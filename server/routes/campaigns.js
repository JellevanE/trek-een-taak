'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const campaignsController = require('../controllers/campaignsController');

router.use(ensureAuth);

router.get('/', campaignsController.listCampaigns);
router.post('/', campaignsController.createCampaign);
router.get('/:id', campaignsController.getCampaign);
router.patch('/:id', campaignsController.updateCampaign);
router.delete('/:id', campaignsController.deleteCampaign);

module.exports = router;
