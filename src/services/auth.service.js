const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
    User,
    Surprise
} = require('../models');

const {
    Op
} = require('sequelize');

const EmailService =
    require('./email.service');


class AuthService {


    /*
    |--------------------------------------------------------------------------
    | REGISTER
    |--------------------------------------------------------------------------
    */

    async register({
        name,
        email,
        password
    }) {

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /*
        |--------------------------------------------------------------------------
        | CHECK EXISTING USER
        |--------------------------------------------------------------------------
        */

        const existingUser =
            await User.findOne({
                where: {
                    email: normalizedEmail
                }
            });


        if (existingUser) {

            const error =
                new Error(
                    'Ya existe un usuario con este correo.'
                );

            error.statusCode = 409;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | PASSWORD
        |--------------------------------------------------------------------------
        */

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        /*
        |--------------------------------------------------------------------------
        | CREATE USER
        |--------------------------------------------------------------------------
        |
        | Nunca aceptamos roles desde el endpoint
        | público de registro.
        |
        | Todo usuario registrado públicamente
        | nace como CLIENT.
        |
        | El correo comienza como NO VERIFICADO.
        |
        */

        const user =
            await User.create({

                name:
                    name.trim(),

                email:
                    normalizedEmail,

                passwordHash,

                emailVerified:
                    false,

                roles:
                    'CLIENT',

                status:
                    'ACTIVE'

            });


        /*
        |--------------------------------------------------------------------------
        | AUTH TOKEN
        |--------------------------------------------------------------------------
        |
        | El usuario puede iniciar sesión inmediatamente
        | después de registrarse.
        |
        | La verificación del correo será un proceso
        | adicional.
        |
        */

        const token =
            this.generateToken(user);


        /*
        |--------------------------------------------------------------------------
        | EMAIL VERIFICATION
        |--------------------------------------------------------------------------
        |
        | Generamos un token independiente del JWT
        | utilizado para autenticación.
        |
        */

        const verificationToken =
            this.generateEmailVerificationToken(
                user
            );


        /*
        |--------------------------------------------------------------------------
        | SEND VERIFICATION EMAIL
        |--------------------------------------------------------------------------
        |
        | MUY IMPORTANTE:
        |
        | Si Resend falla, NO eliminamos al usuario
        | ni hacemos fallar el registro.
        |
        | El usuario ya tiene su cuenta creada.
        |
        | Posteriormente podremos implementar
        | "Reenviar correo de verificación".
        |
        */

        let verificationEmailSent =
            false;


        try {

            await EmailService.sendEmailVerification({

                email:
                    user.email,

                name:
                    user.name,

                verificationToken

            });


            verificationEmailSent =
                true;


        } catch (error) {

            console.error(
                'Error enviando correo de verificación:',
                error
            );

            /*
             * No lanzamos el error.
             *
             * La cuenta ya fue creada correctamente.
             */
        }


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return {

            user:
                this.toSafeUser(user),

            token,

            verificationEmailSent

        };
    }


    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    async login({
        email,
        password
    }) {

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        const user =
            await User.findOne({
                where: {
                    email: normalizedEmail
                }
            });


        if (!user) {

            const error =
                new Error(
                    'Correo o contraseña incorrectos.'
                );

            error.statusCode = 401;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | USER STATUS
        |--------------------------------------------------------------------------
        */

        if (
            user.status !== 'ACTIVE'
        ) {

            const error =
                new Error(
                    'El usuario se encuentra deshabilitado.'
                );

            error.statusCode = 403;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | PASSWORD
        |--------------------------------------------------------------------------
        */

        const validPassword =
            await bcrypt.compare(
                password,
                user.passwordHash
            );


        if (!validPassword) {

            const error =
                new Error(
                    'Correo o contraseña incorrectos.'
                );

            error.statusCode = 401;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | LAST LOGIN
        |--------------------------------------------------------------------------
        */

        user.lastLoginAt =
            new Date();


        await user.save();


        /*
        |--------------------------------------------------------------------------
        | AUTH TOKEN
        |--------------------------------------------------------------------------
        */

        const token =
            this.generateToken(user);


        return {

            user:
                this.toSafeUser(user),

            token

        };
    }


    /*
    |--------------------------------------------------------------------------
    | GET CURRENT USER
    |--------------------------------------------------------------------------
    */

    async getMe(userId) {

        const user =
            await User.findByPk(
                userId
            );


        if (!user) {

            const error =
                new Error(
                    'Usuario no encontrado.'
                );

            error.statusCode = 404;

            throw error;
        }


        return this.toSafeUser(
            user
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GENERATE AUTH TOKEN
    |--------------------------------------------------------------------------
    */

    generateToken(user) {

        return jwt.sign(

            {
                sub:
                    user.id
            },

            process.env.JWT_SECRET,

            {
                expiresIn:
                    process.env.JWT_EXPIRES_IN ||
                    '7d'
            }

        );
    }


    /*
    |--------------------------------------------------------------------------
    | GENERATE EMAIL VERIFICATION TOKEN
    |--------------------------------------------------------------------------
    |
    | Este token NO es el JWT de autenticación.
    |
    | Su único propósito es verificar el correo.
    |
    */

    generateEmailVerificationToken(user) {

        const secret =
            process.env.EMAIL_VERIFICATION_SECRET ||
            process.env.JWT_SECRET;


        return jwt.sign(

            {
                sub:
                    user.id,

                email:
                    user.email,

                purpose:
                    'EMAIL_VERIFICATION'
            },

            secret,

            {
                expiresIn:
                    process.env.EMAIL_VERIFICATION_EXPIRES_IN ||
                    '24h'
            }

        );
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFY EMAIL
    |--------------------------------------------------------------------------
    |
    | Flujo:
    |
    | 1. Validar token.
    | 2. Buscar usuario.
    | 3. Marcar emailVerified = true.
    | 4. Reclamar sorpresas creadas como invitado.
    |
    */

    async verifyEmail(token) {

        if (!token) {

            const error =
                new Error(
                    'Token de verificación requerido.'
                );

            error.statusCode = 400;

            throw error;
        }


        let decoded;


        /*
        |--------------------------------------------------------------------------
        | VERIFY TOKEN
        |--------------------------------------------------------------------------
        */

        try {

            const secret =
                process.env.EMAIL_VERIFICATION_SECRET ||
                process.env.JWT_SECRET;


            decoded =
                jwt.verify(
                    token,
                    secret
                );


        } catch (error) {

            const verificationError =
                new Error(
                    'El enlace de verificación no es válido o ha expirado.'
                );

            verificationError.statusCode = 400;

            throw verificationError;
        }


        /*
        |--------------------------------------------------------------------------
        | CHECK TOKEN PURPOSE
        |--------------------------------------------------------------------------
        */

        if (
            decoded.purpose !==
            'EMAIL_VERIFICATION'
        ) {

            const error =
                new Error(
                    'El token de verificación no es válido.'
                );

            error.statusCode = 400;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | FIND USER
        |--------------------------------------------------------------------------
        */

        const user =
            await User.findByPk(
                decoded.sub
            );


        if (!user) {

            const error =
                new Error(
                    'Usuario no encontrado.'
                );

            error.statusCode = 404;

            throw error;
        }


        /*
        |--------------------------------------------------------------------------
        | VERIFY EMAIL
        |--------------------------------------------------------------------------
        */

        if (
            !user.emailVerified
        ) {

            user.emailVerified =
                true;

            await user.save();
        }


        /*
        |--------------------------------------------------------------------------
        | CLAIM GUEST SURPRISES
        |--------------------------------------------------------------------------
        |
        | Ahora buscamos todas las sorpresas que:
        |
        | userId IS NULL
        | email = user.email
        |
        | y las asociamos al usuario.
        |
        */

        const claimedSurprises =
            await this.claimGuestSurprises(
                user.id,
                user.email
            );


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return {

            user:
                this.toSafeUser(user),

            claimedSurprises

        };
    }


    /*
    |--------------------------------------------------------------------------
    | CLAIM GUEST SURPRISES
    |--------------------------------------------------------------------------
    |
    | Una sorpresa creada sin cuenta queda inicialmente:
    |
    | userId = NULL
    |
    | email = correo introducido al crearla
    |
    | Cuando el propietario crea una cuenta y verifica
    | ese mismo correo, las sorpresas pasan a pertenecer
    | a su cuenta.
    |
    */

    async claimGuestSurprises(
        userId,
        email
    ) {

        if (
            !userId ||
            !email
        ) {

            return 0;
        }


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /*
        |--------------------------------------------------------------------------
        | CLAIM
        |--------------------------------------------------------------------------
        */

        const [
            updatedCount
        ] =
            await Surprise.update(

                {
                    userId
                },

                {
                    where: {

                        userId:
                            {
                                [Op.is]:
                                    null
                            },

                        email:
                            normalizedEmail

                    }
                }

            );


        return updatedCount;
    }


    /*
    |--------------------------------------------------------------------------
    | SAFE USER
    |--------------------------------------------------------------------------
    |
    | Nunca devolvemos passwordHash
    | ni información sensible.
    |
    */

    toSafeUser(user) {

        return {

            id:
                user.id,

            name:
                user.name,

            email:
                user.email,

            emailVerified:
                user.emailVerified,

            roles:
                user.roles,

            status:
                user.status,

            lastLoginAt:
                user.lastLoginAt,

            createdAt:
                user.createdAt

        };
    }

}


module.exports =
    new AuthService();