import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
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

test('check username availability returns available true for new name', async () => {
    const res = await client.get('/api/users/check-username/brand_new_name');
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.available).toBe(true);
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
