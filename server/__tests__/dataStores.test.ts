import fs, { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jest } from '@jest/globals';

import { configureDataFiles, resetDataFileOverrides } from '../src/testing/fixtures';
import { getTasksFile } from '../src/data/filePaths';
import { readTasks, writeTasks } from '../src/data/taskStore';
import { readUsers, writeUsers, sanitizeUser } from '../src/data/userStore';
import { readCampaigns, writeCampaigns } from '../src/data/campaignStore';
import type { TaskStoreData } from '../src/types/task';
import type { UserStoreData } from '../src/types/user';
import type { CampaignStoreData } from '../src/types/campaign';

describe('data stores', () => {
    let dataDir: string;
    let tasksFile: string;
    let usersFile: string;
    let campaignsFile: string;

    beforeAll(() => {
        dataDir = mkdtempSync(join(tmpdir(), 'task-track-data-'));
        tasksFile = join(dataDir, 'tasks.json');
        usersFile = join(dataDir, 'users.json');
        campaignsFile = join(dataDir, 'campaigns.json');
        configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
    });

    afterAll(() => {
        resetDataFileOverrides();
        rmSync(dataDir, { recursive: true, force: true });
    });

    test('readTasks normalizes malformed entries', () => {
        const malformed: TaskStoreData = {
            tasks: [
                ({
                    id: 'not-a-number',
                    description: 42 as unknown as string,
                    sub_tasks: [
                        {
                            id: '1',
                            description: null,
                            status: null,
                            created_at: null,
                            updated_at: null,
                            status_history: null,
                            completed: undefined,
                            rpg: { xp_awarded: 'nope', last_reward_at: 123 }
                        }
                    ],
                    side_quests: null,
                    nextSubtaskId: null,
                    status: null,
                    created_at: null,
                    updated_at: null,
                    owner_id: null,
                    task_level: '4',
                    rpg: { xp_awarded: 'yes', history: [{ at: 123 }] }
                } as unknown) as TaskStoreData['tasks'][number]
            ],
            nextId: null as unknown as number
        };
        writeFileSync(tasksFile, JSON.stringify(malformed));
        // ensure users file exists for owner resolution
        const users: UserStoreData = { users: [], nextId: 1 };
        writeFileSync(usersFile, JSON.stringify(users));

        const data = readTasks();
        expect(data.tasks).toHaveLength(1);
        const [task] = data.tasks;
        expect(task).toBeDefined();
        if (!task) throw new Error('Task should be defined');
        expect(typeof task.id).toBe('number');
        expect(task.description.length).toBeGreaterThan(0);
        const [firstSubtask] = task.sub_tasks;
        expect(firstSubtask).toBeDefined();
        expect(firstSubtask?.status_history.length ?? 0).toBeGreaterThan(0);
        const [firstHistory] = task.rpg.history;
        expect(firstHistory).toBeDefined();
        expect(firstHistory).toHaveProperty('at');
        expect(task.owner_id).toBe(1);
        expect(typeof data.nextId).toBe('number');
    });

    test('writeTasks persists data', () => {
        const snapshot: TaskStoreData = { tasks: [], nextId: 5 };
        expect(writeTasks(snapshot)).toBe(true);
        const reread = readTasks();
        expect(reread.nextId).toBe(5);
    });

    test('readUsers bootstraps default user when file missing', () => {
        rmSync(usersFile, { force: true });
        const data = readUsers();
        expect(data.users.length).toBeGreaterThan(0);
        expect(data.nextId).toBeGreaterThan(1);
    });

    test('writeUsers persists new records', () => {
        const users: UserStoreData = readUsers();
        users.users.push({
            id: users.nextId,
            username: 'archivist',
            password_hash: 'hash',
            email: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile: {
                display_name: 'Archivist',
                avatar: null
            },
            // minimal RPG state
            rpg: {
                level: 1,
                xp: 0,
                hp: 10,
                mp: 5,
                coins: 0,
                streak: 0,
                achievements: [],
                inventory: { items: [] },
                xp_log: [],
                last_daily_reward_at: null,
                last_xp_award_at: null,
                counters: { tasks_completed: 0, subtasks_completed: 0, daily_rewards_claimed: 0 }
            }
        });
        users.nextId += 1;
        expect(writeUsers(users)).toBe(true);
        const reread = readUsers();
        expect(reread.users.some((u) => u.username === 'archivist')).toBe(true);
    });

    test('readUsers falls back when file contents are invalid', () => {
        writeFileSync(usersFile, '{ not json');
        const data = readUsers();
        expect(data).toEqual({ users: [], nextId: 1 });
        writeFileSync(usersFile, JSON.stringify({ users: [], nextId: 1 }));
    });

    test('readCampaigns handles missing file and write round trip', () => {
        rmSync(campaignsFile, { force: true });
        const data = readCampaigns();
        expect(data.campaigns).toHaveLength(0);
        expect(data.nextId).toBe(1);

        const snapshot: CampaignStoreData = {
            campaigns: [
                {
                    id: 1,
                    name: 'Coverage Drive',
                    description: 'Ensure data layer is tested',
                    image_url: null,
                    owner_id: 1,
                    archived: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ],
            nextId: 2
        };
        expect(writeCampaigns(snapshot)).toBe(true);
        const reread = readCampaigns();
        const [storedCampaign] = reread.campaigns;
        expect(storedCampaign).toBeDefined();
        expect(storedCampaign?.name).toBe('Coverage Drive');
    });

    test('readCampaigns falls back when file contents are malformed', () => {
        writeFileSync(campaignsFile, '{ not json');
        const data = readCampaigns();
        expect(data).toEqual({ campaigns: [], nextId: 1 });
        writeFileSync(campaignsFile, JSON.stringify({ campaigns: [], nextId: 1 }));
    });

    test('getTasksFile respects environment variables when overrides reset', () => {
        resetDataFileOverrides();
        const originalEnv = process.env.TASKS_FILE;
        const customPath = join(tmpdir(), 'custom-tasks-path.json');
        process.env.TASKS_FILE = customPath;
        try {
            expect(getTasksFile()).toBe(customPath);
        } finally {
            process.env.TASKS_FILE = originalEnv;
            configureDataFiles({ tasks: tasksFile, users: usersFile, campaigns: campaignsFile });
        }
    });

    test('writeCampaigns cleans up temporary file and rethrows on failure', () => {
        const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
            throw new Error('write failure');
        });
        const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => undefined);
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

        expect(() => writeCampaigns({ campaigns: [], nextId: 1 })).toThrow('write failure');
        expect(renameSpy).not.toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalled();

        writeSpy.mockRestore();
        renameSpy.mockRestore();
        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });

    test('writeUsers cleans up temporary file and rethrows on failure', () => {
        const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
            throw new Error('user write failure');
        });
        const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => undefined);
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

        expect(() => writeUsers({ users: [], nextId: 1 })).toThrow('user write failure');
        expect(renameSpy).not.toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalled();

        writeSpy.mockRestore();
        renameSpy.mockRestore();
        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });

    test('sanitizeUser gracefully handles null input', () => {
        expect(sanitizeUser(null)).toBeNull();
    });
});
