const express = require('express');
const cors = require('cors');
const tasksRouter = require('./router/tasks');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.send('Serveur OK');
});

app.use('/', tasksRouter);

// gestion d'erreur : route inexistante
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});