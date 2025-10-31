import { z } from 'zod';

const taskPriorityValues = ['low', 'medium', 'high'] as const;
const taskStatusValues = ['todo', 'in_progress', 'blocked', 'done'] as const;

const numericId = z.coerce.number().int().positive();
const optionalNumericId = z.union([numericId, z.null()]).optional();

const taskLevelSchema = z.coerce.number().positive().max(99).optional();

const optionalString = z
    .string()
    .transform((value) => value.trim())
    .optional();

const optionalNullableString = z
    .union([
        z.string().transform((value) => value.trim()),
        z.null()
    ])
    .optional();

const optionalNumber = z.coerce.number().optional();

export const createTaskSchema = z
    .object({
        description: z.string().trim().min(1),
        priority: z.enum(taskPriorityValues).optional(),
        due_date: optionalString,
        task_level: taskLevelSchema,
        campaign_id: optionalNumericId
    })
    .strict();

export const createSubtaskSchema = z
    .object({
        description: z.string().trim().min(1)
    })
    .strict();

export const updateStatusSchema = z
    .object({
        status: z.enum(taskStatusValues),
        note: z.union([
            z.string(),
            z.null()
        ]).optional()
    })
    .strict();

export const updateTaskSchema = z
    .object({
        description: z.string().trim().min(1),
        priority: z.string().trim().min(1),
        due_date: optionalNullableString,
        task_level: taskLevelSchema,
        campaign_id: optionalNumericId
    })
    .strict()
    .partial();

export const updateSubtaskSchema = z
    .object({
        description: z.string().trim().min(1),
        status: z.string().trim().min(1),
        weight: optionalNumber,
        priority: z.string().trim().min(1)
    })
    .strict()
    .partial();

export const updateOrderSchema = z
    .object({
        order: z.array(z.coerce.number().int().nonnegative())
    })
    .strict();

export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
export type CreateSubtaskPayload = z.infer<typeof createSubtaskSchema>;
export type UpdateStatusPayload = z.infer<typeof updateStatusSchema>;
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>;
export type UpdateSubtaskPayload = z.infer<typeof updateSubtaskSchema>;
export type UpdateOrderPayload = z.infer<typeof updateOrderSchema>;
