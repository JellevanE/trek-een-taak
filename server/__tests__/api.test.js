const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

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
    rpg: { level: 1, xp: 0, hp: 20, mp: 5, coins: 0, streak: 0, achievements: [], inventory: { items: [] } }
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
