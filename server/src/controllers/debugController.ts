import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import {
    buildDemoTasks,
    readTasks,
    serializeTaskList,
    writeTasks
} from '../data/taskStore';
import { sendError } from '../utils/http';
import { assertAuthenticated } from '../utils/authGuard';
import type { AuthenticatedRequest } from '../types/auth';

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

interface SeedTasksBody {
    count?: number;
}

export function seedTasks(req: BaseAuthedRequest<SeedTasksBody>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const { count } = req.body || {};

    const tasksData = readTasks();
    const existing = tasksData.tasks.filter((task) => task.owner_id !== req.user.id);
    const userTasksRemoved = tasksData.tasks.length - existing.length;
    const orderStart = existing.reduce((max, task) => (task.order > max ? task.order : max), -1) + 1;
    const seedCount = Number.isFinite(count) ? Math.max(1, Math.min(10, Math.floor(count as number))) : 5;

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
