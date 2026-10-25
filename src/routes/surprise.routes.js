const express = require('express');

const SurpriseController = require('../controllers/surprise.controller');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuthMiddleware = require('../middleware/optional-auth.middleware');

const uploadPhotos = require('../middleware/upload-photos');
const router = express.Router();

router.post('/', optionalAuthMiddleware, SurpriseController.create);
router.get('/mine', authMiddleware, SurpriseController.getMine);
router.get('/my/:id', authMiddleware, SurpriseController.getMyById);
router.put('/my/:id', authMiddleware, SurpriseController.updateMyById);
router.post('/my/:id/photos', authMiddleware, uploadPhotos.array('photos', 3), SurpriseController.uploadMySurprisePhotos);
router.delete('/my/:id/photos', authMiddleware, SurpriseController.deleteMySurprisePhoto);
router.get('/edit/:editToken', SurpriseController.getByEditToken);
router.put('/edit/:editToken', SurpriseController.updateByEditToken);
router.post('/edit/:editToken/photos', uploadPhotos.array('photos', 3), SurpriseController.uploadSurprisePhotos);
router.delete('/edit/:editToken/photos', SurpriseController.deleteSurprisePhoto);
router.get('/:publicToken', SurpriseController.getPublic);

module.exports = router;