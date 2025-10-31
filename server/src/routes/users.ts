import { Router } from 'express';

import { ensureAuth } from '../middleware/auth';
import {
    checkUsernameAvailability,
    getCurrentUser,
    loginUser,
    registerUser,
    updateCurrentUser
} from '../controllers/usersController';

const router = Router();

router.get('/me', ensureAuth, getCurrentUser);
router.put('/me', ensureAuth, updateCurrentUser);
router.get('/check-username/:username', checkUsernameAvailability);
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
