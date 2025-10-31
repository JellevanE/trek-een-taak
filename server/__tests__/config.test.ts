import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('config secret resolution', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        jest.resetModules();
        Object.keys(process.env).forEach((key) => {
            delete (process.env as Record<string, string | undefined>)[key];
        });
        Object.assign(process.env, originalEnv);
    });

    test('falls back to test secret when no values provided', () => {
        process.env.NODE_ENV = 'test';
        jest.resetModules();
        const { jwtSecrets, primaryJwtSecret } = require('../src/config');
        expect(jwtSecrets).toEqual(['test-secret']);
        expect(primaryJwtSecret).toBe('test-secret');
    });

    test('aggregates secrets from file and environment variables', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'config-secrets-'));
        const secretFile = join(tempDir, 'secret.txt');
        writeFileSync(secretFile, 'from-file');

        process.env.JWT_SECRET_FILE = secretFile;
        process.env.JWT_SECRETS = 'from-env , extra ';
        process.env.JWT_SECRET = 'single';

        jest.resetModules();
        const { jwtSecrets } = require('../src/config');
        expect(jwtSecrets).toEqual(['from-file', 'from-env', 'extra', 'single']);

        rmSync(tempDir, { recursive: true, force: true });
    });

    test('throws when secret file cannot be read', () => {
        process.env.JWT_SECRET_FILE = join(tmpdir(), 'missing-secret.txt');
        expect(() => {
            jest.resetModules();
            require('../src/config');
        }).toThrow(/Failed to read JWT secret file/);
    });
});
