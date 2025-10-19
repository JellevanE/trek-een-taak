'use strict';

const { readTasks, writeTasks, serializeTaskList, buildDemoTasks } = require('../data/taskStore');
const { sendError } = require('../utils/http');

function clearTasks(req, res) {
    const tasksData = readTasks();
    const before = tasksData.tasks.length;
    tasksData.tasks = tasksData.tasks.filter(task => task.owner_id !== req.user.id);
    const removed = before - tasksData.tasks.length;
    try {
        writeTasks(tasksData);
        res.json({ removed });
    } catch (e) {
        console.error('Failed to clear tasks', e);
        return sendError(res, 500, 'Failed to clear tasks');
    }
}

function seedTasks(req, res) {
    const { count } = req.body || {};
    const tasksData = readTasks();
    const existing = tasksData.tasks.filter(task => task.owner_id !== req.user.id);
    const userTasksRemoved = tasksData.tasks.length - existing.length;
    const orderStart = existing.reduce((max, task) => task.order > max ? task.order : max, -1) + 1;
    const seedCount = Number.isFinite(count) ? Math.max(1, Math.min(10, Math.floor(count))) : 5;
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
        res.json({
            created: demo.tasks.length,
            removedBeforeSeed: userTasksRemoved,
            tasks: serializeTaskList(demo.tasks)
        });
    } catch (e) {
        console.error('Failed to seed tasks', e);
        return sendError(res, 500, 'Failed to seed tasks');
    }
}

module.exports = {
    clearTasks,
    seedTasks
};

