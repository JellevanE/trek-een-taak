import { z } from 'zod';

export const allowedProfileClasses = ['adventurer', 'warrior', 'mage', 'rogue'] as const;

export const profileUpdateSchema = z
    .object({
        display_name: z.string().trim().min(1).max(100).optional(),
        avatar: z
            .string()
            .trim()
            .min(1)
            .max(2048)
            .optional()
            .nullable(),
        class: z.enum(allowedProfileClasses).optional(),
        bio: z
            .string()
            .trim()
            .max(200)
            .optional(),
        prefs: z.record(z.unknown()).optional()
    })
    .strict()
    .partial();

export const registerUserSchema = z
    .object({
        username: z.string().trim().min(1),
        password: z.string().min(6),
        email: z
            .string()
            .trim()
            .email()
            .optional()
            .nullable(),
        profile: profileUpdateSchema.optional()
    })
    .strict();

export const loginUserSchema = z
    .object({
        username: z.string().trim().min(1),
        password: z.string().min(1)
    })
    .strict();

const emailFormatSchema = z.string().trim().email();

export const emailValidationRequestSchema = z
    .object({
        email: z.string().trim().min(1)
    })
    .strict();

export function isEmailFormatValid(email: string): boolean {
    return emailFormatSchema.safeParse(email).success;
}

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
export type RegisterUserPayload = z.infer<typeof registerUserSchema>;
export type LoginUserPayload = z.infer<typeof loginUserSchema>;
export type EmailValidationPayload = z.infer<typeof emailValidationRequestSchema>;
