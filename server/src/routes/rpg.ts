import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import { claimDailyReward, grantXp, resetRpg } from '../controllers/rpgController.js';

const router = Router();

router.use(ensureAuth);

router.post('/daily-reward', claimDailyReward);
router.post('/grant-xp', grantXp);
router.post('/reset', resetRpg);

export default router;
