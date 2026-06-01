import type { CorsOptions } from 'cors';

// Default origins for local development when ALLOWED_ORIGINS is unset.
const DEV_DEFAULT_ORIGINS = ['http://localhost:4000', 'http://localhost:3000'];

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

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Requests with no Origin header (curl, same-origin, mobile apps) are allowed.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
