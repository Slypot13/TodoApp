// Données initiales. À lancer une seule fois :
//   en local    : npm run seed
//   sur Scalingo : scalingo --app <app-api> run npm run seed
// Ne fait rien si la table contient déjà des tâches.
const pool = require('./db');

const TASKS = [
  { title: 'Déployer l\'API sur Scalingo', done: true },
  { title: 'Déployer le client', done: false },
  { title: 'Écrire la section « En cas de panne » du README', done: false },
];

async function seed() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM tasks');
  if (rows[0].n > 0) {
    console.log(`La table contient déjà ${rows[0].n} tâche(s), seed ignoré.`);
    return;
  }
  for (const task of TASKS) {
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', [task.title, task.done]);
  }
  console.log(`${TASKS.length} tâches insérées.`);
}

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
