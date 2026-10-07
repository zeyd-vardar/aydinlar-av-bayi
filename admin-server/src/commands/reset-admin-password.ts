import pg from 'pg';
import { z } from 'zod';
import { hashPassword, validatePassword } from '../password.js';
import { loadCommandConfig } from './config.js';

const resetConfig = z
  .object({
    ADMIN_EMAIL: z.email().transform((value) => value.trim().toLocaleLowerCase('tr-TR')),
    ADMIN_RESET_PASSWORD: z.string().min(1).max(128),
  })
  .parse(process.env);
const passwordError = validatePassword(resetConfig.ADMIN_RESET_PASSWORD);
if (passwordError) throw new Error(passwordError);

const config = loadCommandConfig();
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const passwordHash = await hashPassword(resetConfig.ADMIN_RESET_PASSWORD);
  const result = await client.query(
    `UPDATE administrators
     SET password_hash = $2, must_change_password = true, password_changed_at = now(),
         failed_login_attempts = 0, locked_until = NULL, updated_at = now()
     WHERE id = 1 AND email = $1`,
    [resetConfig.ADMIN_EMAIL, passwordHash],
  );
  if (result.rowCount !== 1) throw new Error('Yönetici hesabı bulunamadı.');
  await client.query(
    'UPDATE admin_sessions SET invalidated_at = now() WHERE administrator_id = 1 AND invalidated_at IS NULL',
  );
  await client.query(
    `INSERT INTO admin_audit_logs (administrator_id, event_type, outcome, metadata)
     VALUES (1, 'password_reset_command', 'success', '{"source":"server_command"}'::jsonb)`,
  );
  await client.query('COMMIT');
  process.stdout.write('Yönetici şifresi sıfırlandı; ilk girişte değiştirme zorunludur.\n');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
