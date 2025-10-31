import type { JsonObject } from './json';
import type {
    RpgAchievement,
    RpgFlags,
    RpgInventory,
    RpgMetrics,
    XpEventMetadata,
    XpEventReason
} from './rpg';

export interface UserProfile {
    display_name: string;
    avatar: string | null;
    class?: string;
    bio?: string;
    prefs?: JsonObject;
}

export interface UserRpgCounters {
    tasks_completed: number;
    subtasks_completed: number;
    daily_rewards_claimed: number;
    [key: string]: number;
}

export interface UserRpgEvent {
    amount: number;
    reason: XpEventReason;
    message: string;
    metadata: XpEventMetadata;
    at: string;
    level_before: number;
    level_after: number;
    xp_before: number;
    xp_after: number;
    xp_into_level: number;
    xp_for_level: number;
    xp_to_next: number;
    leveled_up: boolean;
}

export interface UserRpgState {
    level: number;
    xp: number;
    hp: number;
    mp: number;
    coins: number;
    streak: number;
    achievements: RpgAchievement[];
    inventory: RpgInventory;
    xp_log: UserRpgEvent[];
    last_daily_reward_at: string | null;
    last_xp_award_at: string | null;
    counters: UserRpgCounters;
    flags?: RpgFlags;
    metrics?: RpgMetrics;
}

export interface PublicUserRpgState {
    level: number;
    xp: number;
    xp_into_level: number;
    xp_for_level: number;
    xp_to_next: number;
    xp_progress: number;
    streak: number;
    last_daily_reward_at: string | null;
    last_xp_award_at: string | null;
    counters: UserRpgCounters;
    stats: {
        hp: number;
        mp: number;
        coins: number;
    };
    achievements: RpgAchievement[];
    inventory: RpgInventory;
    recent_events: UserRpgEvent[];
}

export interface UserRecord {
    id: number;
    username: string;
    password_hash: string;
    email: string | null;
    created_at: string;
    updated_at: string;
    profile: UserProfile;
    rpg: UserRpgState;
}

export type PublicUser = Omit<UserRecord, 'password_hash' | 'rpg'> & {
    rpg: PublicUserRpgState;
};

export interface UserStoreData {
    users: UserRecord[];
    nextId: number;
}
