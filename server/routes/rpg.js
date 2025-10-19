'use strict';

const express = require('express');
const router = express.Router();
const rpgController = require('../controllers/rpgController');

const { ensureAuth } = require('../middleware/auth');

router.use(ensureAuth);

router.post('/daily-reward', rpgController.claimDailyReward);
router.post('/grant-xp', rpgController.grantXp);
router.post('/reset', rpgController.resetRpg);

module.exports = router;
