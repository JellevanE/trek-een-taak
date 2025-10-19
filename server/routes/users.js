'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

router.get('/me', ensureAuth, usersController.getCurrentUser);
router.put('/me', ensureAuth, usersController.updateCurrentUser);
router.get('/check-username/:username', usersController.checkUsernameAvailability);
router.post('/register', usersController.registerUser);
router.post('/login', usersController.loginUser);

module.exports = router;

