const express = require('express');
const cors = require('cors');
const { STATUSES, validateApplication } = require('./validation');

/** Builds the Express app around any repository (Postgres in prod, in-memory in tests). */
function createApp(repo) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  function parseId(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }
    req.id = id;
    next();
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/stats', wrap(async (req, res) => res.json(await repo.stats())));

  app.get('/api/applications', wrap(async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    res.json(await repo.list({ status }));
  }));

  app.get('/api/applications/:id', parseId, wrap(async (req, res) => {
    const item = await repo.get(req.id);
    if (!item) return res.status(404).json({ error: 'Application not found' });
    res.json(item);
  }));

  app.post('/api/applications', wrap(async (req, res) => {
    const { errors, value } = validateApplication(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });
    res.status(201).json(await repo.create(value));
  }));

  app.patch('/api/applications/:id', parseId, wrap(async (req, res) => {
    const { errors, value } = validateApplication(req.body, { partial: true });
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });
    const item = await repo.update(req.id, value);
    if (!item) return res.status(404).json({ error: 'Application not found' });
    res.json(item);
  }));

  app.delete('/api/applications/:id', parseId, wrap(async (req, res) => {
    const removed = await repo.remove(req.id);
    if (!removed) return res.status(404).json({ error: 'Application not found' });
    res.status(204).end();
  }));

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
