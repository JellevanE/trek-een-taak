'use strict';

const fs = require('fs');
const { USERS_FILE } = require('./filePaths');
const experience = require('../rpg/experience');

function ensureDefaultUserFile() {
    if (fs.existsSync(USERS_FILE)) {
        return;
    }
    const now = new Date().toISOString();
    const defaultUser = {
        id: 1,
        username: 'local',
        password_hash: '',
        email: null,
        created_at: now,
        updated_at: now,
        profile: { display_name: 'Local User', avatar: null, class: 'adventurer', bio: '' },
        rpg: experience.createInitialRpgState()
    };
    const initial = { users: [defaultUser], nextId: 2 };
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2));
}

function readUsers() {
    try {
        ensureDefaultUserFile();
        const data = fs.readFileSync(USERS_FILE);
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (typeof parsed.nextId !== 'number') {
            const maxId = parsed.users.reduce((m, u) => (u && typeof u.id === 'number' && u.id > m ? u.id : m), 0);
            parsed.nextId = maxId + 1;
        }
        parsed.users.forEach(user => experience.ensureUserRpg(user));
        return parsed;
    } catch (err) {
        console.error('Error reading users file:', err);
        return { users: [], nextId: 1 };
    }
}

function writeUsers(data) {
    const tmpPath = `${USERS_FILE}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, USERS_FILE);
        return true;
    } catch (error) {
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (cleanupErr) {
            // ignore cleanup errors
        }
        console.error('Error writing users file:', error);
        throw error;
    }
}

function sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return { ...rest, rpg: experience.buildPublicRpgState(user.rpg) };
}

module.exports = {
    readUsers,
    writeUsers,
    sanitizeUser,
    ensureDefaultUserFile
};

