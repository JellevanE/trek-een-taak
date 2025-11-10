import { z } from 'zod';

import { allowedProfileClasses } from '../validation/schemas/auth.js';

const taskPriorityValues = ['low', 'medium', 'high'] as const;
const taskStatusValues = ['todo', 'in_progress', 'blocked', 'done'] as const;
const xpReasons = ['task_complete', 'subtask_complete', 'daily_focus', 'debug_adjustment', 'xp_gain', 'legacy'] as const;

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonObjectSchema = z.record(z.unknown());
const jsonMetadataSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]));

export const errorSchema = z
    .object({
        error: z.string()
    })
    .strict();

export const userProfileSchema = z
    .object({
        display_name: z.string(),
        avatar: z.string().nullable(),
        class: z.enum(allowedProfileClasses).optional(),
        bio: z.string().optional(),
        prefs: jsonObjectSchema.optional()
    })
    .strict();

const rpgInventoryItemSchema = z
    .object({
        id: z.string().optional(),
        name: z.string(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']).optional(),
        acquired_at: z.string().optional(),
        equipped: z.boolean().optional(),
        tags: z.array(z.string()).optional()
    })
    .strict();

const rpgAchievementSchema = z
    .object({
        id: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        unlocked_at: z.string().optional(),
        points: z.number().optional(),
        tags: z.array(z.string()).optional()
    })
    .strict();

const userRpgEventSchema = z
    .object({
        amount: z.number(),
        reason: z.enum(xpReasons),
        message: z.string(),
        metadata: jsonMetadataSchema,
        at: z.string(),
        level_before: z.number(),
        level_after: z.number(),
        xp_before: z.number(),
        xp_after: z.number(),
        xp_into_level: z.number(),
        xp_for_level: z.number(),
        xp_to_next: z.number(),
        leveled_up: z.boolean()
    })
    .strict();

export const publicXpEventSchema = z
    .object({
        amount: z.number(),
        reason: z.enum(xpReasons),
        message: z.string(),
        metadata: jsonMetadataSchema,
        at: z.string(),
        level_before: z.number(),
        level_after: z.number(),
        xp_after: z.number(),
        xp_into_level: z.number(),
        xp_for_level: z.number(),
        xp_to_next: z.number(),
        leveled_up: z.boolean()
    })
    .strict();

export const publicUserRpgStateSchema = z
    .object({
        level: z.number(),
        xp: z.number(),
        xp_into_level: z.number(),
        xp_for_level: z.number(),
        xp_to_next: z.number(),
        xp_progress: z.number(),
        streak: z.number(),
        last_daily_reward_at: z.string().nullable(),
        last_xp_award_at: z.string().nullable(),
        counters: z.record(z.number()),
        stats: z
            .object({
                hp: z.number(),
                mp: z.number(),
                coins: z.number()
            })
            .strict(),
        achievements: z.array(rpgAchievementSchema),
        inventory: z
            .object({
                items: z.array(rpgInventoryItemSchema)
            })
            .strict(),
        recent_events: z.array(userRpgEventSchema)
    })
    .strict();

export const publicUserSchema = z
    .object({
        id: z.number(),
        username: z.string(),
        email: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        profile: userProfileSchema,
        rpg: publicUserRpgStateSchema
    })
    .strict();

export const authSuccessResponseSchema = z
    .object({
        token: z.string(),
        user: publicUserSchema
    })
    .strict();

export const currentUserResponseSchema = z
    .object({
        user: publicUserSchema
    })
    .strict();

export const usernameAvailabilitySchema = z
    .object({
        available: z.boolean(),
        reserved: z.boolean().optional(),
        suggestions: z.array(z.string()).optional()
    })
    .strict();

export const emailValidationResponseSchema = z
    .object({
        valid: z.boolean(),
        normalized_email: z.string(),
        reason: z.string().optional()
    })
    .strict();

const statusHistoryEntrySchema = z
    .object({
        status: z.enum(taskStatusValues),
        at: z.string(),
        note: z.string().nullable()
    })
    .strict();

const taskRewardHistoryEntrySchema = z
    .object({
        at: z.string(),
        amount: z.number(),
        reason: z.string(),
        subtask_id: z.number().optional()
    })
    .strict();

const subtaskRpgSchema = z
    .object({
        xp_awarded: z.boolean(),
        last_reward_at: z.string().nullable()
    })
    .strict();

const subtaskSchema = z
    .object({
        id: z.number(),
        description: z.string(),
        status: z.enum(taskStatusValues),
        created_at: z.string(),
        updated_at: z.string(),
        status_history: z.array(statusHistoryEntrySchema),
        completed: z.boolean().optional(),
        rpg: subtaskRpgSchema,
        priority: z.enum(taskPriorityValues).optional(),
        weight: z.number().optional()
    })
    .strict();

const taskRpgSchema = z
    .object({
        xp_awarded: z.boolean(),
        last_reward_at: z.string().nullable(),
        history: z.array(taskRewardHistoryEntrySchema)
    })
    .strict();

export const taskSchema = z
    .object({
        id: z.number(),
        description: z.string(),
        priority: z.enum(taskPriorityValues),
        sub_tasks: z.array(subtaskSchema),
        side_quests: z.array(subtaskSchema),
        nextSubtaskId: z.number(),
        due_date: z.string(),
        status: z.enum(taskStatusValues),
        order: z.number(),
        created_at: z.string(),
        updated_at: z.string(),
        completed: z.boolean().optional(),
        task_level: z.number(),
        status_history: z.array(statusHistoryEntrySchema),
        rpg: taskRpgSchema,
        campaign_id: z.number().nullable(),
        owner_id: z.number(),
        nextId: z.number().optional()
    })
    .strict();

export const taskWithXpSchema = taskSchema
    .extend({
        xp_events: z.array(publicXpEventSchema).optional(),
        player_rpg: publicUserRpgStateSchema.nullable().optional()
    })
    .strict();

export const taskListResponseSchema = z
    .object({
        tasks: z.array(taskSchema),
        nextId: z.number()
    })
    .strict();

export const taskOrderResponseSchema = z
    .object({
        tasks: z.array(taskSchema)
    })
    .strict();

export const taskHistoryResponseSchema = z
    .object({
        history: z.array(statusHistoryEntrySchema)
    })
    .strict();

const campaignStatsSchema = z
    .object({
        quests_total: z.number(),
        quests_completed: z.number(),
        quests_remaining: z.number(),
        quests_in_progress: z.number(),
        completion_percent: z.number()
    })
    .strict();

export const campaignSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        description: z.string(),
        image_url: z.string().nullable(),
        owner_id: z.number(),
        archived: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        stats: campaignStatsSchema.optional(),
        progress_summary: z.string().optional()
    })
    .strict();

export const campaignListResponseSchema = z
    .object({
        campaigns: z.array(campaignSchema)
    })
    .strict();

export const campaignDetailsResponseSchema = z
    .object({
        campaign: campaignSchema,
        quests: z.array(taskSchema)
    })
    .strict();

export const seedTasksResponseSchema = z
    .object({
        created: z.number(),
        removedBeforeSeed: z.number(),
        tasks: z.array(taskSchema)
    })
    .strict();

export const clearTasksResponseSchema = z
    .object({
        removed: z.number()
    })
    .strict();

export const xpGrantResponseSchema = z
    .object({
        xp_event: publicXpEventSchema,
        player_rpg: publicUserRpgStateSchema
    })
    .strict();

export const playerSnapshotResponseSchema = z
    .object({
        player_rpg: publicUserRpgStateSchema
    })
    .strict();

export const taskResponseSchema = taskSchema;

export const taskWithProgressSchema = taskWithXpSchema;
