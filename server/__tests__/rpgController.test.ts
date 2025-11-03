import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jest } from '@jest/globals';

import app from '../src/app.js';
import * as experienceEngine from '../src/rpg/experienceEngine.js';
import { readUsers, writeUsers } from '../src/data/userStore.js';
import * as userStoreModule from '../src/data/userStore.js';
import { resetRegistrationRateLimiter } from '../src/security/registrationRateLimiter.js';
import { createTestClient, type TestClient } from '../src/utils/testClient.js';
import {
    JsonRecord,
    buildDefaultUser,
    configureDataFiles,
    resetDataFileOverrides,
    resetTaskStore,
    resetCampaignStore,
    resetUserStore
} from '../src/testing/fixtures.js';
import { XP_CONFIG } from '../src/rpg/rewardTables.js';

let dataDir: string;
let tasksFile: string;
let usersFile: string;
let campaignsFile: string;
let client: TestClient;
let authToken: string;

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-rpg-'));
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
        body: { username: `player_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    authToken = (register.body as JsonRecord).token as string;
});

afterAll(() => {
    resetDataFileOverrides();
    rmSync(dataDir, { recursive: true, force: true });
});

function authHeaders() {
    return { authorization: `Bearer ${authToken}`, accept: 'application/json' };
}

test('claim daily reward grants XP once per day', async () => {
    const first = await client.post('/api/rpg/daily-reward', {
        headers: authHeaders()
    });
    expect(first.status).toBe(200);
    const firstBody = first.body as JsonRecord;
    expect((firstBody.xp_event as JsonRecord).amount).toBeGreaterThan(0);

    const second = await client.post('/api/rpg/daily-reward', {
        headers: authHeaders()
    });
    expect(second.status).toBe(400);
    expect((second.body as JsonRecord).error).toMatch(/already claimed/i);
});

test('claim daily reward errors when user missing', async () => {
    resetUserStore(usersFile, []);
    const res = await client.post('/api/rpg/daily-reward', {
        headers: authHeaders()
    });
    expect(res.status).toBe(404);
});

test('claim daily reward handles applyXp failure', async () => {
    const originalDailyXp = XP_CONFIG.dailyBaseXp;
    XP_CONFIG.dailyBaseXp = 0;
    const res = await client.post('/api/rpg/daily-reward', {
        headers: authHeaders()
    });
    expect(res.status).toBe(500);
    XP_CONFIG.dailyBaseXp = originalDailyXp;
});

test('grant XP validates amount and handles missing user', async () => {
    const invalid = await client.post('/api/rpg/grant-xp', {
        body: { amount: 'oops' },
        headers: authHeaders()
    });
    expect(invalid.status).toBe(400);

    const zero = await client.post('/api/rpg/grant-xp', {
        body: { amount: 0 },
        headers: authHeaders()
    });
    expect(zero.status).toBe(400);

    const removeUser = readUsers();
    removeUser.users = [];
    writeUsers(removeUser);

    const missing = await client.post('/api/rpg/grant-xp', {
        body: { amount: 10 },
        headers: authHeaders()
    });
    expect(missing.status).toBe(404);
});

test('grant XP handles write errors', async () => {
    const failingDir = mkdtempSync(join(tmpdir(), 'task-track-writefail-'));
    const failingPath = join(failingDir, 'users.json');
    writeFileSync(failingPath, readFileSync(usersFile));
    chmodSync(failingDir, 0o555);
    configureDataFiles({ users: failingPath });
    try {
        const res = await client.post('/api/rpg/grant-xp', {
            body: { amount: 5 },
            headers: authHeaders()
        });
        expect(res.status).toBe(500);
    } finally {
        configureDataFiles({ users: usersFile });
        chmodSync(failingDir, 0o755);
        rmSync(failingDir, { recursive: true, force: true });
    }
});

test('reset RPG restores baseline and handles failures', async () => {
    const res = await client.post('/api/rpg/reset', {
        headers: authHeaders()
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect((body.player_rpg as JsonRecord).level).toBe(1);

    const remove = readUsers();
    remove.users = [];
    writeUsers(remove);
    const missing = await client.post('/api/rpg/reset', { headers: authHeaders() });
    expect(missing.status).toBe(404);
});

test('rpg endpoints enforce authentication', async () => {
    const res = await client.post('/api/rpg/daily-reward');
    expect(res.status).toBe(401);
});
