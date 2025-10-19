const fs = require('fs');
const path = require('path');
const app = require('../app');
const experience = require('../rpg/experience');
const { createTestClient } = require('../utils/testClient');

const TASKS_FILE = path.join(__dirname, '..', 'tasks.json');
const USERS_FILE = path.join(__dirname, '..', 'users.json');

let authToken = null;
let client = null;

beforeEach(() => {
  // reset tasks.json to empty state - tasks will be created by authenticated users in tests
  const initial = {
    tasks: [],
    nextId: 1
  };
  fs.writeFileSync(TASKS_FILE, JSON.stringify(initial, null, 2));
  // reset users.json and register a test user to obtain a token
  const now = new Date().toISOString();
  const defaultUser = {
    id: 1,
    username: 'local',
    password_hash: '',
    email: null,
    created_at: now,
    updated_at: now,
    profile: { display_name: 'Local User', avatar: null, class: 'adventurer', bio: '' },
    rpg: experience.createInitialRpgState()
  };
  const usersInitial = { users: [defaultUser], nextId: 2 };
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersInitial, null, 2));
  client = createTestClient(app);
});

beforeEach(async () => {
  // register a fresh user and store token for authenticated requests
  const res = await client.post('/api/users/register', {
    body: { username: `testuser_${Date.now()}`, password: 'password123' },
    headers: { accept: 'application/json' }
  });
  authToken = res.body && res.body.token;
});

afterAll(() => {
  // restore a minimal file
  const initial = {
    tasks: [],
    nextId: 1
  };
  fs.writeFileSync(TASKS_FILE, JSON.stringify(initial, null, 2));
});

test('create subtask returns 201 and task with subtask id', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'Parent task', priority: 'medium' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  
  const taskId = taskRes.body.id;
  
  // endpoint requires auth; include token
  const resAuth = await client.post(`/api/tasks/${taskId}/subtasks`, {
    body: { description: 'sub 1' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(resAuth.status).toBe(201);
  expect(resAuth.body).toHaveProperty('sub_tasks');
  expect(resAuth.body.sub_tasks.length).toBe(1);
  expect(typeof resAuth.body.sub_tasks[0].id).toBe('number');
  expect(resAuth.body).toHaveProperty('side_quests');
  expect(Array.isArray(resAuth.body.side_quests)).toBe(true);
  expect(resAuth.body.side_quests.length).toBe(1);
});

test('create subtask with missing description returns 400', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'Parent task', priority: 'medium' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  
  const taskId = taskRes.body.id;
  
  const res = await client.post(`/api/tasks/${taskId}/subtasks`, {
    body: { description: '' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(res.status).toBe(400);
});

test('patch status updates task and appends history', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'Test task', priority: 'medium' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  
  const taskId = taskRes.body.id;
  
  const res = await client.patch(`/api/tasks/${taskId}/status`, {
    body: { status: 'in_progress', note: 'working' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('status', 'in_progress');
  expect(Array.isArray(res.body.status_history)).toBe(true);
  expect(res.body.status_history[res.body.status_history.length - 1].status).toBe('in_progress');
  expect(Array.isArray(res.body.side_quests)).toBe(true);
});

test('completing a task awards XP and returns player snapshot', async () => {
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'XP quest', priority: 'medium', task_level: 2 },
    headers: { authorization: `Bearer ${authToken}` }
  });

  const taskId = taskRes.body.id;

  const completeRes = await client.patch(`/api/tasks/${taskId}/status`, {
    body: { status: 'done' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(completeRes.status).toBe(200);
  expect(Array.isArray(completeRes.body.xp_events)).toBe(true);
  expect(completeRes.body.xp_events.length).toBeGreaterThan(0);
  const event = completeRes.body.xp_events[0];
  expect(event.reason).toBe('task_complete');
  expect(event.metadata.task_id).toBe(taskId);
  expect(event.amount).toBeGreaterThan(0);
  expect(completeRes.body).toHaveProperty('player_rpg');
  expect(completeRes.body.player_rpg.xp).toBeGreaterThan(0);

  const profileRes = await client.get('/api/users/me', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(profileRes.status).toBe(200);
  expect(profileRes.body.user.rpg.xp).toBeGreaterThan(0);
});

test('completing a subtask grants XP once', async () => {
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'Parent XP quest', priority: 'high', task_level: 3 },
    headers: { authorization: `Bearer ${authToken}` }
  });
  const taskId = taskRes.body.id;

  const subRes = await client.post(`/api/tasks/${taskId}/subtasks`, {
    body: { description: 'earn xp side quest' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });
  const subId = subRes.body.sub_tasks[0].id;

  const subComplete = await client.patch(`/api/tasks/${taskId}/subtasks/${subId}/status`, {
    body: { status: 'done' },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(subComplete.status).toBe(200);
  expect(Array.isArray(subComplete.body.xp_events)).toBe(true);
  expect(subComplete.body.xp_events.length).toBeGreaterThan(0);
  const subEvent = subComplete.body.xp_events[0];
  expect(subEvent.reason).toBe('subtask_complete');
  expect(subEvent.metadata.subtask_id).toBe(subId);
  expect(subEvent.amount).toBeGreaterThan(0);
  expect(subComplete.body.player_rpg.xp).toBeGreaterThan(0);
});

test('daily reward grants XP once per day', async () => {
  const dailyReward = await client.post('/api/rpg/daily-reward', {
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });
  expect(dailyReward.status).toBe(200);
  expect(dailyReward.body).toHaveProperty('xp_event');
  expect(dailyReward.body.xp_event.reason).toBe('daily_focus');
  expect(dailyReward.body.xp_event.amount).toBeGreaterThan(0);
  expect(dailyReward.body.player_rpg.xp).toBeGreaterThan(0);

  const secondClaim = await client.post('/api/rpg/daily-reward', {
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });
  expect(secondClaim.status).toBe(400);
  expect(secondClaim.body.error).toMatch(/already claimed/i);
});

test('debug clear tasks removes all user quests', async () => {
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'To clear', priority: 'medium' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(taskRes.status).toBe(201);
  const ownerId = taskRes.body.owner_id;

  const clearRes = await client.post('/api/debug/clear-tasks', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(clearRes.status).toBe(200);
  expect(clearRes.body.removed).toBeGreaterThanOrEqual(1);

  const getRes = await client.get('/api/tasks', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(getRes.status).toBe(200);
  const ownedTasks = getRes.body.tasks.filter(t => t.owner_id === ownerId);
  expect(ownedTasks.length).toBe(0);
});

test('debug seed tasks populates demo quests', async () => {
  const seedRes = await client.post('/api/debug/seed-tasks', {
    body: { count: 3 },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });
  expect(seedRes.status).toBe(200);
  expect(seedRes.body.created).toBeGreaterThan(0);

  const listRes = await client.get('/api/tasks', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(listRes.status).toBe(200);
  expect(Array.isArray(listRes.body.tasks)).toBe(true);
  expect(listRes.body.tasks.length).toBeGreaterThanOrEqual(seedRes.body.created);
});

test('debug grant and reset xp adjust the player rpg', async () => {
  const grantRes = await client.post('/api/debug/grant-xp', {
    body: { amount: 250 },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });
  expect(grantRes.status).toBe(200);
  expect(grantRes.body.xp_event.amount).toBe(250);
  expect(grantRes.body.player_rpg.xp).toBeGreaterThanOrEqual(250);

  const resetRes = await client.post('/api/debug/reset-rpg', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(resetRes.status).toBe(200);
  expect(resetRes.body.player_rpg.level).toBe(1);
  expect(resetRes.body.player_rpg.xp).toBe(0);
});

test('put order persists ordering and returns tasks', async () => {
  // create two tasks for reordering
  const task1 = await client.post('/api/tasks', {
    body: { description: 'First', priority: 'high' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  const task2 = await client.post('/api/tasks', {
    body: { description: 'Second', priority: 'low' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  
  const id1 = task1.body.id;
  const id2 = task2.body.id;
  
  const res = await client.put('/api/tasks/order', {
    body: { order: [id2, id1] },
    headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
  });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('tasks');
  expect(Array.isArray(res.body.tasks)).toBe(true);
  expect(res.body.tasks[0].id).toBe(id2);
  expect(res.body.tasks[1].id).toBe(id1);
  expect(res.body.tasks.every(t => Array.isArray(t.side_quests))).toBe(true);
});

test('register, login, create task and owner-scoped GET', async () => {
  // register
  const reg = await client.post('/api/users/register', {
    body: { username: 'tester1', password: 'password123' },
    headers: { accept: 'application/json' }
  });
  expect(reg.status).toBe(201);
  expect(reg.body).toHaveProperty('token');
  const token = reg.body.token;

  // create a task as tester1
  const create = await client.post('/api/tasks', {
    body: { description: 'User task', priority: 'low' },
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' }
  });
  expect(create.status).toBe(201);
  expect(create.body).toHaveProperty('owner_id');

  // get tasks as tester1 -> should include the new task
  const get = await client.get('/api/tasks', {
    headers: { authorization: `Bearer ${token}` }
  });
  expect(get.status).toBe(200);
  expect(Array.isArray(get.body.tasks)).toBe(true);
  const found = get.body.tasks.find(t => t.description === 'User task');
  expect(found).toBeTruthy();
  expect(Array.isArray(found.side_quests)).toBe(true);
});

test('get and update profile via /api/users/me', async () => {
  // use authToken from beforeEach
  const get = await client.get('/api/users/me', {
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(get.status).toBe(200);
  expect(get.body.user).toHaveProperty('profile');

  const updated = await client.put('/api/users/me', {
    body: { display_name: 'Updated Name', bio: 'I like quests' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  expect(updated.status).toBe(200);
  expect(updated.body.user.profile.display_name).toBe('Updated Name');
  expect(updated.body.user.profile.bio).toBe('I like quests');
});

// simulate write failure by making the file read-only and attempting to write
test('server returns 500 when write fails', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await client.post('/api/tasks', {
    body: { description: 'Parent task', priority: 'medium' },
    headers: { authorization: `Bearer ${authToken}` }
  });
  
  const taskId = taskRes.body.id;
  
  // Simulate a write failure by mocking fs.renameSync to throw
  const realRename = fs.renameSync;
  const realWrite = fs.writeFileSync;
  try {
    fs.writeFileSync = () => { /* allow writing tmp file */ };
    fs.renameSync = () => { throw new Error('simulated rename failure'); };

    const res = await client.post(`/api/tasks/${taskId}/subtasks`, {
      body: { description: 'sub 2' },
      headers: { authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });

    expect(res.status).toBe(500);
  } finally {
    fs.renameSync = realRename;
    fs.writeFileSync = realWrite;
  }
});
