import { jest } from '@jest/globals';
import type { CorsOptions } from 'cors';

// Invokes the cors `origin` callback and resolves with the allow decision,
// or rejects with the error cors would surface.
function decide(corsOptions: CorsOptions, origin: string | undefined): Promise<boolean> {
    const originFn = corsOptions.origin as (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
    ) => void;
    return new Promise((resolve, reject) => {
        originFn(origin, (err, allow) => {
            if (err) reject(err);
            else resolve(Boolean(allow));
        });
    });
}

describe('corsOptions origin policy', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        jest.resetModules();
        Object.keys(process.env).forEach((key) => {
            delete (process.env as Record<string, string | undefined>)[key];
        });
        Object.assign(process.env, originalEnv);
    });

    test('allows requests with no Origin header (curl, same-origin GET)', async () => {
        process.env.NODE_ENV = 'test';
        delete process.env.ALLOWED_ORIGINS;
        jest.resetModules();
        const { corsOptions } = await import('../src/security/corsOptions.js');
        await expect(decide(corsOptions, undefined)).resolves.toBe(true);
    });

    test('allows the configured dev client origin', async () => {
        process.env.NODE_ENV = 'test';
        delete process.env.ALLOWED_ORIGINS;
        jest.resetModules();
        const { corsOptions } = await import('../src/security/corsOptions.js');
        await expect(decide(corsOptions, 'http://localhost:4000')).resolves.toBe(true);
    });

    // The CRA dev proxy rewrites the forwarded Origin header to the proxy
    // target (the API's own origin, e.g. http://localhost:4001). Local dev
    // POSTs would otherwise be rejected.
    test('allows the CRA proxy target origin (server own port) in development', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.ALLOWED_ORIGINS;
        jest.resetModules();
        const { corsOptions } = await import('../src/security/corsOptions.js');
        await expect(decide(corsOptions, 'http://localhost:4001')).resolves.toBe(true);
        await expect(decide(corsOptions, 'http://127.0.0.1:4001')).resolves.toBe(true);
    });

    test('rejects an unknown remote origin in development', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.ALLOWED_ORIGINS;
        jest.resetModules();
        const { corsOptions } = await import('../src/security/corsOptions.js');
        await expect(decide(corsOptions, 'https://evil.example.com')).rejects.toThrow(
            /not allowed/,
        );
    });

    test('does NOT auto-allow localhost in production (allowlist only)', async () => {
        process.env.NODE_ENV = 'production';
        process.env.ALLOWED_ORIGINS = 'https://app.example.com';
        jest.resetModules();
        const { corsOptions } = await import('../src/security/corsOptions.js');
        await expect(decide(corsOptions, 'https://app.example.com')).resolves.toBe(true);
        await expect(decide(corsOptions, 'http://localhost:4001')).rejects.toThrow(/not allowed/);
    });
});
