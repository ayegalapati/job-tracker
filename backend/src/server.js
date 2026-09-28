const { createApp } = require('./app');
const { createPgRepository } = require('./repository');
const { pool, initSchema } = require('./db');

const PORT = process.env.PORT || 4000;

async function start(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await initSchema();
      break;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Database not ready (attempt ${attempt}/${retries}), retrying...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  createApp(createPgRepository(pool)).listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
