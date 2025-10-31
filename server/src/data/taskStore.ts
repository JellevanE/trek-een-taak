import fs from 'node:fs';

import * as experience from '../rpg/experience';
import type { UserStoreData } from '../types/user';
import type {
    StatusHistoryEntry,
    SubTask,
    TaskRecord,
    TaskRewardHistoryEntry,
    TaskRpgData,
    TaskStoreData,
    TaskStatus
} from '../types/task';
import { isJsonObject } from '../types/json';

import { getTasksFile } from './filePaths';
import { readUsers } from './userStore';

function ensureStatusHistory(history: unknown, status: TaskStatus, timestamp: string): StatusHistoryEntry[] {
    if (!Array.isArray(history) || history.length === 0) {
        return [{ status, at: timestamp, note: null }];
    }
    return history.map((entry): StatusHistoryEntry => {
        if (!isJsonObject(entry)) {
            return { status, at: timestamp, note: null };
        }
        const statusValue = entry.status;
        const atValue = entry.at;
        const noteValue = 'note' in entry ? entry.note : null;
        return {
            status:
                typeof statusValue === 'string' && ['todo', 'in_progress', 'blocked', 'done'].includes(statusValue)
                    ? (statusValue as TaskStatus)
                    : status,
            at: typeof atValue === 'string' ? atValue : timestamp,
            note: typeof noteValue === 'string' || noteValue === null ? noteValue : null
        };
    });
}

function normalizeSubTask(raw: unknown, now: string): SubTask {
    const source = isJsonObject(raw) ? raw : {};
    const idValue = typeof source.id === 'number' && Number.isFinite(source.id) ? source.id : 0;
    const descriptionValue =
        typeof source.description === 'string' && source.description.trim().length > 0
            ? source.description.trim()
            : 'Side quest';

    const completedValue = typeof source.completed === 'boolean' ? source.completed : undefined;
    const rawStatus = typeof source.status === 'string' ? source.status : undefined;
    const statusValue: TaskStatus =
        rawStatus === 'todo' || rawStatus === 'in_progress' || rawStatus === 'blocked' || rawStatus === 'done'
            ? rawStatus
            : completedValue
            ? 'done'
            : 'todo';

    const createdAt = typeof source.created_at === 'string' ? source.created_at : now;
    const updatedAt = typeof source.updated_at === 'string' ? source.updated_at : createdAt;
    const statusHistory = ensureStatusHistory(source.status_history, statusValue, updatedAt);

    const rpgSource = isJsonObject(source.rpg) ? source.rpg : {};
    const xpAwarded = typeof rpgSource.xp_awarded === 'boolean' ? rpgSource.xp_awarded : !!completedValue;
    const lastRewardAt = typeof rpgSource.last_reward_at === 'string' ? rpgSource.last_reward_at : null;

    const priorityValue =
        source.priority === 'low' || source.priority === 'medium' || source.priority === 'high'
            ? source.priority
            : undefined;
    const weightValue =
        typeof source.weight === 'number' && Number.isFinite(source.weight) ? source.weight : undefined;

    return {
        id: idValue,
        description: descriptionValue,
        status: statusValue,
        created_at: createdAt,
        updated_at: updatedAt,
        status_history: statusHistory,
        completed: completedValue ?? statusValue === 'done',
        rpg: {
            xp_awarded: xpAwarded,
            last_reward_at: lastRewardAt
        },
        priority: priorityValue,
        weight: weightValue
    };
}

function resolveOwnerId(usersData: UserStoreData): number {
    if (Array.isArray(usersData.users) && usersData.users.length > 0) {
        const candidate = usersData.users[0];
        if (candidate && typeof candidate.id === 'number') return candidate.id;
    }
    return 1;
}

function normalizeTaskRpg(raw: unknown, timestamp: string): TaskRpgData {
    const fallback: TaskRpgData = {
        xp_awarded: false,
        last_reward_at: null,
        history: []
    };

    if (!isJsonObject(raw)) return fallback;

    const historyRaw = Array.isArray(raw.history) ? raw.history : [];
    const history: TaskRewardHistoryEntry[] = [];
    for (const entry of historyRaw) {
        if (!isJsonObject(entry)) continue;
        const amountValue = entry.amount;
        const reasonValue = entry.reason;
        const atValue = entry.at;
        const subtaskIdValue = entry.subtask_id;
        const record: TaskRewardHistoryEntry = {
            at: typeof atValue === 'string' ? atValue : timestamp,
            amount: typeof amountValue === 'number' && Number.isFinite(amountValue) ? amountValue : 0,
            reason: typeof reasonValue === 'string' ? reasonValue : 'unknown'
        };
        if (typeof subtaskIdValue === 'number' && Number.isFinite(subtaskIdValue)) {
            record.subtask_id = subtaskIdValue;
        }
        history.push(record);
    }

    return {
        xp_awarded: typeof raw.xp_awarded === 'boolean' ? raw.xp_awarded : false,
        last_reward_at: typeof raw.last_reward_at === 'string' ? raw.last_reward_at : null,
        history
    };
}

function normalizeTask(raw: unknown, index: number, usersData: UserStoreData): TaskRecord {
    const now = new Date().toISOString();
    const source = isJsonObject(raw) ? raw : {};

    const subTasksRaw = Array.isArray(source.sub_tasks) ? source.sub_tasks : [];
    let normalizedSubs = subTasksRaw.map((subtask) => normalizeSubTask(subtask, now));

    let maxSubId = 0;
    normalizedSubs.forEach((subtask) => {
        if (subtask.id > maxSubId) maxSubId = subtask.id;
    });
    normalizedSubs = normalizedSubs.map((subtask) => {
        if (subtask.id === 0) {
            maxSubId += 1;
            return { ...subtask, id: maxSubId };
        }
        return subtask;
    });

    const sideQuestsRaw = Array.isArray(source.side_quests) ? source.side_quests : null;
    const normalizedSideQuests = sideQuestsRaw
        ? sideQuestsRaw.map((subtask) => normalizeSubTask(subtask, now))
        : normalizedSubs.map((subtask) => ({ ...subtask }));

    const completedValue = typeof source.completed === 'boolean' ? source.completed : undefined;
    const rawStatus = typeof source.status === 'string' ? source.status : undefined;
    const statusValue: TaskStatus =
        rawStatus === 'todo' || rawStatus === 'in_progress' || rawStatus === 'blocked' || rawStatus === 'done'
            ? rawStatus
            : completedValue
            ? 'done'
            : 'todo';

    const createdAt = typeof source.created_at === 'string' ? source.created_at : now;
    const updatedAt = typeof source.updated_at === 'string' ? source.updated_at : createdAt;
    const statusHistory = ensureStatusHistory(source.status_history, statusValue, updatedAt);

    const orderValue = typeof source.order === 'number' && Number.isFinite(source.order) ? source.order : index;
    const dueDateValue =
        typeof source.due_date === 'string' && source.due_date.trim().length > 0
            ? source.due_date
            : now.split('T')[0];

    const ownerIdValue =
        typeof source.owner_id === 'number' && Number.isFinite(source.owner_id)
            ? source.owner_id
            : resolveOwnerId(usersData);

    const rawLevel = typeof source.task_level === 'number' && Number.isFinite(source.task_level) ? source.task_level : 1;
    const taskLevel = experience.clampTaskLevel(rawLevel);

    const rpg = normalizeTaskRpg(source.rpg, now);
    if (typeof source.xp_awarded === 'boolean') {
        rpg.xp_awarded = source.xp_awarded;
    }

    const campaignId = (() => {
        if (source.campaign_id === undefined || source.campaign_id === null) return null;
        const numeric = Number(source.campaign_id);
        return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
    })();

    const priorityValue =
        source.priority === 'low' || source.priority === 'medium' || source.priority === 'high'
            ? source.priority
            : 'medium';

    return {
        id: typeof source.id === 'number' && Number.isFinite(source.id) ? source.id : index + 1,
        description:
            typeof source.description === 'string' && source.description.trim().length > 0
                ? source.description.trim()
                : `Task ${index + 1}`,
        priority: priorityValue,
        sub_tasks: normalizedSubs,
        side_quests: normalizedSideQuests,
        nextSubtaskId: typeof source.nextSubtaskId === 'number' && Number.isFinite(source.nextSubtaskId)
            ? source.nextSubtaskId
            : maxSubId + 1,
        due_date: dueDateValue,
        status: statusValue,
        completed: statusValue === 'done',
        order: orderValue,
        created_at: createdAt,
        updated_at: updatedAt,
        status_history: statusHistory,
        owner_id: ownerIdValue,
        task_level: taskLevel,
        rpg,
        campaign_id: campaignId
    };
}

export function readTasks(): TaskStoreData {
    try {
        const tasksFile = getTasksFile();
        if (!fs.existsSync(tasksFile)) {
            return { tasks: [], nextId: 1 };
        }

        const data = fs.readFileSync(tasksFile, 'utf8');
        const parsedRaw = JSON.parse(data);
        const parsed = isJsonObject(parsedRaw) ? parsedRaw : {};

        let usersData: UserStoreData = { users: [], nextId: 1 };
        try {
            usersData = readUsers();
        } catch {
            usersData = { users: [], nextId: 1 };
        }

        const tasksArray = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        const normalizedTasks = tasksArray.map((task, idx) => normalizeTask(task, idx, usersData));

        const maxTaskId =
            normalizedTasks.length > 0
                ? normalizedTasks.reduce((max, task) => (task.id > max ? task.id : max), 0)
                : 0;

        const nextIdValue = typeof parsed.nextId === 'number' && parsed.nextId > maxTaskId ? parsed.nextId : maxTaskId + 1;

        return {
            tasks: normalizedTasks,
            nextId: nextIdValue
        };
    } catch (error) {
        console.error('Error reading tasks file:', error);
        return { tasks: [], nextId: 1 };
    }
}

export function writeTasks(data: TaskStoreData): boolean {
    const tasksFile = getTasksFile();
    const tmpPath = `${tasksFile}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, tasksFile);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
            // ignore cleanup errors
        }
        console.error('Error writing tasks file:', error);
        throw error;
    }
}

function serializeSubtask(subtask: SubTask | null | undefined): SubTask | null {
    if (!subtask) return null;
    const base: SubTask = {
        id: subtask.id,
        description: subtask.description,
        status: subtask.status,
        created_at: subtask.created_at,
        updated_at: subtask.updated_at,
        status_history: subtask.status_history,
        completed: !!subtask.completed,
        rpg: {
            xp_awarded: !!(subtask.rpg && subtask.rpg.xp_awarded),
            last_reward_at: subtask.rpg?.last_reward_at ?? null
        },
        priority: subtask.priority,
        weight: subtask.weight
    };
    return base;
}

export function serializeTask(task: TaskRecord | null | undefined): TaskRecord | null {
    if (!task) return null;
    const subTasks = Array.isArray(task.sub_tasks)
        ? task.sub_tasks
              .map(serializeSubtask)
              .filter((sub): sub is SubTask => sub !== null)
        : [];
    const serializedSideQuests = Array.isArray(task.side_quests)
        ? task.side_quests
              .map(serializeSubtask)
              .filter((sub): sub is SubTask => sub !== null)
        : [];

    const sideQuests = serializedSideQuests.length > 0 ? serializedSideQuests : subTasks;

    const rpgData: TaskRpgData = {
        xp_awarded: !!task.rpg?.xp_awarded,
        last_reward_at: task.rpg?.last_reward_at ?? null,
        history: Array.isArray(task.rpg?.history) ? task.rpg!.history : []
    };

    return {
        ...task,
        sub_tasks: subTasks,
        side_quests: sideQuests,
        rpg: rpgData,
        campaign_id:
            typeof task.campaign_id === 'number' && task.campaign_id > 0 ? task.campaign_id : null
    };
}

export function serializeTaskList(list: TaskRecord[] | null | undefined): TaskRecord[] {
    if (!Array.isArray(list)) return [];
    return list
        .map((task) => serializeTask(task))
        .filter((task): task is TaskRecord => task !== null);
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

interface DemoTaskOptions {
    count?: number;
    nextId: number;
    ownerId: number;
    startingOrder?: number;
}

export function buildDemoTasks(options: DemoTaskOptions): TaskStoreData {
    const { count = 5, nextId, ownerId, startingOrder = 0 } = options;

    const descriptions = [
        'Brew restorative potions',
        'Scout the northern ridge',
        'Upgrade camp defenses',
        'Interview guild recruits',
        'Refine spell catalysts',
        'Chart forgotten ruins',
        'Calibrate the chrono-compass',
        'Train with sparring golems',
        'Draft trading manifests',
        'Decode ancient glyphs'
    ];

    const sideQuestPool = [
        'Gather components',
        'Meet with ally',
        'Write expedition log',
        'Sharpen gear',
        'Meditate before battle',
        'Update quest board',
        'Visit quartermaster'
    ];

    const priorities: TaskRecord['priority'][] = ['low', 'medium', 'high'];
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
    const today = new Date();
    const tasks: TaskRecord[] = [];
    let idCounter = nextId;
    let order = startingOrder;

    for (let i = 0; i < count; i++) {
        const description = randomChoice(descriptions);
        const priority = randomChoice(priorities);
        const status = randomChoice(statuses);
        const level = Math.floor(Math.random() * 5) + 1;
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + (Math.floor(Math.random() * 6) - 2));
        const dueDateIso = dueDate.toISOString().split('T')[0];

        const now = new Date().toISOString();
        const taskId = idCounter++;
        const subTaskCount = Math.floor(Math.random() * 3);
        const subTasks: SubTask[] = [];
        let nextSubId = 1;
        for (let s = 0; s < subTaskCount; s++) {
            const subStatus = randomChoice(['todo', 'in_progress', 'done'] as TaskStatus[]);
            const subNow = new Date().toISOString();
            subTasks.push({
                id: nextSubId++,
                description: randomChoice(sideQuestPool),
                status: subStatus,
                created_at: subNow,
                updated_at: subNow,
                status_history: [{ status: subStatus, at: subNow, note: null }],
                completed: subStatus === 'done',
                rpg: { xp_awarded: subStatus === 'done', last_reward_at: null }
            });
        }

        const task: TaskRecord = {
            id: taskId,
            description,
            priority,
            sub_tasks: subTasks,
            side_quests: subTasks.map((sub) => ({ ...sub })),
            nextSubtaskId: nextSubId,
            due_date: dueDateIso,
            status,
            completed: status === 'done',
            order: order++,
            created_at: now,
            updated_at: now,
            status_history: [{ status, at: now, note: null }],
            owner_id: ownerId,
            task_level: level,
            rpg: { xp_awarded: status === 'done', last_reward_at: null, history: [] },
            campaign_id: null
        };
        tasks.push(task);
    }

    return { tasks, nextId: idCounter };
}
