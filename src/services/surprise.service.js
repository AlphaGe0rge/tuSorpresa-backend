const crypto = require('crypto');
const Surprise = require('../models/surprise.model');

class SurpriseService {

    // ============================================================
    // TOKENS
    // ============================================================

    static generateToken() {

        return crypto
            .randomBytes(32)
            .toString('hex');
    }

    static hashEditToken(token) {

        return crypto
            .createHash('sha512')
            .update(token)
            .digest('hex');
    }


    // ============================================================
    // CREATE
    // ============================================================

    static async create(data) {

        this.validateData(data);

        const publicToken =
            this.generateToken();

        const editToken =
            this.generateToken();

        const editTokenHash =
            this.hashEditToken(editToken);

        const surprise = await Surprise.create({

            template: data.template,

            publicToken,

            editTokenHash,

            recipientName:
                data.recipientName,

            senderName:
                data.senderName || null,

            title: data.title || null,
            message: data.message || null,
            expiresAt: data.expiresAt || null,
            status: 'ACTIVE'
        });

        return {

            id: surprise.id,

            publicToken,

            editToken
        };
    }


    // ============================================================
    // GET PUBLIC
    // ============================================================

    static async getPublic(publicToken) {

        const surprise = await Surprise.findOne({
            where: {
                publicToken
            },
            attributes: [
                'id',
                'template',
                'recipientName',
                'senderName',
                'title',
                'message',
                'createdAt',
                'expiresAt',
                'status'
            ]
        });

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        await this.ensureAvailable(surprise);

        return surprise;
    }

    // ============================================================
    // GET BY EDIT TOKEN
    // ============================================================

    static async getByEditToken(editToken) {

        const editTokenHash = this.hashEditToken(editToken);

        const surprise = await Surprise.findOne({
            where: {
                editTokenHash
            }
        });

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        await this.ensureAvailable(surprise);

        return {
            id: surprise.id,
            template: surprise.template,
            recipientName: surprise.recipientName,
            senderName: surprise.senderName,
            title: surprise.title,
            message: surprise.message,
            publicToken: surprise.publicToken,
            status: surprise.status,
            createdAt: surprise.createdAt,
            updatedAt: surprise.updatedAt,
            expiresAt: surprise.expiresAt
        };
    }

    // ============================================================
    // UPDATE BY EDIT TOKEN
    // ============================================================

    static async updateByEditToken(editToken, data) {

        if (!editToken) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }

        this.validateData(data);

        const editTokenHash = this.hashEditToken(editToken);

        const surprise = await Surprise.findOne({

            where: {
                editTokenHash
            }
        });

        if (!surprise) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }

        await this.ensureAvailable(surprise);

        await surprise.update({

            template:
                data.template,

            recipientName:
                data.recipientName,

            senderName:
                data.senderName || null,

            title:
                data.title || null,

            message:
                data.message || null,

            expiresAt:
                data.expiresAt || null
        });

        return {

            id: surprise.id,

            template:
                surprise.template,

            recipientName:
                surprise.recipientName,

            senderName:
                surprise.senderName,

            title:
                surprise.title,

            message:
                surprise.message,

            publicToken:
                surprise.publicToken,

            updatedAt:
                surprise.updatedAt,

            expiresAt:
                surprise.expiresAt
        };
    }


    static async ensureAvailable(surprise) {

        if (surprise.status === 'DELETED') {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        if (
            surprise.status === 'EXPIRED' || this.isExpired(surprise)
        ) {

            if (surprise.status !== 'EXPIRED') {

                await surprise.update({
                    status: 'EXPIRED'
                });
            }

            throw new Error('SURPRISE_EXPIRED');
        }
    }
    
    static isExpired(surprise) {

        if (!surprise.expiresAt) {
            return false;
        }

        return new Date(surprise.expiresAt) <= new Date();
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    static validateData(data) {

        if (!data || typeof data !== 'object') {
            throw new Error('INVALID_DATA');
        }

        // ------------------------------------------------------------
        // TEMPLATE
        // ------------------------------------------------------------

        if (typeof data.template !== 'string') {
            throw new Error('TEMPLATE_REQUIRED');
        }

        if (!data.template.trim()) {
            throw new Error('TEMPLATE_REQUIRED');
        }

        if (data.template.length > 100) {
            throw new Error('INVALID_TEMPLATE');
        }

        const AVAILABLE_TEMPLATES = [
            'love-01',
            'birthday-01',
            'friendship-01'
        ];

        if (!AVAILABLE_TEMPLATES.includes(data.template)) {
            throw new Error('INVALID_TEMPLATE');
        }


        // ------------------------------------------------------------
        // RECIPIENT
        // ------------------------------------------------------------

        if (typeof data.recipientName !== 'string') {
            throw new Error('INVALID_RECIPIENT_NAME');
        }

        if (!data.recipientName.trim()) {
            throw new Error('RECIPIENT_NAME_REQUIRED');
        }

        if (data.recipientName.length > 100) {
            throw new Error('INVALID_RECIPIENT_NAME');
        }


        // ------------------------------------------------------------
        // SENDER
        // ------------------------------------------------------------

        if (
            data.senderName !== undefined &&
            data.senderName !== null &&
            typeof data.senderName !== 'string'
        ) {
            throw new Error('INVALID_SENDER_NAME');
        }

        if (
            typeof data.senderName === 'string' &&
            data.senderName.length > 100
        ) {
            throw new Error('INVALID_SENDER_NAME');
        }


        // ------------------------------------------------------------
        // TITLE
        // ------------------------------------------------------------

        if (typeof data.title !== 'string') {
            throw new Error('INVALID_TITLE');
        }

        if (!data.title.trim()) {
            throw new Error('TITLE_REQUIRED');
        }

        if (data.title.length > 150) {
            throw new Error('INVALID_TITLE');
        }


        // ------------------------------------------------------------
        // MESSAGE
        // ------------------------------------------------------------

        if (typeof data.message !== 'string') {
            throw new Error('INVALID_MESSAGE');
        }

        if (!data.message.trim()) {
            throw new Error('MESSAGE_REQUIRED');
        }

        if (data.message.length > 10000) {
            throw new Error('INVALID_MESSAGE');
        }
    }
}


module.exports = SurpriseService;