'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const debugController = require('../controllers/debugController');
const rpgController = require('../controllers/rpgController');

router.use(ensureAuth);

router.post('/clear-tasks', debugController.clearTasks);
router.post('/seed-tasks', debugController.seedTasks);
router.post('/grant-xp', rpgController.grantXp);
router.post('/reset-rpg', rpgController.resetRpg);

module.exports = router;

