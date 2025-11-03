import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { applyXp, createInitialRpgState, ensureUserRpg } from '../rpg/experienceEngine.js';
import { buildPublicRpgState, incrementCounter, toPublicXpEvent } from '../rpg/eventHooks.js';
import { computeDailyBaseXp } from '../rpg/rewardTables.js';
import { readUsers, writeUsers } from '../data/userStore.js';
import { sendError } from '../utils/http.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import type { UserStoreData } from '../types/user.js';
import type { DailyFocusMetadata, DebugAdjustmentMetadata } from '../types/rpg.js';
import { validateRequest } from '../validation/index.js';
import { grantXpSchema, type GrantXpPayload } from '../validation/schemas/rpg.js';

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

    const rpgState = ensureUserRpg(user);
    if (!rpgState) return sendError(res, 500, 'Failed to load RPG state');

    const now = new Date();
    const isoString = now.toISOString();
    const todayKey = isoString.slice(0, 10);
    if (rpgState.last_daily_reward_at === todayKey) {
        return sendError(res, 400, 'Daily reward already claimed');
    }

    const reward = computeDailyBaseXp();
    const metadata: DailyFocusMetadata = { date: todayKey };
    const xpEvent = applyXp(user, reward.amount, reward.reason, metadata);
    if (!xpEvent) return sendError(res, 500, 'Failed to grant daily reward');

    incrementCounter(rpgState, 'daily_rewards_claimed');
    rpgState.last_daily_reward_at = todayKey;

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            xp_event: toPublicXpEvent(xpEvent),
            player_rpg: buildPublicRpgState(rpgState)
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to persist daily reward');
    }
}

export function grantXp(req: BaseAuthedRequest<GrantXpPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest<GrantXpPayload>(req, { body: grantXpSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const { amount: xpAmount } = validation.data.body!;

    const usersData = readUsers();
    const { index, user } = loadUser(usersData, req.user.id);
    if (!user) return sendError(res, 404, 'User not found');

    const rpgState = ensureUserRpg(user);
    if (!rpgState) return sendError(res, 500, 'Failed to load RPG state');

    const metadata: DebugAdjustmentMetadata = { amount: xpAmount };
    const event = applyXp(user, xpAmount, 'debug_adjustment', metadata);
    if (!event) return sendError(res, 400, 'No XP applied');

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            xp_event: toPublicXpEvent(event),
            player_rpg: buildPublicRpgState(rpgState)
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

    const baseState = createInitialRpgState();
    user.rpg = { ...baseState };

    try {
        usersData.users[index] = user;
        writeUsers(usersData);
        return res.json({
            player_rpg: buildPublicRpgState(user.rpg)
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
