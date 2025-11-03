import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import {
    checkUsernameAvailability,
    getCurrentUser,
    loginUser,
    registerUser,
    updateCurrentUser,
    validateEmail
} from '../controllers/usersController.js';

const router = Router();

router.get('/me', ensureAuth, getCurrentUser);
router.put('/me', ensureAuth, updateCurrentUser);
router.get('/check-username/:username', checkUsernameAvailability);
router.post('/validate-email', validateEmail);
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
