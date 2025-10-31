import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import * as experience from '../rpg/experience';
import { computeDailyBaseXp } from '../rpg/rewards';
import { readUsers, writeUsers } from '../data/userStore';
import { sendError } from '../utils/http';
import { assertAuthenticated } from '../utils/authGuard';
import type { AuthenticatedRequest } from '../types/auth';
import type { UserStoreData } from '../types/user';
import type { DailyFocusMetadata, DebugAdjustmentMetadata } from '../types/rpg';

type BaseAuthedRequest<B = unknown> = AuthenticatedRequest<ParamsDictionary, unknown, B>;

function loadUser(usersData: UserStoreData, userId: number) {
    const index = usersData.users.findIndex((user) => user.id === userId);
    if (index === -1) return { index, user: null };
    return { index, user: usersData.users[index] };
}

export function claimDailyReward(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const usersData = readUsers();
    const { index, user } = loadUser(usersData, req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    experience.ensureUserRpg(user);

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    if (user.rpg.last_daily_reward_at === todayKey) {
        return sendError(res, 400, 'Daily reward already claimed');
    }

    const reward = computeDailyBaseXp();
    const metadata: DailyFocusMetadata = { date: todayKey };
    const xpEvent = experience.applyXp(user, reward.amount, reward.reason, metadata);
    if (!xpEvent) return sendError(res, 500, 'Failed to grant daily reward');

    experience.incrementCounter(user.rpg, 'daily_rewards_claimed');
    user.rpg.last_daily_reward_at = todayKey;

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            xp_event: experience.toPublicXpEvent(xpEvent),
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to persist daily reward');
    }
}

interface GrantXpBody {
    amount?: number;
}

export function grantXp(req: BaseAuthedRequest<GrantXpBody>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const { amount } = req.body || {};
    const xpAmount = Number(amount);
    if (!Number.isFinite(xpAmount)) return sendError(res, 400, 'Amount must be numeric');
    if (xpAmount === 0) return sendError(res, 400, 'Amount cannot be zero');

    const usersData = readUsers();
    const { index, user } = loadUser(usersData, req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    experience.ensureUserRpg(user);

    const metadata: DebugAdjustmentMetadata = { amount: xpAmount };
    const event = experience.applyXp(user, xpAmount, 'debug_adjustment', metadata);
    if (!event) return sendError(res, 400, 'No XP applied');

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            xp_event: experience.toPublicXpEvent(event),
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to grant XP');
    }
}

export function resetRpg(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const usersData = readUsers();
    const { index, user } = loadUser(usersData, req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    const baseState = experience.createInitialRpgState();
    user.rpg = { ...baseState };

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            player_rpg: experience.buildPublicRpgState(user.rpg)
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to reset RPG stats');
    }
}

const controller = {
    claimDailyReward,
    grantXp,
    resetRpg
};

export default controller;
