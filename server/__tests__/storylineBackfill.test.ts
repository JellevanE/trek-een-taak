process.env.ANTHROPIC_API_KEY = 'test-placeholder-key';

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
import { resetRegistrationRateLimiter } from '../src/security/registrationRateLimiter';
import { createTestClient, type TestClient } from '../src/utils/testClient';
import { readStorylines } from '../src/data/storylineStore';
import {
    __setStorylineAiForTesting,
    __resetStorylineGenerationState,
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
    resetCampaignStore(files.campaigns, {
        campaigns: [buildCampaign({ id: 1, owner_id: 999, name: 'Legacy Quest' })],
    });
    resetStorylineStore(files.storylines, []);
    resetRegistrationRateLimiter();
    __resetStorylineGenerationState();
    __setStorylineAiForTesting(async () => 'A legacy tale begins.', async (_t, prev) => prev);
    client = createTestClient(app);

    const username = `qa_${Date.now()}`;
    const res = await client.post('/api/users/register', {
        body: { username, password: 'password123' },
        headers: { accept: 'application/json' },
    });
    const body = res.body as JsonRecord | null;
    authToken = typeof body?.token === 'string' ? body.token : null;
    // The register endpoint returns { token, user: safeUser } — user.id is available directly.
    ownUserId = (body?.user as JsonRecord | undefined)?.id as number;

    resetCampaignStore(files.campaigns, {
        campaigns: [buildCampaign({ id: 1, owner_id: ownUserId, name: 'Legacy Quest' })],
    });
});

afterAll(() => {
    resetDataFileOverrides();
    __setStorylineAiForTesting(null, null);
    rmSync(dir, { recursive: true, force: true });
});

test('check-update creates a storyline for an owned campaign that lacks one', async () => {
    expect(readStorylines().storylines).toHaveLength(0);

    const res = await client.get('/api/storylines/1/check-update', {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });

    expect(res.status).toBe(200);
    const stored = readStorylines().storylines;
    expect(stored).toHaveLength(1);
    expect(stored[0].campaignId).toBe(1);
});

test('check-update 404s for a campaign the user does not own', async () => {
    resetCampaignStore(files.campaigns, {
        campaigns: [buildCampaign({ id: 1, owner_id: 999, name: 'Not Yours' })],
    });

    const res = await client.get('/api/storylines/1/check-update', {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });

    expect(res.status).toBe(404);
    expect(readStorylines().storylines).toHaveLength(0);
});

test('check-update 404s for a campaign that does not exist', async () => {
    const res = await client.get('/api/storylines/12345/check-update', {
        headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' },
    });
    expect(res.status).toBe(404);
});
