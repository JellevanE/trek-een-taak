const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const experience = require('../rpg/experience');

const TASKS_FILE = path.join(__dirname, '..', 'tasks.json');
const USERS_FILE = path.join(__dirname, '..', 'users.json');

let authToken = null;

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
});

beforeEach(async () => {
  // register a fresh user and store token for authenticated requests
  const res = await request(app)
    .post('/api/users/register')
    .send({ username: `testuser_${Date.now()}`, password: 'password123' })
    .set('Accept', 'application/json');
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
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'Parent task', priority: 'medium' })
    .set('Authorization', `Bearer ${authToken}`);
  
  const taskId = taskRes.body.id;
  
  // endpoint requires auth; include token
  const resAuth = await request(app)
    .post(`/api/tasks/${taskId}/subtasks`)
    .send({ description: 'sub 1' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

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
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'Parent task', priority: 'medium' })
    .set('Authorization', `Bearer ${authToken}`);
  
  const taskId = taskRes.body.id;
  
  const res = await request(app)
    .post(`/api/tasks/${taskId}/subtasks`)
    .send({ description: '' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

  expect(res.status).toBe(400);
});

test('patch status updates task and appends history', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'Test task', priority: 'medium' })
    .set('Authorization', `Bearer ${authToken}`);
  
  const taskId = taskRes.body.id;
  
  const res = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .send({ status: 'in_progress', note: 'working' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('status', 'in_progress');
  expect(Array.isArray(res.body.status_history)).toBe(true);
  expect(res.body.status_history[res.body.status_history.length - 1].status).toBe('in_progress');
  expect(Array.isArray(res.body.side_quests)).toBe(true);
});

test('completing a task awards XP and returns player snapshot', async () => {
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'XP quest', priority: 'medium', task_level: 2 })
    .set('Authorization', `Bearer ${authToken}`);

  const taskId = taskRes.body.id;

  const completeRes = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .send({ status: 'done' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

  expect(completeRes.status).toBe(200);
  expect(Array.isArray(completeRes.body.xp_events)).toBe(true);
  expect(completeRes.body.xp_events.length).toBeGreaterThan(0);
  const event = completeRes.body.xp_events[0];
  expect(event.reason).toBe('task_complete');
  expect(event.metadata.task_id).toBe(taskId);
  expect(event.amount).toBeGreaterThan(0);
  expect(completeRes.body).toHaveProperty('player_rpg');
  expect(completeRes.body.player_rpg.xp).toBeGreaterThan(0);

  const profileRes = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${authToken}`);
  expect(profileRes.status).toBe(200);
  expect(profileRes.body.user.rpg.xp).toBeGreaterThan(0);
});

test('completing a subtask grants XP once', async () => {
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'Parent XP quest', priority: 'high', task_level: 3 })
    .set('Authorization', `Bearer ${authToken}`);
  const taskId = taskRes.body.id;

  const subRes = await request(app)
    .post(`/api/tasks/${taskId}/subtasks`)
    .send({ description: 'earn xp side quest' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);
  const subId = subRes.body.sub_tasks[0].id;

  const subComplete = await request(app)
    .patch(`/api/tasks/${taskId}/subtasks/${subId}/status`)
    .send({ status: 'done' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

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
  const dailyReward = await request(app)
    .post('/api/rpg/daily-reward')
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);
  expect(dailyReward.status).toBe(200);
  expect(dailyReward.body).toHaveProperty('xp_event');
  expect(dailyReward.body.xp_event.reason).toBe('daily_focus');
  expect(dailyReward.body.xp_event.amount).toBeGreaterThan(0);
  expect(dailyReward.body.player_rpg.xp).toBeGreaterThan(0);

  const secondClaim = await request(app)
    .post('/api/rpg/daily-reward')
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);
  expect(secondClaim.status).toBe(400);
  expect(secondClaim.body.error).toMatch(/already claimed/i);
});

test('debug clear tasks removes all user quests', async () => {
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'To clear', priority: 'medium' })
    .set('Authorization', `Bearer ${authToken}`);
  expect(taskRes.status).toBe(201);
  const ownerId = taskRes.body.owner_id;

  const clearRes = await request(app)
    .post('/api/debug/clear-tasks')
    .set('Authorization', `Bearer ${authToken}`);
  expect(clearRes.status).toBe(200);
  expect(clearRes.body.removed).toBeGreaterThanOrEqual(1);

  const getRes = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${authToken}`);
  expect(getRes.status).toBe(200);
  const ownedTasks = getRes.body.tasks.filter(t => t.owner_id === ownerId);
  expect(ownedTasks.length).toBe(0);
});

test('debug seed tasks populates demo quests', async () => {
  const seedRes = await request(app)
    .post('/api/debug/seed-tasks')
    .send({ count: 3 })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);
  expect(seedRes.status).toBe(200);
  expect(seedRes.body.created).toBeGreaterThan(0);

  const listRes = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${authToken}`);
  expect(listRes.status).toBe(200);
  expect(Array.isArray(listRes.body.tasks)).toBe(true);
  expect(listRes.body.tasks.length).toBeGreaterThanOrEqual(seedRes.body.created);
});

test('debug grant and reset xp adjust the player rpg', async () => {
  const grantRes = await request(app)
    .post('/api/debug/grant-xp')
    .send({ amount: 250 })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);
  expect(grantRes.status).toBe(200);
  expect(grantRes.body.xp_event.amount).toBe(250);
  expect(grantRes.body.player_rpg.xp).toBeGreaterThanOrEqual(250);

  const resetRes = await request(app)
    .post('/api/debug/reset-rpg')
    .set('Authorization', `Bearer ${authToken}`);
  expect(resetRes.status).toBe(200);
  expect(resetRes.body.player_rpg.level).toBe(1);
  expect(resetRes.body.player_rpg.xp).toBe(0);
});

test('put order persists ordering and returns tasks', async () => {
  // create two tasks for reordering
  const task1 = await request(app).post('/api/tasks').send({ description: 'First', priority: 'high' }).set('Authorization', `Bearer ${authToken}`);
  const task2 = await request(app).post('/api/tasks').send({ description: 'Second', priority: 'low' }).set('Authorization', `Bearer ${authToken}`);
  
  const id1 = task1.body.id;
  const id2 = task2.body.id;
  
  const res = await request(app)
    .put('/api/tasks/order')
    .send({ order: [id2, id1] })  // reverse order
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${authToken}`);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('tasks');
  expect(Array.isArray(res.body.tasks)).toBe(true);
  expect(res.body.tasks[0].id).toBe(id2);
  expect(res.body.tasks[1].id).toBe(id1);
  expect(res.body.tasks.every(t => Array.isArray(t.side_quests))).toBe(true);
});

test('register, login, create task and owner-scoped GET', async () => {
  // register
  const reg = await request(app)
    .post('/api/users/register')
    .send({ username: 'tester1', password: 'password123' })
    .set('Accept', 'application/json');
  expect(reg.status).toBe(201);
  expect(reg.body).toHaveProperty('token');
  const token = reg.body.token;

  // create a task as tester1
  const create = await request(app)
    .post('/api/tasks')
    .send({ description: 'User task', priority: 'low' })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${token}`);
  expect(create.status).toBe(201);
  expect(create.body).toHaveProperty('owner_id');

  // get tasks as tester1 -> should include the new task
  const get = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token}`);
  expect(get.status).toBe(200);
  expect(Array.isArray(get.body.tasks)).toBe(true);
  const found = get.body.tasks.find(t => t.description === 'User task');
  expect(found).toBeTruthy();
  expect(Array.isArray(found.side_quests)).toBe(true);
});

test('get and update profile via /api/users/me', async () => {
  // use authToken from beforeEach
  const get = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${authToken}`);
  expect(get.status).toBe(200);
  expect(get.body.user).toHaveProperty('profile');

  const updated = await request(app)
    .put('/api/users/me')
    .send({ display_name: 'Updated Name', bio: 'I like quests' })
    .set('Authorization', `Bearer ${authToken}`);
  expect(updated.status).toBe(200);
  expect(updated.body.user.profile.display_name).toBe('Updated Name');
  expect(updated.body.user.profile.bio).toBe('I like quests');
});

// simulate write failure by making the file read-only and attempting to write
test('server returns 500 when write fails', async () => {
  // first create a task that belongs to the authenticated user
  const taskRes = await request(app)
    .post('/api/tasks')
    .send({ description: 'Parent task', priority: 'medium' })
    .set('Authorization', `Bearer ${authToken}`);
  
  const taskId = taskRes.body.id;
  
  // Simulate a write failure by mocking fs.renameSync to throw
  const realRename = fs.renameSync;
  const realWrite = fs.writeFileSync;
  try {
    fs.writeFileSync = () => { /* allow writing tmp file */ };
    fs.renameSync = () => { throw new Error('simulated rename failure'); };

    const res = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .send({ description: 'sub 2' })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(500);
  } finally {
    fs.renameSync = realRename;
    fs.writeFileSync = realWrite;
  }
});
