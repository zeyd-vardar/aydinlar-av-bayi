import * as argon2 from 'argon2';

const weakPasswords = new Set([
  'password1234',
  '123456789012',
  'qwerty123456',
  'admin1234567',
  'aydinlar1234',
]);

export function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Şifre en az 12 karakter olmalıdır.';
  if (password.length > 128) return 'Şifre en fazla 128 karakter olabilir.';
  if (weakPasswords.has(password.toLocaleLowerCase('tr-TR'))) {
    return 'Yaygın veya kolay tahmin edilebilir bir şifre kullanılamaz.';
  }
  if (/^(.)\1+$/.test(password)) return 'Tekrarlanan karakterlerden oluşan şifre kullanılamaz.';
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
