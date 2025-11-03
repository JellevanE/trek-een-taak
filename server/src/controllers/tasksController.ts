import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import { applyXp, ensureUserRpg } from '../rpg/experienceEngine.js';
import { buildPublicRpgState, incrementCounter, toPublicXpEvent } from '../rpg/eventHooks.js';
import { clampTaskLevel, computeSubtaskXp, computeTaskXp } from '../rpg/rewardTables.js';
import {
    readTasks,
    serializeTask,
    serializeTaskList,
    writeTasks
} from '../data/taskStore.js';
import { readCampaigns } from '../data/campaignStore.js';
import { readUsers, writeUsers } from '../data/userStore.js';
import { sendError } from '../utils/http.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import type { CampaignStoreData } from '../types/campaign.js';
import type { SubTask, TaskRecord, TaskStatus, TaskStoreData } from '../types/task.js';
import type { PublicUserRpgState, UserRecord, UserStoreData } from '../types/user.js';
import type { PublicXpEvent } from '../rpg/experienceTypes.js';
import type { SubtaskCompletionMetadata, TaskCompletionMetadata } from '../types/rpg.js';
import { validateRequest } from '../validation/index.js';
import {
    createSubtaskSchema,
    createTaskSchema,
    updateOrderSchema,
    updateStatusSchema,
    updateSubtaskSchema,
    updateTaskSchema,
    type CreateSubtaskPayload,
    type CreateTaskPayload,
    type UpdateOrderPayload,
    type UpdateStatusPayload,
    type UpdateSubtaskPayload,
    type UpdateTaskPayload
} from '../validation/schemas/tasks.js';

type BaseAuthedRequest<
    P extends ParamsDictionary = ParamsDictionary,
    B = unknown,
    Q extends ParsedQs = ParsedQs
> = AuthenticatedRequest<P, unknown, B, Q>;

interface TaskListQuery extends ParsedQs {
    campaign_id?: string | string[];
}

interface TaskResponseExtras {
    xp_events?: PublicXpEvent[];
    player_rpg?: PublicUserRpgState | null;
}

function getOwnerIdFallback(usersData: UserStoreData): number {
    if (Array.isArray(usersData.users) && usersData.users.length > 0) {
        const first = usersData.users[0];
        if (first && typeof first.id === 'number') {
            return first.id;
        }
    }
    return 1;
}

function parseTaskId(param: string | undefined): number | null {
    if (!param) return null;
    const value = Number.parseInt(param, 10);
    return Number.isFinite(value) ? value : null;
}

function toTaskResponse(task: TaskRecord, extras: TaskResponseExtras = {}) {
    const serialized = serializeTask(task);
    if (!serialized) return null;
    return { ...serialized, ...extras };
}

export function listTasks(req: BaseAuthedRequest<ParamsDictionary, unknown, TaskListQuery>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const tasksData = readTasks();
    const userId = req.user.id;
    const userTasks = (tasksData.tasks || []).filter((task) => task.owner_id === userId);

    let filteredTasks = userTasks;
    const campaignQuery = req.query.campaign_id;
    const rawCampaignId = Array.isArray(campaignQuery) ? campaignQuery[0] : campaignQuery;
    if (rawCampaignId !== undefined) {
        if (rawCampaignId === 'null' || rawCampaignId === 'none') {
            filteredTasks = userTasks.filter((task) => !task.campaign_id);
        } else {
            const campaignId = Number(rawCampaignId);
            if (!Number.isInteger(campaignId) || campaignId <= 0) {
                return sendError(res, 400, 'Invalid campaign filter');
            }
            filteredTasks = userTasks.filter((task) => task.campaign_id === campaignId);
        }
    }

    return res.json({ tasks: serializeTaskList(filteredTasks), nextId: tasksData.nextId });
}

export function createTask(req: BaseAuthedRequest<ParamsDictionary, CreateTaskPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: createTaskSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { description, priority, due_date, task_level, campaign_id } = validation.data.body!;

    const prio: TaskRecord['priority'] = priority ?? 'medium';
    const questLevel = clampTaskLevel(task_level ?? 1);

    let campaignId: number | null = null;
    if (campaign_id !== undefined && campaign_id !== null) {
        if (typeof campaign_id !== 'number') {
            return sendError(res, 400, 'Invalid campaign_id');
        }
        const numericCampaignId = campaign_id;
        const campaignsData: CampaignStoreData = readCampaigns();
        const campaign = campaignsData.campaigns.find(
            (record) => record.id === numericCampaignId && record.owner_id === req.user.id && !record.archived
        );
        if (!campaign) return sendError(res, 404, 'Campaign not found');
        campaignId = numericCampaignId;
    }

    const tasksData = readTasks();
    const normalizedDueDate: string =
        typeof due_date === 'string' && due_date.trim().length > 0
            ? due_date
            : new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const newTask: TaskRecord = {
        id: tasksData.nextId,
        description: description.trim(),
        priority: prio,
        sub_tasks: [],
        nextSubtaskId: 1,
        due_date: normalizedDueDate,
        status: 'todo',
        order: tasksData.tasks.length,
        created_at: now,
        updated_at: now,
        task_level: questLevel,
        status_history: [{ status: 'todo', at: now, note: null }],
        rpg: { xp_awarded: false, last_reward_at: null, history: [] },
        campaign_id: campaignId,
        owner_id: req.user.id,
        completed: false
    };

    if (typeof req.user?.id !== 'number') {
        const usersData = readUsers();
        newTask.owner_id = getOwnerIdFallback(usersData);
    }

    tasksData.tasks.push(newTask);
    tasksData.nextId += 1;

    try {
        writeTasks(tasksData);
        const response = toTaskResponse(newTask);
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.status(201).json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist new task');
    }
}

export function createSubtask(
    req: BaseAuthedRequest<{ id: string }, CreateSubtaskPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    if (taskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId);
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const validation = validateRequest(req, { body: createSubtaskSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { description } = validation.data.body!;

    if (typeof task.nextSubtaskId !== 'number') task.nextSubtaskId = 1;
    const now = new Date().toISOString();
    const newSubTask: SubTask = {
        id: task.nextSubtaskId,
        description: description.trim(),
        status: 'todo',
        created_at: now,
        updated_at: now,
        status_history: [{ status: 'todo', at: now, note: null }],
        rpg: { xp_awarded: false, last_reward_at: null },
        completed: false
    };

    task.sub_tasks.push(newSubTask);
    task.nextSubtaskId += 1;
    task.side_quests = task.side_quests && task.side_quests.length > 0 ? task.side_quests : task.sub_tasks;
    task.updated_at = new Date().toISOString();

    try {
        writeTasks(tasksData);
        const response = toTaskResponse(task);
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.status(201).json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist subtask');
    }
}

function applyTaskCompletionReward(
    task: TaskRecord,
    user: UserRecord
): { xpEvents: PublicXpEvent[]; playerSnapshot: PublicUserRpgState | null } {
    const reward = computeTaskXp(task);
    if (reward.amount <= 0) return { xpEvents: [], playerSnapshot: null };

    const metadata: TaskCompletionMetadata = {
        task_id: task.id,
        task_level: task.task_level,
        priority: task.priority
    };
    const xpEvent = applyXp(user, reward.amount, 'task_complete', metadata);
    if (!xpEvent) return { xpEvents: [], playerSnapshot: null };

    incrementCounter(user.rpg, 'tasks_completed');
    task.rpg.xp_awarded = true;
    task.rpg.last_reward_at = xpEvent.at;
    task.rpg.history.unshift({
        at: xpEvent.at,
        amount: xpEvent.amount,
        reason: xpEvent.reason
    });
    if (task.rpg.history.length > 10) task.rpg.history.length = 10;

    const publicEvent = toPublicXpEvent(xpEvent);
    const xpEvents = publicEvent ? [publicEvent] : [];
    const playerSnapshot = buildPublicRpgState(user.rpg);
    return { xpEvents, playerSnapshot };
}

export function updateTaskStatus(
    req: BaseAuthedRequest<{ id: string }, UpdateStatusPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: updateStatusSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { status, note } = validation.data.body!;

    const taskId = parseTaskId(req.params.id);
    if (taskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId);
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    if (!task.rpg || typeof task.rpg !== 'object') task.rpg = { xp_awarded: false, last_reward_at: null, history: [] };
    if (!Array.isArray(task.rpg.history)) task.rpg.history = [];

    const willComplete = status === 'done' && task.status !== 'done' && !task.rpg.xp_awarded;

    let usersData: UserStoreData | null = null;
    let userRecord: UserRecord | null = null;
    let userIndex = -1;

    if (willComplete) {
        usersData = readUsers();
        userIndex = usersData.users.findIndex((user) => user.id === req.user.id);
        if (userIndex === -1) return sendError(res, 404, 'User not found');
        const record = usersData.users[userIndex];
        if (!record) return sendError(res, 404, 'User not found');
        userRecord = record;
        ensureUserRpg(userRecord);
    }

    const now = new Date().toISOString();
    task.status = status;
    task.completed = status === 'done';
    task.updated_at = now;
    if (!Array.isArray(task.status_history)) task.status_history = [];
    task.status_history.push({ status, at: now, note: note || null });

    let xpEvents: PublicXpEvent[] = [];
    let playerSnapshot: PublicUserRpgState | null = null;

    if (willComplete && userRecord) {
        const rewardOutcome = applyTaskCompletionReward(task, userRecord);
        xpEvents = rewardOutcome.xpEvents;
        playerSnapshot = rewardOutcome.playerSnapshot;
    }

    try {
        writeTasks(tasksData);
        if (usersData && userRecord && xpEvents.length > 0 && userIndex >= 0) {
            usersData.users[userIndex] = userRecord;
            writeUsers(usersData);
        }
        const response = toTaskResponse(
            task,
            xpEvents.length > 0
                ? {
                      xp_events: xpEvents,
                      player_rpg: playerSnapshot
                  }
                : {}
        );
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist status change');
    }
}

function applySubtaskCompletionReward(
    task: TaskRecord,
    subtask: SubTask,
    user: UserRecord
) {
    const reward = computeSubtaskXp(task, subtask);
    if (reward.amount <= 0) return null;

    const metadata: SubtaskCompletionMetadata = {
        task_id: task.id,
        task_level: task.task_level,
        subtask_id: subtask.id,
        priority: subtask.priority ?? task.priority
    };
    if (typeof subtask.weight === 'number' && Number.isFinite(subtask.weight)) {
        metadata.weight = subtask.weight;
    }

    const xpEvent = applyXp(user, reward.amount, 'subtask_complete', metadata);
    if (!xpEvent) return null;

    incrementCounter(user.rpg, 'subtasks_completed');
    subtask.rpg.xp_awarded = true;
    subtask.rpg.last_reward_at = xpEvent.at;

    task.rpg.history.unshift({
        at: xpEvent.at,
        amount: xpEvent.amount,
        reason: xpEvent.reason,
        subtask_id: subtask.id
    });
    if (task.rpg.history.length > 10) task.rpg.history.length = 10;

    return xpEvent;
}

export function updateSubtaskStatus(
    req: BaseAuthedRequest<{ id: string; subtask_id: string }, UpdateStatusPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: updateStatusSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { status, note } = validation.data.body!;

    const taskId = parseTaskId(req.params.id);
    const subtaskId = parseTaskId(req.params.subtask_id);
    if (taskId === null || subtaskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId);
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const subtask = (task.sub_tasks || []).find((item) => item.id === subtaskId);
    if (!subtask) return res.status(404).send('Subtask not found');

    if (!task.rpg || typeof task.rpg !== 'object') task.rpg = { xp_awarded: false, last_reward_at: null, history: [] };
    if (!Array.isArray(task.rpg.history)) task.rpg.history = [];
    if (!subtask.rpg || typeof subtask.rpg !== 'object') {
        subtask.rpg = { xp_awarded: false, last_reward_at: null };
    }

    const willComplete = status === 'done' && subtask.status !== 'done' && !subtask.rpg.xp_awarded;

    let usersData: UserStoreData | null = null;
    let userRecord: UserRecord | null = null;
    let userIndex = -1;

    if (willComplete) {
        usersData = readUsers();
        userIndex = usersData.users.findIndex((user) => user.id === req.user.id);
        if (userIndex === -1) return sendError(res, 404, 'User not found');
        const record = usersData.users[userIndex];
        if (!record) return sendError(res, 404, 'User not found');
        userRecord = record;
        ensureUserRpg(userRecord);
    }

    const now = new Date().toISOString();
    subtask.status = status;
    subtask.completed = status === 'done';
    subtask.updated_at = now;
    task.updated_at = now;
    if (!Array.isArray(subtask.status_history)) subtask.status_history = [];
    subtask.status_history.push({ status, at: now, note: note || null });

    const xpEvents: PublicXpEvent[] = [];
    let playerSnapshot: PublicUserRpgState | null = null;

    if (willComplete && userRecord) {
        const event = applySubtaskCompletionReward(task, subtask, userRecord);
        if (event) {
            const publicEvent = toPublicXpEvent(event);
            if (publicEvent) xpEvents.push(publicEvent);
            playerSnapshot = buildPublicRpgState(userRecord.rpg);
        }
    }

    try {
        writeTasks(tasksData);
        if (usersData && userRecord && xpEvents.length > 0 && userIndex >= 0) {
            usersData.users[userIndex] = userRecord;
            writeUsers(usersData);
        }
        const response = toTaskResponse(
            task,
            xpEvents.length > 0
                ? {
                      xp_events: xpEvents,
                      player_rpg: playerSnapshot
                  }
                : {}
        );
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist subtask status change');
    }
}

export function updateTaskOrder(
    req: BaseAuthedRequest<ParamsDictionary, UpdateOrderPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: updateOrderSchema });
    if (!validation.success) {
        return sendError(res, 400, 'order must be an array of ids');
    }
    const { order } = validation.data.body!;

    const tasksData = readTasks();
    const userId = req.user.id;
    const idToTask = new Map<number, TaskRecord>();
    tasksData.tasks.forEach((task) => {
        if (task.owner_id === userId) idToTask.set(task.id, task);
    });

    let updated = false;
    order.forEach((taskId: number, index: number) => {
        const task = idToTask.get(taskId);
        if (task) {
            task.order = index;
            updated = true;
        }
    });

    if (updated) {
        tasksData.tasks
            .filter((task) => task.owner_id === userId && !order.includes(task.id))
            .forEach((task) => {
                task.order = order.length + task.id;
            });
    }

    try {
        writeTasks(tasksData);
        const userTasks = tasksData.tasks.filter((task) => task.owner_id === userId);
        userTasks.sort((a, b) => a.order - b.order);
        return res.json({ tasks: serializeTaskList(userTasks) });
    } catch (error) {
        return sendError(res, 500, 'Failed to persist order');
    }
}

export function getTaskHistory(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    if (taskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId && record.owner_id === req.user.id);
    if (!task) return sendError(res, 404, 'Task not found');

    if (!task.status_history || !Array.isArray(task.status_history)) {
        task.status_history = [];
    }

    return res.json({ history: task.status_history });
}

export function updateTask(
    req: BaseAuthedRequest<{ id: string }, UpdateTaskPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    if (taskId === null) return sendError(res, 400, 'Invalid task id');

    const validation = validateRequest(req, { body: updateTaskSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const updates = validation.data.body ?? {};

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId && record.owner_id === req.user.id);
    if (!task) return sendError(res, 404, 'Task not found');

    if (Object.prototype.hasOwnProperty.call(updates, 'description') && updates.description !== undefined) {
        task.description = updates.description.trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'priority')) {
        const value = updates.priority;
        if (value === undefined) {
            return sendError(res, 400, 'Invalid priority');
        }
        const allowed: TaskRecord['priority'][] = ['low', 'medium', 'high'];
        if (typeof value !== 'string' || !allowed.includes(value as TaskRecord['priority'])) {
            return sendError(res, 400, 'Invalid priority');
        }
        task.priority = value as TaskRecord['priority'];
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'due_date')) {
        if (updates.due_date === null) {
            task.due_date = new Date().toISOString().slice(0, 10);
        } else if (typeof updates.due_date === 'string') {
            task.due_date = updates.due_date;
        } else {
            return sendError(res, 400, 'Invalid due_date');
        }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'task_level') && updates.task_level !== undefined) {
        task.task_level = clampTaskLevel(updates.task_level);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'campaign_id')) {
        const campaignIdValue = updates.campaign_id;
        if (campaignIdValue === null) {
            task.campaign_id = null;
        } else if (typeof campaignIdValue === 'number') {
            const numeric = campaignIdValue;
            const campaignsData = readCampaigns();
            const campaign = campaignsData.campaigns.find(
                (record) => record.id === numeric && record.owner_id === req.user.id && !record.archived
            );
            if (!campaign) return sendError(res, 404, 'Campaign not found');
            task.campaign_id = numeric;
        } else {
            return sendError(res, 400, 'Invalid campaign_id');
        }
    }

    task.updated_at = new Date().toISOString();

    try {
        writeTasks(tasksData);
        const response = toTaskResponse(task);
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist task update');
    }
}

export function deleteTask(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    if (taskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const index = tasksData.tasks.findIndex((record) => record.id === taskId && record.owner_id === req.user.id);
    if (index === -1) return sendError(res, 404, 'Task not found');

    tasksData.tasks.splice(index, 1);

    try {
        writeTasks(tasksData);
        return res.status(204).send();
    } catch (error) {
        return sendError(res, 500, 'Failed to delete task');
    }
}

export function updateSubtask(
    req: BaseAuthedRequest<{ id: string; subtask_id: string }, UpdateSubtaskPayload>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    const subtaskId = parseTaskId(req.params.subtask_id);
    if (taskId === null || subtaskId === null) return sendError(res, 400, 'Invalid task id');

    const validation = validateRequest(req, { body: updateSubtaskSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const updates = validation.data.body ?? {};

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId && record.owner_id === req.user.id);
    if (!task) return sendError(res, 404, 'Task not found');

    const subtask = (task.sub_tasks || []).find((item) => item.id === subtaskId);
    if (!subtask) return sendError(res, 404, 'Subtask not found');

    if (Object.prototype.hasOwnProperty.call(updates, 'description') && updates.description !== undefined) {
        subtask.description = updates.description.trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
        const value = updates.status;
        const allowedStatuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
        if (value === undefined || typeof value !== 'string' || !allowedStatuses.includes(value as TaskStatus)) {
            return sendError(res, 400, 'Invalid status');
        }
        subtask.status = value as TaskStatus;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'weight')) {
        const value = updates.weight;
        if (value === undefined || !Number.isFinite(value)) {
            return sendError(res, 400, 'Invalid weight');
        }
        subtask.weight = value;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'priority')) {
        const value = updates.priority;
        const allowedPriorities: TaskRecord['priority'][] = ['low', 'medium', 'high'];
        if (value === undefined || typeof value !== 'string' || !allowedPriorities.includes(value as TaskRecord['priority'])) {
            return sendError(res, 400, 'Invalid priority');
        }
        subtask.priority = value as TaskRecord['priority'];
    }

    subtask.updated_at = new Date().toISOString();

    try {
        writeTasks(tasksData);
        const response = toTaskResponse(task);
        if (!response) return sendError(res, 500, 'Failed to serialize task');
        return res.json(response);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist subtask update');
    }
}

export function deleteSubtask(
    req: BaseAuthedRequest,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const taskId = parseTaskId(req.params.id);
    const subtaskId = parseTaskId(req.params.subtask_id);
    if (taskId === null || subtaskId === null) return sendError(res, 400, 'Invalid task id');

    const tasksData = readTasks();
    const task = tasksData.tasks.find((record) => record.id === taskId && record.owner_id === req.user.id);
    if (!task) return sendError(res, 404, 'Task not found');

    const index = task.sub_tasks.findIndex((sub) => sub.id === subtaskId);
    if (index === -1) return sendError(res, 404, 'Subtask not found');

    task.sub_tasks.splice(index, 1);
    if (Array.isArray(task.side_quests)) {
        task.side_quests = task.side_quests.filter((sub) => sub.id !== subtaskId);
    }

    try {
        writeTasks(tasksData);
        return res.status(204).send();
    } catch (error) {
        return sendError(res, 500, 'Failed to delete subtask');
    }
}

const controller = {
    listTasks,
    createTask,
    createSubtask,
    updateTaskStatus,
    updateSubtaskStatus,
    updateTaskOrder,
    getTaskHistory,
    updateTask,
    deleteTask,
    updateSubtask,
    deleteSubtask
};

export default controller;
