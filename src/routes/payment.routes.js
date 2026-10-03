const express = require('express');

const PaymentController =
    require('../controllers/payment.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const optionalAuthMiddleware =
    require('../middleware/optional-auth.middleware');


const router =
    express.Router();


// ============================================================
// CREATE PAYMENT
// ============================================================

// Usuario registrado:
//    JWT
//
// Invitado:
//    editToken en body
//
router.post(
    '/surprises/:surpriseId',
    optionalAuthMiddleware,
    PaymentController.create
);


// ============================================================
// GET PAYMENT STATUS
// ============================================================

// Usuario registrado:
//    JWT
//
// Invitado:
//    ?editToken=...
//
router.get(
    '/:paymentId',
    optionalAuthMiddleware,
    PaymentController.getStatus
);


// ============================================================
// SYNC WOMPI TRANSACTION
// ============================================================

// Usuario registrado:
//    JWT
//
// Invitado:
//    ?editToken=...
//
router.get(
    '/wompi/transaction/:transactionId',
    optionalAuthMiddleware,
    PaymentController.syncTransaction
);


// ============================================================
// WOMPI WEBHOOK
// ============================================================

// Público.
// La seguridad la proporciona la firma
// del webhook de Wompi.
router.post(
    '/wompi/webhook',
    PaymentController.wompiWebhook
);


module.exports =
    router;