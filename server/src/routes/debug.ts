import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import { clearTasks, seedTasks } from '../controllers/debugController.js';
import { grantXp, resetRpg } from '../controllers/rpgController.js';
import { seedCampaigns, clearCampaigns, completeCampaignTasks } from '../controllers/debugCampaignController.js';

const router = Router();

router.use(ensureAuth);

router.post('/clear-tasks', clearTasks);
router.post('/seed-tasks', seedTasks);
router.post('/grant-xp', grantXp);
router.post('/reset-rpg', resetRpg);

router.post('/seed-campaigns', seedCampaigns);
router.post('/clear-campaigns', clearCampaigns);
router.post('/complete-campaign-tasks', completeCampaignTasks);

export default router;
