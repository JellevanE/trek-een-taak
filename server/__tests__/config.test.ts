import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jest } from '@jest/globals';

describe('config secret resolution', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        jest.resetModules();
        Object.keys(process.env).forEach((key) => {
            delete (process.env as Record<string, string | undefined>)[key];
        });
        Object.assign(process.env, originalEnv);
    });

    test('falls back to test secret when no values provided', async () => {
        process.env.NODE_ENV = 'test';
        jest.resetModules();
        const { jwtSecrets, primaryJwtSecret } = await import('../src/config.js');
        expect(jwtSecrets).toEqual(['test-secret']);
        expect(primaryJwtSecret).toBe('test-secret');
    });

    test('aggregates secrets from file and environment variables', async () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'config-secrets-'));
        const secretFile = join(tempDir, 'secret.txt');
        writeFileSync(secretFile, 'from-file');

        process.env.JWT_SECRET_FILE = secretFile;
        process.env.JWT_SECRETS = 'from-env , extra ';
        process.env.JWT_SECRET = 'single';

        jest.resetModules();
        const { jwtSecrets } = await import('../src/config.js');
        expect(jwtSecrets).toEqual(['from-file', 'from-env', 'extra', 'single']);

        rmSync(tempDir, { recursive: true, force: true });
    });

    test('throws when secret file cannot be read', async () => {
        process.env.JWT_SECRET_FILE = join(tmpdir(), 'missing-secret.txt');
        jest.resetModules();
        await expect(import('../src/config.js')).rejects.toThrow(/Failed to read JWT secret file/);
    });
});
