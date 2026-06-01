import type { CorsOptions } from 'cors';

// Default origins for local development when ALLOWED_ORIGINS is unset.
const DEV_DEFAULT_ORIGINS = ['http://localhost:4000', 'http://localhost:3000'];

const isProduction = process.env.NODE_ENV === 'production';

function resolveAllowedOrigins(): string[] {
    const fromEnv = process.env.ALLOWED_ORIGINS;
    if (fromEnv && fromEnv.trim()) {
        return fromEnv
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    }
    return DEV_DEFAULT_ORIGINS;
}

const allowedOrigins = resolveAllowedOrigins();

// True for loopback origins on any port (localhost / 127.0.0.1 / [::1]).
function isLoopbackOrigin(origin: string): boolean {
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
        return false;
    }
}

function isOriginAllowed(origin: string): boolean {
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    // In local development the Create React App dev server proxies /api requests
    // to this server and rewrites the forwarded Origin header to the proxy
    // target — the API's own origin (e.g. http://localhost:4001). A strict
    // allowlist would reject those, breaking every proxied POST/PUT in dev.
    // Outside production we therefore accept any loopback origin regardless of
    // port; production still relies solely on the explicit allowlist.
    if (!isProduction && isLoopbackOrigin(origin)) {
        return true;
    }
    return false;
}

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Requests with no Origin header (curl, same-origin, mobile apps) are allowed.
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
