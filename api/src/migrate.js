// Migrations versionnées : chaque fichier migrations/NNN_nom.sql est joué une
// seule fois, dans l'ordre, et enregistré dans la table schema_migrations.
// Lancé automatiquement après chaque déploiement (process postdeploy du Procfile).
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    // Verrou : empêche deux déploiements simultanés de migrer en même temps.
    await client.query('SELECT pg_advisory_lock(727274)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      log(`-> migration ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count++;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Échec de la migration ${file} : ${error.message}`);
      }
    }

    log(count === 0 ? 'Base à jour, aucune migration à jouer.' : `${count} migration(s) appliquée(s).`);
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error.message);
      await pool.end();
      process.exit(1);
    });
}
