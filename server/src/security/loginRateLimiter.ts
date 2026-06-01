import { createRateLimiter } from './rateLimiter.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// Throttle login attempts per client IP to blunt credential brute-forcing.
export const loginRateLimiter = createRateLimiter({
    limit: 10,
    windowMs: FIFTEEN_MINUTES_MS,
});

export function resetLoginRateLimiter(key?: string) {
    loginRateLimiter.reset(key);
}
