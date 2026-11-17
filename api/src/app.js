const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const openapi = require('./openapi');
const pool = require('./db');
const tasksRouter = require('./routes/tasks');

const app = express();

app.use(express.json());
app.use(cors({ origin: config.corsOrigins }));

app.get('/', (req, res) => {
  res.json({ message: 'Todo API', health: '/health', tasks: '/tasks', docs: '/docs' });
});

// Documentation Swagger
app.get('/openapi.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Vérifie que l'API tourne ET que la base répond.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch (error) {
    console.error('Health check : base injoignable', error.message);
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/tasks', tasksRouter);

// Route inexistante
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Erreur non gérée (JSON invalide, base en panne...)
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide' });
  }
  console.error(error);
  res.status(500).json({ message: 'Erreur serveur' });
});

module.exports = app;
