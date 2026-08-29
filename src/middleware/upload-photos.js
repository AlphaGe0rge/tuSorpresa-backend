// middleware/upload-photos.js

const multer = require('multer');

const storage = multer.memoryStorage();

const uploadPhotos = multer({
    storage,

    limits: {
        files: 3,
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error('INVALID_PHOTO_TYPE')
            );
        }

        callback(null, true);
    }
});

module.exports = uploadPhotos;