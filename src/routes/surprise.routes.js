const express = require('express');

const SurpriseController =
    require('../controllers/surprise.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const router = express.Router();

const uploadPhotos =
    require('../middleware/upload-photos');


// ============================================================
// AUTHENTICATED
// ============================================================

// Crear sorpresa
router.post(
    '/',
    authMiddleware,
    SurpriseController.create
);


// Obtener mis sorpresas
//
// IMPORTANTE:
// Esta ruta debe estar ANTES de /:publicToken
// para que "mine" no sea interpretado como publicToken.
router.get(
    '/mine',
    authMiddleware,
    SurpriseController.getMine
);


// ============================================================
// EDIT TOKEN
// ============================================================

router.get(
    '/edit/:editToken',
    SurpriseController.getByEditToken
);


router.post(
    '/edit/:editToken/photos',
    uploadPhotos.array('photos', 3),
    SurpriseController.uploadSurprisePhotos
);


router.delete(
    '/edit/:editToken/photos',
    SurpriseController.deleteSurprisePhoto
);


router.put(
    '/edit/:editToken',
    SurpriseController.updateByEditToken
);


// ============================================================
// PUBLIC
// ============================================================

router.get(
    '/:publicToken',
    SurpriseController.getPublic
);


module.exports = router;