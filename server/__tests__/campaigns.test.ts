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
    resetCampaignStore,
    resetTaskStore,
    resetUserStore
} from '../src/testing/fixtures';

let dataDir: string;
let tasksFile: string;
let usersFile: string;
let campaignsFile: string;

let authToken: string | null = null;
let client: TestClient;

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-'));
    tasksFile = join(dataDir, 'tasks.json');
    usersFile = join(dataDir, 'users.json');
    campaignsFile = join(dataDir, 'campaigns.json');
    configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
});

beforeEach(() => {
    authToken = null;
    resetTaskStore(tasksFile);
    resetCampaignStore(campaignsFile);
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

test('creates campaign and aggregates quest stats', async () => {
    const createRes = await client.post('/api/campaigns', {
        body: { name: 'Atlas Campaign', description: 'Bring quests together' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(createRes.status).toBe(201);
    const campaignBody = createRes.body as JsonRecord;
    expect(typeof campaignBody.id).toBe('number');
    expect(campaignBody.progress_summary).toBe('0/0');
    const campaignId = campaignBody.id as number;

    const firstTask = await client.post('/api/tasks', {
        body: { description: 'Scout ruins', campaign_id: campaignId },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(firstTask.status).toBe(201);

    const secondTask = await client.post('/api/tasks', {
        body: { description: 'Draft expedition plan', campaign_id: campaignId },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(secondTask.status).toBe(201);

    const statusRes = await client.patch(`/api/tasks/${(firstTask.body as JsonRecord).id}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(statusRes.status).toBe(200);

    const listRes = await client.get('/api/campaigns', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(listRes.status).toBe(200);
    const listBody = listRes.body as { campaigns: Array<JsonRecord> };
    expect(Array.isArray(listBody.campaigns)).toBe(true);
    expect(listBody.campaigns.length).toBe(1);
    const campaign = listBody.campaigns[0] as JsonRecord;
    expect(campaign.stats).toMatchObject({ quests_total: 2, quests_completed: 1, completion_percent: 50 });
    expect(campaign.progress_summary).toBe('1/2');
});

test('filters tasks by campaign via query parameter', async () => {
    const campaignRes = await client.post('/api/campaigns', {
        body: { name: 'Questline', description: '' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const campaignBody = campaignRes.body as JsonRecord;
    const campaignId = campaignBody.id as number;

    const associated = await client.post('/api/tasks', {
        body: { description: 'Linked quest', campaign_id: campaignId },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(associated.status).toBe(201);

    const standalone = await client.post('/api/tasks', {
        body: { description: 'Unlinked quest' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(standalone.status).toBe(201);

    const filtered = await client.get(`/api/tasks?campaign_id=${campaignId}`, {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(filtered.status).toBe(200);
    const filteredBody = filtered.body as { tasks: Array<JsonRecord> };
    expect(filteredBody.tasks.length).toBe(1);
    const filteredTask = filteredBody.tasks[0] as JsonRecord;
    expect(filteredTask.campaign_id).toBe(campaignId);

    const uncategorized = await client.get('/api/tasks?campaign_id=null', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(uncategorized.status).toBe(200);
    const uncategorizedBody = uncategorized.body as { tasks: Array<JsonRecord> };
    expect(uncategorizedBody.tasks.length).toBe(1);
    const remainingTask = uncategorizedBody.tasks[0] as JsonRecord;
    expect(remainingTask.id).toBe((standalone.body as JsonRecord).id);
});

test('rejects task creation when campaign is missing', async () => {
    const res = await client.post('/api/tasks', {
        body: { description: 'Invalid quest', campaign_id: 999 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.status).toBe(404);
    const body = res.body as JsonRecord;
    expect(typeof body.error).toBe('string');
});

test('rejects campaign creation without a valid name', async () => {
    const res = await client.post('/api/campaigns', {
        body: { name: '   ', description: 'Missing name' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.status).toBe(400);
    const body = res.body as JsonRecord;
    expect(typeof body.error).toBe('string');
});

test('rejects campaign updates with invalid fields', async () => {
    const create = await client.post('/api/campaigns', {
        body: { name: 'Field Checks' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(create.status).toBe(201);
    const id = (create.body as JsonRecord).id as number;

    const invalidDescription = await client.patch(`/api/campaigns/${id}`, {
        body: { description: 42 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(invalidDescription.status).toBe(400);

    const invalidArchived = await client.patch(`/api/campaigns/${id}`, {
        body: { archived: 'yes' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(invalidArchived.status).toBe(400);
});

test('returns not found when deleting a missing campaign', async () => {
    const res = await client.delete('/api/campaigns/999', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.status).toBe(404);
    const body = res.body as JsonRecord;
    expect(typeof body.error).toBe('string');
});

test('cannot access campaigns owned by another user', async () => {
    const create = await client.post('/api/campaigns', {
        body: { name: 'Secret Operations' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(create.status).toBe(201);
    const campaignId = (create.body as JsonRecord).id as number;

    const secondUser = await client.post('/api/users/register', {
        body: { username: `intruder_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    const otherToken = (secondUser.body as JsonRecord).token as string;

    const getRes = await client.get(`/api/campaigns/${campaignId}`, {
        headers: { authorization: `Bearer ${otherToken}` }
    });
    expect(getRes.status).toBe(404);
});

test('retrieves campaign detail with related quests', async () => {
    const campaignRes = await client.post('/api/campaigns', {
        body: { name: 'Detail Run' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const campaignId = (campaignRes.body as JsonRecord).id as number;

    await client.post('/api/tasks', {
        body: { description: 'Linked quest', campaign_id: campaignId },
        headers: { authorization: `Bearer ${authToken}` }
    });

    const detail = await client.get(`/api/campaigns/${campaignId}`, {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(detail.status).toBe(200);
    const body = detail.body as JsonRecord;
    expect((body.campaign as JsonRecord).id).toBe(campaignId);
    const quests = body.quests as unknown[];
    expect(Array.isArray(quests)).toBe(true);
    expect(quests).toHaveLength(1);
});

test('updates campaign fields and respects archived filters', async () => {
    const createRes = await client.post('/api/campaigns', {
        body: { name: 'Archivists' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const campaignId = (createRes.body as JsonRecord).id as number;

    const updateRes = await client.patch(`/api/campaigns/${campaignId}`, {
        body: {
            name: 'Archivists United',
            description: 'Maintaining coverage history',
            image_url: '  ',
            archived: true
        },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(updateRes.status).toBe(200);
    const updated = updateRes.body as JsonRecord;
    expect(updated).toMatchObject({
        name: 'Archivists United',
        description: 'Maintaining coverage history',
        image_url: null,
        archived: true
    });

    const withoutArchived = await client.get('/api/campaigns', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const listBody = withoutArchived.body as { campaigns: Array<JsonRecord> };
    expect(listBody.campaigns).toEqual([]);

    const withArchived = await client.get('/api/campaigns?include_archived=true', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const archivedList = withArchived.body as { campaigns: Array<JsonRecord> };
    expect(archivedList.campaigns.length).toBe(1);
    expect((archivedList.campaigns[0] as JsonRecord).name).toBe('Archivists United');
});

test('deletes campaign and detaches related tasks', async () => {
    const createRes = await client.post('/api/campaigns', {
        body: { name: 'Cleanup Crew' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const campaignId = (createRes.body as JsonRecord).id as number;
    const taskRes = await client.post('/api/tasks', {
        body: { description: 'Detach me', campaign_id: campaignId },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const taskId = (taskRes.body as JsonRecord).id as number;

    const deleteRes = await client.delete(`/api/campaigns/${campaignId}`, {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(deleteRes.status).toBe(204);

    const taskDetail = await client.get('/api/tasks', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    const tasks = (taskDetail.body as { tasks: Array<JsonRecord> }).tasks;
    const detached = tasks.find((task) => task.id === taskId);
    expect(detached).toBeDefined();
    expect(detached?.campaign_id ?? null).toBeNull();
});

test('list campaigns requires authentication', async () => {
    const res = await client.get('/api/campaigns');
    expect(res.status).toBe(401);
});
