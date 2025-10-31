import cors from 'cors';
import express from 'express';

import { authenticate } from './middleware/auth';
import { applyTestingListenPatch } from './utils/testingListenPatch';

import campaignsRouter from './routes/campaigns';
import debugRouter from './routes/debug';
import rpgRouter from './routes/rpg';
import tasksRouter from './routes/tasks';
import usersRouter from './routes/users';

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

export default app;
