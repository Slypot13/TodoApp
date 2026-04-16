const fs = require('fs');
const path = require('path');
const data = require('../data.json');

const dataPath = path.join(__dirname, '../data.json');

// GET toutes les tâches
const getAllTasks = (req, res) => {
  res.status(200).json(data.tasks);
};

// POST ajouter une tâche
const createTask = (req, res) => {
  const { title, done } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Le champ title est obligatoire" });
  }

  const newTask = {
    id: data.tasks.length > 0 ? data.tasks[data.tasks.length - 1].id + 1 : 1,
    title: title,
    done: done ?? false
  };

  data.tasks.push(newTask);

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.status(201).json(newTask);
};

// PUT modifier une tâche
const updateTask = (req, res) => {
  const id = parseInt(req.params.id);
  const { title, done } = req.body;

  const task = data.tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ message: "Task non trouvée" });
  }

  if (title !== undefined) {
    task.title = title;
  }

  if (done !== undefined) {
    task.done = done;
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.status(200).json(task);
};

// DELETE supprimer une tâche
const deleteTask = (req, res) => {
  const id = parseInt(req.params.id);

  const index = data.tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Task non trouvée" });
  }

  data.tasks.splice(index, 1);

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.status(200).json({ message: "Task supprimée" });
};

// EXPORT
module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask
};