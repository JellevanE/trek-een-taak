import { createRateLimiter } from './rateLimiter.js';
import { storylineConfig } from '../config/storyline.config.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Caps how many AI story generations a single user can trigger per day, enforcing
// the maxGenerationsPerDay budget that storyline.config.ts declares. This is the
// primary guard against a logged-in user running up the Anthropic bill.
//
// Note: in-memory (like the other limiters), so the daily count resets if the
// server restarts. Adequate against external abuse on a single instance; a
// persisted per-user counter is a possible follow-up for stronger guarantees.
export const aiGenerationRateLimiter = createRateLimiter({
    limit: storylineConfig.rateLimits.maxGenerationsPerDay,
    windowMs: ONE_DAY_MS,
});

export function resetAiGenerationRateLimiter(key?: string) {
    aiGenerationRateLimiter.reset(key);
}
