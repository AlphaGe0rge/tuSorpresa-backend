const SurpriseService = require('../services/surprise.service');

class SurpriseController {

    static async create(req, res) {

        try {

            const result = await SurpriseService.create(req.body);

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


    static async getPublic(req, res) {

        try {

            const { publicToken } = req.params;

            const result =
                await SurpriseService.getPublic(publicToken);

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

            const { editToken } = req.params;

            const result =
                await SurpriseService.getByEditToken(editToken);

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

            console.error(
                'Error getting surprise by edit token:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to get surprise'
            });
        }
    }


    static async updateByEditToken(req, res) {

        try {

            const { editToken } = req.params;

            const result =
                await SurpriseService.updateByEditToken(
                    editToken,
                    req.body
                );

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

            console.error('Error updating surprise:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update surprise'
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

            'INVALID_SENDER_NAME'
        ];

        return validationErrors.includes(error.message);
    }
}


module.exports = SurpriseController;