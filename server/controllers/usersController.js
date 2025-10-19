'use strict';

const bcrypt = require('bcryptjs');
const experience = require('../rpg/experience');
const { readUsers, writeUsers, sanitizeUser } = require('../data/userStore');
const { sendError } = require('../utils/http');
const { signToken } = require('../middleware/auth');

function getCurrentUser(req, res) {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return sendError(res, 404, 'User not found');
    return res.json({ user: sanitizeUser(user) });
}

function updateCurrentUser(req, res) {
    const users = readUsers();
    const userIndex = users.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');

    const allowedProfile = ['display_name', 'avatar', 'class', 'bio', 'prefs'];
    const profile = users.users[userIndex].profile || {};
    if (req.body && typeof req.body === 'object') {
        allowedProfile.forEach(k => {
            if (Object.prototype.hasOwnProperty.call(req.body, k)) {
                profile[k] = req.body[k];
            }
        });
    }
    users.users[userIndex].profile = profile;
    users.users[userIndex].updated_at = new Date().toISOString();
    try {
        writeUsers(users);
        return res.json({ user: sanitizeUser(users.users[userIndex]) });
    } catch (e) {
        return sendError(res, 500, 'Failed to persist profile update');
    }
}

function checkUsernameAvailability(req, res) {
    const { username } = req.params;
    if (!username || typeof username !== 'string' || !username.trim()) {
        return sendError(res, 400, 'Invalid username');
    }
    const usersData = readUsers();
    const isTaken = usersData.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (isTaken) {
        const suggestions = [
            `${username}${Math.floor(Math.random() * 100)}`,
            `${username}_${Math.floor(Math.random() * 10)}`,
        ];
        return res.json({ available: false, suggestions });
    }
    return res.json({ available: true });
}

function registerUser(req, res) {
    const { username, password, email, profile: profileData } = req.body || {};
    if (!username || typeof username !== 'string' || !username.trim()) return sendError(res, 400, 'Invalid username');
    if (!password || typeof password !== 'string' || password.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');

    const trimmedUsername = username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    const usersData = readUsers();
    if (usersData.users.some(u => typeof u.username === 'string' && u.username.toLowerCase() === normalizedUsername)) {
        return sendError(res, 400, 'Username taken');
    }

    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, 10);

    const defaultProfile = {
        display_name: trimmedUsername,
        avatar: null,
        class: 'adventurer',
        bio: ''
    };

    const profile = { ...defaultProfile };
    if (profileData && typeof profileData === 'object') {
        if (profileData.display_name && typeof profileData.display_name === 'string' && profileData.display_name.trim()) {
            profile.display_name = profileData.display_name.trim();
        }
        if (profileData.class && typeof profileData.class === 'string') {
            const allowedClasses = ['adventurer', 'warrior', 'mage', 'rogue'];
            if (allowedClasses.includes(profileData.class)) {
                profile.class = profileData.class;
            }
        }
        if (typeof profileData.bio === 'string') {
            profile.bio = profileData.bio.trim().substring(0, 200);
        }
    }

    const user = {
        id: usersData.nextId,
        username: trimmedUsername,
        password_hash: hash,
        email: email || null,
        created_at: now,
        updated_at: now,
        profile,
        rpg: experience.createInitialRpgState()
    };
    usersData.users.push(user);
    usersData.nextId++;
    try {
        writeUsers(usersData);
        const safeUser = sanitizeUser(user);
        const token = signToken(user);
        res.status(201).json({ token, user: safeUser });
    } catch (e) {
        console.error('Failed to persist user', e);
        return sendError(res, 500, 'Failed to create user');
    }
}

function loginUser(req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) return sendError(res, 400, 'Missing credentials');
    const usersData = readUsers();
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedUsername = trimmedUsername.toLowerCase();
    const user = usersData.users.find(u => typeof u.username === 'string' && u.username.toLowerCase() === normalizedUsername);
    if (!user) return sendError(res, 401, 'Invalid credentials');
    if (!bcrypt.compareSync(password, user.password_hash)) return sendError(res, 401, 'Invalid credentials');
    experience.ensureUserRpg(user);
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
}

module.exports = {
    getCurrentUser,
    updateCurrentUser,
    checkUsernameAvailability,
    registerUser,
    loginUser
};

