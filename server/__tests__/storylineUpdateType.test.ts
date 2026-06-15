import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { determineUpdateType } from '../src/services/storyline.service';
import {
    buildStoryline,
    buildTask,
    configureDataFiles,
    resetDataFileOverrides,
    resetTaskStore,
} from '../src/testing/fixtures';

let dataDir: string;
let tasksFile: string;

beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'task-track-'));
    tasksFile = join(dataDir, 'tasks.json');
    configureDataFiles({ tasks: tasksFile });
});

afterAll(() => {
    resetDataFileOverrides();
    rmSync(dataDir, { recursive: true, force: true });
});

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

test('first ever update is intro', () => {
    resetTaskStore(tasksFile);
    const sl = buildStoryline({ updates: [] });
    expect(determineUpdateType(sl)).toBe('intro');
});

test('same day with existing updates yields null', () => {
    resetTaskStore(tasksFile);
    const sl = buildStoryline({
        updates: [{ id: 'a', type: 'intro', text: 't', generatedAt: new Date().toISOString(), tasksCompleted: [] }],
        lastVisitDate: new Date().toISOString(),
    });
    expect(determineUpdateType(sl)).toBeNull();
});

test('new day with completed tasks yields daily', () => {
    resetTaskStore(tasksFile, {
        tasks: [
            buildTask({ id: 1, campaign_id: 1, status: 'done', updated_at: new Date().toISOString() }),
            buildTask({ id: 2, campaign_id: 1, status: 'todo', updated_at: new Date().toISOString() }),
        ],
    });
    const sl = buildStoryline({
        updates: [{ id: 'a', type: 'intro', text: 't', generatedAt: yesterday, tasksCompleted: [] }],
        lastVisitDate: yesterday,
    });
    expect(determineUpdateType(sl)).toBe('daily');
});

test('new day with no completed tasks yields reflection', () => {
    resetTaskStore(tasksFile, {
        tasks: [buildTask({ id: 1, campaign_id: 1, status: 'todo', updated_at: new Date().toISOString() })],
    });
    const sl = buildStoryline({
        updates: [{ id: 'a', type: 'intro', text: 't', generatedAt: yesterday, tasksCompleted: [] }],
        lastVisitDate: yesterday,
    });
    expect(determineUpdateType(sl)).toBe('reflection');
});

test('100% progress on a new day yields completion', () => {
    resetTaskStore(tasksFile, {
        tasks: [buildTask({ id: 1, campaign_id: 1, status: 'done', updated_at: new Date().toISOString() })],
    });
    const sl = buildStoryline({
        updates: [{ id: 'a', type: 'daily', text: 't', generatedAt: yesterday, tasksCompleted: [] }],
        lastVisitDate: yesterday,
    });
    expect(determineUpdateType(sl)).toBe('completion');
});
