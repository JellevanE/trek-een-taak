import { z } from 'zod';

export const campaignIdParamsSchema = z
    .object({
        id: z.coerce.number().int().positive()
    })
    .strict();

export const listCampaignsQuerySchema = z
    .object({
        include_archived: z.union([z.string(), z.array(z.string())]).optional()
    })
    .strict();

export const createCampaignSchema = z
    .object({
        name: z.string().trim().min(1, 'Name is required'),
        description: z.string().trim().max(2000).optional(),
        image_url: z
            .string()
            .trim()
            .max(2048)
            .nullable()
            .optional()
    })
    .strict();

export const updateCampaignSchema = createCampaignSchema
    .partial()
    .extend({
        archived: z.boolean().optional()
    })
    .strict();

export type CampaignIdParams = z.infer<typeof campaignIdParamsSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type CreateCampaignPayload = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignPayload = z.infer<typeof updateCampaignSchema>;
