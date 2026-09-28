const express = require('express');

const PaymentController =
    require('../controllers/payment.controller');

const authMiddleware =
    require('../middleware/auth.middleware');


const router =
    express.Router();


// ============================================================
// AUTHENTICATED
// ============================================================


// Crear pago de una sorpresa
router.post(
    '/surprises/:surpriseId',
    authMiddleware,
    PaymentController.create
);


// Consultar estado de un pago
router.get(
    '/:paymentId',
    authMiddleware,
    PaymentController.getStatus
);


// Sincronizar transacción después
// de regresar desde Wompi
router.get(
    '/wompi/transaction/:transactionId',
    authMiddleware,
    PaymentController.syncTransaction
);


// ============================================================
// WEBHOOK
// ============================================================

router.post(
    '/wompi/webhook',
    PaymentController.wompiWebhook
);


module.exports =
    router;