const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');

// GET /services — List catalog services
router.get('/', async (req, res) => {
  const { category, search, active_only } = req.query;
  const isOnlyActive = active_only !== 'false';

  let query = 'SELECT * FROM service_catalog WHERE 1=1';
  const params = [];

  if (isOnlyActive) {
    query += ' AND is_active = 1';
  }

  if (category && category !== 'all') {
    query += ' AND LOWER(category) = LOWER(?)';
    params.push(category);
  }

  if (search && search.trim()) {
    query += ' AND (LOWER(job_name) LIKE LOWER(?) OR LOWER(service_id) LIKE LOWER(?) OR LOWER(notes) LIKE LOWER(?))';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY category ASC, job_name ASC';

  try {
    const services = await db.all(query, params);
    return ok(res, services);
  } catch (err) {
    return fail(res, 'DB_ERROR', err.message, 500);
  }
});

// GET /services/categories/all — List distinct categories
router.get('/categories/all', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT category FROM service_catalog WHERE is_active = 1 ORDER BY category ASC');
    const categories = rows.map(r => r.category);
    return ok(res, categories);
  } catch (err) {
    return fail(res, 'DB_ERROR', err.message, 500);
  }
});

// GET /services/:id — Get single service by id or service_id (e.g. SVC-001)
router.get('/:id', async (req, res) => {
  const idOrCode = req.params.id;
  try {
    const service = await db.get(
      'SELECT * FROM service_catalog WHERE id = ? OR service_id = ?',
      [idOrCode, idOrCode]
    );

    if (!service) {
      return fail(res, 'NOT_FOUND', `Service ${idOrCode} not found in catalog`, 404);
    }

    return ok(res, service);
  } catch (err) {
    return fail(res, 'DB_ERROR', err.message, 500);
  }
});

module.exports = router;
