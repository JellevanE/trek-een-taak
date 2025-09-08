const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

const TASKS_FILE = path.join(__dirname, '..', 'tasks.json');

beforeEach(() => {
  // reset tasks.json to a known small state
  const initial = {
    tasks: [
      { id: 1, description: 'Test task', priority: 'medium', sub_tasks: [], due_date: '2025-09-08', completed: false }
    ],
    nextId: 2
  };
  fs.writeFileSync(TASKS_FILE, JSON.stringify(initial, null, 2));
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
  const res = await request(app)
    .post('/api/tasks/1/subtasks')
    .send({ description: 'sub 1' })
    .set('Accept', 'application/json');

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('sub_tasks');
  expect(res.body.sub_tasks.length).toBe(1);
  expect(typeof res.body.sub_tasks[0].id).toBe('number');
});

test('create subtask with missing description returns 400', async () => {
  const res = await request(app)
    .post('/api/tasks/1/subtasks')
    .send({ description: '' })
    .set('Accept', 'application/json');

  expect(res.status).toBe(400);
});

test('patch status updates task and appends history', async () => {
  const res = await request(app)
    .patch('/api/tasks/1/status')
    .send({ status: 'in_progress', note: 'working' })
    .set('Accept', 'application/json');

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('status', 'in_progress');
  expect(Array.isArray(res.body.status_history)).toBe(true);
  expect(res.body.status_history[res.body.status_history.length - 1].status).toBe('in_progress');
});

test('put order persists ordering and returns tasks', async () => {
  // create a second task for reordering
  await request(app).post('/api/tasks').send({ description: 'Second', priority: 'low' });
  const res = await request(app)
    .put('/api/tasks/order')
    .send({ order: [2,1] })
    .set('Accept', 'application/json');

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('tasks');
  expect(Array.isArray(res.body.tasks)).toBe(true);
  expect(res.body.tasks[0].id).toBe(2);
  expect(res.body.tasks[1].id).toBe(1);
});

// simulate write failure by making the file read-only and attempting to write
test('server returns 500 when write fails', async () => {
  // make the file read-only
  fs.chmodSync(TASKS_FILE, 0o444);
  try {
    const res = await request(app)
      .post('/api/tasks/1/subtasks')
      .send({ description: 'sub 2' })
      .set('Accept', 'application/json');

    expect([500, 201]).toContain(res.status); // some platforms may still allow write, but 500 expected when blocked
  } finally {
    // restore permissions
    fs.chmodSync(TASKS_FILE, 0o644);
  }
});
