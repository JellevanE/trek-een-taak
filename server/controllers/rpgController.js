'use strict';

const experience = require('../rpg/experience');
const { readUsers, writeUsers } = require('../data/userStore');
const { sendError } = require('../utils/http');

function claimDailyReward(req, res) {
    const usersData = readUsers();
    const userIndex = usersData.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');

    const user = usersData.users[userIndex];
    experience.ensureUserRpg(user);

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    if (user.rpg.last_daily_reward_at === todayKey) {
        return sendError(res, 400, 'Daily reward already claimed');
    }

    const reward = experience.computeDailyBaseXp();
    const xpEvent = experience.applyXp(user, reward.amount, 'daily_focus', { date: todayKey });
    if (!xpEvent) {
        return sendError(res, 500, 'Failed to grant daily reward');
    }
    experience.incrementCounter(user.rpg, 'daily_rewards_claimed');
    user.rpg.last_daily_reward_at = todayKey;

    try {
        usersData.users[userIndex] = user;
        writeUsers(usersData);
        res.json({
            xp_event: experience.toPublicXpEvent(xpEvent),
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (e) {
        console.error('Failed to persist daily reward', e);
        return sendError(res, 500, 'Failed to persist daily reward');
    }
}

function grantXp(req, res) {
    const { amount } = req.body || {};
    const xpAmount = Number(amount);
    if (!Number.isFinite(xpAmount)) return sendError(res, 400, 'Amount must be numeric');
    if (xpAmount === 0) return sendError(res, 400, 'Amount cannot be zero');

    const usersData = readUsers();
    const userIndex = usersData.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');
    const user = usersData.users[userIndex];
    experience.ensureUserRpg(user);

    const event = experience.applyXp(user, xpAmount, 'debug_adjustment', { amount: xpAmount });
    if (!event) return sendError(res, 400, 'No XP applied');

    try {
        usersData.users[userIndex] = user;
        writeUsers(usersData);
        res.json({
            xp_event: experience.toPublicXpEvent(event),
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (e) {
        console.error('Failed to grant xp', e);
        return sendError(res, 500, 'Failed to grant XP');
    }
}

function resetRpg(req, res) {
    const usersData = readUsers();
    const userIndex = usersData.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');
    const user = usersData.users[userIndex];

    const baseState = experience.createInitialRpgState();
    user.rpg = { ...baseState };
    try {
        usersData.users[userIndex] = user;
        writeUsers(usersData);
        res.json({
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (e) {
        console.error('Failed to reset rpg', e);
        return sendError(res, 500, 'Failed to reset RPG stats');
    }
}

module.exports = {
    claimDailyReward,
    grantXp,
    resetRpg
};

