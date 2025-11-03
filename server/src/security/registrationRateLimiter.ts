import { createRateLimiter } from './rateLimiter.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const registrationRateLimiter = createRateLimiter({
    limit: 5,
    windowMs: ONE_HOUR_MS
});

export function resetRegistrationRateLimiter(key?: string) {
    registrationRateLimiter.reset(key);
}
