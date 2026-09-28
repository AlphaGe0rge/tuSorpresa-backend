const crypto = require('crypto');

const {
    Payment,
    Surprise
} = require('../models');

const WompiService =
    require('./wompi.service');

const EmailService =
    require('./email.service');


class PaymentService {

    // ============================================================
    // PRICE
    // ============================================================

    static getPriceInCop() {

        const price =
            Number(
                process.env.WOMPI_SURPRISE_PRICE_COP
            );

        if (
            !Number.isInteger(price) ||
            price <= 0
        ) {
            throw new Error(
                'INVALID_WOMPI_PRICE'
            );
        }

        return price;
    }


    // ============================================================
    // CREATE PAYMENT
    // ============================================================

    static async createPayment(
        surpriseId,
        userId
    ) {

        if (!userId) {
            throw new Error(
                'USER_REQUIRED'
            );
        }


        if (!surpriseId) {
            throw new Error(
                'SURPRISE_ID_REQUIRED'
            );
        }


        const surprise =
            await Surprise.findOne({
                where: {
                    id: surpriseId,
                    userId
                }
            });


        if (!surprise) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        if (
            surprise.status === 'ACTIVE'
        ) {
            throw new Error(
                'SURPRISE_ALREADY_PAID'
            );
        }


        if (
            surprise.status === 'EXPIRED'
        ) {
            throw new Error(
                'SURPRISE_EXPIRED'
            );
        }


        /*
         * El precio SIEMPRE sale del backend.
         *
         * Nunca recibimos amount desde Angular.
         */

        const priceCop =
            this.getPriceInCop();


        const amountInCents =
            priceCop * 100;


        const reference =
            `SURPRISE-${surprise.id}-${crypto.randomUUID()}`;


        const signature =
            WompiService.generateIntegritySignature({
                reference,
                amountInCents,
                currency: 'COP'
            });


        const payment =
            await Payment.create({

                surpriseId:
                    surprise.id,

                provider:
                    'WOMPI',

                reference,

                amountInCents,

                currency:
                    'COP',

                status:
                    'PENDING'
            });


        return {

            paymentId:
                payment.id,

            reference,

            amountInCents,

            currency:
                'COP',

            publicKey:
                process.env.WOMPI_PUBLIC_KEY,

            signature,

            redirectUrl:
                process.env.WOMPI_REDIRECT_URL
        };
    }


    // ============================================================
    // GET PAYMENT STATUS
    // ============================================================

    static async getPaymentStatus(
        paymentId,
        userId
    ) {

        if (!userId) {
            throw new Error(
                'USER_REQUIRED'
            );
        }


        const payment =
            await Payment.findOne({
                where: {
                    id: paymentId
                },

                include: [
                    {
                        model: Surprise,
                        as: 'surprise',

                        where: {
                            userId
                        },

                        attributes: [
                            'id',
                            'status',
                            'publicToken'
                        ]
                    }
                ]
            });


        if (!payment) {
            throw new Error(
                'PAYMENT_NOT_FOUND'
            );
        }


        return this.toStatusResponse(
            payment
        );
    }


    // ============================================================
    // SYNC FROM WOMPI TRANSACTION
    // ============================================================

    static async syncWompiTransaction(
        transactionId,
        userId = null
    ) {

        const transaction =
            await WompiService.getTransaction(
                transactionId
            );


        if (!transaction) {
            throw new Error(
                'WOMPI_TRANSACTION_NOT_FOUND'
            );
        }


        const payment =
            await Payment.findOne({
                where: {
                    reference:
                        transaction.reference
                },

                include: [
                    {
                        model: Surprise,
                        as: 'surprise'
                    }
                ]
            });


        if (!payment) {
            throw new Error(
                'PAYMENT_NOT_FOUND'
            );
        }


        if (
            userId &&
            payment.surprise.userId !== userId
        ) {
            throw new Error(
                'PAYMENT_NOT_FOUND'
            );
        }


        await this.applyTransaction(
            payment,
            transaction
        );


        await payment.reload();


        return this.toStatusResponse(
            payment
        );
    }


    // ============================================================
    // WEBHOOK
    // ============================================================

    static async processWompiWebhook(
        event,
        headerChecksum
    ) {

        if (
            event?.event !==
            'transaction.updated'
        ) {
            return;
        }


        /*
         * Verificamos que el ambiente
         * recibido corresponda al actual.
         */

        const expectedEnvironment =
            process.env.WOMPI_ENV ===
            'production'
                ? 'prod'
                : 'test';


        if (
            event.environment &&
            event.environment !==
                expectedEnvironment
        ) {

            throw new Error(
                'INVALID_WOMPI_ENVIRONMENT'
            );
        }


        const validSignature =
            WompiService
                .validateEventSignature(
                    event
                );


        if (!validSignature) {
            throw new Error(
                'INVALID_WOMPI_SIGNATURE'
            );
        }


        /*
         * El header y el body
         * contienen el mismo checksum.
         */

        if (
            !WompiService
                .validateEventHeader(
                    event,
                    headerChecksum
                )
        ) {
            throw new Error(
                'INVALID_WOMPI_HEADER_SIGNATURE'
            );
        }


        const transaction =
            event.data?.transaction;


        if (!transaction) {
            throw new Error(
                'INVALID_WOMPI_EVENT'
            );
        }


        const payment =
            await Payment.findOne({
                where: {
                    reference:
                        transaction.reference
                },

                include: [
                    {
                        model: Surprise,
                        as: 'surprise'
                    }
                ]
            });


        if (!payment) {

            /*
             * No existe una orden local.
             *
             * No debemos crear nada
             * automáticamente.
             */

            throw new Error(
                'PAYMENT_NOT_FOUND'
            );
        }


        await this.applyTransaction(
            payment,
            transaction
        );
    }


    // ============================================================
    // APPLY WOMPI TRANSACTION
    // ============================================================

    static async applyTransaction(
        payment,
        transaction
    ) {

        /*
         * Nunca confiamos únicamente
         * en status.
         */

        if (
            transaction.currency !==
            payment.currency
        ) {

            throw new Error(
                'INVALID_PAYMENT_CURRENCY'
            );
        }


        if (
            Number(
                transaction.amount_in_cents
            ) !==
            Number(
                payment.amountInCents
            )
        ) {

            throw new Error(
                'INVALID_PAYMENT_AMOUNT'
            );
        }


        if (
            transaction.reference !==
            payment.reference
        ) {

            throw new Error(
                'INVALID_PAYMENT_REFERENCE'
            );
        }


        const previousStatus =
            payment.status;


        payment.wompiTransactionId =
            transaction.id;

        payment.status =
            transaction.status;

        payment.paymentMethodType =
            transaction.payment_method_type ||
            null;

        payment.statusMessage =
            transaction.status_message ||
            null;


        if (
            transaction.status ===
            'APPROVED'
        ) {

            payment.paidAt =
                payment.paidAt ||
                new Date();

            await payment.save();


            /*
             * Solo activamos si realmente
             * el pago fue aprobado.
             */

            if (
                payment.surprise.status !==
                'ACTIVE'
            ) {

                await payment.surprise.update({
                    status:
                        'ACTIVE'
                });
            }


            /*
             * Evitamos enviar nuevamente
             * el correo si Wompi repite
             * el webhook.
             */

            if (
                previousStatus !==
                'APPROVED'
            ) {

                try {

                    await EmailService
                        .sendSurpriseCreated({

                            email:
                                payment.surprise.email,

                            recipientName:
                                payment.surprise
                                    .recipientName,

                            publicToken:
                                payment.surprise
                                    .publicToken,

                            editToken: null
                        });

                } catch (error) {

                    console.error(
                        'Unable to send paid surprise email:',
                        error
                    );
                }
            }

        } else {

            await payment.save();


            /*
             * Si fue anulada después
             * de haber sido aprobada,
             * desactivamos la sorpresa.
             */

            if (
                transaction.status ===
                'VOIDED'
            ) {

                await payment.surprise.update({
                    status:
                        'DISABLED'
                });
            }
        }
    }


    // ============================================================
    // RESPONSE
    // ============================================================

    static toStatusResponse(
        payment
    ) {

        return {

            paymentId:
                payment.id,

            reference:
                payment.reference,

            status:
                payment.status,

            amountInCents:
                payment.amountInCents,

            currency:
                payment.currency,

            paymentMethodType:
                payment.paymentMethodType,

            statusMessage:
                payment.statusMessage,

            paidAt:
                payment.paidAt,

            surprise: {

                id:
                    payment.surprise.id,

                status:
                    payment.surprise.status,

                publicToken:
                    payment.surprise.publicToken
            }
        };
    }
}


module.exports = PaymentService;