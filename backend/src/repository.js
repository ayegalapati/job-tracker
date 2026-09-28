const { STATUSES } = require('./validation');

const COLUMNS = `id, company, role, status, location, url, notes,
  to_char(applied_date, 'YYYY-MM-DD') AS applied_date, created_at, updated_at`;
// Whitelist of writable columns - guards the dynamic UPDATE below.
const FIELDS = ['company', 'role', 'status', 'location', 'url', 'notes', 'applied_date'];

function emptyStats() {
  return Object.fromEntries(STATUSES.map((s) => [s, 0]));
}

/** PostgreSQL-backed repository (parameterized queries only). */
function createPgRepository(pool) {
  return {
    async list({ status } = {}) {
      const { rows } = status
        ? await pool.query(`SELECT ${COLUMNS} FROM applications WHERE status = $1 ORDER BY updated_at DESC`, [status])
        : await pool.query(`SELECT ${COLUMNS} FROM applications ORDER BY updated_at DESC`);
      return rows;
    },

    async get(id) {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM applications WHERE id = $1`, [id]);
      return rows[0] || null;
    },

    async create(data) {
      const { rows } = await pool.query(
        `INSERT INTO applications (company, role, status, location, url, notes, applied_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
        [data.company, data.role, data.status, data.location ?? null, data.url ?? null, data.notes ?? null, data.applied_date ?? null]
      );
      return rows[0];
    },

    async update(id, data) {
      const keys = FIELDS.filter((k) => k in data);
      if (keys.length === 0) return this.get(id);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE applications SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING ${COLUMNS}`,
        [...keys.map((k) => data[k]), id]
      );
      return rows[0] || null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM applications WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async stats() {
      const { rows } = await pool.query('SELECT status, COUNT(*)::int AS count FROM applications GROUP BY status');
      const stats = emptyStats();
      rows.forEach((r) => { stats[r.status] = r.count; });
      return stats;
    },
  };
}

/** In-memory repository with the same interface - used by the test suite. */
function createMemoryRepository() {
  let items = [];
  let nextId = 1;
  return {
    async list({ status } = {}) {
      return items.filter((a) => !status || a.status === status).slice().reverse();
    },
    async get(id) {
      return items.find((a) => a.id === id) || null;
    },
    async create(data) {
      const now = new Date().toISOString();
      const item = { location: null, url: null, notes: null, applied_date: null, ...data, id: nextId++, created_at: now, updated_at: now };
      items.push(item);
      return item;
    },
    async update(id, data) {
      const item = items.find((a) => a.id === id);
      if (!item) return null;
      Object.assign(item, data, { updated_at: new Date().toISOString() });
      return item;
    },
    async remove(id) {
      const before = items.length;
      items = items.filter((a) => a.id !== id);
      return items.length < before;
    },
    async stats() {
      const stats = emptyStats();
      items.forEach((a) => { stats[a.status] += 1; });
      return stats;
    },
  };
}

module.exports = { createPgRepository, createMemoryRepository };
