const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {OAuth2Client} = require('google-auth-library');

const {User, Surprise} = require('../models');

const {Op} = require('sequelize');
const EmailService = require('./email.service');

const crypto = require('crypto');
const sequelize = require('../config/database');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {

    async register({name, email, password}) {

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {

            const error = new Error('Ya existe un usuario con este correo.');

            error.statusCode = 409;

            throw error;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            googleId: null,
            emailVerified: false,
            roles: 'CLIENT',
            status: 'ACTIVE'
        });

        const token = this.generateToken(user);

        return {
            user: this.toSafeUser(user),
            token
        };
    }

    
    async login({email, password}) {

        const normalizedEmail = email.trim().toLowerCase();

        const genericError = () => {

            const error = new Error(
                'No pudimos iniciar sesión con esos datos. Verifica tu correo y contraseña, o intenta continuar con Google si registraste tu cuenta de esa manera.'
            );

            error.statusCode = 401;

            return error;
        };

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            throw genericError();
        }

        if (user.status !== 'ACTIVE') {
            throw genericError();
        }

        if (!user.passwordHash) {
            throw genericError();
        }

        const validPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!validPassword) {
            throw genericError();
        }

        user.lastLoginAt = new Date();

        await user.save();

        const token = this.generateToken(user);

        return {
            user: this.toSafeUser(user),
            token
        };
    }

    async googleLogin(credential) {

        if (!credential) {

            const error = new Error('La credencial de Google es obligatoria.');

            error.statusCode = 400;

            throw error;
        }

        let payload;

        try {

            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            payload = ticket.getPayload();

        } catch (error) {

            const authError = new Error('No pudimos verificar tu cuenta de Google.');

            authError.statusCode = 401;

            throw authError;
        }

        if (!payload || !payload.sub || !payload.email) {

            const error = new Error('La cuenta de Google no es válida.');

            error.statusCode = 401;

            throw error;
        }

        if (payload.email_verified !== true) {

            const error = new Error('El correo de Google no está verificado.');

            error.statusCode = 401;

            throw error;
        }

        const googleId = payload.sub;

        const normalizedEmail = payload.email.trim().toLowerCase();

        const googleName = typeof payload.name === 'string' &&  payload.name.trim() ? payload.name.trim() : normalizedEmail.split('@')[0];

        let user = await User.findOne({
            where: {
                googleId
            }
        });

        if (!user) {

            user = await User.findOne({
                where: {
                    email:
                        normalizedEmail
                }
            });

            if (user) {

                if (user.googleId && user.googleId !== googleId) {

                    const error = new Error('Este correo ya está asociado a otra cuenta de Google.');

                    error.statusCode = 409;

                    throw error;
                }

                user.googleId = googleId;
                user.emailVerified = true;

                await user.save();

            } else {

                user = await User.create({
                    name: googleName,
                    email: normalizedEmail,
                    passwordHash: null,
                    googleId,
                    emailVerified: true,
                    roles: 'CLIENT',
                    status: 'ACTIVE'
                });
            }
        }

        if (user.status !== 'ACTIVE') {

            const error = new Error('El usuario se encuentra deshabilitado.');

            error.statusCode = 403;

            throw error;
        }

        if (!user.emailVerified) user.emailVerified = true;

        user.lastLoginAt = new Date();

        await user.save();

        const claimedSurprises = await this.claimGuestSurprises(user.id, user.email);

        const token = this.generateToken(user);

        return {
            user: this.toSafeUser(user),
            token,
            claimedSurprises
        };
    }

    async getMe(userId) {

        const user = await User.findByPk(userId);

        if (!user) {

            const error = new Error('Usuario no encontrado.');

            error.statusCode = 404;

            throw error;
        }

        return this.toSafeUser(user);
    }

    generateToken(user) {
        return jwt.sign({sub: user.id}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
    }

    generateEmailVerificationToken(user) {

        const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET;

        return jwt.sign({
            sub: user.id,
            email: user.email,
            purpose: 'EMAIL_VERIFICATION'
        },
        secret,
        {
            expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN ||'24h'
        });
    }

    async resendVerificationEmail(userId) {

        const user = await User.findByPk(userId);

        if (!user) {
            const error = new Error('Usuario no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.status !== 'ACTIVE') {
            const error = new Error('El usuario se encuentra deshabilitado.');
            error.statusCode = 403;
            throw error;
        }

        if (user.emailVerified) {
            const error = new Error('Tu correo electrónico ya está verificado.');
            error.statusCode = 409;
            throw error;
        }

        const verificationToken = this.generateEmailVerificationToken(user);

        await EmailService.sendEmailVerificationWorkspace({
            email: user.email,
            name: user.name,
            verificationToken
        });

        return {
            message: 'Te enviamos un correo para verificar tu cuenta.'
        };
    }

    async verifyEmail(token) {

        if (!token) {

            const error = new Error('Token de verificación requerido.');

            error.statusCode = 400;

            throw error;
        }

        let decoded;

        try {

            const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET;

            decoded = jwt.verify(token, secret);

        } catch (error) {

            const verificationError = new Error('El enlace de verificación no es válido o ha expirado.');

            verificationError.statusCode = 400;

            throw verificationError;
        }

        if (decoded.purpose !== 'EMAIL_VERIFICATION') {

            const error = new Error('El token de verificación no es válido.');

            error.statusCode = 400;

            throw error;
        }

        const user = await User.findByPk(decoded.sub);

        if (!user) {

            const error = new Error('Usuario no encontrado.');

            error.statusCode = 404;

            throw error;
        }

        if (!user.emailVerified) {

            user.emailVerified = true;

            await user.save();
        }

        const claimedSurprises = await this.claimGuestSurprises(user.id, user.email);

        return {
            user: this.toSafeUser(user),
            claimedSurprises
        };
    }

    async claimGuestSurprises(userId, email) {

        if (!userId || !email) return 0;
        
        const normalizedEmail = email.trim().toLowerCase();

        const [updatedCount] = await Surprise.update(
            {
                userId
            },
            {
                where: {
                    userId: {[Op.is]: null},
                    email: normalizedEmail
                }
            }
        );

        return updatedCount;
    }

    toSafeUser(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            authProvider: user.googleId ? 'GOOGLE' : 'LOCAL',
            roles: user.roles,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
        };
    }

    async requestPasswordReset(email) {

        const normalizedEmail = email.trim().toLowerCase();

        const genericResponse = {
            message: 'Si existe una cuenta asociada a este correo, recibirás instrucciones para restablecer tu contraseña.'
        };

        const user = await User.findOne({
            where: {
                email: normalizedEmail,
                status: 'ACTIVE'
            }
        });

        if (!user || !user.passwordHash) return genericResponse;

        const resetToken = crypto.randomBytes(32).toString('hex');

        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.passwordResetTokenHash = resetTokenHash;
        user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await user.save();

        try {
            await EmailService.sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                resetToken
            });
        } catch (error) {
            user.passwordResetTokenHash = null;
            user.passwordResetExpiresAt = null;

            await user.save();

            throw error;
        }

        return genericResponse;
    }

    async resetPassword({token, password}) {

        if (!token || !password) {
            const error = new Error('El token y la nueva contraseña son obligatorios.');
            error.statusCode = 400;
            throw error;
        }

        if (password.length < 8) {
            const error = new Error('La contraseña debe tener al menos 8 caracteres.');
            error.statusCode = 400;
            throw error;
        }

        const tokenHash = crypto.createHash('sha256')
                                .update(token)
                                .digest('hex');

        const user = await User.findOne({
            where: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: {
                    [Op.gt]: new Date()
                },
                status: 'ACTIVE'
            }
        });

        if (!user) {
            const error = new Error('El enlace de recuperación no es válido o ha expirado.');
            error.statusCode = 400;
            throw error;
        }

        user.passwordHash = await bcrypt.hash(password, 12);
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;

        await user.save();

        return {
            message: 'Tu contraseña se ha actualizado correctamente.'
        };
    }

    async updateProfile(userId, {name}) {

        const user = await User.findByPk(userId);

        if (!user) {
            const error = new Error('Usuario no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.status !== 'ACTIVE') {
            const error = new Error('El usuario se encuentra deshabilitado.');
            error.statusCode = 403;
            throw error;
        }

        user.name = name.trim();

        await user.save();

        return this.toSafeUser(user);
    }

    async changePassword(userId, {currentPassword, newPassword}) {

        const user = await User.findByPk(userId);

        if (!user) {
            const error = new Error('Usuario no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.status !== 'ACTIVE') {
            const error = new Error('El usuario se encuentra deshabilitado.');
            error.statusCode = 403;
            throw error;
        }

        if (!user.passwordHash) {
            const error = new Error('Esta cuenta utiliza Google para iniciar sesión y no tiene una contraseña local.');
            error.statusCode = 400;
            throw error;
        }

        const validPassword = await bcrypt.compare(
            currentPassword,
            user.passwordHash
        );

        if (!validPassword) {
            const error = new Error('La contraseña actual es incorrecta.');
            error.statusCode = 400;
            throw error;
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.passwordHash
        );

        if (samePassword) {
            const error = new Error('La nueva contraseña debe ser diferente de la actual.');
            error.statusCode = 400;
            throw error;
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);

        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;

        await user.save();

        return {message: 'Tu contraseña se cambió correctamente.'};

    }

    async requestEmailChange(userId, email) {

        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
            const error = new Error('El correo electrónico no es válido.');
            error.statusCode = 400;
            throw error;
        }

        const now = new Date();

        const COOLDOWN_MS = 2 * 60 * 1000;
        const WINDOW_MS = 24 * 60 * 60 * 1000;
        const MAX_REQUESTS = 3;

        const token = crypto.randomBytes(32).toString('hex');

        const tokenHash = crypto.createHash('sha256')
                                .update(token)
                                .digest('hex');

        let user;
        let previousEmail;

        try {

            await sequelize.transaction(async transaction => {

                user = await User.findByPk(userId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!user) {
                    const error = new Error('Usuario no encontrado.');
                    error.statusCode = 404;
                    throw error;
                }

                if (user.status !== 'ACTIVE') {
                    const error = new Error('El usuario se encuentra deshabilitado.');
                    error.statusCode = 403;
                    throw error;
                }

                if (!user.passwordHash) {
                    const error = new Error(
                        'Las cuentas de Google no pueden cambiar su correo desde esta opción.'
                    );
                    error.statusCode = 400;
                    throw error;
                }

                if (normalizedEmail === user.email.toLowerCase()) {
                    const error = new Error('El nuevo correo debe ser diferente del actual.');
                    error.statusCode = 400;
                    throw error;
                }

                const existingUser = await User.findOne({
                    where: {
                        email: normalizedEmail
                    },
                    transaction
                });

                if (existingUser) {
                    const error = new Error('No es posible utilizar ese correo electrónico.');
                    error.statusCode = 409;
                    throw error;
                }

                const pendingEmailUser = await User.findOne({
                    where: {
                        pendingEmail: normalizedEmail,
                        id: { [Op.ne]: user.id }
                    },
                    transaction
                });

                if (pendingEmailUser) {
                    const error = new Error('No es posible utilizar ese correo electrónico.');
                    error.statusCode = 409;
                    throw error;
                }

                // Control del intervalo de 24 horas.
                let requestCount = user.emailChangeRequestCount || 0;

                let windowStartedAt = user.emailChangeWindowStartedAt
                    ? new Date(user.emailChangeWindowStartedAt)
                    : null;

                if (!windowStartedAt || now.getTime() - windowStartedAt.getTime() >= WINDOW_MS) {
                    requestCount = 0;
                    windowStartedAt = now;
                }

                // Control de espera entre solicitudes.
                if (user.emailChangeLastRequestedAt) {

                    const lastRequestedAt = new Date(user.emailChangeLastRequestedAt);

                    const elapsed = now.getTime() - lastRequestedAt.getTime();

                    if (elapsed < COOLDOWN_MS) {

                        const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);

                        const error = new Error(`Debes esperar ${remainingSeconds} segundos antes de solicitar otro cambio.`);

                        error.statusCode = 429;
                        throw error;
                    }
                }

                if (requestCount >= MAX_REQUESTS) {

                    const error = new Error(
                        'Has alcanzado el límite de solicitudes de cambio de correo. Inténtalo nuevamente después de 24 horas.'
                    );

                    error.statusCode = 429;
                    throw error;
                }

                previousEmail = user.email;

                user.emailChangeRequestCount = requestCount + 1;
                user.emailChangeWindowStartedAt = windowStartedAt;
                user.emailChangeLastRequestedAt = now;
                user.pendingEmail = normalizedEmail;
                user.emailChangeTokenHash = tokenHash;
                user.emailChangeExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);

                await user.save({ transaction });

            });

        } catch (error) {

            if (error.name === 'SequelizeUniqueConstraintError') {
                const conflictError = new Error('No es posible utilizar ese correo electrónico.');
                conflictError.statusCode = 409;
                throw conflictError;
            }

            throw error;
        }

        try {

            await EmailService.sendEmailChangeVerificationWorkspace({
                email: normalizedEmail,
                name: user.name,
                token
            });

        } catch (error) {

            await User.update(
                {
                    pendingEmail: null,
                    emailChangeTokenHash: null,
                    emailChangeExpiresAt: null
                },
                {
                    where: {
                        id: user.id,
                        emailChangeTokenHash: tokenHash
                    }
                });

            throw error;
        }

        return {
            message: 'Te enviamos un enlace al nuevo correo. Confírmalo para completar el cambio.'
        };
    }

    async verifyEmailChange(token) {

        if (!token || typeof token !== 'string') {
            const error = new Error('El token de confirmación es obligatorio.');
            error.statusCode = 400;
            throw error;
        }

        const tokenHash = crypto.createHash('sha256')
                                .update(token)
                                .digest('hex');

        let user;
        let previousEmail;

        try {

            await sequelize.transaction(async transaction => {

                user = await User.findOne({
                    where: {
                        emailChangeTokenHash: tokenHash,
                        emailChangeExpiresAt: {
                            [Op.gt]: new Date()
                        },
                        status: 'ACTIVE'
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!user || !user.pendingEmail) {
                    const error = new Error(
                        'El enlace de cambio de correo no es válido o ha expirado.'
                    );

                    error.statusCode = 400;
                    throw error;
                }

                const existingUser = await User.findOne({
                    where: {
                        email: user.pendingEmail,
                        id: { [Op.ne]: user.id }
                    },
                    transaction
                });

                if (existingUser) {
                    const error = new Error(
                        'No es posible utilizar ese correo electrónico.'
                    );

                    error.statusCode = 409;
                    throw error;
                }

                previousEmail = user.email;

                user.email = user.pendingEmail;
                user.pendingEmail = null;
                user.emailChangeTokenHash = null;
                user.emailChangeExpiresAt = null;
                user.emailVerified = true;
                user.emailChangeRequestCount = 0;
                user.emailChangeWindowStartedAt = null;
                user.emailChangeLastRequestedAt = null;

                await user.save({ transaction });

            });

        } catch (error) {

            if (error.name === 'SequelizeUniqueConstraintError') {
                const conflictError = new Error('No es posible utilizar ese correo electrónico.');
                conflictError.statusCode = 409;
                throw conflictError;
            }

            throw error;
        }

        return {
            message: 'Tu correo electrónico se actualizó correctamente.',
            user: this.toSafeUser(user)
        };
    }

}

module.exports = new AuthService();