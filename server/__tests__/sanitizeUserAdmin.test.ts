import { sanitizeUser } from '../src/data/userStore';
import { buildDefaultUser } from '../src/testing/fixtures';

describe('sanitizeUser exposes is_admin', () => {
    const prev = process.env.ADMIN_USERNAMES;
    beforeAll(() => {
        process.env.ADMIN_USERNAMES = 'boss, Captain';
    });
    afterAll(() => {
        if (prev === undefined) delete process.env.ADMIN_USERNAMES;
        else process.env.ADMIN_USERNAMES = prev;
    });

    test('is_admin is true for an allowlisted username (case-insensitive)', () => {
        expect(sanitizeUser(buildDefaultUser({ username: 'boss' }))?.is_admin).toBe(true);
        expect(sanitizeUser(buildDefaultUser({ username: 'CAPTAIN' }))?.is_admin).toBe(true);
    });

    test('is_admin is false for a non-allowlisted username', () => {
        expect(sanitizeUser(buildDefaultUser({ username: 'pleb' }))?.is_admin).toBe(false);
    });

    test('does not leak the password hash', () => {
        const safe = sanitizeUser(buildDefaultUser({ username: 'boss' }));
        expect(safe).not.toHaveProperty('password_hash');
    });
});
