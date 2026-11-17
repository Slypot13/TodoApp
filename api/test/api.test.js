// Tests d'intégration : vraie base PostgreSQL (Docker en local, service en CI).
// En local, TEST_DATABASE_URL pointe vers une base dédiée pour ne pas vider
// vos données de développement.
// Le .env doit être chargé ICI, avant de choisir la base : sinon
// TEST_DATABASE_URL serait encore inconnue et les tests videraient la base
// de développement.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : normal en CI.
}
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const pool = require('../src/db');
const migrate = require('../src/migrate');

let server;
let baseUrl;

async function request(method, path, body) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  await migrate({ log: () => {} });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await pool.query('TRUNCATE tasks RESTART IDENTITY');
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('GET /health répond 200 quand la base répond', async () => {
  const res = await request('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST puis GET /tasks', async () => {
  const created = await request('POST', '/tasks', { title: '  Acheter du pain  ' });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id: 1, title: 'Acheter du pain', done: false });

  const list = await request('GET', '/tasks');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
});

test('POST /tasks refuse un titre vide', async () => {
  const res = await request('POST', '/tasks', { title: '   ' });
  assert.equal(res.status, 400);
});

test('PUT /tasks/:id modifie seulement les champs envoyés', async () => {
  await request('POST', '/tasks', { title: 'Tâche' });
  const res = await request('PUT', '/tasks/1', { done: true });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: 1, title: 'Tâche', done: true });
});

test('PUT et DELETE renvoient 404 sur une tâche inexistante', async () => {
  assert.equal((await request('PUT', '/tasks/999', { done: true })).status, 404);
  assert.equal((await request('DELETE', '/tasks/999')).status, 404);
});

test('DELETE /tasks/:id supprime la tâche', async () => {
  await request('POST', '/tasks', { title: 'À supprimer' });
  assert.equal((await request('DELETE', '/tasks/1')).status, 200);
  assert.equal((await request('GET', '/tasks')).body.length, 0);
});

test('identifiant non numérique : 400', async () => {
  assert.equal((await request('DELETE', '/tasks/abc')).status, 400);
});

test('GET /docs affiche Swagger UI', async () => {
  const response = await fetch(baseUrl + '/docs/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /swagger-ui/i);
});

test('route inconnue : 404', async () => {
  assert.equal((await request('GET', '/nope')).status, 404);
});
