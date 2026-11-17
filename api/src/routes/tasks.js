const express = require('express');
const pool = require('../db');

const router = express.Router();

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /tasks
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, done FROM tasks ORDER BY id'
  );
  res.status(200).json(rows);
});

// POST /tasks
router.post('/', async (req, res) => {
  const { title, done = false } = req.body ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Le champ title est obligatoire' });
  }
  if (typeof done !== 'boolean') {
    return res.status(400).json({ message: 'Le champ done doit être un booléen' });
  }

  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING id, title, done',
    [title.trim(), done]
  );
  res.status(201).json(rows[0]);
});

// PUT /tasks/:id
router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }

  const { title, done } = req.body ?? {};

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ message: 'Le champ title ne peut pas être vide' });
  }
  if (done !== undefined && typeof done !== 'boolean') {
    return res.status(400).json({ message: 'Le champ done doit être un booléen' });
  }

  // COALESCE garde l'ancienne valeur quand le champ n'est pas envoyé.
  const { rows } = await pool.query(
    `UPDATE tasks
        SET title = COALESCE($2, title),
            done = COALESCE($3, done),
            updated_at = now()
      WHERE id = $1
      RETURNING id, title, done`,
    [id, title === undefined ? null : title.trim(), done === undefined ? null : done]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Task non trouvée' });
  }
  res.status(200).json(rows[0]);
});

// DELETE /tasks/:id
router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }

  const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

  if (rowCount === 0) {
    return res.status(404).json({ message: 'Task non trouvée' });
  }
  res.status(200).json({ message: 'Task supprimée' });
});

module.exports = router;
