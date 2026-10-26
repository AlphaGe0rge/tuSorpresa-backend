const crypto = require('crypto');

const {Payment, Surprise} = require('../models');

const WompiService = require('./wompi.service');
const EmailService = require('./email.service');

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
        
        const surprise = await Surprise.findByPk(surpriseId);

        if (!surprise) throw new Error('SURPRISE_NOT_FOUND');

        await this.authorizeSurpriseAccess({surprise, userId, editToken});

        if (surprise.status === 'ACTIVE') {
            throw new Error('SURPRISE_ALREADY_PAID');
        }

        if (surprise.status === 'EXPIRED') {
            throw new Error('SURPRISE_EXPIRED');
        }

        if (surprise.status !== 'PENDING_PAYMENT') {
            throw new Error('SURPRISE_NOT_PENDING_PAYMENT');
        }

        const planDetails = this.getPlanDetails(plan);
        const priceCop = planDetails.priceCop;
        const amountInCents = priceCop * 100;

        const reference = `SURPRISE-${surprise.id}-${crypto.randomUUID()}`;

        const signature = WompiService.generateIntegritySignature({
            reference,
            amountInCents,
            currency: 'COP'
        });

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

    static async authorizeSurpriseAccess({surprise, userId = null, editToken = null}) {

        if (userId) {

            if (surprise.userId !== userId) throw new Error('SURPRISE_NOT_FOUND');

            return true;
        }

        if (!editToken) throw new Error('PAYMENT_AUTH_REQUIRED');

        const validToken = await Surprise.verifyEditToken(editToken, surprise.editTokenHash);

        if (!validToken) throw new Error('PAYMENT_AUTH_REQUIRED'); 

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

        if (!payment) throw new Error('PAYMENT_NOT_FOUND');
        
        await this.applyTransaction(payment, transaction);
    }

    static async applyTransaction(payment, transaction) {

        if (transaction.currency !== payment.currency) {
            throw new Error('INVALID_PAYMENT_CURRENCY');
        }

        if (Number(transaction.amount_in_cents) !== Number(payment.amountInCents)) {
            throw new Error('INVALID_PAYMENT_AMOUNT');
        }
        
        if (transaction.reference !== payment.reference) {
            throw new Error('INVALID_PAYMENT_REFERENCE');
        }

        const previousStatus = payment.status;

        payment.wompiTransactionId = transaction.id;
        payment.status = transaction.status;
        payment.paymentMethodType = transaction.payment_method_type || null;
        payment.statusMessage = transaction.status_message || null;

        if (transaction.status === 'APPROVED') {

            payment.paidAt = payment.paidAt || new Date();

            await payment.save();

            if (payment.surprise.status !== 'ACTIVE') {

                const expiresAt = payment.durationDays === null ? null : new Date(payment.paidAt.getTime() + payment.durationDays * 24 * 60 * 60 * 1000);

                await payment.surprise.update({
                    status: 'ACTIVE',
                    expiresAt
                });
            }

            if (previousStatus !== 'APPROVED') {

                try {

                    await EmailService .sendSurpriseCreated({
                        email: payment.surprise.email,
                        recipientName: payment.surprise.recipientName,
                        publicToken: payment.surprise.publicToken,
                        editToken: null
                    });

                } catch (error) {
                    console.error('Unable to send paid surprise email:', error);
                }
            }

        } else {

            await payment.save();

            if (transaction.status === 'VOIDED') {
                await payment.surprise.update({status: 'DISABLED'});
            }
        }
    }

    static toStatusResponse(payment) {
        return {
            paymentId: payment.id,
            reference: payment.reference,
            status: payment.status,
            amountInCents: payment.amountInCents,
            currency: payment.currency,
            paymentMethodType: payment.paymentMethodType,
            statusMessage: payment.statusMessage,
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