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
    resetDataFileOverrides,
    resetTaskStore,
    resetUserStore
} from '../src/testing/fixtures';

let dataDir: string;
let tasksFile: string;
let usersFile: string;

let authToken: string | null = null;
let client: TestClient;

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-'));
    tasksFile = join(dataDir, 'tasks.json');
    usersFile = join(dataDir, 'users.json');
    configureDataFiles({ tasks: tasksFile, users: usersFile });
});

beforeEach(() => {
    authToken = null;
    resetTaskStore(tasksFile);
    resetUserStore(usersFile, [buildDefaultUser()]);
    resetRegistrationRateLimiter();
    client = createTestClient(app);
});

beforeEach(async () => {
    const res = await client.post('/api/users/register', {
        body: { username: `testuser_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    const body = res.body as JsonRecord | null;
    authToken = typeof body?.token === 'string' ? body.token : null;
});

afterAll(() => {
    resetDataFileOverrides();
    if (dataDir) {
        rmSync(dataDir, { recursive: true, force: true });
    }
});

test('create subtask returns 201 and task with subtask id', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Parent task', priority: 'medium' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskBody = taskRes.body as { id: number };
    const taskId = taskBody.id;

    const resAuth = await client.post(`/api/tasks/${taskId}/subtasks`, {
        body: { description: 'sub 1' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(resAuth.status).toBe(201);
    const response = resAuth.body as JsonRecord & { sub_tasks: unknown[]; side_quests: unknown[] };
    expect(Array.isArray(response.sub_tasks)).toBe(true);
    expect(response.sub_tasks.length).toBe(1);
    const firstSubtask = response.sub_tasks[0] as JsonRecord;
    expect(typeof firstSubtask.id).toBe('number');
    expect(Array.isArray(response.side_quests)).toBe(true);
    expect(response.side_quests.length).toBe(1);
});

test('create subtask with missing description returns 400', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Parent task', priority: 'medium' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskBody = taskRes.body as { id: number };
    const taskId = taskBody.id;

    const res = await client.post(`/api/tasks/${taskId}/subtasks`, {
        body: { description: '' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(res.status).toBe(400);
});

test('patch status updates task and appends history', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Test task', priority: 'medium' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskBody = taskRes.body as { id: number };
    const taskId = taskBody.id;

    const res = await client.patch(`/api/tasks/${taskId}/status`, {
        body: { status: 'in_progress', note: 'working' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(res.status).toBe(200);
    const body = res.body as JsonRecord;
    expect(body.status).toBe('in_progress');
    const history = body.status_history as unknown[];
    expect(Array.isArray(history)).toBe(true);
    const lastEntry = history[history.length - 1] as JsonRecord;
    expect(lastEntry.status).toBe('in_progress');
    expect(Array.isArray(body.side_quests as unknown[])).toBe(true);
});

test('completing a task awards XP and returns player snapshot', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'XP quest', priority: 'medium', task_level: 2 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskBody = taskRes.body as { id: number };
    const taskId = taskBody.id;

    const completeRes = await client.patch(`/api/tasks/${taskId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(completeRes.status).toBe(200);
    const body = completeRes.body as JsonRecord;
    const events = body.xp_events as unknown[];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    const event = events[0] as JsonRecord;
    expect(event.reason).toBe('task_complete');
    const metadata = event.metadata as JsonRecord;
    expect(metadata.task_id).toBe(taskId);
    expect(typeof event.amount).toBe('number');
    const player = body.player_rpg as JsonRecord;
    expect(typeof player.xp).toBe('number');
    expect((player.xp as number) > 0).toBe(true);

    const profileRes = await client.get('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(profileRes.status).toBe(200);
    const profileBody = profileRes.body as JsonRecord;
    const user = profileBody.user as JsonRecord;
    const rpg = user.rpg as JsonRecord;
    expect(typeof rpg.xp).toBe('number');
    expect((rpg.xp as number) > 0).toBe(true);
});

test('completing a subtask grants XP once', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Parent XP quest', priority: 'high', task_level: 3 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskBody = taskRes.body as { id: number };
    const taskId = taskBody.id;

    const subRes = await client.post(`/api/tasks/${taskId}/subtasks`, {
        body: { description: 'earn xp side quest' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    const subBody = subRes.body as JsonRecord & { sub_tasks: Array<JsonRecord> };
    const subId = (subBody.sub_tasks[0] as JsonRecord).id as number;

    const subComplete = await client.patch(`/api/tasks/${taskId}/subtasks/${subId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(subComplete.status).toBe(200);
    const body = subComplete.body as JsonRecord;
    const events = body.xp_events as unknown[];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    const subEvent = events[0] as JsonRecord;
    expect(subEvent.reason).toBe('subtask_complete');
    const metadata = subEvent.metadata as JsonRecord;
    expect(metadata.subtask_id).toBe(subId);
    const player = body.player_rpg as JsonRecord;
    expect(typeof player.xp).toBe('number');
    expect((player.xp as number) > 0).toBe(true);
});

test('re-completing a task does not grant additional XP', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'One-shot quest', priority: 'medium', task_level: 2 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskId = (taskRes.body as { id: number }).id;

    const firstComplete = await client.patch(`/api/tasks/${taskId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(firstComplete.status).toBe(200);
    const firstBody = firstComplete.body as JsonRecord;
    const firstPlayer = firstBody.player_rpg as JsonRecord;
    const xpAfterFirst = firstPlayer.xp as number;
    expect(firstBody.xp_events).toBeDefined();

    const secondComplete = await client.patch(`/api/tasks/${taskId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(secondComplete.status).toBe(200);
    const secondBody = secondComplete.body as JsonRecord;
    expect(secondBody).not.toHaveProperty('xp_events');

    const profileRes = await client.get('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const profileBody = profileRes.body as JsonRecord;
    const user = profileBody.user as JsonRecord;
    const playerState = user.rpg as JsonRecord;
    expect(playerState.xp).toBe(xpAfterFirst);
});

test('re-completing a subtask does not grant additional XP', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Split quest', priority: 'high', task_level: 3 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskId = (taskRes.body as { id: number }).id;

    const subRes = await client.post(`/api/tasks/${taskId}/subtasks`, {
        body: { description: 'Initial effort' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    const subTasks = (subRes.body as JsonRecord & { sub_tasks: Array<JsonRecord> }).sub_tasks || [];
    expect(subTasks.length).toBeGreaterThan(0);
    const subId = subTasks[0].id as number;

    const firstComplete = await client.patch(`/api/tasks/${taskId}/subtasks/${subId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(firstComplete.status).toBe(200);
    const firstBody = firstComplete.body as JsonRecord;
    const player = firstBody.player_rpg as JsonRecord;
    const xpAfterFirst = player.xp as number;
    expect(firstBody.xp_events).toBeDefined();

    const secondComplete = await client.patch(`/api/tasks/${taskId}/subtasks/${subId}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(secondComplete.status).toBe(200);
    const secondBody = secondComplete.body as JsonRecord;
    expect(secondBody).not.toHaveProperty('xp_events');

    const profileRes = await client.get('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const profileBody = profileRes.body as JsonRecord;
    const user = profileBody.user as JsonRecord;
    const playerState = user.rpg as JsonRecord;
    expect(playerState.xp).toBe(xpAfterFirst);
});

test('daily reward grants XP once per day', async () => {
    const dailyReward = await client.post('/api/rpg/daily-reward', {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(dailyReward.status).toBe(200);
    const rewardBody = dailyReward.body as JsonRecord;
    const event = rewardBody.xp_event as JsonRecord;
    expect(event.reason).toBe('daily_focus');
    expect(typeof event.amount).toBe('number');
    const player = rewardBody.player_rpg as JsonRecord;
    expect(typeof player.xp).toBe('number');
    expect((player.xp as number) > 0).toBe(true);

    const secondClaim = await client.post('/api/rpg/daily-reward', {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    expect(secondClaim.status).toBe(400);
    const secondBody = secondClaim.body as JsonRecord;
    expect(typeof secondBody.error).toBe('string');
});

test('debug clear tasks removes all user quests', async () => {
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'To clear', priority: 'medium' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(taskRes.status).toBe(201);

    const clearRes = await client.post('/api/debug/clear-tasks', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(clearRes.status).toBe(200);
    const clearBody = clearRes.body as JsonRecord;
    expect(typeof clearBody.removed).toBe('number');
    expect((clearBody.removed as number) > 0).toBe(true);

    const listRes = await client.get('/api/tasks', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(listRes.status).toBe(200);
    const listBody = listRes.body as JsonRecord;
    const tasks = listBody.tasks as unknown[];
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(0);
});
