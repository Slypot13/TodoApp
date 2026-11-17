// Toute la configuration vient de l'environnement (Twelve-Factor).
// En local, un fichier .env est chargé s'il existe ; les variables déjà
// définies dans l'environnement (Scalingo, CI) restent prioritaires.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : normal en production.
}

function required(name, value) {
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

// Scalingo fournit SCALINGO_POSTGRESQL_URL (prioritaire) ; en local et en CI
// on utilise DATABASE_URL.
const rawDatabaseUrl = required(
  'SCALINGO_POSTGRESQL_URL (ou DATABASE_URL)',
  process.env.SCALINGO_POSTGRESQL_URL || process.env.DATABASE_URL
);

// Le paramètre sslmode de l'URL est retiré et remplacé par une option ssl
// explicite : les versions récentes de pg traitent "sslmode=prefer" comme une
// vérification stricte du certificat, ce qui échoue avec certains hébergeurs.
function parseDatabaseUrl(urlString) {
  const url = new URL(urlString);
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  let ssl = false;
  if (process.env.DATABASE_SSL !== undefined) {
    ssl = process.env.DATABASE_SSL === 'true';
  } else if (sslmode && sslmode !== 'disable') {
    ssl = true;
  }

  return {
    connectionString: url.toString(),
    ssl: ssl ? { rejectUnauthorized: false } : false,
  };
}

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 3000,
  database: parseDatabaseUrl(rawDatabaseUrl),
  corsOrigins,
};
