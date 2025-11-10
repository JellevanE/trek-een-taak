import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
import { resetRegistrationRateLimiter } from '../src/security/registrationRateLimiter';
import { createTestClient, type TestClient } from '../src/utils/testClient';
import {
    buildDefaultUser,
    JsonRecord,
    configureDataFiles,
    resetCampaignStore,
    resetDataFileOverrides,
    resetTaskStore,
    resetUserStore
} from '../src/testing/fixtures';

let dataDir: string;
let tasksFile: string;
let usersFile: string;
let campaignsFile: string;
let client: TestClient;
let authToken: string;

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-users-'));
    tasksFile = join(dataDir, 'tasks.json');
    usersFile = join(dataDir, 'users.json');
    campaignsFile = join(dataDir, 'campaigns.json');
    configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
    client = createTestClient(app);
});

beforeEach(async () => {
    resetRegistrationRateLimiter();
    resetTaskStore(tasksFile);
    resetCampaignStore(campaignsFile);
    resetUserStore(usersFile, [buildDefaultUser()]);

    const register = await client.post('/api/users/register', {
        body: { username: `tester_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    authToken = (register.body as JsonRecord).token as string;
});

afterAll(() => {
    resetDataFileOverrides();
    rmSync(dataDir, { recursive: true, force: true });
});

test('check username availability returns suggestions when taken', async () => {
    const unavailable = await client.get('/api/users/check-username/local');
    expect(unavailable.status).toBe(200);
    const body = unavailable.body as JsonRecord;
    expect(body.available).toBe(false);
    const suggestions = body.suggestions as unknown[];
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
});

test('check username availability flags reserved usernames', async () => {
    const res = await client.get('/api/users/check-username/admin');
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.available).toBe(false);
    expect(body.reserved).toBe(true);
    const suggestions = body.suggestions as unknown[];
    expect(Array.isArray(suggestions)).toBe(true);
});

test('check username availability returns available true for new name', async () => {
    const res = await client.get('/api/users/check-username/brand_new_name');
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.available).toBe(true);
});

test('validate email accepts RFC-compliant addresses', async () => {
    const res = await client.post('/api/users/validate-email', {
        body: { email: 'hero@example.com ' },
        headers: { accept: 'application/json' }
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.valid).toBe(true);
    expect(body.normalized_email).toBe('hero@example.com');
});

test('validate email rejects malformed addresses', async () => {
    const res = await client.post('/api/users/validate-email', {
        body: { email: 'not-an-email' },
        headers: { accept: 'application/json' }
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.valid).toBe(false);
    expect(body.reason).toBe('invalid_format');
});

test('register rejects reserved usernames', async () => {
    resetRegistrationRateLimiter();
    const res = await client.post('/api/users/register', {
        body: { username: 'ADMIN', password: 'password123!' },
        headers: { accept: 'application/json' }
    });
    expect(res.status).toBe(400);
    const body = res.body as JsonRecord;
    expect(String(body.error)).toMatch(/not allowed/i);
});

test('register enforces per-ip rate limiting', async () => {
    resetRegistrationRateLimiter();
    const headers = { accept: 'application/json', 'x-forwarded-for': '203.0.113.25' };
    for (let index = 0; index < 5; index += 1) {
        const attempt = await client.post('/api/users/register', {
            body: { username: `rate_limited_${Date.now()}_${index}`, password: 'secretpass1' },
            headers
        });
        expect(attempt.status).toBe(201);
    }

    const blocked = await client.post('/api/users/register', {
        body: { username: `rate_limited_${Date.now()}_blocked`, password: 'secretpass1' },
        headers
    });
    expect(blocked.status).toBe(429);
    const body = blocked.body as JsonRecord;
    expect(String(body.error)).toMatch(/too many/i);
    expect(blocked.headers['retry-after']).toBeDefined();
    resetRegistrationRateLimiter();
});

test('get /me requires authentication', async () => {
    const res = await client.get('/api/users/me');
    expect(res.status).toBe(401);
});

test('profile update persists changes', async () => {
    const update = await client.put('/api/users/me', {
        body: { display_name: 'Arcane Wanderer', bio: 'From coverage town.' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(update.status).toBe(200);
    const body = update.body as JsonRecord;
    const user = body.user as JsonRecord;
    expect(user.profile).toMatchObject({ display_name: 'Arcane Wanderer', bio: 'From coverage town.' });

    const me = await client.get('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const meBody = me.body as JsonRecord;
    const current = meBody.user as JsonRecord;
    expect(current.profile).toMatchObject({ display_name: 'Arcane Wanderer', bio: 'From coverage town.' });
});

test('profile update rejects invalid preferences', async () => {
    const res = await client.put('/api/users/me', {
        body: { prefs: 'not-an-object' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(res.status).toBe(400);
    const body = res.body as JsonRecord;
    expect(String(body.error)).toMatch(/pref/i);
});
