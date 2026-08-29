const express = require('express');

const SurpriseController = require('../controllers/surprise.controller');

const router = express.Router();

const uploadPhotos = require('../middleware/upload-photos');

router.post(
    '/',
    SurpriseController.create
);

router.get(
    '/edit/:editToken',
    SurpriseController.getByEditToken
);

router.post(
    '/edit/:editToken/photos',
    uploadPhotos.array('photos', 3),
    SurpriseController.uploadSurprisePhotos
);

router.delete('/edit/:editToken/photos', SurpriseController.deleteSurprisePhoto);

router.put(
    '/edit/:editToken',
    SurpriseController.updateByEditToken
);

router.get(
    '/:publicToken',
    SurpriseController.getPublic
);

module.exports = router;