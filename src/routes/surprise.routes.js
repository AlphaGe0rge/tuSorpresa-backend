const express = require('express');

const SurpriseController = require('../controllers/surprise.controller');

const router = express.Router();

router.post(
    '/',
    SurpriseController.create
);

router.get(
    '/edit/:editToken',
    SurpriseController.getByEditToken
);

router.put(
    '/edit/:editToken',
    SurpriseController.updateByEditToken
);

router.get(
    '/:publicToken',
    SurpriseController.getPublic
);

module.exports = router;