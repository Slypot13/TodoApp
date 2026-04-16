const express = require('express');
const router = express.Router();
const tasksController = require('../controller/tasks');

router.get('/tasks', tasksController.getAllTasks);
router.post('/tasks', tasksController.createTask);
router.put('/tasks/:id', tasksController.updateTask);
router.delete('/tasks/:id', tasksController.deleteTask);

module.exports = router;