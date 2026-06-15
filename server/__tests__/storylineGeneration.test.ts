import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { jest } from '@jest/globals';

// ChatAnthropic throws at construction time when the key is absent; set a
// placeholder so the LangChain singleton initialises without error. The actual
// Anthropic API is never called: the AI seam replaces both the generator and
// the state extractor for every test in this file.
process.env.ANTHROPIC_API_KEY = 'test-placeholder-key';

import {
    StorylineService,
    __setStorylineAiForTesting,
    __resetStorylineGenerationState,
} from '../src/services/storyline.service';
import { readStorylines } from '../src/data/storylineStore';
import {
    resetAiGenerationRateLimiter,
} from '../src/security/aiGenerationRateLimiter';
import { storylineConfig } from '../src/config/storyline.config';
import {
    buildCampaign,
    buildStoryline,
    buildTask,
    buildDefaultUser,
    configureDataFiles,
    resetCampaignStore,
    resetDataFileOverrides,
    resetStorylineStore,
    resetTaskStore,
    resetUserStore,
} from '../src/testing/fixtures';

let dir: string;
let files: { tasks: string; users: string; campaigns: string; storylines: string };

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

beforeEach(() => {
    resetTaskStore(files.tasks);
    resetUserStore(files.users, [buildDefaultUser({ id: 1 })]);
    resetCampaignStore(files.campaigns, { campaigns: [buildCampaign({ id: 1, owner_id: 1 })] });
    resetStorylineStore(files.storylines, [buildStoryline({ id: 's1', campaignId: 1, updates: [] })]);
    resetAiGenerationRateLimiter();
    __resetStorylineGenerationState();
    __setStorylineAiForTesting(null, null);
});

afterAll(() => {
    resetDataFileOverrides();
    __setStorylineAiForTesting(null, null);
    rmSync(dir, { recursive: true, force: true });
});

test('rate-limit exhaustion degrades to current without generating', async () => {
    const gen = jest.fn(async () => 'should not run');
    __setStorylineAiForTesting(gen, async (_t, prev) => prev);

    // Exhaust the daily budget for user 1.
    for (let i = 0; i < storylineConfig.rateLimits.maxGenerationsPerDay; i++) {
        // eslint-disable-next-line no-await-in-loop
        await StorylineService.checkAndGenerateUpdate('s1', 1);
        __resetStorylineGenerationState(); // allow the next attempt to pass the in-flight guard
    }

    // Let all background generations complete before asserting and before the
    // next beforeEach resets the store (avoids cross-test pollution).
    await new Promise((r) => setTimeout(r, 50));

    const result = await StorylineService.checkAndGenerateUpdate('s1', 1);
    expect(result.status).toBe('current');
});

test('in-flight guard prevents a second concurrent generation', async () => {
    let resolveGen: (v: string) => void = () => {};
    const gen = jest.fn(
        () => new Promise<string>((resolve) => {
            resolveGen = resolve;
        }),
    );
    __setStorylineAiForTesting(gen, async (_t, prev) => prev);

    const first = await StorylineService.checkAndGenerateUpdate('s1', 1);
    expect(first.status).toBe('generating');

    const second = await StorylineService.checkAndGenerateUpdate('s1', 1);
    expect(second.status).toBe('generating');

    // The background generation is async. Yield to let the microtask/macrotask
    // queue process the dynamic imports inside generateStoryUpdate before
    // asserting that gen was invoked exactly once.
    await new Promise((r) => setTimeout(r, 10));

    expect(gen).toHaveBeenCalledTimes(1); // second call did not start a new run
    resolveGen('A grand tale unfolds.');
});

test('successful generation appends an update and resets failures', async () => {
    __setStorylineAiForTesting(
        async () => 'A hero sets forth from the village of Ashford.',
        async (_text, prev) => ({ ...prev, summary: 'The hero left Ashford.', chapter: 1 }),
    );

    const sl = readStorylines().storylines[0];
    await StorylineService.generateStoryUpdate(sl, 'intro', 1);

    const after = readStorylines().storylines[0];
    expect(after.updates).toHaveLength(1);
    expect(after.updates[0].type).toBe('intro');
    expect(after.updates[0].text).toContain('Ashford');
    expect(after.narrativeState.summary).toBe('The hero left Ashford.');
    expect(after.generationFailures).toBe(0);
});

test('extraction fallback preserves previous narrative state', async () => {
    __setStorylineAiForTesting(
        async () => 'Some new story text.',
        async (_text, prev) => prev, // simulates extractor falling back
    );

    const sl = readStorylines().storylines[0];
    await StorylineService.generateStoryUpdate(sl, 'intro', 1);

    const after = readStorylines().storylines[0];
    expect(after.narrativeState.currentObjective).toBe('Begin your adventure');
    expect(after.updates).toHaveLength(1);
});
