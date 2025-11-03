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
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-debug-'));
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
    resetRegistrationRateLimiter();

    const register = await client.post('/api/users/register', {
        body: { username: `debugger_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    authToken = (register.body as JsonRecord).token as string;
});

afterAll(() => {
    resetDataFileOverrides();
    if (dataDir) {
        rmSync(dataDir, { recursive: true, force: true });
    }
});

function authHeaders() {
    return { authorization: `Bearer ${authToken}`, accept: 'application/json' };
}

test('debug endpoints require authentication', async () => {
    const res = await client.post('/api/debug/clear-tasks');
    expect(res.status).toBe(401);
});

test('clear-tasks removes only the authenticated user tasks', async () => {
    await client.post('/api/tasks', {
        body: { description: 'clear me' },
        headers: authHeaders()
    });

    const res = await client.post('/api/debug/clear-tasks', {
        headers: authHeaders()
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.removed).toBe(1);

    const list = await client.get('/api/tasks', { headers: authHeaders() });
    expect((list.body as JsonRecord).tasks).toEqual([]);
});

test('seed-tasks creates demo tasks and removes previous ones for user', async () => {
    // seed with custom count
    await client.post('/api/tasks', {
        body: { description: 'existing to replace' },
        headers: authHeaders()
    });

    const res = await client.post('/api/debug/seed-tasks', {
        body: { count: 3 },
        headers: authHeaders()
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.created).toBe(3);
    expect(body.removedBeforeSeed).toBe(1);
    const seeded = body.tasks as unknown[];
    expect(Array.isArray(seeded)).toBe(true);
    expect(seeded).toHaveLength(3);

    const list = await client.get('/api/tasks', { headers: authHeaders() });
    const tasks = (list.body as JsonRecord).tasks as unknown[];
    expect(tasks).toHaveLength(3);
});

test('grant-xp adjusts player XP and returns event', async () => {
    const res = await client.post('/api/debug/grant-xp', {
        body: { amount: 75 },
        headers: authHeaders()
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    const event = body.xp_event as JsonRecord;
    expect(event.amount).toBe(75);
    expect(event.reason).toBe('debug_adjustment');
    const player = body.player_rpg as JsonRecord;
    expect(player.xp).toBeGreaterThanOrEqual(75);
});

test('reset-rpg returns player to baseline stats', async () => {
    await client.post('/api/debug/grant-xp', {
        body: { amount: 100 },
        headers: authHeaders()
    });

    const res = await client.post('/api/debug/reset-rpg', {
        headers: authHeaders()
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    const player = body.player_rpg as JsonRecord;
    expect(player.level).toBe(1);
    expect(player.xp).toBe(0);
    const counters = player.counters as JsonRecord;
    expect(counters.tasks_completed).toBe(0);
});
