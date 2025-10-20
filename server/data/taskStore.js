'use strict';

const fs = require('fs');
const { TASKS_FILE } = require('./filePaths');
const { readUsers } = require('./userStore');
const experience = require('../rpg/experience');

function readTasks() {
    try {
        if (!fs.existsSync(TASKS_FILE)) {
            return { tasks: [], nextId: 1 };
        }
        const data = fs.readFileSync(TASKS_FILE);
        const parsed = JSON.parse(data);

        let usersData = { users: [], nextId: 1 };
        try {
            usersData = readUsers();
        } catch (err) {
            usersData = { users: [], nextId: 1 };
        }

        if (Array.isArray(parsed.tasks)) {
            parsed.tasks.forEach((task, idx) => {
                if (!Array.isArray(task.sub_tasks)) task.sub_tasks = [];

                if (!task.status) {
                    if (typeof task.completed === 'boolean') {
                        task.status = task.completed ? 'done' : 'todo';
                    } else {
                        task.status = 'todo';
                    }
                }

                if (typeof task.order !== 'number') task.order = idx;

                const now = new Date().toISOString();
                if (!task.created_at) task.created_at = now;
                if (!task.updated_at) task.updated_at = now;

                if (!Array.isArray(task.status_history) || task.status_history.length === 0) {
                    task.status_history = [{ status: task.status, at: task.updated_at, note: null }];
                }

                let maxSubId = 0;
                task.sub_tasks.forEach(sub => {
                    if (sub && typeof sub.id === 'number' && sub.id > maxSubId) {
                        maxSubId = sub.id;
                    }
                });
                task.sub_tasks.forEach((sub) => {
                    if (!sub || typeof sub !== 'object') return;
                    if (typeof sub.id !== 'number') {
                        maxSubId += 1;
                        sub.id = maxSubId;
                    }
                    if (!sub.status) sub.status = (sub.completed ? 'done' : 'todo');
                    if (!sub.created_at) sub.created_at = now;
                    if (!sub.updated_at) sub.updated_at = now;
                    if (!Array.isArray(sub.status_history) || sub.status_history.length === 0) {
                        sub.status_history = [{ status: sub.status, at: sub.updated_at, note: null }];
                    }
                    if (typeof sub.xp_awarded === 'boolean') {
                        if (!sub.rpg || typeof sub.rpg !== 'object') sub.rpg = {};
                        if (typeof sub.rpg.xp_awarded !== 'boolean') sub.rpg.xp_awarded = sub.xp_awarded;
                        delete sub.xp_awarded;
                    }
                    if (!sub.rpg || typeof sub.rpg !== 'object') sub.rpg = {};
                    if (typeof sub.rpg.xp_awarded !== 'boolean') sub.rpg.xp_awarded = (sub.status === 'done');
                });

                const nextSubId = maxSubId + 1;
                if (typeof task.nextSubtaskId !== 'number') task.nextSubtaskId = nextSubId;

                if (typeof task.owner_id !== 'number') {
                    const defaultUserId = (Array.isArray(usersData.users) && usersData.users[0] && typeof usersData.users[0].id === 'number')
                        ? usersData.users[0].id
                        : 1;
                    task.owner_id = defaultUserId;
                }

                if (typeof task.xp_awarded === 'boolean') {
                    if (!task.rpg || typeof task.rpg !== 'object') task.rpg = {};
                    if (typeof task.rpg.xp_awarded !== 'boolean') task.rpg.xp_awarded = task.xp_awarded;
                    delete task.xp_awarded;
                }
                if (!task.rpg || typeof task.rpg !== 'object') task.rpg = {};
                if (typeof task.rpg.xp_awarded !== 'boolean') task.rpg.xp_awarded = (task.status === 'done');
                if (!Array.isArray(task.rpg.history)) task.rpg.history = [];
                if (!task.rpg.last_reward_at) task.rpg.last_reward_at = null;

                if (typeof task.task_level !== 'number' || !Number.isFinite(task.task_level)) task.task_level = 1;
                task.task_level = experience.clampTaskLevel(task.task_level);

                if (task.campaign_id === undefined || task.campaign_id === null) {
                    task.campaign_id = null;
                } else {
                    const campaignId = Number(task.campaign_id);
                    task.campaign_id = Number.isInteger(campaignId) && campaignId > 0 ? campaignId : null;
                }
            });
        }

        const maxTaskId = Array.isArray(parsed.tasks) && parsed.tasks.length > 0
            ? parsed.tasks.reduce((max, t) => (typeof t.id === 'number' && t.id > max ? t.id : max), 0)
            : 0;
        if (typeof parsed.nextId !== 'number' || parsed.nextId <= maxTaskId) {
            parsed.nextId = maxTaskId + 1;
        }
        return parsed;
    } catch (error) {
        console.error('Error reading tasks file:', error);
        return { tasks: [], nextId: 1 };
    }
}

function writeTasks(data) {
    const tmpPath = `${TASKS_FILE}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, TASKS_FILE);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch (cleanupErr) {
            // ignore cleanup errors
        }
        console.error('Error writing tasks file:', error);
        throw error;
    }
}

function serializeSubtask(subtask) {
    if (!subtask || typeof subtask !== 'object') return subtask;
    const base = { ...subtask };
    if (subtask.rpg && typeof subtask.rpg === 'object') {
        base.rpg = {
            xp_awarded: !!subtask.rpg.xp_awarded,
            last_reward_at: subtask.rpg.last_reward_at || null
        };
    } else {
        base.rpg = { xp_awarded: false, last_reward_at: null };
    }
    return base;
}

function serializeTask(task) {
    if (!task || typeof task !== 'object') return task;
    const subTasks = Array.isArray(task.sub_tasks) ? task.sub_tasks.map(serializeSubtask) : [];
    const sideQuests = Array.isArray(task.side_quests)
        ? task.side_quests.map(serializeSubtask)
        : subTasks;
    const rpgData = task.rpg && typeof task.rpg === 'object'
        ? {
            xp_awarded: !!task.rpg.xp_awarded,
            last_reward_at: task.rpg.last_reward_at || null
        }
        : { xp_awarded: false, last_reward_at: null };
    const base = { ...task, sub_tasks: subTasks, rpg: rpgData };
    base.campaign_id = (typeof task.campaign_id === 'number' && Number.isInteger(task.campaign_id) && task.campaign_id > 0)
        ? task.campaign_id
        : null;
    return { ...base, side_quests: sideQuests };
}

function serializeTaskList(list) {
    return Array.isArray(list) ? list.map(serializeTask) : [];
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildDemoTasks(options) {
    const {
        count = 5,
        nextId,
        ownerId,
        startingOrder = 0
    } = options;

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

    const priorities = ['low', 'medium', 'high'];
    const statuses = ['todo', 'in_progress', 'blocked', 'done'];
    const today = new Date();
    const tasks = [];
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
        const subTasks = [];
        let nextSubId = 1;
        for (let s = 0; s < subTaskCount; s++) {
            const subStatus = randomChoice(['todo', 'in_progress', 'done']);
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

        const task = {
            id: taskId,
            description,
            priority,
            sub_tasks: subTasks,
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
            rpg: { xp_awarded: status === 'done', last_reward_at: null, history: [] }
        };
        tasks.push(task);
    }

    return { tasks, nextId: idCounter };
}

module.exports = {
    readTasks,
    writeTasks,
    serializeTask,
    serializeTaskList,
    buildDemoTasks
};
