import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import { clearTasks, seedTasks } from '../controllers/debugController.js';
import { grantXp, resetRpg } from '../controllers/rpgController.js';

const router = Router();

router.use(ensureAuth);

router.post('/clear-tasks', clearTasks);
router.post('/seed-tasks', seedTasks);
router.post('/grant-xp', grantXp);
router.post('/reset-rpg', resetRpg);

export default router;
