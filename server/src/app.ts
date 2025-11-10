import cors from 'cors';
import express from 'express';

import { authenticate } from './middleware/auth.js';
import { applyTestingListenPatch } from './utils/testingListenPatch.js';

import campaignsRouter from './routes/campaigns.js';
import debugRouter from './routes/debug.js';
import rpgRouter from './routes/rpg.js';
import tasksRouter from './routes/tasks.js';
import usersRouter from './routes/users.js';
import docsRouter from './routes/docs.js';

const app = express();

applyTestingListenPatch(app);

app.use(cors());
app.use(express.json());
app.use(authenticate);

app.use('/api/docs', docsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/rpg', rpgRouter);
app.use('/api/debug', debugRouter);

export default app;
