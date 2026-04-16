const API_URL = "http://localhost:3000/tasks";

// CAROUSEL
const images = [
  "images/img1.png",
  "images/img2.png",
  "images/img3.png"
];

let currentIndex = 0;

function changeImage() {
  const img = document.getElementById("carouselImage");

  currentIndex = (currentIndex + 1) % images.length;
  img.src = images[currentIndex];
}

setInterval(changeImage, 3000);

// TODO APP
// Charger et afficher les tâches
function loadTasks() {
  fetch(API_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des tâches");
      }
      return response.json();
    })
    .then(data => {
      const list = document.getElementById("taskList");
      list.innerHTML = "";

      data.forEach(task => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.title + (task.done ? " ✅" : " ❌");
        li.appendChild(text);

        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = task.done ? "Annuler" : "Terminer";
        toggleBtn.onclick = () => toggleTask(task);
        li.appendChild(toggleBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Supprimer";
        deleteBtn.onclick = () => deleteTask(task.id);
        li.appendChild(deleteBtn);

        list.appendChild(li);
      });
    })
    .catch(error => {
      console.error(error);
      document.getElementById("errorMessage").textContent =
        "Impossible de charger les tâches.";
    });
}

// Ajouter une tâche
function addTask() {
  const input = document.getElementById("taskInput");
  const errorDiv = document.getElementById("errorMessage");

  errorDiv.textContent = "";

  const title = input.value.trim();

  if (title === "") {
    errorDiv.textContent = "Veuillez entrer une tâche.";
    return;
  }

  const newTask = {
    title: title,
    done: false
  };

  fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newTask)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout");
      }
      return response.json();
    })
    .then(() => {
      input.value = "";
      loadTasks();
    })
    .catch(error => {
      console.error(error);
      errorDiv.textContent = "Impossible d'ajouter la tâche.";
    });
}

// Modifier une tâche
function toggleTask(task) {
  fetch(`${API_URL}/${task.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: task.title,
      done: !task.done
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur modification");
      }
      return response.json();
    })
    .then(() => {
      loadTasks();
    })
    .catch(error => {
      console.error(error);
      alert("Impossible de modifier la tâche.");
    });
}

// Supprimer une tâche
function deleteTask(id) {
  fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur suppression");
      }
      return response.json();
    })
    .then(() => {
      loadTasks();
    })
    .catch(error => {
      console.error(error);
      alert("Impossible de supprimer la tâche.");
    });
}

// Chargement initial
loadTasks();