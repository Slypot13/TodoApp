const fs = require('fs');
const path = require('path');
const data = require('../data.json');

const dataPath = path.join(__dirname, '../data.json');

// Sauvegarder les données dans le fichier JSON
const saveData = () => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// GET : récupérer toutes les tâches
const getAllTasks = (req, res) => {
  try {
    res.status(200).json(data.tasks);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST : créer une tâche
const createTask = (req, res) => {
  try {
    const { title, done } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Le champ title est obligatoire' });
    }

    const newTask = {
      id: data.tasks.length > 0 ? data.tasks[data.tasks.length - 1].id + 1 : 1,
      title: title.trim(),
      done: done ?? false
    };

    data.tasks.push(newTask);
    saveData();

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// PUT : modifier une tâche
const updateTask = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, done } = req.body;

    const task = data.tasks.find(t => t.id === id);

    if (!task) {
      return res.status(404).json({ message: 'Task non trouvée' });
    }

    if (title !== undefined) {
      if (title.trim() === '') {
        return res.status(400).json({ message: 'Le champ title ne peut pas être vide' });
      }
      task.title = title.trim();
    }

    if (done !== undefined) {
      task.done = done;
    }

    saveData();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// DELETE : supprimer une tâche
const deleteTask = (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const index = data.tasks.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ message: 'Task non trouvée' });
    }

    data.tasks.splice(index, 1);
    saveData();

    res.status(200).json({ message: 'Task supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask
};