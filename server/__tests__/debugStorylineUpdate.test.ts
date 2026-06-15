process.env.ANTHROPIC_API_KEY = 'test-placeholder-key';
process.env.ADMIN_USERNAMES = 'admin_user';

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
import { resetRegistrationRateLimiter } from '../src/security/registrationRateLimiter';
import { createTestClient, type TestClient } from '../src/utils/testClient';
import { readStorylines } from '../src/data/storylineStore';
import {
    __resetStorylineGenerationState,
    __setStorylineAiForTesting,
} from '../src/services/storyline.service';
import {
    buildCampaign,
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
let ownUserId: number;

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
    resetUserStore(files.users, [buildDefaultUser()]);
    resetStorylineStore(files.storylines, []);
    resetRegistrationRateLimiter();
    __resetStorylineGenerationState();
    __setStorylineAiForTesting(async () => 'A forced tale unfolds.', async (_t, prev) => prev);
    client = createTestClient(app);

    const res = await client.post('/api/users/register', {
        body: { username: 'admin_user', password: 'password123' },
        headers: { accept: 'application/json' },
    });
    const body = res.body as JsonRecord | null;
    authToken = typeof body?.token === 'string' ? body.token : null;
    ownUserId = (body?.user as JsonRecord | undefined)?.id as number;

    resetCampaignStore(files.campaigns, {
        campaigns: [buildCampaign({ id: 1, owner_id: ownUserId, name: 'Test Campaign' })],
    });
});

afterAll(() => {
    resetDataFileOverrides();
    __setStorylineAiForTesting(null, null);
    rmSync(dir, { recursive: true, force: true });
});

function generate(type?: string) {
    return client.post('/api/debug/generate-storyline-update', {
        body: { campaign_id: 1, ...(type ? { type } : {}) },
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });
}

test('force-generates an update of the given type, bypassing the new-day gate', async () => {
    // Storyline already has an intro and was visited today — determineUpdateType
    // would normally return null. The debug endpoint must generate anyway.
    const today = new Date().toISOString();
    resetStorylineStore(files.storylines, [
        {
            id: 's1',
            campaignId: 1,
            theme: 'fantasy',
            narrativeState: {
                chapter: 1,
                currentObjective: 'Go on',
                summary: 's',
                characters: [],
                locations: [],
                keyPlotPoints: [],
                progressPercentage: 0,
            },
            updates: [{ id: 'u0', type: 'intro', text: 'intro', generatedAt: today, tasksCompleted: [] }],
            createdAt: today,
            lastGeneratedAt: today,
            lastVisitDate: today,
            generationFailures: 0,
        },
    ]);

    const res = await generate('daily');
    expect(res.status).toBe(200);

    const sl = readStorylines().storylines.find((s) => s.campaignId === 1);
    expect(sl?.updates).toHaveLength(2);
    expect(sl?.updates[1].type).toBe('daily');
});

test('creates the storyline if missing and can stack multiple updates same-day', async () => {
    expect(readStorylines().storylines).toHaveLength(0);

    expect((await generate('intro')).status).toBe(200);
    expect((await generate('daily')).status).toBe(200);
    expect((await generate('reflection')).status).toBe(200);

    const sl = readStorylines().storylines.find((s) => s.campaignId === 1);
    expect(sl?.updates.map((u) => u.type)).toEqual(['intro', 'daily', 'reflection']);
});

test('defaults to a daily update when no type is given', async () => {
    expect((await generate()).status).toBe(200);
    const sl = readStorylines().storylines.find((s) => s.campaignId === 1);
    expect(sl?.updates[0].type).toBe('daily');
});

test('rejects an invalid type', async () => {
    const res = await generate('nonsense');
    expect(res.status).toBe(400);
});

test('404s for a campaign the user does not own', async () => {
    resetCampaignStore(files.campaigns, {
        campaigns: [buildCampaign({ id: 1, owner_id: 9999, name: 'Not Yours' })],
    });
    const res = await generate('daily');
    expect(res.status).toBe(404);
    expect(readStorylines().storylines).toHaveLength(0);
});

test('requires admin (403 for non-admin)', async () => {
    const reg = await client.post('/api/users/register', {
        body: { username: `pleb_${Date.now()}`, password: 'password123' },
        headers: { accept: 'application/json' },
    });
    const plebToken = (reg.body as JsonRecord).token as string;
    const res = await client.post('/api/debug/generate-storyline-update', {
        body: { campaign_id: 1, type: 'daily' },
        headers: { authorization: `Bearer ${plebToken}`, accept: 'application/json' },
    });
    expect(res.status).toBe(403);
});
