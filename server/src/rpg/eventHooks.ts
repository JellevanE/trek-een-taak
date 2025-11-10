import {
    type MutableUser,
    type PublicXpEvent,
    type UserRpgCounters,
    type UserRpgEvent,
    type UserRpgState,
    type PublicUserRpgState
} from './experienceTypes.js';
import { ensureUserRpg, getLevelProgress } from './experienceEngine.js';

export function buildPublicRpgState(rpg: UserRpgState | null | undefined): PublicUserRpgState {
    const container: MutableUser = { rpg: rpg ? { ...rpg } : null };
    const safe = ensureUserRpg(container);
    const normalized = safe ?? ensureUserRpg({ rpg: {} })!;
    const progress = getLevelProgress(normalized.level, normalized.xp);
    const recentEvents: UserRpgEvent[] = Array.isArray(normalized.xp_log)
        ? normalized.xp_log.slice(0, 5).map((event) => ({ ...event }))
        : [];

    return {
        level: normalized.level,
        xp: normalized.xp,
        xp_into_level: progress.xp_into_level,
        xp_for_level: progress.xp_for_level,
        xp_to_next: progress.xp_to_next,
        xp_progress: progress.progress,
        streak: normalized.streak || 0,
        last_daily_reward_at: normalized.last_daily_reward_at || null,
        last_xp_award_at: normalized.last_xp_award_at || null,
        counters: { ...normalized.counters },
        stats: {
            hp: normalized.hp,
            mp: normalized.mp,
            coins: normalized.coins
        },
        achievements: Array.isArray(normalized.achievements) ? [...normalized.achievements] : [],
        inventory:
            normalized.inventory && typeof normalized.inventory === 'object'
                ? { items: Array.isArray(normalized.inventory.items) ? [...normalized.inventory.items] : [] }
                : { items: [] },
        recent_events: recentEvents
    };
}

export function toPublicXpEvent(event: UserRpgEvent | null | undefined): PublicXpEvent | null {
    if (!event || typeof event !== 'object') return null;
    return {
        amount: event.amount,
        reason: event.reason,
        message: event.message,
        metadata: { ...event.metadata },
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

export function incrementCounter(
    rpg: UserRpgState | null | undefined,
    counter: keyof UserRpgCounters | string
): void {
    if (!rpg || typeof rpg !== 'object') return;
    if (!rpg.counters || typeof rpg.counters !== 'object') {
        rpg.counters = { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 };
    }
    const key = counter as string;
    if (typeof rpg.counters[key] !== 'number' || !Number.isFinite(rpg.counters[key])) {
        rpg.counters[key] = 0;
    }
    rpg.counters[key] += 1;
}
