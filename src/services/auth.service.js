const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
    OAuth2Client
} = require('google-auth-library');

const {
    User,
    Surprise
} = require('../models');

const {
    Op
} = require('sequelize');

const EmailService =
    require('./email.service');

const googleClient =
    new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID
    );

class AuthService {

    async register({
        name,
        email,
        password
    }) {

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

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

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        const user =
            await User.create({

                name:
                    name.trim(),

                email:
                    normalizedEmail,

                passwordHash,

                googleId:
                    null,

                emailVerified:
                    false,

                roles:
                    'CLIENT',

                status:
                    'ACTIVE'

            });

        const token =
            this.generateToken(user);

        const verificationToken =
            this.generateEmailVerificationToken(
                user
            );

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
        }

        return {

            user:
                this.toSafeUser(user),

            token,

            verificationEmailSent

        };
    }

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

        if (!user.passwordHash) {

            const error =
                new Error(
                    'Esta cuenta utiliza Google para iniciar sesión.'
                );

            error.statusCode = 400;

            throw error;
        }

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

        user.lastLoginAt =
            new Date();

        await user.save();

        const token =
            this.generateToken(user);

        return {

            user:
                this.toSafeUser(user),

            token

        };
    }

    async googleLogin(
        credential
    ) {

        if (!credential) {

            const error =
                new Error(
                    'La credencial de Google es obligatoria.'
                );

            error.statusCode = 400;

            throw error;
        }

        let payload;

        try {

            const ticket =
                await googleClient.verifyIdToken({

                    idToken:
                        credential,

                    audience:
                        process.env.GOOGLE_CLIENT_ID

                });

            payload =
                ticket.getPayload();

        } catch (error) {

            const authError =
                new Error(
                    'No pudimos verificar tu cuenta de Google.'
                );

            authError.statusCode = 401;

            throw authError;
        }

        if (
            !payload ||
            !payload.sub ||
            !payload.email
        ) {

            const error =
                new Error(
                    'La cuenta de Google no es válida.'
                );

            error.statusCode = 401;

            throw error;
        }

        if (
            payload.email_verified !== true
        ) {

            const error =
                new Error(
                    'El correo de Google no está verificado.'
                );

            error.statusCode = 401;

            throw error;
        }

        const googleId =
            payload.sub;

        const normalizedEmail =
            payload.email
                .trim()
                .toLowerCase();

        const googleName =
            typeof payload.name === 'string' &&
            payload.name.trim()
                ? payload.name.trim()
                : normalizedEmail.split('@')[0];

        let user =
            await User.findOne({
                where: {
                    googleId
                }
            });

        if (!user) {

            user =
                await User.findOne({
                    where: {
                        email:
                            normalizedEmail
                    }
                });

            if (user) {

                if (
                    user.googleId &&
                    user.googleId !== googleId
                ) {

                    const error =
                        new Error(
                            'Este correo ya está asociado a otra cuenta de Google.'
                        );

                    error.statusCode = 409;

                    throw error;
                }

                user.googleId =
                    googleId;

                user.emailVerified =
                    true;

                await user.save();

            } else {

                user =
                    await User.create({

                        name:
                            googleName,

                        email:
                            normalizedEmail,

                        passwordHash:
                            null,

                        googleId,

                        emailVerified:
                            true,

                        roles:
                            'CLIENT',

                        status:
                            'ACTIVE'

                    });
            }
        }

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

        if (
            !user.emailVerified
        ) {

            user.emailVerified =
                true;
        }

        user.lastLoginAt =
            new Date();

        await user.save();

        const claimedSurprises =
            await this.claimGuestSurprises(
                user.id,
                user.email
            );

        const token =
            this.generateToken(user);

        return {

            user:
                this.toSafeUser(user),

            token,

            claimedSurprises

        };
    }

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

        if (
            !user.emailVerified
        ) {

            user.emailVerified =
                true;

            await user.save();
        }

        const claimedSurprises =
            await this.claimGuestSurprises(
                user.id,
                user.email
            );

        return {

            user:
                this.toSafeUser(user),

            claimedSurprises

        };
    }

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