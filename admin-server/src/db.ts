import pg from 'pg';
import type { Config } from './config.js';

const { Pool } = pg;

export function createPool(config: Config) {
  return new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export type DatabasePool = ReturnType<typeof createPool>;
