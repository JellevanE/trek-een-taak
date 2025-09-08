const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const TASKS_FILE = path.join(__dirname, 'tasks.json');

function readTasks() {
    try {
        if (!fs.existsSync(TASKS_FILE)) {
            return { tasks: [], nextId: 1 };
        }
        const data = fs.readFileSync(TASKS_FILE);
        const parsed = JSON.parse(data);

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

function writeTasks(data) {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing tasks file:', error);
        // throw so callers can surface a 500 to clients
        throw error;
    }
}

app.get('/api/tasks', (req, res) => {
    const tasks = readTasks();
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    // basic validation
    const { description, priority } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).send('Missing or invalid description');
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
        due_date: new Date().toISOString().split('T')[0],
        status: 'todo',
        order: tasksData.tasks.length,
        created_at: now,
        updated_at: now,
        status_history: [{ status: 'todo', at: now, note: null }],
    };
    tasksData.tasks.push(newTask);
    tasksData.nextId++;
    try {
        writeTasks(tasksData);
        res.status(201).json(newTask);
    } catch (e) {
        res.status(500).send('Failed to persist new task');
    }
});

app.post('/api/tasks/:id/subtasks', (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send('Task not found');

    // validation
    const { description } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).send('Missing or invalid description for subtask');
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
        res.status(201).json(task);
    } catch (e) {
        res.status(500).send('Failed to persist subtask');
    }
});

// patch status for a task
app.patch('/api/tasks/:id/status', (req, res) => {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return res.status(400).send('Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send('Task not found');

    const now = new Date().toISOString();
    task.status = status;
    // maintain legacy `completed` boolean for backward compatibility
    task.completed = (status === 'done');
    task.updated_at = now;
    if (!Array.isArray(task.status_history)) task.status_history = [];
    task.status_history.push({ status, at: now, note: note || null });
    try {
        writeTasks(tasks);
        res.json(task);
    } catch (e) {
        res.status(500).send('Failed to persist status change');
    }
});

// patch status for a subtask
app.patch('/api/tasks/:id/subtasks/:subtask_id/status', (req, res) => {
    const { status, note } = req.body || {};
    const allowed = ['todo', 'in_progress', 'blocked', 'done'];
    if (!status || !allowed.includes(status)) return res.status(400).send('Invalid status');

    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send('Task not found');

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
        res.json(task);
    } catch (e) {
        res.status(500).send('Failed to persist subtask status change');
    }
});

// persist order
app.put('/api/tasks/order', (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).send('Order must be an array of ids');
    const tasksData = readTasks();
    // validate all ids exist
    const idSet = new Set(tasksData.tasks.map(t => t.id));
    for (const id of order) {
        if (!idSet.has(id)) return res.status(400).send('Invalid task id in order');
    }
    // apply order: set order field to position in array
    const idToTask = new Map(tasksData.tasks.map(t => [t.id, t]));
    order.forEach((id, idx) => {
        const task = idToTask.get(id);
        if (task) task.order = idx;
    });
    // any tasks not included keep their relative order after provided ones
    const remaining = tasksData.tasks.filter(t => !order.includes(t.id)).sort((a, b) => a.order - b.order);
    remaining.forEach((t, idx) => { t.order = order.length + idx; });
    tasksData.tasks.sort((a, b) => a.order - b.order);
    try {
        writeTasks(tasksData);
        res.json({ tasks: tasksData.tasks });
    } catch (e) {
        res.status(500).send('Failed to persist order');
    }
});

// get status history
app.get('/api/tasks/:id/history', (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).send('Task not found');
    res.json({ status_history: task.status_history || [] });
});

app.put('/api/tasks/:id', (req, res) => {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id));
    if (taskIndex !== -1) {
        // allow updating description/priority/completed/due_date
        const allowed = ['description', 'priority', 'completed', 'due_date'];
        allowed.forEach(k => {
            if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
                tasks.tasks[taskIndex][k] = req.body[k];
            }
        });
        try {
            writeTasks(tasks);
            res.json(tasks.tasks[taskIndex]);
        } catch (e) {
            res.status(500).send('Failed to persist task update');
        }
    } else {
        res.status(404).send('Task not found');
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    const tasks = readTasks();
    const taskIndex = tasks.tasks.findIndex(t => t.id === parseInt(req.params.id));
    if (taskIndex !== -1) {
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

app.put('/api/tasks/:id/subtasks/:subtask_id', (req, res) => {
    const tasks = readTasks();
    const task = tasks.tasks.find(t => t.id === parseInt(req.params.id));
    if (task) {
        const subId = parseInt(req.params.subtask_id);
        const subtask = task.sub_tasks.find(s => s.id === subId);
        if (subtask) {
            // merge allowed fields
            if (typeof req.body.completed === 'boolean') subtask.completed = req.body.completed;
            if (typeof req.body.description === 'string' && req.body.description.trim()) subtask.description = req.body.description.trim();
            try {
                writeTasks(tasks);
                res.json(task);
            } catch (e) {
                res.status(500).send('Failed to persist subtask update');
            }
        } else {
            res.status(404).send('Subtask not found');
        }
    } else {
        res.status(404).send('Task not found');
    }
});


// allow requiring by tests without starting the server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
