'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const tasksController = require('../controllers/tasksController');

router.use(ensureAuth);

router.get('/', tasksController.listTasks);
router.post('/', tasksController.createTask);
router.post('/:id/subtasks', tasksController.createSubtask);
router.patch('/:id/status', tasksController.updateTaskStatus);
router.patch('/:id/subtasks/:subtask_id/status', tasksController.updateSubtaskStatus);
router.put('/order', tasksController.updateTaskOrder);
router.get('/:id/history', tasksController.getTaskHistory);
router.put('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);
router.put('/:id/subtasks/:subtask_id', tasksController.updateSubtask);
router.delete('/:id/subtasks/:subtask_id', tasksController.deleteSubtask);

module.exports = router;

