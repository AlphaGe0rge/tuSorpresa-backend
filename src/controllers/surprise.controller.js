const SurpriseService = require('../services/surprise.service');

class SurpriseController {

    static async create(req, res) {

        try {

            const userId = req.user?.id ?? null;

            const result = await SurpriseService.create(req.body, userId); 

            return res.status(201).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (SurpriseController.isValidationError(error)) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error creating surprise:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to create surprise'
            });
        }
    }

    static async getMine(req, res) {

        try {

            const result = await SurpriseService.getByUserId(req.user.id);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (error.message === 'USER_REQUIRED') {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication is required'
                });
            }

            console.error('Error getting user surprises:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to get user surprises'

            });
        }
    }

    static async getMyById(req, res) {

        try {

            const {id} = req.params;

            const result = await SurpriseService.getMyById(id, req.user.id);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (error.message === 'USER_REQUIRED') {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication is required'
                });
            }

            if (error.message === 'SURPRISE_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    message: 'Surprise not found'
                });
            }

            if (error.message === 'SURPRISE_EXPIRED') { 
                return res.status(410).json({
                    success: false,
                    message: 'Surprise expired'
                });
            }

            console.error('Error getting user surprise:',error);

            return res.status(500).json({
                success: false,
                message: 'Unable to get surprise'
            });
        }
    }

    static async updateMyById(req, res) {

        try {

            const {id} = req.params;

            const result = await SurpriseService.updateMyById(id, req.user.id, req.body);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (error.message === 'USER_REQUIRED') {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication is required'
                });
            }

            if (SurpriseController.isValidationError(error)) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'SURPRISE_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    message: 'Surprise not found'
                });
            }

            if (error.message === 'SURPRISE_EXPIRED') {
                return res.status(410).json({
                    success: false,
                    message: 'Surprise expired'

                });
            }

            console.error('Error updating user surprise:', error);

            return res.status(500).json({
                success: false,
                message:'Unable to update surprise'
            });
        }
    }

    static async uploadMySurprisePhotos(req, res) {

        try {

            const {id} = req.params;

            const result = await SurpriseService.uploadPhotosByUser(id, req.user.id, req.files);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                USER_REQUIRED: 401,
                SURPRISE_NOT_FOUND: 404,
                SURPRISE_EXPIRED: 410,
                PHOTOS_REQUIRED: 400,
                TOO_MANY_PHOTOS: 400,
                INVALID_PHOTO_TYPE:400
            };

            return res.status(statusCodes[error.message] || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async deleteMySurprisePhoto(req, res) {

        try {

            const {id} = req.params;

            const {key} = req.body;

            const result = await SurpriseService.deletePhotoByUser(id, req.user.id, key);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                USER_REQUIRED: 401,
                SURPRISE_NOT_FOUND: 404,
                SURPRISE_EXPIRED: 410,
                PHOTO_NOT_FOUND: 404
            };

            return res.status(statusCodes[error.message] || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getPublic(req, res) {

        try {

            const {publicToken} = req.params;

            const result = await SurpriseService.getPublic(publicToken);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            
            if (error.message === 'SURPRISE_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    message: 'Surprise not found'
                });
            }

            if (error.message === 'SURPRISE_EXPIRED') {
                return res.status(410).json({
                    success: false,
                    message: 'Surprise expired'
                });
            }

            console.error('Error getting public surprise:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to get surprise'
            });
        }
    }

    static async getByEditToken(req, res) {

        try {

            const {editToken} = req.params;

            const result = await SurpriseService.getByEditToken(editToken);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (error.message === 'SURPRISE_NOT_FOUND') {

                return res.status(404).json({
                    success: false,
                    message: 'Surprise not found'
                });
            }

            if (error.message === 'SURPRISE_EXPIRED') {
                return res.status(410).json({
                    success: false,
                    message: 'Surprise expired'

                });
            }

            console.error('Error getting surprise by edit token:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to get surprise'
            });
        }
    }

    static async updateByEditToken(req, res) {

        try {

            const {editToken} = req.params;

            const result = await SurpriseService.updateByEditToken(editToken, req.body);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            if (SurpriseController.isValidationError(error)) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'SURPRISE_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    message: 'Surprise not found'
                });
            }

            if (error.message === 'SURPRISE_EXPIRED') {
                return res.status(410).json({
                    success: false,
                    message: 'Surprise expired'
                });
            }

            console.error('Error updating surprise:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update surprise'
            });
        }
    }

    static async uploadSurprisePhotos(req, res) {

        try {

            const {editToken} = req.params;

            const result = await SurpriseService.uploadPhotos(editToken, req.files);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                SURPRISE_NOT_FOUND: 404,
                SURPRISE_EXPIRED:410,
                PHOTOS_REQUIRED: 400,
                TOO_MANY_PHOTOS: 400,
                INVALID_PHOTO_TYPE: 400
            };

            return res.status(statusCodes[error.message] || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async deleteSurprisePhoto(req, res) {

        try {

            const {editToken} = req.params;

            const {key} = req.body;

            const result = await SurpriseService.deletePhoto(editToken, key);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {

            const statusCodes = {
                SURPRISE_NOT_FOUND: 404,
                SURPRISE_EXPIRED: 410,
                PHOTO_NOT_FOUND: 404
            };

            return res.status(statusCodes[error.message] || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    static isValidationError(error) {

        const validationErrors = [
            'INVALID_DATA',
            'TEMPLATE_REQUIRED',
            'INVALID_TEMPLATE',
            'RECIPIENT_NAME_REQUIRED',
            'INVALID_RECIPIENT_NAME',
            'TITLE_REQUIRED',
            'INVALID_TITLE',
            'MESSAGE_REQUIRED',
            'INVALID_MESSAGE',
            'INVALID_SENDER_NAME',
            'INVALID_EMAIL',
            'EMAIL_REQUIRED',
            'INVALID_PHOTOS',
            'TOO_MANY_PHOTOS',
            'INVALID_DYNAMIC_DATA'
        ];

        return validationErrors.includes(error.message);
    }
}

module.exports = SurpriseController;