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

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-auth-'));
    tasksFile = join(dataDir, 'tasks.json');
    usersFile = join(dataDir, 'users.json');
    campaignsFile = join(dataDir, 'campaigns.json');
    configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
    client = createTestClient(app);
});

beforeEach(() => {
    resetTaskStore(tasksFile);
    resetCampaignStore(campaignsFile);
    resetUserStore(usersFile, [buildDefaultUser()]);
    resetRegistrationRateLimiter();
});

afterAll(() => {
    resetDataFileOverrides();
    if (dataDir) {
        rmSync(dataDir, { recursive: true, force: true });
    }
});

function expectError(response: { status: number; body: unknown }, status: number) {
    expect(response.status).toBe(status);
    const body = response.body as JsonRecord;
    expect(typeof body.error).toBe('string');
}

test('register rejects blank username', async () => {
    const res = await client.post('/api/users/register', {
        body: { username: '   ', password: 'secret123' },
        headers: { accept: 'application/json' }
    });
    expectError(res, 400);
});

test('register rejects passwords shorter than 6 chars', async () => {
    const res = await client.post('/api/users/register', {
        body: { username: 'newhero', password: '123' },
        headers: { accept: 'application/json' }
    });
    expectError(res, 400);
});

test('register rejects invalid profile class', async () => {
    const res = await client.post('/api/users/register', {
        body: {
            username: 'invalidclass',
            password: 'secret123',
            profile: { class: 'paladin' }
        },
        headers: { accept: 'application/json' }
    });
    expect(res.status).toBe(400);
    const body = res.body as JsonRecord;
    expect(String(body.error)).toMatch(/profile\.class/i);
});

test('register rejects duplicate usernames', async () => {
    const first = await client.post('/api/users/register', {
        body: { username: 'guildmaster', password: 'password123' },
        headers: { accept: 'application/json' }
    });
    expect(first.status).toBe(201);

    const dup = await client.post('/api/users/register', {
        body: { username: 'GuildMaster', password: 'password123' },
        headers: { accept: 'application/json' }
    });
    expectError(dup, 400);
});

test('login requires both username and password', async () => {
    const res = await client.post('/api/users/login', {
        body: { username: 'someone' },
        headers: { accept: 'application/json' }
    });
    expectError(res, 400);
});

test('login rejects invalid credentials', async () => {
    await client.post('/api/users/register', {
        body: { username: 'scout', password: 'password123' },
        headers: { accept: 'application/json' }
    });

    const res = await client.post('/api/users/login', {
        body: { username: 'scout', password: 'wrongpass' },
        headers: { accept: 'application/json' }
    });
    expectError(res, 401);
});

test('login succeeds after registration', async () => {
    const register = await client.post('/api/users/register', {
        body: { username: 'enchanter', password: 'password123' },
        headers: { accept: 'application/json' }
    });
    expect(register.status).toBe(201);

    const login = await client.post('/api/users/login', {
        body: { username: 'Enchanter', password: 'password123' },
        headers: { accept: 'application/json' }
    });
    expect(login.status).toBe(200);
    const body = login.body as JsonRecord;
    expect(typeof body.token).toBe('string');
    const user = body.user as JsonRecord;
    expect(user.username).toBe('enchanter');
    expect(user).not.toHaveProperty('password_hash');
});
