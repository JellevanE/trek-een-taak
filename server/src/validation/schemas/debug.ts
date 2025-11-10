import { z } from 'zod';

export const seedTasksSchema = z
    .object({
        count: z.union([z.number(), z.string(), z.null()]).optional()
    })
    .strict();

export type SeedTasksPayload = z.infer<typeof seedTasksSchema>;
