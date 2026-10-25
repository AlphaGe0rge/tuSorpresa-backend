const express = require('express');

const PaymentController = require('../controllers/payment.controller');
const optionalAuthMiddleware = require('../middleware/optional-auth.middleware');

const router = express.Router();

router.post('/surprises/:surpriseId', optionalAuthMiddleware, PaymentController.create);
router.get('/:paymentId', optionalAuthMiddleware, PaymentController.getStatus);
router.get('/wompi/transaction/:transactionId', optionalAuthMiddleware, PaymentController.syncTransaction);
router.post('/wompi/webhook', PaymentController.wompiWebhook);

module.exports = router;