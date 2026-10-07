import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('database security contract', () => {
  it('enforces a single administrator and unique email in the migration', async () => {
    const migration = await readFile(join(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
    assert.match(migration, /id smallint PRIMARY KEY DEFAULT 1 CHECK \(id = 1\)/);
    assert.match(migration, /email text NOT NULL UNIQUE/);
  });

  it('stores only hashes for sessions and reset tokens', async () => {
    const migration = await readFile(join(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
    assert.match(migration, /token_hash text NOT NULL UNIQUE/g);
    assert.doesNotMatch(migration, /password\s+text/i);
  });

  it('creates the managed store, brand, product detail and blog fields', async () => {
    const migration = await readFile(
      join(process.cwd(), 'migrations/002_content_management.sql'),
      'utf8',
    );
    assert.match(migration, /CREATE TABLE IF NOT EXISTS store_settings/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS brands/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS blog_posts/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS description/);
    assert.match(migration, /is_deleted boolean NOT NULL DEFAULT false/);
  });
});
