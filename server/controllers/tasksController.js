'use strict';

const experience = require('../rpg/experience');
const { readTasks, writeTasks, serializeTask, serializeTaskList } = require('../data/taskStore');
const { readCampaigns } = require('../data/campaignStore');
const { readUsers, writeUsers } = require('../data/userStore');
const { sendError } = require('../utils/http');

function listTasks(req, res) {
    const tasks = readTasks();
    const userTasks = (tasks.tasks || []).filter(t => t.owner_id === req.user.id);
    let filteredTasks = userTasks;
    if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'campaign_id')) {
        const rawCampaignId = req.query.campaign_id;
        if (rawCampaignId === 'null' || rawCampaignId === 'none') {
            filteredTasks = userTasks.filter(task => !task.campaign_id);
        } else {
            const campaignId = Number(rawCampaignId);
            if (!Number.isInteger(campaignId) || campaignId <= 0) return sendError(res, 400, 'Invalid campaign filter');
            filteredTasks = userTasks.filter(task => task.campaign_id === campaignId);
        }
    }
    return res.json({ tasks: serializeTaskList(filteredTasks), nextId: tasks.nextId });
}

function createTask(req, res) {
    const { description, priority, due_date, task_level, campaign_id } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
        return sendError(res, 400, 'Missing or invalid description');
    }
    const allowed = ['low', 'medium', 'high'];
    const prio = allowed.includes(priority) ? priority : 'medium';
    const levelValue = Number(task_level);
    const questLevel = Number.isFinite(levelValue) ? experience.clampTaskLevel(levelValue) : 1;

    let campaignId = null;
    if (campaign_id !== undefined && campaign_id !== null) {
        const numericCampaignId = Number(campaign_id);
        if (!Number.isInteger(numericCampaignId) || numericCampaignId <= 0) return sendError(res, 400, 'Invalid campaign_id');
        const campaignsData = readCampaigns();
        const campaign = campaignsData.campaigns.find(c => c.id === numericCampaignId && c.owner_id === req.user.id && !c.archived);
        if (!campaign) return sendError(res, 404, 'Campaign not found');
        campaignId = numericCampaignId;
    }

    const tasksData = readTasks();
    const now = new Date().toISOString();
    const newTask = {
        id: tasksData.nextId,
        description: description.trim(),
        priority: prio,
        sub_tasks: [],
        nextSubtaskId: 1,
        due_date: typeof due_date === 'string' && due_date ? due_date : new Date().toISOString().split('T')[0],
        status: 'todo',
        order: tasksData.tasks.length,
        created_at: now,
        updated_at: now,
        task_level: questLevel,
        status_history: [{ status: 'todo', at: now, note: null }],
        rpg: { xp_awarded: false, last_reward_at: null },
        campaign_id: campaignId
    };
    if (req.user && typeof req.user.id === 'number') newTask.owner_id = req.user.id;
    else {
        const users = readUsers();
        newTask.owner_id = (Array.isArray(users.users) && users.users[0] && typeof users.users[0].id === 'number') ? users.users[0].id : 1;
    }
    tasksData.tasks.push(newTask);
    tasksData.nextId++;
    try {
        writeTasks(tasksData);
        res.status(201).json(serializeTask(newTask));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist new task' });
    }
}

function createSubtask(req, res) {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id, 10));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const { description } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
        return sendError(res, 400, 'Missing or invalid description for subtask');
    }

    if (typeof task.nextSubtaskId !== 'number') task.nextSubtaskId = 1;
    const now = new Date().toISOString();
    const newSubTask = {
        id: task.nextSubtaskId,
        description: description.trim(),
        status: 'todo',
        created_at: now,
        updated_at: now,
        status_history: [{ status: 'todo', at: now, note: null }],
        rpg: { xp_awarded: false, last_reward_at: null }
    };
    task.sub_tasks.push(newSubTask);
    task.nextSubtaskId++;
    task.updated_at = new Date().toISOString();
    try {
        writeTasks(tasks);
        res.status(201).json(serializeTask(task));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist subtask' });
    }
}

function updateTaskStatus(req, res) {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return sendError(res, 400, 'Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id, 10));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    if (!task.rpg || typeof task.rpg !== 'object') task.rpg = { xp_awarded: false, last_reward_at: null, history: [] };
    if (!Array.isArray(task.rpg.history)) task.rpg.history = [];
    const willComplete = (status === 'done') && (task.status !== 'done') && (!task.rpg.xp_awarded);

    let usersData = null;
    let userIndex = -1;
    let userRecord = null;
    if (willComplete) {
        usersData = readUsers();
        userIndex = usersData.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) return sendError(res, 404, 'User not found');
        userRecord = usersData.users[userIndex];
        experience.ensureUserRpg(userRecord);
    }

    const now = new Date().toISOString();
    task.status = status;
    task.completed = (status === 'done');
    task.updated_at = now;
    if (!Array.isArray(task.status_history)) task.status_history = [];
    task.status_history.push({ status, at: now, note: note || null });

    const xpEvents = [];
    let playerSnapshot = null;

    if (willComplete && userRecord) {
        const reward = experience.computeTaskXp(task);
        if (reward.amount > 0) {
            const xpEvent = experience.applyXp(userRecord, reward.amount, 'task_complete', {
                task_id: task.id,
                task_level: task.task_level,
                priority: task.priority
            });
            if (xpEvent) {
                experience.incrementCounter(userRecord.rpg, 'tasks_completed');
                task.rpg.xp_awarded = true;
                task.rpg.last_reward_at = xpEvent.at;
                task.rpg.history.unshift({ at: xpEvent.at, amount: xpEvent.amount, reason: xpEvent.reason });
                if (task.rpg.history.length > 10) task.rpg.history.length = 10;
                xpEvents.push(experience.toPublicXpEvent(xpEvent));
                playerSnapshot = experience.buildPublicRpgState(userRecord.rpg);
            }
        }
    }

    try {
        writeTasks(tasks);
        if (usersData && userRecord && xpEvents.length > 0) {
            usersData.users[userIndex] = userRecord;
            writeUsers(usersData);
        }
        const payload = serializeTask(task);
        if (xpEvents.length > 0) {
            payload.xp_events = xpEvents;
            if (playerSnapshot) payload.player_rpg = playerSnapshot;
        }
        res.json(payload);
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist status change' });
    }
}

function updateSubtaskStatus(req, res) {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return sendError(res, 400, 'Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id, 10));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const subId = parseInt(req.params.subtask_id, 10);
    const subtask = (task.sub_tasks || []).find(s => s.id === subId);
    if (!subtask) return res.status(404).send('Subtask not found');

    if (!task.rpg || typeof task.rpg !== 'object') task.rpg = { xp_awarded: false, last_reward_at: null, history: [] };
    if (!Array.isArray(task.rpg.history)) task.rpg.history = [];
    if (!subtask.rpg || typeof subtask.rpg !== 'object') subtask.rpg = { xp_awarded: false, last_reward_at: null };
    const willComplete = (status === 'done') && (subtask.status !== 'done') && (!subtask.rpg.xp_awarded);

    let usersData = null;
    let userIndex = -1;
    let userRecord = null;
    if (willComplete) {
        usersData = readUsers();
        userIndex = usersData.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) return sendError(res, 404, 'User not found');
        userRecord = usersData.users[userIndex];
        experience.ensureUserRpg(userRecord);
    }

    const now = new Date().toISOString();
    subtask.status = status;
    subtask.completed = (status === 'done');
    subtask.updated_at = now;
    task.updated_at = now;
    if (!Array.isArray(subtask.status_history)) subtask.status_history = [];
    subtask.status_history.push({ status, at: now, note: note || null });

    const xpEvents = [];
    let playerSnapshot = null;

    if (willComplete && userRecord) {
        const reward = experience.computeSubtaskXp(task, subtask);
        if (reward.amount > 0) {
            const xpEvent = experience.applyXp(userRecord, reward.amount, 'subtask_complete', {
                task_id: task.id,
                subtask_id: subtask.id,
                task_level: task.task_level,
                priority: subtask.priority || task.priority
            });
            if (xpEvent) {
                experience.incrementCounter(userRecord.rpg, 'subtasks_completed');
                subtask.rpg.xp_awarded = true;
                subtask.rpg.last_reward_at = xpEvent.at;
                if (task.rpg && Array.isArray(task.rpg.history)) {
                    task.rpg.history.unshift({ at: xpEvent.at, amount: xpEvent.amount, reason: 'subtask_complete', subtask_id: subtask.id });
                    if (task.rpg.history.length > 10) task.rpg.history.length = 10;
                }
                xpEvents.push(experience.toPublicXpEvent(xpEvent));
                playerSnapshot = experience.buildPublicRpgState(userRecord.rpg);
            }
        }
    }

    try {
        writeTasks(tasks);
        if (usersData && userRecord && xpEvents.length > 0) {
            usersData.users[userIndex] = userRecord;
            writeUsers(usersData);
        }
        const payload = serializeTask(task);
        if (xpEvents.length > 0) {
            payload.xp_events = xpEvents;
            if (playerSnapshot) payload.player_rpg = playerSnapshot;
        }
        res.json(payload);
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist subtask status change' });
    }
}

function updateTaskOrder(req, res) {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return sendError(res, 400, 'Order must be an array of ids');
    const tasksData = readTasks();
    const userTasks = tasksData.tasks.filter(t => t.owner_id === req.user.id);
    const userTaskIds = new Set(userTasks.map(t => t.id));
    for (const id of order) {
        if (!userTaskIds.has(id)) return res.status(400).send('Invalid task id in order');
    }
    const idToTask = new Map(userTasks.map(t => [t.id, t]));
    order.forEach((id, idx) => {
        const task = idToTask.get(id);
        if (task) task.order = idx;
    });
    const remaining = userTasks.filter(t => !order.includes(t.id)).sort((a, b) => a.order - b.order);
    remaining.forEach((t, idx) => { t.order = order.length + idx; });
    const otherUserTasks = tasksData.tasks.filter(t => t.owner_id !== req.user.id);
    const sortedUserTasks = userTasks.sort((a, b) => a.order - b.order);
    tasksData.tasks = [...otherUserTasks, ...sortedUserTasks];
    try {
        writeTasks(tasksData);
        res.json({ tasks: serializeTaskList(sortedUserTasks) });
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist order' });
    }
}

function getTaskHistory(req, res) {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id, 10));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');
    res.json({ status_history: task.status_history || [] });
}

function updateTask(req, res) {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id, 10));
    if (taskIndex === -1 || tasks.tasks[taskIndex].owner_id !== req.user.id) return sendError(res, 404, 'Task not found');

    const target = tasks.tasks[taskIndex];
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'description')) {
        if (typeof req.body.description !== 'string' || !req.body.description.trim()) return sendError(res, 400, 'Invalid description');
        target.description = req.body.description.trim();
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'priority')) {
        const allowedP = ['low', 'medium', 'high'];
        if (!allowedP.includes(req.body.priority)) return sendError(res, 400, 'Invalid priority');
        target.priority = req.body.priority;
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'task_level')) {
        const levelValue = Number(req.body.task_level);
        if (!Number.isFinite(levelValue)) return sendError(res, 400, 'Invalid task_level');
        target.task_level = experience.clampTaskLevel(levelValue);
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'completed')) {
        if (typeof req.body.completed !== 'boolean') return sendError(res, 400, 'Invalid completed flag');
        target.completed = req.body.completed;
        target.status = req.body.completed ? 'done' : target.status;
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'due_date')) {
        if (typeof req.body.due_date !== 'string') return sendError(res, 400, 'Invalid due_date');
        target.due_date = req.body.due_date;
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'campaign_id')) {
        const rawCampaign = req.body.campaign_id;
        if (rawCampaign === null) {
            target.campaign_id = null;
        } else {
            const numericCampaign = Number(rawCampaign);
            if (!Number.isInteger(numericCampaign) || numericCampaign <= 0) return sendError(res, 400, 'Invalid campaign_id');
            const campaignsData = readCampaigns();
            const campaign = campaignsData.campaigns.find(c => c.id === numericCampaign && c.owner_id === req.user.id && !c.archived);
            if (!campaign) return sendError(res, 404, 'Campaign not found');
            target.campaign_id = numericCampaign;
        }
    }
    target.updated_at = new Date().toISOString();
    try {
        writeTasks(tasks);
        res.json(serializeTask(target));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist task update' });
    }
}

function deleteTask(req, res) {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id, 10));
    if (taskIndex === -1 || tasks.tasks[taskIndex].owner_id !== req.user.id) return res.status(404).send('Task not found');
    tasks.tasks.splice(taskIndex, 1);
    try {
        writeTasks(tasks);
        res.status(204).send();
    } catch (e) {
        res.status(500).send('Failed to persist task deletion');
    }
}

function updateSubtask(req, res) {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id, 10));
    if (!task || task.owner_id !== req.user.id) return sendError(res, 404, 'Task not found');
    const subId = parseInt(req.params.subtask_id, 10);
    const subtask = task.sub_tasks.find(s => s.id === subId);
    if (!subtask) return sendError(res, 404, 'Subtask not found');

    if (Object.prototype.hasOwnProperty.call(req.body, 'completed')) {
        if (typeof req.body.completed !== 'boolean') return sendError(res, 400, 'Invalid completed flag for subtask');
        subtask.completed = req.body.completed;
        subtask.status = req.body.completed ? 'done' : subtask.status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
        if (typeof req.body.description !== 'string' || !req.body.description.trim()) return sendError(res, 400, 'Invalid description for subtask');
        subtask.description = req.body.description.trim();
    }
    try {
        writeTasks(tasks);
        res.json(serializeTask(task));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist subtask update' });
    }
}

function deleteSubtask(req, res) {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id, 10));
    if (taskIndex === -1) return sendError(res, 404, 'Task not found');
    const task = tasks.tasks[taskIndex];
    if (task.owner_id !== req.user.id) return sendError(res, 404, 'Task not found');
    if (!Array.isArray(task.sub_tasks)) task.sub_tasks = [];
    const subId = parseInt(req.params.subtask_id, 10);
    const subIndex = task.sub_tasks.findIndex(s => s.id === subId);
    if (subIndex === -1) return sendError(res, 404, 'Subtask not found');
    task.sub_tasks.splice(subIndex, 1);
    try {
        writeTasks(tasks);
        res.json(serializeTask(task));
    } catch (e) {
        console.error('Failed to delete subtask', e);
        res.status(500).json({ error: 'Failed to persist subtask deletion' });
    }
}

module.exports = {
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
