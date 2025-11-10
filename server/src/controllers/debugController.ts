import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import {
    buildDemoTasks,
    readTasks,
    serializeTaskList,
    writeTasks
} from '../data/taskStore.js';
import { sendError } from '../utils/http.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { validateRequest } from '../validation/index.js';
import { seedTasksSchema, type SeedTasksPayload } from '../validation/schemas/debug.js';

type BaseAuthedRequest<B = unknown> = AuthenticatedRequest<ParamsDictionary, unknown, B>;

export function clearTasks(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const tasksData = readTasks();
    const before = tasksData.tasks.length;
    tasksData.tasks = tasksData.tasks.filter((task) => task.owner_id !== req.user.id);
    const removed = before - tasksData.tasks.length;

    try {
        writeTasks(tasksData);
        return res.json({ removed });
    } catch (error) {
        return sendError(res, 500, 'Failed to clear tasks');
    }
}

export function seedTasks(req: BaseAuthedRequest<SeedTasksPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: seedTasksSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const payload = (validation.data.body ?? {}) as SeedTasksPayload;
    const rawCount = payload.count;
    let seedCount = 5;
    if (rawCount !== undefined && rawCount !== null) {
        const numeric = Number(rawCount);
        if (Number.isFinite(numeric)) {
            const floored = Math.floor(numeric);
            seedCount = Math.max(1, Math.min(10, floored));
        }
    }

    const tasksData = readTasks();
    const existing = tasksData.tasks.filter((task) => task.owner_id !== req.user.id);
    const userTasksRemoved = tasksData.tasks.length - existing.length;
    const orderStart = existing.reduce((max, task) => (task.order > max ? task.order : max), -1) + 1;

    const demo = buildDemoTasks({
        count: seedCount,
        nextId: tasksData.nextId,
        ownerId: req.user.id,
        startingOrder: orderStart
    });

    tasksData.tasks = [...existing, ...demo.tasks];
    tasksData.nextId = demo.nextId;

    try {
        writeTasks(tasksData);
        return res.json({
            created: demo.tasks.length,
            removedBeforeSeed: userTasksRemoved,
            tasks: serializeTaskList(demo.tasks)
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to seed tasks');
    }
}

const controller = {
    clearTasks,
    seedTasks
};

export default controller;
