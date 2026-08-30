const crypto = require('crypto');
const Surprise = require('../models/surprise.model');
const R2Service = require('./r2.service');
const EmailService = require('./email.service');

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
            recipientName: data.recipientName,
            senderName: data.senderName || null,
            email: data.email,
            photos: [],
            title: data.title || null,
            message: data.message || null,
            expiresAt: data.expiresAt || null,
            status: 'ACTIVE'
        });

        try {

            await EmailService.sendSurpriseCreated({
                email: surprise.email,
                recipientName: surprise.recipientName,
                publicToken,
                editToken
            });

        } catch (error) {

            console.error(
                'Unable to send surprise email:',
                error
            );
        }

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
                'photos',
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

    static async getByEditToken(
        editToken
    ) {

        const editTokenHash =
            this.hashEditToken(editToken);


        const surprise =
            await Surprise.findOne({

                where: {
                    editTokenHash
                }
            });


        if (!surprise) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        await this.ensureAvailable(
            surprise
        );


        return {

            id:
                surprise.id,

            template:
                surprise.template,

            recipientName:
                surprise.recipientName,

            senderName:
                surprise.senderName,
            email: surprise.email,
            title:
                surprise.title,

            message:
                surprise.message,

            photos:
                surprise.photos || [],

            publicToken:
                surprise.publicToken,

            status:
                surprise.status,

            createdAt:
                surprise.createdAt,

            updatedAt:
                surprise.updatedAt,

            expiresAt:
                surprise.expiresAt
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
            template: data.template,
            recipientName: data.recipientName,
            email: data.email,
            senderName: data.senderName || null,
            title: data.title || null,
            message: data.message || null,
            expiresAt: data.expiresAt || null
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
            photos: surprise.photos,

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

    static getExtension(filename) {
         return filename
            .split('.')
            .pop()
            ?.toLowerCase() ?? '';
    }

    static async uploadPhotos(editToken,files) {

        if (!editToken) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        if (
            !Array.isArray(files) ||
            !files.length
        ) {

            throw new Error(
                'PHOTOS_REQUIRED'
            );
        }


        if (files.length > 3) {

            throw new Error(
                'TOO_MANY_PHOTOS'
            );
        }


        const editTokenHash =
            this.hashEditToken(editToken);


        const surprise =
            await Surprise.findOne({

                where: {
                    editTokenHash
                }
            });


        if (!surprise) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        await this.ensureAvailable(
            surprise
        );


        const currentPhotos =
            Array.isArray(surprise.photos)
                ? surprise.photos
                : [];


        if (
            currentPhotos.length +
            files.length > 3
        ) {

            throw new Error(
                'TOO_MANY_PHOTOS'
            );
        }


        const uploadedPhotos = [];


        try {

            for (const file of files) {

                const extension =
                    this.getExtension(
                        file.mimetype
                    );


                const fileName =
                    `${crypto.randomUUID()}.${extension}`;


                const key =
                    `surprises/${surprise.publicToken}/${fileName}`;


                const photo =
                    await R2Service.upload(
                        key,
                        file.buffer,
                        file.mimetype
                    );


                uploadedPhotos.push(
                    photo
                );
            }


            const photos = [
                ...currentPhotos,
                ...uploadedPhotos
            ];


            await surprise.update({
                photos
            });


            return {
                photos
            };

        } catch (error) {

            /*
            * Si una subida falla después de
            * haber subido alguna foto,
            * intentamos limpiar las anteriores.
            */

            for (
                const photo
                of uploadedPhotos
            ) {

                try {

                    await R2Service.delete(
                        photo.key
                    );

                } catch (deleteError) {

                    console.error(
                        'Unable to rollback R2 photo:',
                        deleteError
                    );
                }
            }


            console.error(
                'Unable to upload surprise photos:',
                error
            );


            throw error;
        }
    }

    static async deletePhoto(editToken, photoKey) {

        if (!editToken) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        if (!photoKey) {

            throw new Error(
                'PHOTO_NOT_FOUND'
            );
        }


        const editTokenHash =
            this.hashEditToken(editToken);


        const surprise =
            await Surprise.findOne({

                where: {
                    editTokenHash
                }
            });


        if (!surprise) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        await this.ensureAvailable(
            surprise
        );


        const currentPhotos =
            Array.isArray(surprise.photos)
                ? surprise.photos
                : [];


        const photo =
            currentPhotos.find(
                item =>
                    item.key === photoKey
            );


        if (!photo) {

            throw new Error(
                'PHOTO_NOT_FOUND'
            );
        }


        await R2Service.delete(
            photo.key
        );


        const photos =
            currentPhotos.filter(
                item =>
                    item.key !== photoKey
            );


        await surprise.update({
            photos
        });


        return {
            photos
        };
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

        // ============================================================
        // EMAIL
        // ============================================================

        if (typeof data.email !== 'string') {
            throw new Error('INVALID_EMAIL');
        }

        if (!data.email.trim()) {
            throw new Error('EMAIL_REQUIRED');
        }

        if (data.email.length > 255) {
            throw new Error('INVALID_EMAIL');
        }

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(data.email.trim())) {
            throw new Error('INVALID_EMAIL');
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

        if (data.photos !== undefined && data.photos !== null && !Array.isArray(data.photos)) {
            throw new Error('INVALID_PHOTOS');
        }

        if (Array.isArray(data.photos) && data.photos.length > 3) {
            throw new Error('TOO_MANY_PHOTOS');
        }
    }
}


module.exports = SurpriseService;