import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import app from '../src/app';
import { signToken } from '../src/middleware/auth';
import { XP_CONFIG, type PublicXpEvent } from '../src/rpg/experience';
import { createTestClient, type TestClient } from '../src/utils/testClient';
import {
    buildCampaign,
    buildDefaultUser,
    buildTask,
    configureDataFiles,
    resetCampaignStore,
    resetDataFileOverrides,
    resetTaskStore,
    resetUserStore,
    type JsonRecord
} from '../src/testing/fixtures';
import { readTasks } from '../src/data/taskStore';
import { readUsers } from '../src/data/userStore';
import type { TaskRecord, TaskRewardHistoryEntry, TaskStoreData } from '../src/types/task';
import type { UserRecord, UserRpgEvent } from '../src/types/user';

function buildLegacyRewardHistory(count: number): TaskRewardHistoryEntry[] {
    const now = Date.now();
    return Array.from({ length: count }, (_, index) => ({
        at: new Date(now - index * 60_000).toISOString(),
        amount: 5 + index,
        reason: 'legacy_reward'
    }));
}

function buildLegacyXpEvents(count: number): UserRpgEvent[] {
    const now = Date.now();
    return Array.from({ length: count }, (_, index) => ({
        amount: 5,
        reason: 'legacy',
        message: `Legacy award #${index}`,
        metadata: {},
        at: new Date(now - index * 90_000).toISOString(),
        level_before: 1,
        level_after: 1,
        xp_before: 0,
        xp_after: 0,
        xp_into_level: 0,
        xp_for_level: 100,
        xp_to_next: 100,
        leveled_up: false
    }));
}

describe('tasks controller lifecycle coverage', () => {
    let dataDir: string;
    let tasksFile: string;
    let usersFile: string;
    let campaignsFile: string;
    let token: string;
    let client: TestClient;
    let user: UserRecord;

    beforeAll(() => {
        dataDir = mkdtempSync(join(tmpdir(), 'task-track-lifecycle-'));
        tasksFile = join(dataDir, 'tasks.json');
        usersFile = join(dataDir, 'users.json');
        campaignsFile = join(dataDir, 'campaigns.json');
        configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
        client = createTestClient(app);
    });

    beforeEach(() => {
        user = buildDefaultUser({
            id: 42,
            username: 'coverage_knight'
        });
        user.rpg.xp = 0;
        user.rpg.xp_log = buildLegacyXpEvents(XP_CONFIG.xpLogLimit + 4);
        user.rpg.counters.tasks_completed = Number.NaN;
        user.rpg.counters.subtasks_completed = 2;
        user.rpg.counters.daily_rewards_claimed = 1;
        user.rpg.inventory.items = [{ name: 'Old Relic' }];

        resetUserStore(usersFile, [user], user.id + 1);
        token = signToken({ id: user.id, username: user.username });

        const firstTask = buildTask({
            id: 1,
            owner_id: user.id,
            status: 'in_progress',
            order: 0,
            task_level: 5,
            priority: 'high'
        });
        firstTask.status_history = [
            { status: 'todo', at: firstTask.created_at, note: null },
            { status: 'in_progress', at: firstTask.updated_at, note: 'Grinding' }
        ];
        firstTask.rpg = {
            xp_awarded: false,
            last_reward_at: null,
            history: buildLegacyRewardHistory(10)
        };

        const subtaskCreatedAt = new Date().toISOString();
        const secondTask = buildTask({
            id: 2,
            owner_id: user.id,
            status: 'todo',
            order: 1,
            task_level: 3,
            priority: 'low'
        });
        secondTask.sub_tasks = [
            {
                id: 5,
                description: 'Reassemble map',
                status: 'todo',
                created_at: subtaskCreatedAt,
                updated_at: subtaskCreatedAt,
                status_history: [],
                completed: false,
                rpg: { xp_awarded: false, last_reward_at: null },
                priority: 'low',
                weight: 0.25
            }
        ];
        secondTask.side_quests = [...secondTask.sub_tasks];
        secondTask.nextSubtaskId = 6;

        const tasksSnapshot: TaskStoreData = {
            tasks: [firstTask, secondTask],
            nextId: 3
        };
        resetTaskStore(tasksFile, tasksSnapshot);

        resetCampaignStore(campaignsFile, {
            campaigns: [
                buildCampaign({
                    id: 7,
                    owner_id: user.id,
                    name: 'Coverage Crusade'
                })
            ],
            nextId: 8
        });
    });

    afterAll(() => {
        resetDataFileOverrides();
        rmSync(dataDir, { recursive: true, force: true });
    });

    function authHeaders() {
        return { authorization: `Bearer ${token}` };
    }

    test('manages tasks end-to-end with rewards, ordering, history, updates, and deletions', async () => {
        const statusRes = await client.patch('/api/tasks/1/status', {
            body: { status: 'done', note: 'Quest complete' },
            headers: authHeaders()
        });
        expect(statusRes.status).toBe(200);
        const statusBody = statusRes.body as JsonRecord;
        const statusEvents = Array.isArray(statusBody.xp_events)
            ? (statusBody.xp_events as unknown as PublicXpEvent[])
            : undefined;
        expect(Array.isArray(statusEvents)).toBe(true);
        expect(statusEvents!.length).toBe(1);
        expect(statusEvents![0]).toMatchObject({ reason: 'task_complete' });

        const taskData = readTasks();
        const finishedTask = taskData.tasks.find((record) => record.id === 1)!;
        expect(finishedTask.status).toBe('done');
        expect(finishedTask.rpg.xp_awarded).toBe(true);
        expect(finishedTask.rpg.history.length).toBeLessThanOrEqual(10);
        expect(finishedTask.rpg.history[0]).toMatchObject({ reason: 'task_complete' });

        const usersData = readUsers();
        const storedUser = usersData.users.find((candidate) => candidate.id === user.id)!;
        expect(storedUser.rpg.xp_log.length).toBe(XP_CONFIG.xpLogLimit);
        expect(storedUser.rpg.last_xp_award_at).toBeTruthy();

        const subtaskRes = await client.patch('/api/tasks/2/subtasks/5/status', {
            body: { status: 'done', note: null },
            headers: authHeaders()
        });
        expect(subtaskRes.status).toBe(200);
        const subTaskBody = subtaskRes.body as JsonRecord;
        expect(Array.isArray(subTaskBody.xp_events)).toBe(true);
        const refreshedTasks = readTasks();
        const withSubtask = refreshedTasks.tasks.find((record) => record.id === 2)!;
        const nestedSubtask = withSubtask.sub_tasks[0];
        expect(nestedSubtask.status).toBe('done');
        expect(nestedSubtask.rpg.xp_awarded).toBe(true);
        expect(nestedSubtask.status_history.some((entry) => entry.status === 'done')).toBe(true);

        const reorderRes = await client.put('/api/tasks/order', {
            body: { order: [2, 1] },
            headers: authHeaders()
        });
        expect(reorderRes.status).toBe(200);
        const reorderBody = reorderRes.body as { tasks: TaskRecord[] };
        expect(reorderBody.tasks.map((task) => task.id)).toEqual([2, 1]);

        const historyRes = await client.get('/api/tasks/1/history', {
            headers: authHeaders()
        });
        expect(historyRes.status).toBe(200);
        const historyBody = historyRes.body as { history: Array<Record<string, unknown>> };
        expect(Array.isArray(historyBody.history)).toBe(true);
        expect(historyBody.history.length).toBeGreaterThan(1);

        const updateRes = await client.put('/api/tasks/2', {
            body: {
                description: 'Updated coverage quest',
                priority: 'high',
                due_date: null,
                task_level: 7,
                campaign_id: 7
            },
            headers: authHeaders()
        });
        expect(updateRes.status).toBe(200);
        const updateBody = updateRes.body as JsonRecord;
        expect(updateBody).toMatchObject({
            description: 'Updated coverage quest',
            priority: 'high',
            campaign_id: 7
        });
        expect(updateBody.task_level).toBe(7);
        expect(typeof updateBody.due_date).toBe('string');

        const subtaskUpdateRes = await client.put('/api/tasks/2/subtasks/5', {
            body: {
                description: 'Reassembled map pieces',
                status: 'in_progress',
                weight: 1.5,
                priority: 'medium'
            },
            headers: authHeaders()
        });
        expect(subtaskUpdateRes.status).toBe(200);
        const updatedTaskData = readTasks();
        const updatedTask = updatedTaskData.tasks.find((record) => record.id === 2)!;
        const updatedSubtask = updatedTask.sub_tasks.find((entry) => entry.id === 5)!;
        expect(updatedSubtask.description).toBe('Reassembled map pieces');
        expect(updatedSubtask.status).toBe('in_progress');
        expect(updatedSubtask.weight).toBe(1.5);
        expect(updatedSubtask.priority).toBe('medium');

        const deleteSubRes = await client.delete('/api/tasks/2/subtasks/5', {
            headers: authHeaders()
        });
        expect(deleteSubRes.status).toBe(204);
        const afterSubDelete = readTasks();
        const withoutSubtask = afterSubDelete.tasks.find((record) => record.id === 2)!;
        expect(withoutSubtask.sub_tasks.length).toBe(0);

        const deleteTaskRes = await client.delete('/api/tasks/1', {
            headers: authHeaders()
        });
        expect(deleteTaskRes.status).toBe(204);
        const finalData = readTasks();
        expect(finalData.tasks.some((record) => record.id === 1)).toBe(false);
    });

    test('rejects invalid reorder payload and invalid task updates', async () => {
        const reorderRes = await client.put('/api/tasks/order', {
            body: { order: 'not-an-array' },
            headers: authHeaders()
        });
        expect(reorderRes.status).toBe(400);
        const reorderBody = reorderRes.body as JsonRecord;
        expect(reorderBody.error).toMatch(/order must be an array/i);

        const invalidPriorityRes = await client.put('/api/tasks/2', {
            body: { priority: 'legendary' },
            headers: authHeaders()
        });
        expect(invalidPriorityRes.status).toBe(400);
        const invalidPriorityBody = invalidPriorityRes.body as JsonRecord;
        expect(String(invalidPriorityBody.error)).toMatch(/invalid (body\.)?priority/i);
    });
});
