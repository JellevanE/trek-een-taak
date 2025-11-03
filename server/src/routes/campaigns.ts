import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import {
    createCampaign,
    deleteCampaign,
    getCampaign,
    listCampaigns,
    updateCampaign
} from '../controllers/campaignsController.js';

const router = Router();

router.use(ensureAuth);

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.patch('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

export default router;
