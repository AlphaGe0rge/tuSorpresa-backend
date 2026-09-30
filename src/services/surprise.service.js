const crypto = require('crypto');

const Surprise =
    require('../models/surprise.model');

const R2Service =
    require('./r2.service');

const EmailService =
    require('./email.service');


class SurpriseService {

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


    static async create(data, userId) {

        this.validateData(data);

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        const publicToken =
            this.generateToken();

        const editToken =
            this.generateToken();

        const editTokenHash =
            this.hashEditToken(
                editToken
            );

        const surprise =
            await Surprise.create({

                userId,

                template:
                    data.template,

                publicToken,

                editTokenHash,

                recipientName:
                    data.recipientName,

                senderName:
                    data.senderName || null,

                email:
                    data.email,

                photos: [],

                dynamicData:
                    data.dynamicData || {},

                title:
                    data.title || null,

                message:
                    data.message || null,

                expiresAt:
                    data.expiresAt || null,

                status: 'ACTIVE'
            });


        try {

            await EmailService.sendSurpriseCreated({

                email:
                    surprise.email,

                recipientName:
                    surprise.recipientName,

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

            id:
                surprise.id,

            publicToken,

            editToken

        };
    }


    static async getByUserId(userId) {

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        const surprises =
            await Surprise.findAll({

                where: {
                    userId
                },

                order: [
                    ['createdAt', 'DESC']
                ],

                attributes: {
                    exclude: [
                        'editTokenHash'
                    ]
                }

            });

        return surprises;
    }


    static async getMyById(
        surpriseId,
        userId
    ) {

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        if (!surpriseId) {
            throw new Error('SURPRISE_NOT_FOUND');
        }

        const surprise =
            await Surprise.findOne({

                where: {
                    id: surpriseId,
                    userId
                },

                attributes: {
                    exclude: [
                        'editTokenHash'
                    ]
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


        return surprise;
    }


    static async updateMyById(
        surpriseId,
        userId,
        data
    ) {

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        if (!surpriseId) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
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


        await this.ensureAvailable(
            surprise
        );


        const validated =
            this.validateData(data);


        await surprise.update({

            template:
                validated.template,

            recipientName:
                validated.recipientName,

            email:
                validated.email,

            senderName:
                validated.senderName,

            title:
                validated.title,

            message:
                validated.message,

            dynamicData:
                validated.dynamicData,

            expiresAt:
                validated.expiresAt

        });


        return this.serializeSurprise(
            surprise
        );
    }


    static async getPublic(publicToken) {

        const surprise =
            await Surprise.findOne({

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
                    'dynamicData',
                    'createdAt',
                    'updatedAt',
                    'expiresAt',
                    'status'
                ]

            });


        if (!surprise) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        if (
            surprise.status ===
            'PENDING_PAYMENT'
        ) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        await this.ensureAvailable(
            surprise
        );


        return surprise;
    }


    static async getByEditToken(
        editToken
    ) {

        if (!editToken) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }

        const editTokenHash =
            this.hashEditToken(
                editToken
            );


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


        return this.serializeSurprise(
            surprise
        );
    }


    static async updateByEditToken(
        editToken,
        data
    ) {

        if (!editToken) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        const editTokenHash =
            this.hashEditToken(
                editToken
            );


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


        const validated =
            this.validateData(data);


        await surprise.update({

            template:
                validated.template,

            recipientName:
                validated.recipientName,

            email:
                validated.email,

            senderName:
                validated.senderName,

            title:
                validated.title,

            message:
                validated.message,

            dynamicData:
                validated.dynamicData,

            expiresAt:
                validated.expiresAt

        });


        return this.serializeSurprise(
            surprise
        );
    }


    static async uploadPhotosByUser(
        surpriseId,
        userId,
        files
    ) {

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        const surprise =
            await this.findOwnedSurprise(
                surpriseId,
                userId
            );

        return this.uploadPhotosToSurprise(
            surprise,
            files
        );
    }


    static async deletePhotoByUser(
        surpriseId,
        userId,
        photoKey
    ) {

        if (!userId) {
            throw new Error('USER_REQUIRED');
        }

        const surprise =
            await this.findOwnedSurprise(
                surpriseId,
                userId
            );

        return this.deletePhotoFromSurprise(
            surprise,
            photoKey
        );
    }


    static async uploadPhotos(
        editToken,
        files
    ) {

        if (!editToken) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        const editTokenHash =
            this.hashEditToken(
                editToken
            );


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


        return this.uploadPhotosToSurprise(
            surprise,
            files
        );
    }


    static async deletePhoto(
        editToken,
        photoKey
    ) {

        if (!editToken) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        const editTokenHash =
            this.hashEditToken(
                editToken
            );


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


        return this.deletePhotoFromSurprise(
            surprise,
            photoKey
        );
    }


    static async findOwnedSurprise(
        surpriseId,
        userId
    ) {

        if (!surpriseId) {
            throw new Error(
                'SURPRISE_NOT_FOUND'
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


        await this.ensureAvailable(
            surprise
        );


        return surprise;
    }


    static async uploadPhotosToSurprise(
        surprise,
        files
    ) {

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


        await this.ensureAvailable(
            surprise
        );


        const currentPhotos =
            Array.isArray(
                surprise.photos
            )
                ? surprise.photos
                : [];


        if (
            currentPhotos.length +
            files.length >
            3
        ) {

            throw new Error(
                'TOO_MANY_PHOTOS'
            );
        }


        const uploadedPhotos = [];


        try {

            for (
                const file of files
            ) {

                const extension =
                    this.getExtension(
                        file.originalname
                    );


                if (
                    ![
                        'jpg',
                        'jpeg',
                        'png',
                        'webp',
                        'gif'
                    ].includes(extension)
                ) {

                    throw new Error(
                        'INVALID_PHOTO_TYPE'
                    );
                }


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


            throw error;
        }
    }


    static async deletePhotoFromSurprise(
        surprise,
        photoKey
    ) {

        if (!photoKey) {
            throw new Error(
                'PHOTO_NOT_FOUND'
            );
        }


        await this.ensureAvailable(
            surprise
        );


        const currentPhotos =
            Array.isArray(
                surprise.photos
            )
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


    static async ensureAvailable(
        surprise
    ) {

        if (
            surprise.status ===
            'DELETED'
        ) {

            throw new Error(
                'SURPRISE_NOT_FOUND'
            );
        }


        if (
            surprise.status ===
                'EXPIRED' ||
            this.isExpired(
                surprise
            )
        ) {

            if (
                surprise.status !==
                'EXPIRED'
            ) {

                await surprise.update({
                    status: 'EXPIRED'
                });
            }


            throw new Error(
                'SURPRISE_EXPIRED'
            );
        }
    }


    static isExpired(
        surprise
    ) {

        if (!surprise.expiresAt) {
            return false;
        }


        return (
            new Date(
                surprise.expiresAt
            ) <= new Date()
        );
    }


    static getExtension(
        filename
    ) {

        return filename
            .split('.')
            .pop()
            ?.toLowerCase() ?? '';
    }


    static serializeSurprise(
        surprise
    ) {

        return {

            id:
                surprise.id,

            template:
                surprise.template,

            recipientName:
                surprise.recipientName,

            senderName:
                surprise.senderName,

            email:
                surprise.email,

            title:
                surprise.title,

            message:
                surprise.message,

            photos:
                surprise.photos || [],

            dynamicData:
                surprise.dynamicData || {},

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


    static validateData(
        data
    ) {

        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {

            throw new Error(
                'INVALID_DATA'
            );
        }


        if (
            typeof data.template !==
            'string'
        ) {

            throw new Error(
                'TEMPLATE_REQUIRED'
            );
        }


        if (
            !data.template.trim()
        ) {

            throw new Error(
                'TEMPLATE_REQUIRED'
            );
        }


        if (
            data.template.length > 100
        ) {

            throw new Error(
                'INVALID_TEMPLATE'
            );
        }


        const AVAILABLE_TEMPLATES = [
            'love-01',
            'love-02',
            'birthday-01',
            'friendship-01',
            'invitation-01',
            'anniversary-01'
        ];


        if (
            !AVAILABLE_TEMPLATES.includes(
                data.template
            )
        ) {

            throw new Error(
                'INVALID_TEMPLATE'
            );
        }


        if (
            typeof data.recipientName !==
            'string'
        ) {

            throw new Error(
                'INVALID_RECIPIENT_NAME'
            );
        }


        if (
            !data.recipientName.trim()
        ) {

            throw new Error(
                'RECIPIENT_NAME_REQUIRED'
            );
        }


        if (
            data.recipientName.length > 100
        ) {

            throw new Error(
                'INVALID_RECIPIENT_NAME'
            );
        }


        if (
            typeof data.email !==
            'string'
        ) {

            throw new Error(
                'INVALID_EMAIL'
            );
        }


        if (
            !data.email.trim()
        ) {

            throw new Error(
                'EMAIL_REQUIRED'
            );
        }


        if (
            data.email.length > 255
        ) {

            throw new Error(
                'INVALID_EMAIL'
            );
        }


        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailRegex.test(
                data.email.trim()
            )
        ) {

            throw new Error(
                'INVALID_EMAIL'
            );
        }


        if (
            data.senderName !== undefined &&
            data.senderName !== null &&
            typeof data.senderName !== 'string'
        ) {

            throw new Error(
                'INVALID_SENDER_NAME'
            );
        }


        if (
            typeof data.senderName ===
            'string' &&
            data.senderName.length > 100
        ) {

            throw new Error(
                'INVALID_SENDER_NAME'
            );
        }


        if (
            typeof data.message !==
            'string'
        ) {

            throw new Error(
                'INVALID_MESSAGE'
            );
        }


        if (
            !data.message.trim()
        ) {

            throw new Error(
                'MESSAGE_REQUIRED'
            );
        }


        if (
            data.message.length > 10000
        ) {

            throw new Error(
                'INVALID_MESSAGE'
            );
        }


        if (
            data.photos !== undefined &&
            data.photos !== null &&
            !Array.isArray(data.photos)
        ) {

            throw new Error(
                'INVALID_PHOTOS'
            );
        }


        if (
            Array.isArray(data.photos) &&
            data.photos.length > 3
        ) {

            throw new Error(
                'TOO_MANY_PHOTOS'
            );
        }


        if (
            data.dynamicData !== undefined &&
            data.dynamicData !== null &&
            (
                typeof data.dynamicData !==
                'object' ||
                Array.isArray(
                    data.dynamicData
                )
            )
        ) {

            throw new Error(
                'INVALID_DYNAMIC_DATA'
            );
        }


        return {

            template:
                data.template.trim(),

            recipientName:
                data.recipientName.trim(),

            senderName:
                typeof data.senderName ===
                'string'
                    ? data.senderName.trim() ||
                      null
                    : null,

            email:
                data.email.trim().toLowerCase(),

            title:
                typeof data.title ===
                'string'
                    ? data.title.trim() || null
                    : null,

            message:
                data.message.trim(),

            expiresAt:
                data.expiresAt || null,

            dynamicData:
                data.dynamicData || {}
        };
    }
}


module.exports =
    SurpriseService;