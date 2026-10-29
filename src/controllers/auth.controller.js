const AuthService = require('../services/auth.service');

class AuthController {

    async register(req, res) {

        try {

            const {name, email, password} = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    message: 'El nombre es obligatorio.'
                });
            }

            if (!email || !email.trim()) {
                return res.status(400).json({
                    message: 'El correo es obligatorio.'
                });
            }

            if (!password) {
                return res.status(400).json({
                    message: 'La contraseña es obligatoria.'
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    message: 'La contraseña debe tener al menos 8 caracteres.'
                });
            }

            const result = await AuthService.register({name, email, password});

            return res.status(201).json(result);

        } catch (error) {

            console.error('Error en register:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }

    async login(req, res) {

        try {

            const {email, password} = req.body;

            if (!email || !email.trim()) {
                return res.status(400).json({
                    message: 'El correo es obligatorio.'
                });
            }

            if (!password) {
                return res.status(400).json({
                    message: 'La contraseña es obligatoria.'
                });
            }

            const result = await AuthService.login({email, password});

            return res.status(200).json(result);

        } catch (error) {

            console.error('Error en login:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }

    async google(req, res) {

        try {

            const {credential} = req.body;

            if (!credential) {
                return res.status(400).json({
                    message: 'La credencial de Google es obligatoria.'
                });
            }

            const result = await AuthService.googleLogin(credential);

            return res.status(200).json(result);

        } catch (error) {

            console.error('Error en Google login:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }

    async me(req, res) {

        try {

            const user = await AuthService.getMe(req.user.id);

            return res.status(200).json({user});

        } catch (error) {

            console.error('Error en /me:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }

    async resendVerificationEmail(req, res) {

        try {
            const result = await AuthService.resendVerificationEmail(
                req.user.id
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error reenviando correo de verificación:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : 'No fue posible enviar el correo de verificación.'
            });
        }
    }

    async verifyEmail(req, res) {

        try {

            const {token} = req.body;

            if (!token) {
                return res.status(400).json({
                    message: 'El token de verificación es obligatorio.'
                });
            }

            const result = await AuthService.verifyEmail(token);

            return res.status(200).json({
                message: 'Correo electrónico verificado correctamente.',
                user: result.user,
                claimedSurprises: result.claimedSurprises
            });

        } catch (error) {

            console.error('Error en verify-email:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }

    async forgotPassword(req, res) {

        try {
            const {email} = req.body;

            if (!email || typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({
                    message: 'El correo electrónico es obligatorio.'
                });
            }

            const result = await AuthService.requestPasswordReset(email);

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error en forgot-password:', error);

            return res.status(500).json({
                message: 'No fue posible procesar la solicitud. Inténtalo más tarde.'
            });
        }
    }

    async resetPassword(req, res) {

        try {
            
            const {token, password} = req.body;

            const result = await AuthService.resetPassword({
                token,
                password
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error en reset-password:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : 'No fue posible restablecer la contraseña. Inténtalo más tarde.'
            });
        }
    }

    async updateProfile(req, res) {

        try {

            const {name} = req.body;

            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'El nombre es obligatorio.'
                });
            }

            if (name.trim().length > 100) {
                return res.status(400).json({
                    message: 'El nombre no puede superar los 100 caracteres.'
                });
            }

            const user = await AuthService.updateProfile(req.user.id, {name});

            return res.status(200).json({
                message: 'Tu perfil se actualizó correctamente.',
                user
            });

        } catch (error) {

            console.error('Error en updateProfile:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode ? error.message : 'No fue posible actualizar tu perfil.'
            });
        }
    }

    async changePassword(req, res) {

        try {

            const {currentPassword, newPassword} = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    message: 'Debes ingresar tu contraseña actual y la nueva.'
                });
            }

            if (typeof newPassword !== 'string' || newPassword.length < 8) {
                return res.status(400).json({
                    message: 'La nueva contraseña debe tener al menos 8 caracteres.'
                });
            }

            const result = await AuthService.changePassword(
                req.user.id,
                {currentPassword, newPassword}
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Error en changePassword:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : 'No fue posible cambiar la contraseña.'
            });
        }
    }

    async requestEmailChange(req, res) {
        try {
            const {email} = req.body;

            if (typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({
                    message: 'Debes ingresar el nuevo correo electrónico.'
                });
            }

            const result = await AuthService.requestEmailChange(
                req.user.id,
                email
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error en requestEmailChange:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : 'No fue posible solicitar el cambio de correo.'
            });
        }
    }

    async verifyEmailChange(req, res) {
        
        try {

            const {token} = req.body;

            if (!token || typeof token !== 'string') {
                return res.status(400).json({
                    message: 'El token de confirmación es obligatorio.'
                });
            }

            const result = await AuthService.verifyEmailChange(token);

            return res.status(200).json(result);
            
        } catch (error) {
            console.error('Error en verifyEmailChange:', error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : 'No fue posible confirmar el cambio de correo.'
            });
        }
    }

}

module.exports = new AuthController();