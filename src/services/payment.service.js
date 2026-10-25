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

    static getPlanDetails(plan) {

        const plans = {
            '30-days': {
                priceCop: 19990,
                durationDays: 30
            },
            permanent: {
                priceCop: 48990,
                durationDays: null
            }
        };

        const selectedPlan = plans[plan];

        if (!selectedPlan) {
            throw new Error('INVALID_SURPRISE_PLAN');
        }

        return selectedPlan;
    }

    // ============================================================
    // CREATE PAYMENT
    // ============================================================

    static async createPayment(
        surpriseId,
        plan,
        userId = null,
        editToken = null
    ) {

        if (!surpriseId) {
            throw new Error(
                'SURPRISE_ID_REQUIRED'
            );
        }


        // --------------------------------------------------------
        // Buscar sorpresa
        // --------------------------------------------------------

        const surprise =
            await Surprise.findByPk(
                surpriseId
            );


        if (!surprise) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        // --------------------------------------------------------
        // Authorization
        // --------------------------------------------------------

        await this.authorizeSurpriseAccess({
            surprise,
            userId,
            editToken
        });


        // --------------------------------------------------------
        // Estado
        // --------------------------------------------------------

        if (surprise.status === 'ACTIVE') {
            throw new Error('SURPRISE_ALREADY_PAID');
        }

        if (surprise.status === 'EXPIRED') {
            throw new Error('SURPRISE_EXPIRED');
        }

        if (surprise.status !== 'PENDING_PAYMENT') {
            throw new Error('SURPRISE_NOT_PENDING_PAYMENT');
        }


        // --------------------------------------------------------
        // Price
        // --------------------------------------------------------

        /*
         * El precio SIEMPRE sale del backend.
         *
         * Nunca recibimos amount desde Angular.
         */
        const planDetails = this.getPlanDetails(plan);
        const priceCop = planDetails.priceCop;
        const amountInCents = priceCop * 100;

        // --------------------------------------------------------
        // Reference
        // --------------------------------------------------------

        const reference =
            `SURPRISE-${surprise.id}-${crypto.randomUUID()}`;


        // --------------------------------------------------------
        // Integrity signature
        // --------------------------------------------------------

        console.log({
            hasPublicKey: Boolean(process.env.WOMPI_PUBLIC_KEY),
            publicKeyPrefix: process.env.WOMPI_PUBLIC_KEY?.split('_').slice(0, 2).join('_'),
            hasIntegritySecret: Boolean(process.env.WOMPI_INTEGRITY_SECRET),
            integritySecretPrefix: process.env.WOMPI_INTEGRITY_SECRET?.split('_').slice(0, 2).join('_'),
            baseUrl: WompiService.getBaseUrl()
        });

        const signature = WompiService.generateIntegritySignature({
            reference,
            amountInCents,
            currency: 'COP'
        });

        console.log({
            reference,
            amountInCents,
            currency: 'COP',
            signatureLength: signature.length,
            signatureFormat: /^[a-f0-9]{64}$/i.test(signature)
        });

        // Create payment
        const payment = await Payment.create({
            surpriseId: surprise.id,
            provider: 'WOMPI',
            reference,
            amountInCents,
            currency: 'COP',
            status: 'PENDING',
            plan,
            durationDays: planDetails.durationDays
        });

        // Response
        return {
            paymentId: payment.id,
            reference,
            amountInCents,
            currency: 'COP',
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            signature,
            redirectUrl: process.env.WOMPI_REDIRECT_URL
        };
    }

    // AUTHORIZE SURPRISE ACCESS
    static async authorizeSurpriseAccess({surprise, userId = null, editToken = null}) {

        // --------------------------------------------------------
        // Registered user
        // --------------------------------------------------------

        if (userId) {

            if (
                surprise.userId !== userId
            ) {
                throw new Error(
                    'SURPRISE_NOT_FOUND'
                );
            }

            return true;
        }


        // --------------------------------------------------------
        // Guest
        // --------------------------------------------------------

        if (!editToken) {
            throw new Error(
                'PAYMENT_AUTH_REQUIRED'
            );
        }


        const validToken =
            await Surprise.verifyEditToken(
                editToken,
                surprise.editTokenHash
            );


        if (!validToken) {
            throw new Error(
                'PAYMENT_AUTH_REQUIRED'
            );
        }


        return true;
    }


    // ============================================================
    // GET PAYMENT STATUS
    // ============================================================

    static async getPaymentStatus(
        paymentId,
        userId = null,
        editToken = null
    ) {

        if (!paymentId) {
            throw new Error(
                'PAYMENT_ID_REQUIRED'
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
                        as: 'surprise'
                    }
                ]
            });


        if (!payment) {
            throw new Error(
                'PAYMENT_NOT_FOUND'
            );
        }


        // --------------------------------------------------------
        // Authorization
        // --------------------------------------------------------

        await this.authorizeSurpriseAccess({
            surprise: payment.surprise,
            userId,
            editToken
        });


        return this.toStatusResponse(
            payment
        );
    }


    // ============================================================
    // SYNC FROM WOMPI TRANSACTION
    // ============================================================

    static async syncWompiTransaction(
        transactionId,
        userId = null,
        editToken = null
    ) {

        if (!transactionId) {
            throw new Error(
                'TRANSACTION_ID_REQUIRED'
            );
        }


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


        // --------------------------------------------------------
        // Authorization
        // --------------------------------------------------------

        await this.authorizeSurpriseAccess({
            surprise: payment.surprise,
            userId,
            editToken
        });


        // --------------------------------------------------------
        // Apply transaction
        // --------------------------------------------------------

        await this.applyTransaction(payment, transaction);

        await payment.reload({
            include: [
                {
                    model: Surprise,
                    as: 'surprise'
                }
            ]
        });


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


        // --------------------------------------------------------
        // Environment
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Event signature
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Header signature
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Transaction
        // --------------------------------------------------------

        const transaction =
            event.data?.transaction;


        if (!transaction) {
            throw new Error(
                'INVALID_WOMPI_EVENT'
            );
        }


        // --------------------------------------------------------
        // Local payment
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Apply transaction
        // --------------------------------------------------------

        await this.applyTransaction(payment, transaction);
    }


    // ============================================================
    // APPLY WOMPI TRANSACTION
    // ============================================================

    static async applyTransaction(payment, transaction) {

        /*
         * Nunca confiamos únicamente
         * en status.
         */

        // --------------------------------------------------------
        // Currency
        // --------------------------------------------------------

        if (
            transaction.currency !==
            payment.currency
        ) {

            throw new Error(
                'INVALID_PAYMENT_CURRENCY'
            );
        }


        // --------------------------------------------------------
        // Amount
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Reference
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Update payment
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // APPROVED
        // --------------------------------------------------------

        if (
            transaction.status ===
            'APPROVED'
        ) {

            payment.paidAt =
                payment.paidAt ||
                new Date();


            await payment.save();


            // ----------------------------------------------------
            // Activate surprise
            // ----------------------------------------------------

            if (payment.surprise.status !== 'ACTIVE') {

                const expiresAt = payment.durationDays === null ? null : new Date(payment.paidAt.getTime() + payment.durationDays * 24 * 60 * 60 * 1000);

                await payment.surprise.update({
                    status: 'ACTIVE',
                    expiresAt
                });
            }

            // ----------------------------------------------------
            // Email
            // ----------------------------------------------------

            /*
             * Evitamos enviar nuevamente
             * el correo si Wompi repite
             * el webhook.
             */

            if (previousStatus !== 'APPROVED') {

                try {

                    await EmailService .sendSurpriseCreated({

                            email:
                                payment.surprise.email,

                            recipientName:
                                payment.surprise
                                    .recipientName,

                            publicToken:
                                payment.surprise
                                    .publicToken,

                            editToken:
                                null
                        });

                } catch (error) {

                    console.error(
                        'Unable to send paid surprise email:',
                        error
                    );
                }
            }

        } else {

            // ----------------------------------------------------
            // Other statuses
            // ----------------------------------------------------

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


module.exports =
    PaymentService;