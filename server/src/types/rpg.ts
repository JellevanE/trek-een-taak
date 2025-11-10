import type { TaskPriority } from './task.js';
import type { JsonValue } from './json.js';

export type XpEventReason =
    | 'task_complete'
    | 'subtask_complete'
    | 'daily_focus'
    | 'debug_adjustment'
    | 'xp_gain'
    | 'legacy';

export interface XpMetadataBase {
    [key: string]: JsonValue | undefined;
}

export interface TaskCompletionMetadata extends XpMetadataBase {
    task_id: number;
    task_level: number;
    priority: TaskPriority;
}

export interface SubtaskCompletionMetadata extends TaskCompletionMetadata {
    subtask_id: number;
    weight?: number;
}

export interface DailyFocusMetadata extends XpMetadataBase {
    date: string;
}

export interface DebugAdjustmentMetadata extends XpMetadataBase {
    amount: number;
}

export type GenericXpMetadata = XpMetadataBase;

export type XpEventMetadata =
    | TaskCompletionMetadata
    | SubtaskCompletionMetadata
    | DailyFocusMetadata
    | DebugAdjustmentMetadata
    | GenericXpMetadata;

export interface RpgInventoryItem {
    id?: string;
    name: string;
    description?: string;
    quantity?: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    acquired_at?: string;
    equipped?: boolean;
    tags?: string[];
}

export interface RpgInventory {
    items: RpgInventoryItem[];
}

export interface RpgAchievement {
    id?: string;
    title: string;
    description?: string;
    unlocked_at?: string;
    points?: number;
    tags?: string[];
}

export interface RpgFlags {
    [flag: string]: boolean;
}

export interface RpgMetrics {
    [metric: string]: number;
}
