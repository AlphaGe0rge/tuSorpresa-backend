const { rateLimit } = require('express-rate-limit');

const changeEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Has realizado demasiadas solicitudes. Inténtalo nuevamente en unos minutos.'
    }
});

const verifyEmailChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Has realizado demasiados intentos de confirmación. Inténtalo más tarde.'
    }
});

module.exports = {
    changeEmailLimiter,
    verifyEmailChangeLimiter
};