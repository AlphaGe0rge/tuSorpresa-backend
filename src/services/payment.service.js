const crypto = require('crypto');

const {Payment, Surprise} = require('../models');

const WompiService = require('./wompi.service');
const EmailService = require('./email.service');
const QrCardService = require('./qr-card.service');
const SurpriseService = require('./surprise.service');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

class PaymentService {

    static getPlanDetails(plan) {

        const plans = {
            '30-days': {
                priceCop: 19990,
                durationDays: 30
            },
            permanent: {
                priceCop: 48990,
                durationDays: null
            },
            'permanent-upgrade': {
                priceCop: 35000,
                durationDays: null
            }
        };

        const selectedPlan = plans[plan];

        if (!selectedPlan) {
            throw new Error('INVALID_SURPRISE_PLAN');
        }

        return selectedPlan;
    }

    
    static async createPayment(surpriseId, plan, userId = null, editToken = null) {

        if (!surpriseId) throw new Error('SURPRISE_ID_REQUIRED');

        const planDetails = this.getPlanDetails(plan);

        const result = await sequelize.transaction(async (transaction) => {
            const surprise = await Surprise.findByPk(surpriseId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!surprise) throw new Error('SURPRISE_NOT_FOUND');

            await this.authorizeSurpriseAccess({
                surprise,
                userId,
                editToken
            });

            await SurpriseService.refreshLifecycle(surprise, transaction);

            if (plan === 'permanent-upgrade') {
                if (
                    surprise.status !== 'EXPIRED' ||
                    !surprise.gracePeriodEndsAt ||
                    new Date() > new Date(surprise.gracePeriodEndsAt)
                ) {
                    throw new Error('SURPRISE_EXPIRED');
                }
            } else {
                if (surprise.status === 'ACTIVE') {
                    throw new Error('SURPRISE_ALREADY_PAID');
                }

                if (surprise.status === 'EXPIRED' || surprise.status === 'DISABLED') {
                    throw new Error('SURPRISE_EXPIRED');
                }

                if (surprise.status !== 'PENDING_PAYMENT') {
                    throw new Error('SURPRISE_NOT_PENDING_PAYMENT');
                }
            }

            // Evitar crear varios intentos simultáneos para la misma sorpresa.
            const pendingPayment = await Payment.findOne({
                where: {
                    surpriseId: surprise.id,
                    status: {
                        [Op.in]: ['CREATED', 'PENDING']
                    }
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (pendingPayment) {
                throw new Error('PAYMENT_IN_PROGRESS');
            }

            const amountInCents = planDetails.priceCop * 100;
            const reference = `SURPRISE-${surprise.id}-${crypto.randomUUID()}`;

            const signature = WompiService.generateIntegritySignature({
                reference,
                amountInCents,
                currency: 'COP'
            });

            const attemptNumber = await Payment.count({
                where: {
                    surpriseId: surprise.id
                },
                transaction
            }) + 1;

            const payment = await Payment.create({
                surpriseId: surprise.id,
                attemptNumber,
                provider: 'WOMPI',
                reference,
                amountInCents,
                currency: 'COP',
                status: 'CREATED',
                plan,
                durationDays: planDetails.durationDays
            }, {
                transaction
            });

            return {
                paymentId: payment.id,
                reference,
                amountInCents,
                currency: 'COP',
                publicKey: process.env.WOMPI_PUBLIC_KEY,
                signature,
                redirectUrl: process.env.WOMPI_REDIRECT_URL
            };
        });

        return result;

    }

    static async authorizeSurpriseAccess({surprise, userId = null, editToken = null}) {

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        if (userId != null) {

            if (String(surprise.userId) !== String(userId)) {
                throw new Error('SURPRISE_NOT_FOUND');
            }

            return true;
        }

        if (typeof editToken !== 'string' ||  !editToken || !surprise.editTokenHash) {
            throw new Error('PAYMENT_AUTH_REQUIRED');
        }

        const providedHash = SurpriseService.hashEditToken(editToken);

        const providedBuffer = Buffer.from(providedHash, 'hex');

        const storedBuffer = Buffer.from(surprise.editTokenHash, 'hex');

        if (providedBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(providedBuffer, storedBuffer)) {
            throw new Error('PAYMENT_AUTH_REQUIRED');
        }

        return true;
    }

    static async getPaymentStatus(paymentId, userId = null, editToken = null) {

        if (!paymentId) throw new Error('PAYMENT_ID_REQUIRED');
        
        const payment = await Payment.findOne({
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

        if (!payment) throw new Error('PAYMENT_NOT_FOUND');
        
        await this.authorizeSurpriseAccess({
            surprise: payment.surprise,
            userId,
            editToken
        });

        return this.toStatusResponse(payment);
    }

    static async syncWompiTransaction(transactionId, userId = null, editToken = null) {

        if (!transactionId) throw new Error('TRANSACTION_ID_REQUIRED');
        
        const transaction = await WompiService.getTransaction(transactionId);

        if (!transaction) throw new Error('WOMPI_TRANSACTION_NOT_FOUND');
        
        const payment = await Payment.findOne({
            where: {
                reference: transaction.reference
            },
            include: [
                {
                    model: Surprise,
                    as: 'surprise'
                }
            ]
        });

        if (!payment) throw new Error('PAYMENT_NOT_FOUND');        

        await this.authorizeSurpriseAccess({
            surprise: payment.surprise,
            userId,
            editToken
        });

        await this.applyTransaction(payment, transaction);

        await payment.reload({
            include: [
                {
                    model: Surprise,
                    as: 'surprise'
                }
            ]
        });

        return this.toStatusResponse(payment);
    }

    static async processWompiWebhook(event, headerChecksum) {

        if (event?.event !== 'transaction.updated') return;
        
        const expectedEnvironment = process.env.WOMPI_ENV === 'production' ? 'prod' : 'test';

        if (event.environment && event.environment !== expectedEnvironment) {
            throw new Error('INVALID_WOMPI_ENVIRONMENT');
        }

        const validSignature = WompiService.validateEventSignature(event);

        if (!validSignature) throw new Error('INVALID_WOMPI_SIGNATURE');
        
        if (!WompiService.validateEventHeader(event, headerChecksum)) {
            throw new Error('INVALID_WOMPI_HEADER_SIGNATURE');
        }

        const transaction = event.data?.transaction;

        if (!transaction) throw new Error('INVALID_WOMPI_EVENT');
        
        const payment = await Payment.findOne({
            where: {
                reference: transaction.reference
            },
            include: [
                {
                    model: Surprise,
                    as: 'surprise'
                }
            ]
        });

        if (!payment) throw new Error('PAYMENT_NOT_FOUND');
        
        await this.applyTransaction(payment, transaction);
    }

    static async applyTransaction(payment, wompiTransaction) {

        const allowedStatuses = [
            'PENDING',
            'APPROVED',
            'DECLINED',
            'VOIDED',
            'ERROR'
        ];

        // Validaciones de la respuesta de Wompi.
        if (!allowedStatuses.includes(wompiTransaction.status)) {
            throw new Error('INVALID_WOMPI_TRANSACTION_STATUS');
        }

        if (wompiTransaction.currency !== payment.currency) {
            throw new Error('INVALID_PAYMENT_CURRENCY');
        }

        if (
            Number(wompiTransaction.amount_in_cents) !==
            Number(payment.amountInCents)
        ) {
            throw new Error('INVALID_PAYMENT_AMOUNT');
        }

        if (wompiTransaction.reference !== payment.reference) {
            throw new Error('INVALID_PAYMENT_REFERENCE');
        }

        if (!wompiTransaction.id) {
            throw new Error('WOMPI_TRANSACTION_ID_REQUIRED');
        }

        if (
            payment.wompiTransactionId &&
            payment.wompiTransactionId !== wompiTransaction.id
        ) {
            throw new Error('WOMPI_TRANSACTION_ID_MISMATCH');
        }

        const surpriseId = payment.surpriseId;

        const result = await sequelize.transaction(async (dbTransaction) => {

            const surprise = await Surprise.findByPk(surpriseId, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE
            });

            if (!surprise) {
                throw new Error('SURPRISE_NOT_FOUND');
            }

            const lockedPayment = await Payment.findByPk(payment.id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE
            });

            if (!lockedPayment) {
                throw new Error('PAYMENT_NOT_FOUND');
            }

            if (lockedPayment.reference !== wompiTransaction.reference) {
                throw new Error('INVALID_PAYMENT_REFERENCE');
            }

            if (lockedPayment.wompiTransactionId && lockedPayment.wompiTransactionId !== wompiTransaction.id) {
                throw new Error('WOMPI_TRANSACTION_ID_MISMATCH');
            }

            const previousStatus = lockedPayment.status;

            // No permitir que una notificación antigua cambie un pago aprobado.
            if (previousStatus === 'APPROVED' && wompiTransaction.status !== 'APPROVED') {
                return {
                    shouldSendCreationEmail: false
                };
            }

            // Un pago ya aprobado no debe procesarse nuevamente.
            if (previousStatus === 'APPROVED' && wompiTransaction.status === 'APPROVED') {
                return {
                    shouldSendCreationEmail: false
                };
            }

            lockedPayment.wompiTransactionId = wompiTransaction.id;
            lockedPayment.status = wompiTransaction.status;
            lockedPayment.paymentMethodType = wompiTransaction.payment_method_type || null;
            lockedPayment.statusMessage = wompiTransaction.status_message || null;

            lockedPayment.failureReason = [
                'DECLINED',
                'ERROR',
                'VOIDED'
            ].includes(wompiTransaction.status)
                ? (wompiTransaction.status_message || wompiTransaction.status)
                : null;

            if (wompiTransaction.status !== 'APPROVED') {
                await lockedPayment.save({transaction: dbTransaction});

                return {
                    shouldSendCreationEmail: false
                };
            }

            lockedPayment.paidAt = lockedPayment.paidAt || new Date();

            await lockedPayment.save({
                transaction: dbTransaction
            });

            if (lockedPayment.plan === '30-days' && Number(lockedPayment.durationDays) !== 30) {
                throw new Error('INVALID_PAYMENT_PLAN');
            }

            if (['permanent', 'permanent-upgrade'].includes(lockedPayment.plan) && lockedPayment.durationDays !== null) {
                throw new Error('INVALID_PAYMENT_PLAN');
            }

            const isAlreadyPermanent = surprise.status === 'ACTIVE' && surprise.expiresAt === null;

            if (isAlreadyPermanent && lockedPayment.plan !== 'permanent-upgrade') {
                console.warn(
                    `La sorpresa ${surprise.id} ya es permanente. ` +
                    `No se aplicará nuevamente el pago ${lockedPayment.id}.`
                );

                return {
                    shouldSendCreationEmail: false
                };
            }

            if (lockedPayment.plan === 'permanent-upgrade') {

                const deadline = surprise.gracePeriodEndsAt;
                const paymentCreatedAt = new Date(lockedPayment.createdAt);

                if (!deadline || paymentCreatedAt > new Date(deadline)) {
                    console.error(
                        `Recuperación fuera del periodo permitido. ` +
                        `Payment: ${lockedPayment.id}`
                    );

                    return {
                        shouldSendCreationEmail: false
                    };
                }
            } else {

                if (surprise.status !== 'PENDING_PAYMENT') {

                    console.warn(
                        `El pago ${lockedPayment.id} fue aprobado, ` +
                        `pero la sorpresa ${surprise.id} ya no está ` +
                        `en estado PENDING_PAYMENT.`
                    );

                    return {
                        shouldSendCreationEmail: false
                    };
                }
            }

            const expiresAt = lockedPayment.durationDays === null ? null : new Date(lockedPayment.paidAt.getTime() + lockedPayment.durationDays * 24 * 60 * 60 * 1000);

            const gracePeriodEndsAt = expiresAt ? new Date(expiresAt.getTime() + 20 * 24 * 60 * 60 * 1000): null;

            await surprise.update({
                status: 'ACTIVE',
                expiresAt,
                gracePeriodEndsAt
            }, {
                transaction: dbTransaction
            });

            return {
                shouldSendCreationEmail: lockedPayment.plan !== 'permanent-upgrade'
            };
        });

        if (!result.shouldSendCreationEmail) {
            return;
        }

        try {
            const updatedSurprise = await Surprise.findByPk(surpriseId);

            const frontendUrl = process.env.FRONTEND_URL;
            const publicUrl = `${frontendUrl}/sorpresa/${updatedSurprise.publicToken}`;

            const qrBuffer = await QrCardService.generateCard(
                publicUrl,
                updatedSurprise.template
            );

            await EmailService.sendSurpriseCreated({
                email: updatedSurprise.email,
                senderName: updatedSurprise.senderName,
                publicToken: updatedSurprise.publicToken,
                qrBuffer
            });

        } catch (error) {
            console.error(
                'Unable to send paid surprise email:',
                error
            );
        }
    }

    static toStatusResponse(payment) {
        return {
            paymentId: payment.id,
            reference: payment.reference,
            attemptNumber: payment.attemptNumber,
            status: payment.status,
            amountInCents: payment.amountInCents,
            currency: payment.currency,
            paymentMethodType: payment.paymentMethodType,
            statusMessage: payment.statusMessage,
            failureReason: payment.failureReason,
            paidAt: payment.paidAt,
            surprise: {
                id: payment.surprise.id,
                status: payment.surprise.status,
                publicToken: payment.surprise.publicToken
            }
        };
    }
}

module.exports = PaymentService;