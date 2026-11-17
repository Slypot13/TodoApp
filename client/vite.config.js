import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Un build sans URL d'API produirait un client qui appelle "undefined/tasks" :
  // on préfère faire échouer le déploiement tout de suite.
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL doit être définie avant le build (voir .env.example).');
  }

  return {};
});
