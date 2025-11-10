import type {
    PublicUserRpgState,
    UserRpgCounters,
    UserRpgEvent,
    UserRpgState
} from '../types/user.js';
import type { XpEventMetadata, XpEventReason } from '../types/rpg.js';

export type MutableUser = {
    rpg?: Partial<UserRpgState> | null;
};

export interface LevelProgress {
    xp_into_level: number;
    xp_for_level: number;
    xp_to_next: number;
    progress: number;
}

export interface PublicXpEvent {
    amount: number;
    reason: XpEventReason;
    message: string;
    metadata: XpEventMetadata;
    at: string;
    level_before: number;
    level_after: number;
    xp_after: number;
    xp_into_level: number;
    xp_for_level: number;
    xp_to_next: number;
    leveled_up: boolean;
}

export type {
    PublicUserRpgState,
    UserRpgCounters,
    UserRpgEvent,
    UserRpgState
};
