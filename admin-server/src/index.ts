import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { Repository } from './repository.js';
import { buildServer } from './server.js';

const config = loadConfig();
const pool = createPool(config);
const repository = new Repository(pool);
const app = await buildServer(config, repository);

const shutdown = async () => {
  await app.close();
  await pool.end();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ host: '0.0.0.0', port: config.PORT });
