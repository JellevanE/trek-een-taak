const XP_CONFIG = {
    baseTaskXp: 50,
    taskLevelBonus: 12,
    baseSubtaskXp: 18,
    subtaskLevelBonus: 6,
    subtaskWeightFloor: 0.35,
    priorityMultipliers: { low: 0.9, medium: 1.0, high: 1.15 },
    dailyBaseXp: 30,
    maxTaskLevel: 10,
    levelBaseRequirement: 100,
    levelStepRequirement: 40,
    xpLogLimit: 30
};

function clampTaskLevel(level) {
    if (!Number.isFinite(level)) return 1;
    const rounded = Math.round(level);
    if (rounded < 1) return 1;
    if (rounded > XP_CONFIG.maxTaskLevel) return XP_CONFIG.maxTaskLevel;
    return rounded;
}

function getPriorityMultiplier(priority) {
    if (!priority || typeof priority !== 'string') return 1.0;
    const key = priority.toLowerCase();
    return XP_CONFIG.priorityMultipliers[key] || 1.0;
}

function xpRequiredForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let l = 1; l < level; l++) {
        total += XP_CONFIG.levelBaseRequirement + (l - 1) * XP_CONFIG.levelStepRequirement;
    }
    return total;
}

function getLevelFromXp(xp) {
    if (!Number.isFinite(xp) || xp <= 0) return 1;
    let level = 1;
    while (xp >= xpRequiredForLevel(level + 1)) {
        level++;
        if (level >= 99) break; // soft cap; can be raised later
    }
    return level;
}

function getLevelProgress(level, xp) {
    const safeXp = Math.max(0, Number.isFinite(xp) ? Math.floor(xp) : 0);
    const safeLevel = level >= 1 ? Math.floor(level) : 1;
    const currentLevelFloor = xpRequiredForLevel(safeLevel);
    const nextLevelFloor = xpRequiredForLevel(safeLevel + 1);
    const xpForLevel = Math.max(1, nextLevelFloor - currentLevelFloor);
    const xpIntoLevel = Math.max(0, safeXp - currentLevelFloor);
    const xpToNext = Math.max(0, nextLevelFloor - safeXp);
    const progress = Math.min(1, Math.max(0, xpIntoLevel / xpForLevel));
    return {
        xp_into_level: xpIntoLevel,
        xp_for_level: xpForLevel,
        xp_to_next: xpToNext,
        progress
    };
}

function describeXpEvent(reason, amount) {
    switch (reason) {
        case 'task_complete':
            return `Quest complete +${amount} XP`;
        case 'subtask_complete':
            return `Side-quest complete +${amount} XP`;
        case 'daily_focus':
            return `Daily focus bonus +${amount} XP`;
        default:
            if (amount >= 0) return `Gained +${amount} XP`;
            return `Lost ${Math.abs(amount)} XP`;
    }
}

function ensureUserRpg(user) {
    if (!user || typeof user !== 'object') return null;
    if (!user.rpg || typeof user.rpg !== 'object') user.rpg = {};
    const rpg = user.rpg;
    if (typeof rpg.level !== 'number' || rpg.level < 1) rpg.level = 1;
    if (typeof rpg.xp !== 'number' || !Number.isFinite(rpg.xp) || rpg.xp < 0) rpg.xp = 0;
    rpg.xp = Math.floor(rpg.xp);
    if (!Array.isArray(rpg.xp_log)) rpg.xp_log = [];
    if (!rpg.inventory || typeof rpg.inventory !== 'object') rpg.inventory = { items: [] };
    if (!Array.isArray(rpg.inventory.items)) rpg.inventory.items = [];
    if (!Array.isArray(rpg.achievements)) rpg.achievements = [];
    if (typeof rpg.hp !== 'number' || !Number.isFinite(rpg.hp)) rpg.hp = 20;
    if (typeof rpg.mp !== 'number' || !Number.isFinite(rpg.mp)) rpg.mp = 5;
    if (typeof rpg.coins !== 'number' || !Number.isFinite(rpg.coins)) rpg.coins = 0;
    if (typeof rpg.streak !== 'number' || !Number.isFinite(rpg.streak)) rpg.streak = 0;
    if (!rpg.counters || typeof rpg.counters !== 'object') {
        rpg.counters = { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 };
    } else {
        if (typeof rpg.counters.tasks_completed !== 'number') rpg.counters.tasks_completed = 0;
        if (typeof rpg.counters.subtasks_completed !== 'number') rpg.counters.subtasks_completed = 0;
        if (typeof rpg.counters.daily_rewards_claimed !== 'number') rpg.counters.daily_rewards_claimed = 0;
    }
    if (!rpg.flags || typeof rpg.flags !== 'object') rpg.flags = {};
    if (!rpg.metrics || typeof rpg.metrics !== 'object') rpg.metrics = {};
    if (!rpg.last_daily_reward_at) rpg.last_daily_reward_at = null;
    if (!rpg.last_xp_award_at) rpg.last_xp_award_at = null;

    // recompute level from XP to stay consistent; future level overrides can be added later
    const computedLevel = getLevelFromXp(rpg.xp);
    if (computedLevel !== rpg.level) rpg.level = computedLevel;
    return rpg;
}

function createInitialRpgState(overrides = {}) {
    const base = {
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
    const user = { rpg: { ...base, ...overrides } };
    ensureUserRpg(user);
    return user.rpg;
}

function applyXp(user, amount, reason, metadata = {}) {
    if (!user || !Number.isFinite(amount) || amount === 0) return null;
    ensureUserRpg(user);
    const rpg = user.rpg;
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
    const event = {
        amount: delta,
        reason: reason || 'xp_gain',
        message: describeXpEvent(reason || 'xp_gain', delta),
        metadata,
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

function computeTaskXp(task) {
    if (!task || typeof task !== 'object') return { amount: 0, level: 1, multiplier: 1 };
    const level = clampTaskLevel(task.task_level || 1);
    const base = XP_CONFIG.baseTaskXp + (level - 1) * XP_CONFIG.taskLevelBonus;
    const multiplier = getPriorityMultiplier(task.priority);
    const amount = Math.max(1, Math.round(base * multiplier));
    return { amount, level, multiplier, base };
}

function computeSubtaskXp(task, subtask) {
    if (!task || typeof task !== 'object') return { amount: 0, level: 1, multiplier: 1, weight: 1 };
    const level = clampTaskLevel(task.task_level || 1);
    const base = XP_CONFIG.baseSubtaskXp + (level - 1) * XP_CONFIG.subtaskLevelBonus;
    const prioritySource = (subtask && subtask.priority) || task.priority;
    const multiplier = getPriorityMultiplier(prioritySource);
    let weight = 1;
    if (subtask && typeof subtask.weight === 'number' && Number.isFinite(subtask.weight)) {
        weight = Math.max(XP_CONFIG.subtaskWeightFloor, subtask.weight);
    }
    const amount = Math.max(1, Math.round(base * multiplier * weight));
    return { amount, level, multiplier, weight, base };
}

function computeDailyBaseXp() {
    return { amount: XP_CONFIG.dailyBaseXp };
}

function buildPublicRpgState(rpg) {
    const safe = rpg && typeof rpg === 'object' ? rpg : createInitialRpgState();
    ensureUserRpg({ rpg: safe });
    const progress = getLevelProgress(safe.level, safe.xp);
    return {
        level: safe.level,
        xp: safe.xp,
        xp_into_level: progress.xp_into_level,
        xp_for_level: progress.xp_for_level,
        xp_to_next: progress.xp_to_next,
        xp_progress: progress.progress,
        streak: safe.streak || 0,
        last_daily_reward_at: safe.last_daily_reward_at || null,
        last_xp_award_at: safe.last_xp_award_at || null,
        counters: { ...safe.counters },
        stats: {
            hp: safe.hp,
            mp: safe.mp,
            coins: safe.coins
        },
        achievements: Array.isArray(safe.achievements) ? [...safe.achievements] : [],
        inventory: safe.inventory && typeof safe.inventory === 'object'
            ? { items: Array.isArray(safe.inventory.items) ? [...safe.inventory.items] : [] }
            : { items: [] },
        recent_events: Array.isArray(safe.xp_log) ? safe.xp_log.slice(0, 5) : []
    };
}

function toPublicXpEvent(event) {
    if (!event || typeof event !== 'object') return null;
    return {
        amount: event.amount,
        reason: event.reason,
        message: event.message,
        metadata: event.metadata || {},
        at: event.at,
        level_before: event.level_before,
        level_after: event.level_after,
        xp_after: event.xp_after,
        xp_into_level: event.xp_into_level,
        xp_for_level: event.xp_for_level,
        xp_to_next: event.xp_to_next,
        leveled_up: !!event.leveled_up
    };
}

function incrementCounter(rpg, counter) {
    if (!rpg || typeof rpg !== 'object') return;
    if (!rpg.counters || typeof rpg.counters !== 'object') rpg.counters = {};
    if (typeof rpg.counters[counter] !== 'number' || !Number.isFinite(rpg.counters[counter])) {
        rpg.counters[counter] = 0;
    }
    rpg.counters[counter] += 1;
}

module.exports = {
    XP_CONFIG,
    clampTaskLevel,
    getPriorityMultiplier,
    xpRequiredForLevel,
    getLevelFromXp,
    ensureUserRpg,
    createInitialRpgState,
    applyXp,
    computeTaskXp,
    computeSubtaskXp,
    computeDailyBaseXp,
    buildPublicRpgState,
    toPublicXpEvent,
    incrementCounter
};
