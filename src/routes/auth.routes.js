const express = require('express');

const authController =
    require('../controllers/auth.controller');

const authMiddleware =
    require('../middleware/auth.middleware');


const router =
    express.Router();


/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post(
    '/register',
    authController.register.bind(
        authController
    )
);


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post(
    '/login',
    authController.login.bind(
        authController
    )
);


/*
|--------------------------------------------------------------------------
| VERIFY EMAIL
|--------------------------------------------------------------------------
|
| Este endpoint no requiere autenticación.
|
| El usuario llega desde el enlace enviado
| por correo con un token de verificación.
|
*/

router.post(
    '/verify-email',
    authController.verifyEmail.bind(
        authController
    )
);


/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

router.get(
    '/me',
    authMiddleware,
    authController.me.bind(
        authController
    )
);


module.exports = router;