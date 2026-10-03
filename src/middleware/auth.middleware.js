const jwt = require('jsonwebtoken');
const { User } = require('../models');


async function authMiddleware(
    req,
    res,
    next
) {

    try {

        const authorization =
            req.headers.authorization;


        // ========================================================
        // AUTHORIZATION
        // ========================================================

        if (!authorization) {

            return res.status(401).json({

                message:
                    'No autenticado.'

            });

        }


        // ========================================================
        // TOKEN
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
        // VERIFY JWT
        // ========================================================

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // ========================================================
        // FIND USER
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
        // CHECK STATUS
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
        // SET USER
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


        next();

    } catch (error) {

        console.error(error);

        return res.status(401).json({

            message:
                'Token inválido o expirado.'

        });

    }
}


module.exports =
    authMiddleware;