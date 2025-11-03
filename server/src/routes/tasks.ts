import { Router } from 'express';

import { ensureAuth } from '../middleware/auth.js';
import {
    createSubtask,
    createTask,
    deleteSubtask,
    deleteTask,
    getTaskHistory,
    listTasks,
    updateSubtask,
    updateSubtaskStatus,
    updateTask,
    updateTaskOrder,
    updateTaskStatus
} from '../controllers/tasksController.js';

const router = Router();

router.use(ensureAuth);

router.get('/', listTasks);
router.post('/', createTask);
router.post('/:id/subtasks', createSubtask);
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/subtasks/:subtask_id/status', updateSubtaskStatus);
router.put('/order', updateTaskOrder);
router.get('/:id/history', getTaskHistory);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.put('/:id/subtasks/:subtask_id', updateSubtask);
router.delete('/:id/subtasks/:subtask_id', deleteSubtask);

export default router;
