const router = require('express').Router();

const controller = require('../controllers/health.controllers');

router.get('/', controller.checkServer);

router.get('/db', controller.checkDatabase);

module.exports = router;
