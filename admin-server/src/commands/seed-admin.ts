import pg from 'pg';
import { z } from 'zod';
import { hashPassword, validatePassword } from '../password.js';
import { loadCommandConfig } from './config.js';

const adminConfig = z
  .object({
    ADMIN_EMAIL: z.email().transform((value) => value.trim().toLocaleLowerCase('tr-TR')),
    ADMIN_INITIAL_PASSWORD: z.string().min(1).max(128),
  })
  .parse(process.env);
const passwordError = validatePassword(adminConfig.ADMIN_INITIAL_PASSWORD);
if (passwordError) throw new Error(passwordError);

const config = loadCommandConfig();
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
});

try {
  const existing = await pool.query('SELECT id FROM administrators LIMIT 1');
  if (existing.rowCount) {
    process.stdout.write('Yönetici hesabı zaten mevcut; yeni hesap oluşturulmadı.\n');
  } else {
    const passwordHash = await hashPassword(adminConfig.ADMIN_INITIAL_PASSWORD);
    await pool.query(
      `INSERT INTO administrators (id, email, password_hash, must_change_password)
       VALUES (1, $1, $2, true)`,
      [adminConfig.ADMIN_EMAIL, passwordHash],
    );
    process.stdout.write('Tek yönetici hesabı güvenli şekilde oluşturuldu.\n');
  }
} finally {
  await pool.end();
}
