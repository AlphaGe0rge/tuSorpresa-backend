const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function optionalAuthMiddleware(req, res, next) {

    try {

        const authorization =
            req.headers.authorization;


        // ========================================================
        // SIN AUTENTICACIÓN
        // ========================================================

        if (!authorization) {

            req.user = null;

            return next();

        }


        // ========================================================
        // VALIDAR FORMATO
        // ========================================================

        const [type, token] =
            authorization.split(' ');


        if (
            type !== 'Bearer' ||
            !token
        ) {

            return res.status(401).json({

                message:
                    'Token de autenticación inválido.'

            });

        }


        // ========================================================
        // VALIDAR TOKEN
        // ========================================================

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // ========================================================
        // BUSCAR USUARIO
        // ========================================================

        const user =
            await User.findByPk(
                decoded.sub
            );


        if (!user) {

            return res.status(401).json({

                message:
                    'El usuario no existe.'

            });

        }


        // ========================================================
        // VALIDAR ESTADO
        // ========================================================

        if (
            user.status !== 'ACTIVE'
        ) {

            return res.status(403).json({

                message:
                    'El usuario se encuentra deshabilitado.'

            });

        }


        // ========================================================
        // USUARIO AUTENTICADO
        // ========================================================

        req.user = {

            id:
                user.id,

            name:
                user.name,

            email:
                user.email,

            roles:
                user.roles,

            status:
                user.status

        };


        return next();

    } catch (error) {

        console.error(error);

        return res.status(401).json({

            message:
                'Token inválido o expirado.'

        });

    }
}

module.exports =
    optionalAuthMiddleware;