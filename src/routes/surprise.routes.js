const express = require('express');

const SurpriseController =
    require('../controllers/surprise.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const optionalAuthMiddleware =
    require('../middleware/optional-auth.middleware');

const uploadPhotos =
    require('../middleware/upload-photos');

const router =
    express.Router();


// ============================================================
// CREATE
// ============================================================

// Puede crear:
// - Usuario autenticado
// - Invitado
router.post(
    '/',
    optionalAuthMiddleware,
    SurpriseController.create
);


// ============================================================
// AUTHENTICATED USER
// ============================================================

// Obtener mis sorpresas
router.get(
    '/mine',
    authMiddleware,
    SurpriseController.getMine
);


// Obtener una de mis sorpresas
router.get(
    '/my/:id',
    authMiddleware,
    SurpriseController.getMyById
);


// Actualizar una de mis sorpresas
router.put(
    '/my/:id',
    authMiddleware,
    SurpriseController.updateMyById
);


// Subir fotos a una de mis sorpresas
router.post(
    '/my/:id/photos',
    authMiddleware,
    uploadPhotos.array('photos', 3),
    SurpriseController.uploadMySurprisePhotos
);


// Eliminar foto de una de mis sorpresas
router.delete(
    '/my/:id/photos',
    authMiddleware,
    SurpriseController.deleteMySurprisePhoto
);


// ============================================================
// EDIT TOKEN
// ============================================================

// Obtener sorpresa mediante editToken
router.get(
    '/edit/:editToken',
    SurpriseController.getByEditToken
);


// Actualizar sorpresa mediante editToken
router.put(
    '/edit/:editToken',
    SurpriseController.updateByEditToken
);


// Subir fotos mediante editToken
router.post(
    '/edit/:editToken/photos',
    uploadPhotos.array('photos', 3),
    SurpriseController.uploadSurprisePhotos
);


// Eliminar foto mediante editToken
router.delete(
    '/edit/:editToken/photos',
    SurpriseController.deleteSurprisePhoto
);


// ============================================================
// PUBLIC
// ============================================================

// Ver sorpresa públicamente
router.get(
    '/:publicToken',
    SurpriseController.getPublic
);


module.exports =
    router;