const crypto = require('crypto');
const Surprise = require('../models/surprise.model');

class SurpriseService {

    static hashEditToken(token) {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }

    static async create(data) {

        const editToken = crypto.randomBytes(32).toString('hex');
        const publicToken = crypto.randomBytes(32).toString('hex');

        const editTokenHash = this.hashEditToken(editToken);

        const surprise = await Surprise.create({
            template: data.template,
            publicToken,
            editTokenHash,

            recipientName: data.recipientName,
            senderName: data.senderName,
            title: data.title,
            message: data.message
        });

        return {
            id: surprise.id,
            publicToken,
            editToken
        };
    }

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
                'expiresAt'
            ]
        });

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        return surprise;
    }

    static async getByEditToken(editToken) {

        const editTokenHash = this.hashEditToken(editToken);

        const surprise = await Surprise.findOne({
            where: {
                edit_token_hash: editTokenHash
            }
        });

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        return {
            id: surprise.id,
            template: surprise.template,
            recipientName: surprise.recipientName,
            senderName: surprise.senderName,
            title: surprise.title,
            message: surprise.message,
            publicToken: surprise.publicToken,
            createdAt: surprise.createdAt,
            updatedAt: surprise.updatedAt,
            expiresAt: surprise.expiresAt
        };
    }

    static async updateByEditToken(editToken, data) {

        const editTokenHash = this.hashEditToken(editToken);

        const surprise = await Surprise.findOne({
            where: {
                editTokenHash
            }
        });

        if (!surprise) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        await surprise.update({
            template: data.template,
            recipientName: data.recipientName,
            senderName: data.senderName,
            title: data.title,
            message: data.message
        });

        return {
            id: surprise.id,
            template: surprise.template,
            recipientName: surprise.recipientName,
            senderName: surprise.senderName,
            title: surprise.title,
            message: surprise.message,
            publicToken: surprise.publicToken,
            updatedAt: surprise.updatedAt,
            expiresAt: surprise.expiresAt
        };
    }
}

module.exports = SurpriseService;