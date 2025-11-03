export interface RateLimiterOptions {
    windowMs: number;
    limit: number;
    now?: () => number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetInMs: number;
}

interface RateLimitBucket {
    count: number;
    windowStart: number;
}

function defaultNow(): number {
    return Date.now();
}

export function createRateLimiter(options: RateLimiterOptions) {
    const { windowMs, limit, now = defaultNow } = options;
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error('windowMs must be a positive number');
    }
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error('limit must be a positive number');
    }

    const buckets = new Map<string, RateLimitBucket>();

    function calculateResetInMs(bucket: RateLimitBucket, current: number): number {
        const resetIn = bucket.windowStart + windowMs - current;
        return resetIn > 0 ? resetIn : 0;
    }

    function attempt(key: string): RateLimitResult {
        const current = now();
        const existing = buckets.get(key);

        if (!existing || current - existing.windowStart >= windowMs) {
            buckets.set(key, { count: 1, windowStart: current });
            return {
                allowed: true,
                remaining: limit - 1,
                limit,
                resetInMs: windowMs
            };
        }

        if (existing.count >= limit) {
            return {
                allowed: false,
                remaining: 0,
                limit,
                resetInMs: calculateResetInMs(existing, current)
            };
        }

        existing.count += 1;
        return {
            allowed: true,
            remaining: Math.max(limit - existing.count, 0),
            limit,
            resetInMs: calculateResetInMs(existing, current)
        };
    }

    function reset(key?: string) {
        if (typeof key === 'string') {
            buckets.delete(key);
        } else {
            buckets.clear();
        }
    }

    function getSnapshot(key: string): RateLimitBucket | undefined {
        const bucket = buckets.get(key);
        if (!bucket) return undefined;
        return { ...bucket };
    }

    return {
        attempt,
        reset,
        getSnapshot
    };
}
