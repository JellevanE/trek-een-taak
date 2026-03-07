import { Router } from 'express';
import { ensureAuth } from '../middleware/auth.js';
import { checkUpdate, getStoryline } from '../controllers/storylineController.js';

const router = Router();

router.use(ensureAuth);

router.get('/:campaignId', getStoryline);
router.get('/:campaignId/check-update', checkUpdate);

export default router;
