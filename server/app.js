const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// auth deps and helpers
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
    // minimal token payload
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticate(req, res, next) {
    const auth = req.headers && req.headers.authorization;
    if (!auth) return next(); // allow anonymous requests to fall back to default user
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return sendError(res, 401, 'Invalid auth format');
    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // attach user to request
        req.user = { id: payload.id, username: payload.username };
        return next();
    } catch (e) {
        return sendError(res, 401, 'Invalid or expired token');
    }
}

app.use(authenticate);

function ensureAuth(req, res, next) {
    if (!req.user || typeof req.user.id !== 'number') return sendError(res, 401, 'Authentication required');
    return next();
}

// Allow overriding the tasks & users file paths via environment for tests and deployments
const TASKS_FILE = process.env.TASKS_FILE || path.join(__dirname, 'tasks.json');
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, 'users.json');

function readTasks() {
    try {
        if (!fs.existsSync(TASKS_FILE)) {
            return { tasks: [], nextId: 1 };
        }
        const data = fs.readFileSync(TASKS_FILE);
        const parsed = JSON.parse(data);

        // Load users to migrate/assign owner_id if missing
        let usersData = { users: [], nextId: 1 };
        try {
            if (fs.existsSync(USERS_FILE)) {
                usersData = JSON.parse(fs.readFileSync(USERS_FILE));
            }
        } catch (e) {
            // ignore users read errors; will create default below if needed
        }

        // Backwards-compat: ensure each task has expected fields, subtasks have unique ids and a nextSubtaskId counter
        if (Array.isArray(parsed.tasks)) {
            parsed.tasks.forEach((task, idx) => {
                // ensure basic arrays
                if (!Array.isArray(task.sub_tasks)) task.sub_tasks = [];

                // normalize status: old boolean `completed` -> status
                if (!task.status) {
                    if (typeof task.completed === 'boolean') {
                        task.status = task.completed ? 'done' : 'todo';
                    } else {
                        task.status = 'todo';
                    }
                }

                // ensure order exists
                if (typeof task.order !== 'number') task.order = idx;

                // timestamps
                const now = new Date().toISOString();
                if (!task.created_at) task.created_at = now;
                if (!task.updated_at) task.updated_at = now;

                // ensure status_history exists
                if (!Array.isArray(task.status_history) || task.status_history.length === 0) {
                    task.status_history = [{ status: task.status, at: task.updated_at, note: null }];
                }

                // ensure subtask ids and normalize subtask fields
                let maxSubId = 0;
                task.sub_tasks.forEach(sub => {
                    if (sub && typeof sub.id === 'number') {
                        if (sub.id > maxSubId) maxSubId = sub.id;
                    }
                });
                task.sub_tasks.forEach((sub) => {
                    if (!sub || typeof sub !== 'object') return;
                    if (typeof sub.id !== 'number') {
                        maxSubId++;
                        sub.id = maxSubId;
                    }
                    if (!sub.status) sub.status = (sub.completed ? 'done' : 'todo');
                    if (!sub.created_at) sub.created_at = now;
                    if (!sub.updated_at) sub.updated_at = now;
                    if (!Array.isArray(sub.status_history) || sub.status_history.length === 0) {
                        sub.status_history = [{ status: sub.status, at: sub.updated_at, note: null }];
                    }
                });

                const nextSubId = maxSubId + 1;
                if (typeof task.nextSubtaskId !== 'number') task.nextSubtaskId = nextSubId;
                // ensure owner exists; migrate to default user if missing
                if (typeof task.owner_id !== 'number') {
                    // pick the first user if available, otherwise default to 1
                    const defaultUserId = (Array.isArray(usersData.users) && usersData.users[0] && typeof usersData.users[0].id === 'number') ? usersData.users[0].id : 1;
                    task.owner_id = defaultUserId;
                }
            });
        }

        // Ensure top-level nextId: pick a safe value (max existing id + 1)
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

function readUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            // create a default local user
            const now = new Date().toISOString();
            const defaultUser = {
                id: 1,
                username: 'local',
                password_hash: '',
                email: null,
                created_at: now,
                updated_at: now,
                profile: { display_name: 'Local User', avatar: null, class: 'adventurer', bio: '' },
                rpg: { level: 1, xp: 0, hp: 20, mp: 5, coins: 0, streak: 0, achievements: [], inventory: { items: [] } }
            };
            const initial = { users: [defaultUser], nextId: 2 };
            fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2));
            return initial;
        }
        const data = fs.readFileSync(USERS_FILE);
        const parsed = JSON.parse(data);
        // basic normalization
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (typeof parsed.nextId !== 'number') {
            const maxId = parsed.users.reduce((m, u) => (u && typeof u.id === 'number' && u.id > m ? u.id : m), 0);
            parsed.nextId = maxId + 1;
        }
        return parsed;
    } catch (err) {
        console.error('Error reading users file:', err);
        return { users: [], nextId: 1 };
    }
}

function writeUsers(data) {
    const tmpPath = `${USERS_FILE}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, USERS_FILE);
        return true;
    } catch (error) {
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}
        console.error('Error writing users file:', error);
        throw error;
    }
}

function sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
}

function serializeSubtask(subtask) {
    if (!subtask || typeof subtask !== 'object') return subtask;
    return { ...subtask };
}

function serializeTask(task) {
    if (!task || typeof task !== 'object') return task;
    const subTasks = Array.isArray(task.sub_tasks) ? task.sub_tasks.map(serializeSubtask) : [];
    const sideQuests = Array.isArray(task.side_quests)
        ? task.side_quests.map(serializeSubtask)
        : subTasks;
    const base = { ...task, sub_tasks: subTasks };
    return { ...base, side_quests: sideQuests };
}

function serializeTaskList(list) {
    return Array.isArray(list) ? list.map(serializeTask) : [];
}

// Profile endpoints
app.get('/api/users/me', ensureAuth, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return sendError(res, 404, 'User not found');
    return res.json({ user: sanitizeUser(user) });
});

app.put('/api/users/me', ensureAuth, (req, res) => {
    const users = readUsers();
    const userIndex = users.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');

    const allowedProfile = ['display_name', 'avatar', 'class', 'bio', 'prefs'];
    const profile = users.users[userIndex].profile || {};
    if (req.body && typeof req.body === 'object') {
        allowedProfile.forEach(k => {
            if (Object.prototype.hasOwnProperty.call(req.body, k)) {
                profile[k] = req.body[k];
            }
        });
    }
    users.users[userIndex].profile = profile;
    users.users[userIndex].updated_at = new Date().toISOString();
    try {
        writeUsers(users);
        return res.json({ user: sanitizeUser(users.users[userIndex]) });
    } catch (e) {
        return sendError(res, 500, 'Failed to persist profile update');
    }
});

app.get('/api/users/check-username/:username', (req, res) => {
    const { username } = req.params;
    if (!username || typeof username !== 'string' || !username.trim()) {
        return sendError(res, 400, 'Invalid username');
    }
    const usersData = readUsers();
    const isTaken = usersData.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (isTaken) {
        // Optionally, suggest some alternatives
        const suggestions = [
            `${username}${Math.floor(Math.random() * 100)}`,
            `${username}_${Math.floor(Math.random() * 10)}`,
        ];
        return res.json({ available: false, suggestions });
    }
    return res.json({ available: true });
});

function writeTasks(data) {
    // atomic write: write to temp file then rename
    const tmpPath = `${TASKS_FILE}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        // rename is atomic on most filesystems when on same mount
        fs.renameSync(tmpPath, TASKS_FILE);
        return true;
    } catch (error) {
        // cleanup tmp file if it exists
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch (e) {
            // ignore cleanup errors
        }
        console.error('Error writing tasks file:', error);
        // throw so callers can surface a 500 to clients
        throw error;
    }
}

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

app.get('/api/tasks', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const userTasks = (tasks.tasks || []).filter(t => t.owner_id === req.user.id);
    return res.json({ tasks: serializeTaskList(userTasks), nextId: tasks.nextId });
});

app.post('/api/tasks', ensureAuth, (req, res) => {
    // basic validation
    const { description, priority, due_date } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
        return sendError(res, 400, 'Missing or invalid description');
    }
    const allowed = ['low', 'medium', 'high'];
    const prio = allowed.includes(priority) ? priority : 'medium';

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
        status_history: [{ status: 'todo', at: now, note: null }],
    };
    // set owner from authenticated user or default to first user
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
});

// Auth endpoints
app.post('/api/users/register', (req, res) => {
    const { username, password, email, profile: profileData } = req.body || {};
    if (!username || typeof username !== 'string' || !username.trim()) return sendError(res, 400, 'Invalid username');
    if (!password || typeof password !== 'string' || password.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');

    const usersData = readUsers();
    // ensure unique username
    if (usersData.users.some(u => u.username === username.trim())) return sendError(res, 400, 'Username taken');

    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, 10);
    
    // Build profile with defaults and provided data
    const defaultProfile = {
        display_name: username.trim(),
        avatar: null,
        class: 'adventurer',
        bio: ''
    };
    
    const profile = { ...defaultProfile };
    if (profileData && typeof profileData === 'object') {
        if (profileData.display_name && typeof profileData.display_name === 'string' && profileData.display_name.trim()) {
            profile.display_name = profileData.display_name.trim();
        }
        if (profileData.class && typeof profileData.class === 'string') {
            const allowedClasses = ['adventurer', 'warrior', 'mage', 'rogue'];
            if (allowedClasses.includes(profileData.class)) {
                profile.class = profileData.class;
            }
        }
        if (typeof profileData.bio === 'string') {
            profile.bio = profileData.bio.trim().substring(0, 200); // Limit bio length, allow empty
        }
    }
    
    const user = {
        id: usersData.nextId,
        username: username.trim(),
        password_hash: hash,
        email: email || null,
        created_at: now,
        updated_at: now,
        profile: profile,
        rpg: { level: 1, xp: 0, hp: 20, mp: 5, coins: 0, streak: 0, achievements: [], inventory: { items: [] } }
    };
    usersData.users.push(user);
    usersData.nextId++;
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
        const token = signToken(user);
        res.status(201).json({ token, user: { id: user.id, username: user.username, profile: user.profile, rpg: user.rpg } });
    } catch (e) {
        console.error('Failed to persist user', e);
        return sendError(res, 500, 'Failed to create user');
    }
});

app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return sendError(res, 400, 'Missing credentials');
    const usersData = readUsers();
    const user = usersData.users.find(u => u.username === username);
    if (!user) return sendError(res, 401, 'Invalid credentials');
    if (!bcrypt.compareSync(password, user.password_hash)) return sendError(res, 401, 'Invalid credentials');
    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, profile: user.profile, rpg: user.rpg } });
});

app.post('/api/tasks/:id/subtasks', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    // validation
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
});

// patch status for a task
app.patch('/api/tasks/:id/status', ensureAuth, (req, res) => {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return sendError(res, 400, 'Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const now = new Date().toISOString();
    task.status = status;
    // maintain legacy `completed` boolean for backward compatibility
    task.completed = (status === 'done');
    task.updated_at = now;
    if (!Array.isArray(task.status_history)) task.status_history = [];
    task.status_history.push({ status, at: now, note: note || null });
    try {
        writeTasks(tasks);
        res.json(serializeTask(task));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist status change' });
    }
});

// patch status for a subtask
app.patch('/api/tasks/:id/subtasks/:subtask_id/status', ensureAuth, (req, res) => {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return sendError(res, 400, 'Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');

    const subId = parseInt(req.params.subtask_id);
    const subtask = (task.sub_tasks || []).find(s => s.id === subId);
    if (!subtask) return res.status(404).send('Subtask not found');

    const now = new Date().toISOString();
    subtask.status = status;
    // maintain legacy `completed` boolean
    subtask.completed = (status === 'done');
    subtask.updated_at = now;
    if (!Array.isArray(subtask.status_history)) subtask.status_history = [];
    subtask.status_history.push({ status, at: now, note: note || null });
    try {
        writeTasks(tasks);
        // return the whole parent task for client convenience
        res.json(serializeTask(task));
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist subtask status change' });
    }
});

// persist order
app.put('/api/tasks/order', ensureAuth, (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return sendError(res, 400, 'Order must be an array of ids');
    const tasksData = readTasks();
    // filter to user's tasks only
    const userTasks = tasksData.tasks.filter(t => t.owner_id === req.user.id);
    // validate all ids exist and belong to user
    const userTaskIds = new Set(userTasks.map(t => t.id));
    for (const id of order) {
        if (!userTaskIds.has(id)) return res.status(400).send('Invalid task id in order');
    }
    // apply order: set order field to position in array for user's tasks only
    const idToTask = new Map(userTasks.map(t => [t.id, t]));
    order.forEach((id, idx) => {
        const task = idToTask.get(id);
        if (task) task.order = idx;
    });
    // any user tasks not included keep their relative order after provided ones
    const remaining = userTasks.filter(t => !order.includes(t.id)).sort((a, b) => a.order - b.order);
    remaining.forEach((t, idx) => { t.order = order.length + idx; });
    // only sort user's tasks, leave other users' tasks unchanged
    const otherUserTasks = tasksData.tasks.filter(t => t.owner_id !== req.user.id);
    const sortedUserTasks = userTasks.sort((a, b) => a.order - b.order);
    tasksData.tasks = [...otherUserTasks, ...sortedUserTasks];
    try {
        writeTasks(tasksData);
        res.json({ tasks: serializeTaskList(sortedUserTasks) });
    } catch (e) {
        res.status(500).json({ error: 'Failed to persist order' });
    }
});

// get status history
app.get('/api/tasks/:id/history', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task || task.owner_id !== req.user.id) return res.status(404).send('Task not found');
    res.json({ status_history: task.status_history || [] });
});

app.put('/api/tasks/:id', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id));
    if (taskIndex !== -1 && tasks.tasks[taskIndex].owner_id === req.user.id) {
        // allow updating description/priority/completed/due_date
        const allowed = ['description', 'priority', 'completed', 'due_date'];
        // validation
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'description')) {
            if (typeof req.body.description !== 'string' || !req.body.description.trim()) return sendError(res, 400, 'Invalid description');
            tasks.tasks[taskIndex].description = req.body.description.trim();
        }
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'priority')) {
            const allowedP = ['low', 'medium', 'high'];
            if (!allowedP.includes(req.body.priority)) return sendError(res, 400, 'Invalid priority');
            tasks.tasks[taskIndex].priority = req.body.priority;
        }
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'completed')) {
            if (typeof req.body.completed !== 'boolean') return sendError(res, 400, 'Invalid completed flag');
            tasks.tasks[taskIndex].completed = req.body.completed;
            tasks.tasks[taskIndex].status = req.body.completed ? 'done' : tasks.tasks[taskIndex].status;
        }
        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'due_date')) {
            if (typeof req.body.due_date !== 'string') return sendError(res, 400, 'Invalid due_date');
            tasks.tasks[taskIndex].due_date = req.body.due_date;
        }
        try {
            writeTasks(tasks);
            res.json(serializeTask(tasks.tasks[taskIndex]));
        } catch (e) {
            res.status(500).json({ error: 'Failed to persist task update' });
        }
    } else {
        return sendError(res, 404, 'Task not found');
    }
});

app.delete('/api/tasks/:id', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id));
    if (taskIndex !== -1 && tasks.tasks[taskIndex].owner_id === req.user.id) {
        tasks.tasks.splice(taskIndex, 1);
        try {
            writeTasks(tasks);
            res.status(204).send();
        } catch (e) {
            res.status(500).send('Failed to persist task deletion');
        }
    } else {
        res.status(404).send('Task not found');
    }
});

app.put('/api/tasks/:id/subtasks/:subtask_id', ensureAuth, (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (task && task.owner_id === req.user.id) {
        const subId = parseInt(req.params.subtask_id);
        const subtask = task.sub_tasks.find(s => s.id === subId);
        if (subtask) {
            // merge allowed fields with validation
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
        } else {
            return sendError(res, 404, 'Subtask not found');
        }
    } else {
        return sendError(res, 404, 'Task not found');
    }
});


module.exports = app;
