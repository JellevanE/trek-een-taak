import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
import { resetRegistrationRateLimiter } from '../src/security/registrationRateLimiter';
import { createTestClient, type TestClient } from '../src/utils/testClient';
import { readStorylines } from '../src/data/storylineStore';
import {
    buildDefaultUser,
    configureDataFiles,
    JsonRecord,
    resetCampaignStore,
    resetDataFileOverrides,
    resetStorylineStore,
    resetTaskStore,
    resetUserStore,
} from '../src/testing/fixtures';

let dir: string;
let files: { tasks: string; users: string; campaigns: string; storylines: string };
let client: TestClient;
let authToken: string | null = null;

beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'task-track-'));
    files = {
        tasks: join(dir, 'tasks.json'),
        users: join(dir, 'users.json'),
        campaigns: join(dir, 'campaigns.json'),
        storylines: join(dir, 'storylines.json'),
    };
    configureDataFiles(files);
});

beforeEach(async () => {
    resetTaskStore(files.tasks);
    resetCampaignStore(files.campaigns);
    resetUserStore(files.users, [buildDefaultUser()]);
    resetStorylineStore(files.storylines, []);
    resetRegistrationRateLimiter();
    client = createTestClient(app);

    const res = await client.post('/api/users/register', {
        body: { username: `qa_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' },
    });
    const body = res.body as JsonRecord | null;
    authToken = typeof body?.token === 'string' ? body.token : null;
});

afterAll(() => {
    resetDataFileOverrides();
    rmSync(dir, { recursive: true, force: true });
});

test('creating a campaign auto-creates a storyline', async () => {
    const res = await client.post('/api/campaigns', {
        body: { name: 'The Dragon Crusade' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });
    const campaign = res.body as JsonRecord;
    const campaignId = campaign.id as number;

    const stored = readStorylines().storylines;
    expect(stored.some((s) => s.campaignId === campaignId)).toBe(true);
});

test('deleting a campaign cascade-deletes its storyline', async () => {
    const createRes = await client.post('/api/campaigns', {
        body: { name: 'Doomed Realm' },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });
    const campaignId = (createRes.body as JsonRecord).id as number;
    expect(readStorylines().storylines.some((s) => s.campaignId === campaignId)).toBe(true);

    await client.delete(`/api/campaigns/${campaignId}`, {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });

    expect(readStorylines().storylines.some((s) => s.campaignId === campaignId)).toBe(false);
});
