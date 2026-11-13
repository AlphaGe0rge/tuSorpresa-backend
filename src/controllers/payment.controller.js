const PaymentService = require('../services/payment.service');

class PaymentController {

    // CREATE PAYMENT
    static async create(req, res) {

        try {

            const {surpriseId} = req.params;
            const {plan, editToken} = req.body || {};

            const userId = req.user?.id ?? null;

            const result = await PaymentService.createPayment(surpriseId, plan, userId, editToken);

            return res.status(201).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                PAYMENT_AUTH_REQUIRED: 401,
                SURPRISE_ID_REQUIRED: 400,
                PAYMENT_ID_REQUIRED: 400,
                TRANSACTION_ID_REQUIRED: 400,
                INVALID_SURPRISE_PLAN: 400,
                INVALID_PAYMENT_PLAN: 400,
                SURPRISE_NOT_FOUND: 404,
                PAYMENT_NOT_FOUND: 404,
                SURPRISE_ALREADY_PAID: 409,
                SURPRISE_NOT_PENDING_PAYMENT: 409,
                PAYMENT_IN_PROGRESS: 409,
                SURPRISE_EXPIRED: 410,
                INVALID_WOMPI_PRICE: 500,
                INVALID_WOMPI_SIGNATURE_DATA: 500
            };

            const status = statusCodes[error.message] || 500;

            if (status === 500) {
                console.error('Error creating Wompi payment:', error);
            }

            return res.status(status).json({
                success: false,
                message: status === 500 ? 'Unable to create payment' : error.message
            });
        }
    }

    // GET PAYMENT STATUS
    static async getStatus(req, res) {

        try {

            const {paymentId} = req.params;

            const editToken = req.query.editToken || null;

            const userId = req.user?.id ?? null;

            const result = await PaymentService.getPaymentStatus(paymentId, userId, editToken);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                PAYMENT_AUTH_REQUIRED: 401,
                PAYMENT_ID_REQUIRED: 400,
                PAYMENT_NOT_FOUND: 404
            };

            const status = statusCodes[error.message] || 500;

            if (status === 500) {
                console.error('Error getting payment status:', error);
            }

            return res.status(status).json({
                success: false,
                message: status === 500 ? 'Unable to get payment status' : error.message
            });
        }
    }

    // SYNC TRANSACTION FROM REDIRECT
    static async syncTransaction(req, res) {

        try {

            const {transactionId} = req.params;

            const editToken = req.query.editToken || null;

            const userId = req.user?.id ?? null;

            const result = await PaymentService.syncWompiTransaction(transactionId, userId, editToken);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                PAYMENT_AUTH_REQUIRED: 401,
                TRANSACTION_ID_REQUIRED: 400,
                PAYMENT_NOT_FOUND: 404,
                WOMPI_TRANSACTION_NOT_FOUND: 404,
                WOMPI_TRANSACTION_QUERY_FAILED: 502
            };

            const status = statusCodes[error.message] || 500;

            if (status === 500) {
                console.error('Error syncing Wompi transaction:', error);
            }

            return res.status(status).json({
                success: false,
                message: status === 500 ? 'Unable to synchronize payment' : error.message
            });
        }
    }

    // WOMPI WEBHOOK
    static async wompiWebhook(req, res) {

        try {

            const checksum = req.headers['x-event-checksum'];

            await PaymentService.processWompiWebhook(
                req.body,
                checksum
            );

            return res.sendStatus(200);

        } catch (error) {

            console.error('Wompi webhook error:', error);

            const invalidEvents = [
                'INVALID_WOMPI_ENVIRONMENT',
                'INVALID_WOMPI_SIGNATURE',
                'INVALID_WOMPI_HEADER_SIGNATURE',
                'INVALID_WOMPI_EVENT',
                'INVALID_WOMPI_TRANSACTION_STATUS',
                'INVALID_PAYMENT_CURRENCY',
                'INVALID_PAYMENT_AMOUNT',
                'INVALID_PAYMENT_REFERENCE',
                'WOMPI_TRANSACTION_ID_REQUIRED'
            ];

            if (invalidEvents.includes(error.message)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Wompi event'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Unable to process Wompi event'
            });
        }
    }
}


module.exports = PaymentController;