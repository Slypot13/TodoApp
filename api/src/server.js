const app = require('./app');
const config = require('./config');
const pool = require('./db');

// 0.0.0.0 : obligatoire pour être joignable depuis le routeur Scalingo.
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`API lancée sur le port ${config.port}`);
});

// Scalingo envoie SIGTERM avant d'arrêter un conteneur (déploiement, restart).
function shutdown(signal) {
  console.log(`${signal} reçu, arrêt propre...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
