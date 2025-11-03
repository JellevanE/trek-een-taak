import { writeFileSync } from 'node:fs';

import type { CampaignRecord, CampaignStoreData } from '../types/campaign.js';
import type { SubTask, TaskRecord, TaskStoreData } from '../types/task.js';
import type { UserRecord, UserStoreData } from '../types/user.js';
import { configureDataFiles, resetDataFileOverrides } from '../data/filePaths.js';
import { createInitialRpgState } from '../rpg/experienceEngine.js';
import type { JsonObject } from '../types/json.js';

export type JsonRecord = JsonObject;

function writeJsonFile<T>(filePath: string, data: T): void {
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizeTask(task: TaskRecord): TaskRecord {
    const clone: TaskRecord = JSON.parse(JSON.stringify(task));
    const normalizeSubtasks = (list: SubTask[] | undefined): SubTask[] =>
        Array.isArray(list)
            ? list.map((sub) => ({ ...sub, status_history: sub.status_history ?? [] }))
            : [];

    clone.sub_tasks = normalizeSubtasks(clone.sub_tasks);
    clone.side_quests = normalizeSubtasks(clone.side_quests ?? clone.sub_tasks);
    clone.status_history = Array.isArray(clone.status_history) ? clone.status_history : [];
    clone.rpg = {
        xp_awarded: !!clone.rpg?.xp_awarded,
        last_reward_at: clone.rpg?.last_reward_at ?? null,
        history: Array.isArray(clone.rpg?.history) ? clone.rpg!.history : []
    };
    return clone;
}

export function buildDefaultUser(overrides: Partial<UserRecord> = {}): UserRecord {
    const now = new Date().toISOString();
    const baseProfile: UserRecord['profile'] = {
        display_name: 'Local User',
        avatar: null,
        class: 'adventurer',
        bio: ''
    };

    const base: UserRecord = {
        id: 1,
        username: 'local',
        password_hash: '',
        email: null,
        created_at: now,
        updated_at: now,
        profile: baseProfile,
        rpg: createInitialRpgState()
    };

    let mergedProfile: UserRecord['profile'] = { ...baseProfile };
    if (overrides.profile) {
        mergedProfile = { ...mergedProfile, ...overrides.profile };
        if (overrides.profile.prefs === undefined) {
            delete (mergedProfile as { prefs?: JsonObject }).prefs;
        }
    }

    const mergedRpg = overrides.rpg ? { ...createInitialRpgState(), ...overrides.rpg } : base.rpg;

    return {
        ...base,
        ...overrides,
        profile: mergedProfile,
        rpg: mergedRpg
    };
}

export function resetUserStore(
    filePath: string,
    users: UserRecord[] = [buildDefaultUser()],
    nextId?: number
): UserStoreData {
    const highestId = users.reduce((max, user) => (user.id > max ? user.id : max), 0);
    const store: UserStoreData = {
        users: users.map((user) => ({ ...user, profile: { ...user.profile } })),
        nextId: nextId ?? highestId + 1
    };
    writeJsonFile(filePath, store);
    return store;
}

export function emptyTaskStore(overrides: Partial<TaskStoreData> = {}): TaskStoreData {
    const base: TaskStoreData = { tasks: [], nextId: 1 };
    const merged = { ...base, ...overrides };
    merged.tasks = Array.isArray(merged.tasks) ? merged.tasks.map(normalizeTask) : [];
    if (typeof merged.nextId !== 'number' || merged.nextId < 1) {
        merged.nextId = merged.tasks.reduce((max, task) => (task.id > max ? task.id : max), 0) + 1;
    }
    return merged;
}

export function resetTaskStore(
    filePath: string,
    overrides: Partial<TaskStoreData> = {}
): TaskStoreData {
    const store = emptyTaskStore(overrides);
    writeJsonFile(filePath, store);
    return store;
}

export function emptyCampaignStore(
    overrides: Partial<CampaignStoreData> = {}
): CampaignStoreData {
    const base: CampaignStoreData = { campaigns: [], nextId: 1 };
    const merged = { ...base, ...overrides };
    merged.campaigns = Array.isArray(merged.campaigns)
        ? merged.campaigns.map((campaign) => ({ ...campaign }))
        : [];
    if (typeof merged.nextId !== 'number' || merged.nextId < 1) {
        merged.nextId =
            merged.campaigns.reduce((max, campaign) => (campaign.id > max ? campaign.id : max), 0) + 1;
    }
    return merged;
}

export function resetCampaignStore(
    filePath: string,
    overrides: Partial<CampaignStoreData> = {}
): CampaignStoreData {
    const store = emptyCampaignStore(overrides);
    writeJsonFile(filePath, store);
    return store;
}

export function buildCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
    const now = new Date().toISOString();
    const base: CampaignRecord = {
        id: 1,
        name: 'Campaign',
        description: '',
        image_url: null,
        owner_id: 1,
        archived: false,
        created_at: now,
        updated_at: now
    };
    return { ...base, ...overrides };
}

export function buildTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
    const now = new Date().toISOString();
    const base: TaskRecord = {
        id: 1,
        description: 'Task',
        priority: 'medium',
        sub_tasks: [],
        side_quests: [],
        nextSubtaskId: 1,
        due_date: now.slice(0, 10),
        status: 'todo',
        order: 0,
        created_at: now,
        updated_at: now,
        status_history: [{ status: 'todo', at: now, note: null }],
        owner_id: 1,
        task_level: 1,
        rpg: { xp_awarded: false, last_reward_at: null, history: [] },
        campaign_id: null,
        completed: false
    };
    return normalizeTask({ ...base, ...overrides });
}

export { configureDataFiles, resetDataFileOverrides };
