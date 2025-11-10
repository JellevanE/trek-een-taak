import {
    type MutableUser,
    type LevelProgress,
    type UserRpgCounters,
    type UserRpgEvent,
    type UserRpgState
} from './experienceTypes.js';
import { XP_CONFIG } from './rewardTables.js';
import type {
    RpgFlags,
    RpgInventory,
    RpgMetrics,
    XpEventMetadata,
    XpEventReason
} from '../types/rpg.js';

export function xpRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    let total = 0;
    for (let value = 1; value < level; value += 1) {
        total += XP_CONFIG.levelBaseRequirement + (value - 1) * XP_CONFIG.levelStepRequirement;
    }
    return total;
}

export function getLevelFromXp(xp: unknown): number {
    if (typeof xp !== 'number' || !Number.isFinite(xp) || xp <= 0) return 1;
    let level = 1;
    while (xp >= xpRequiredForLevel(level + 1)) {
        level += 1;
        if (level >= 99) break;
    }
    return level;
}

export function getLevelProgress(levelInput: number, xpInput: number): LevelProgress {
    const safeXp = Math.max(0, Number.isFinite(xpInput) ? Math.floor(xpInput) : 0);
    const safeLevel = levelInput >= 1 ? Math.floor(levelInput) : 1;
    const currentFloor = xpRequiredForLevel(safeLevel);
    const nextFloor = xpRequiredForLevel(safeLevel + 1);
    const xpForLevel = Math.max(1, nextFloor - currentFloor);
    const xpIntoLevel = Math.max(0, safeXp - currentFloor);
    const xpToNext = Math.max(0, nextFloor - safeXp);
    const progress = Math.min(1, Math.max(0, xpIntoLevel / xpForLevel));
    return {
        xp_into_level: xpIntoLevel,
        xp_for_level: xpForLevel,
        xp_to_next: xpToNext,
        progress
    };
}

function ensureCounters(counters: unknown): UserRpgCounters {
    const safe: UserRpgCounters =
        counters && typeof counters === 'object'
            ? (counters as UserRpgCounters)
            : { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 };

    if (typeof safe.tasks_completed !== 'number' || !Number.isFinite(safe.tasks_completed)) {
        safe.tasks_completed = 0;
    }
    if (typeof safe.subtasks_completed !== 'number' || !Number.isFinite(safe.subtasks_completed)) {
        safe.subtasks_completed = 0;
    }
    if (typeof safe.daily_rewards_claimed !== 'number' || !Number.isFinite(safe.daily_rewards_claimed)) {
        safe.daily_rewards_claimed = 0;
    }
    return safe;
}

export function ensureUserRpg(user: MutableUser | null | undefined): UserRpgState | null {
    if (!user || typeof user !== 'object') return null;
    if (!user.rpg || typeof user.rpg !== 'object') {
        user.rpg = {} as Partial<UserRpgState>;
    }

    const rpg = user.rpg as UserRpgState & {
        xp_log?: UserRpgEvent[];
        counters?: Partial<UserRpgCounters>;
    };

    if (typeof rpg.level !== 'number' || rpg.level < 1) rpg.level = 1;
    if (typeof rpg.xp !== 'number' || !Number.isFinite(rpg.xp) || rpg.xp < 0) rpg.xp = 0;
    rpg.xp = Math.floor(rpg.xp);

    if (!Array.isArray(rpg.xp_log)) rpg.xp_log = [];

    if (!rpg.inventory || typeof rpg.inventory !== 'object') {
        rpg.inventory = { items: [] } as RpgInventory;
    } else if (!Array.isArray(rpg.inventory.items)) {
        rpg.inventory.items = [];
    }

    if (!Array.isArray(rpg.achievements)) rpg.achievements = [];

    if (typeof rpg.hp !== 'number' || !Number.isFinite(rpg.hp)) rpg.hp = 20;
    if (typeof rpg.mp !== 'number' || !Number.isFinite(rpg.mp)) rpg.mp = 5;
    if (typeof rpg.coins !== 'number' || !Number.isFinite(rpg.coins)) rpg.coins = 0;
    if (typeof rpg.streak !== 'number' || !Number.isFinite(rpg.streak)) rpg.streak = 0;

    rpg.counters = ensureCounters(rpg.counters);

    if (!rpg.flags || typeof rpg.flags !== 'object') rpg.flags = {} as RpgFlags;
    if (!rpg.metrics || typeof rpg.metrics !== 'object') rpg.metrics = {} as RpgMetrics;

    if (typeof rpg.last_daily_reward_at !== 'string') rpg.last_daily_reward_at = null;
    if (typeof rpg.last_xp_award_at !== 'string') rpg.last_xp_award_at = null;

    const computedLevel = getLevelFromXp(rpg.xp);
    if (computedLevel !== rpg.level) rpg.level = computedLevel;

    return rpg as UserRpgState;
}

export function createInitialRpgState(overrides: Partial<UserRpgState> = {}): UserRpgState {
    const base: UserRpgState = {
        level: 1,
        xp: 0,
        hp: 20,
        mp: 5,
        coins: 0,
        streak: 0,
        achievements: [],
        inventory: { items: [] },
        xp_log: [],
        last_daily_reward_at: null,
        last_xp_award_at: null,
        counters: { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 },
        flags: {},
        metrics: {}
    };
    const user: MutableUser = { rpg: { ...base, ...overrides } };
    return ensureUserRpg(user) ?? base;
}

function describeXpEvent(reason: XpEventReason, amount: number): string {
    switch (reason) {
        case 'task_complete':
            return `Quest complete +${amount} XP`;
        case 'subtask_complete':
            return `Side-quest complete +${amount} XP`;
        case 'daily_focus':
            return `Daily focus bonus +${amount} XP`;
        default:
            return amount >= 0 ? `Gained +${amount} XP` : `Lost ${Math.abs(amount)} XP`;
    }
}

export function applyXp(
    user: MutableUser | null | undefined,
    amount: number,
    reason: XpEventReason = 'xp_gain',
    metadata: XpEventMetadata = {}
): UserRpgEvent | null {
    if (!user || !Number.isFinite(amount) || amount === 0) return null;
    const rpg = ensureUserRpg(user);
    if (!rpg) return null;

    const delta = Math.floor(amount);
    if (delta === 0) return null;

    const now = new Date().toISOString();
    const xpBefore = rpg.xp;
    const levelBefore = rpg.level;
    const newXp = Math.max(0, xpBefore + delta);
    rpg.xp = newXp;
    rpg.level = getLevelFromXp(rpg.xp);
    const levelAfter = rpg.level;
    const leveledUp = levelAfter > levelBefore;
    rpg.last_xp_award_at = now;

    const progress = getLevelProgress(rpg.level, rpg.xp);
    const metadataCopy = { ...metadata } as XpEventMetadata;
    const event: UserRpgEvent = {
        amount: delta,
        reason: reason || 'xp_gain',
        message: describeXpEvent(reason || 'xp_gain', delta),
        metadata: metadataCopy,
        at: now,
        level_before: levelBefore,
        level_after: levelAfter,
        xp_before: xpBefore,
        xp_after: rpg.xp,
        xp_into_level: progress.xp_into_level,
        xp_for_level: progress.xp_for_level,
        xp_to_next: progress.xp_to_next,
        leveled_up: leveledUp
    };

    rpg.xp_log.unshift(event);
    if (rpg.xp_log.length > XP_CONFIG.xpLogLimit) {
        rpg.xp_log.length = XP_CONFIG.xpLogLimit;
    }

    return event;
}
