import './style.css';
import { createApi } from './api.js';

const api = createApi();

const list = document.getElementById('taskList');
const form = document.getElementById('taskForm');
const input = document.getElementById('taskInput');
const errorMessage = document.getElementById('errorMessage');

function showError(text) {
  errorMessage.textContent = text;
}

// CAROUSEL
const images = ['/images/img1.png', '/images/img2.png', '/images/img3.png'];
let currentIndex = 0;

setInterval(() => {
  currentIndex = (currentIndex + 1) % images.length;
  document.getElementById('carouselImage').src = images[currentIndex];
}, 3000);

// TODO APP
function renderTask(task) {
  const li = document.createElement('li');

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.title + (task.done ? ' ✅' : ' ❌');
  li.appendChild(text);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = task.done ? 'Annuler' : 'Terminer';
  toggleBtn.addEventListener('click', () => toggleTask(task));
  li.appendChild(toggleBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Supprimer';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));
  li.appendChild(deleteBtn);

  return li;
}

async function loadTasks() {
  try {
    const tasks = await api.list();
    list.replaceChildren(...tasks.map(renderTask));
  } catch (error) {
    console.error(error);
    showError('Impossible de charger les tâches.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');

  const title = input.value.trim();
  if (title === '') {
    showError('Veuillez entrer une tâche.');
    return;
  }

  try {
    await api.create(title);
    input.value = '';
    await loadTasks();
  } catch (error) {
    console.error(error);
    showError("Impossible d'ajouter la tâche.");
  }
});

async function toggleTask(task) {
  try {
    await api.update(task.id, { done: !task.done });
    await loadTasks();
  } catch (error) {
    console.error(error);
    showError('Impossible de modifier la tâche.');
  }
}

async function deleteTask(id) {
  try {
    await api.remove(id);
    await loadTasks();
  } catch (error) {
    console.error(error);
    showError('Impossible de supprimer la tâche.');
  }
}

loadTasks();
