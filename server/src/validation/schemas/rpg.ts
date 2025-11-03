import { z } from 'zod';

export const grantXpSchema = z
    .object({
        amount: z
            .coerce
            .number()
            .refine((value) => value !== 0, { message: 'Amount cannot be zero' })
    })
    .strict();

export type GrantXpPayload = z.infer<typeof grantXpSchema>;
