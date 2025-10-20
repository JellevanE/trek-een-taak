'use strict';

const express = require('express');
const cors = require('cors');
const { applyTestingListenPatch } = require('./utils/testingListenPatch');
const { authenticate } = require('./middleware/auth');

const usersRouter = require('./routes/users');
const tasksRouter = require('./routes/tasks');
const campaignsRouter = require('./routes/campaigns');
const rpgRouter = require('./routes/rpg');
const debugRouter = require('./routes/debug');

const app = express();

applyTestingListenPatch(app);

app.use(cors());
app.use(express.json());
app.use(authenticate);

app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/rpg', rpgRouter);
app.use('/api/debug', debugRouter);

module.exports = app;
