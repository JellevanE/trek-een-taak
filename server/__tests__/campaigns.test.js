const fs = require('fs');
const path = require('path');
const app = require('../app');
const experience = require('../rpg/experience');
const { createTestClient } = require('../utils/testClient');

const TASKS_FILE = path.join(__dirname, '..', 'tasks.json');
const USERS_FILE = path.join(__dirname, '..', 'users.json');
const CAMPAIGNS_FILE = path.join(__dirname, '..', 'campaigns.json');

let authToken = null;
let client = null;

function resetFixtures() {
    const tasksInitial = { tasks: [], nextId: 1 };
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasksInitial, null, 2));
    const campaignsInitial = { campaigns: [], nextId: 1 };
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaignsInitial, null, 2));
    const now = new Date().toISOString();
    const defaultUser = {
        id: 1,
        username: 'local',
        password_hash: '',
        email: null,
        created_at: now,
        updated_at: now,
        profile: { display_name: 'Local User', avatar: null, class: 'adventurer', bio: '' },
        rpg: experience.createInitialRpgState()
    };
    const usersInitial = { users: [defaultUser], nextId: 2 };
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersInitial, null, 2));
}

beforeEach(() => {
    resetFixtures();
    client = createTestClient(app);
});

beforeEach(async () => {
    const res = await client.post('/api/users/register', {
        body: { username: `testuser_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' }
    });
    authToken = res.body && res.body.token;
});

afterAll(() => {
    resetFixtures();
});

test('creates campaign and aggregates quest stats', async () => {
    const createRes = await client.post('/api/campaigns', {
        body: { name: 'Atlas Campaign', description: 'Bring quests together' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body).toHaveProperty('progress_summary', '0/0');
    const campaignId = createRes.body.id;

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

    const statusRes = await client.patch(`/api/tasks/${firstTask.body.id}/status`, {
        body: { status: 'done' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(statusRes.status).toBe(200);

    const listRes = await client.get('/api/campaigns', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.campaigns)).toBe(true);
    expect(listRes.body.campaigns.length).toBe(1);
    const campaign = listRes.body.campaigns[0];
    expect(campaign.stats).toMatchObject({ quests_total: 2, quests_completed: 1, completion_percent: 50 });
    expect(campaign.progress_summary).toBe('1/2');
});

test('filters tasks by campaign via query parameter', async () => {
    const campaignRes = await client.post('/api/campaigns', {
        body: { name: 'Questline', description: '' },
        headers: { authorization: `Bearer ${authToken}` }
    });
    const campaignId = campaignRes.body.id;

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
    expect(filtered.body.tasks.length).toBe(1);
    expect(filtered.body.tasks[0].campaign_id).toBe(campaignId);

    const uncategorized = await client.get('/api/tasks?campaign_id=null', {
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(uncategorized.status).toBe(200);
    expect(uncategorized.body.tasks.length).toBe(1);
    expect(uncategorized.body.tasks[0].id).toBe(standalone.body.id);
});

test('rejects task creation when campaign is missing', async () => {
    const res = await client.post('/api/tasks', {
        body: { description: 'Invalid quest', campaign_id: 999 },
        headers: { authorization: `Bearer ${authToken}` }
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/campaign/i);
});
