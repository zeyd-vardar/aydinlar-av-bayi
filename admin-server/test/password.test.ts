import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, validatePassword, verifyPassword } from '../src/password.js';

describe('password security', () => {
  it('rejects short and common passwords', () => {
    assert.ok(validatePassword('short'));
    assert.ok(validatePassword('password1234'));
  });

  it('stores passwords as Argon2id hashes and verifies them', async () => {
    const password = 'Uzun ve guvenli parola 2026!';
    const hash = await hashPassword(password);
    assert.match(hash, /^\$argon2id\$/);
    assert.notEqual(hash, password);
    assert.equal(await verifyPassword(hash, password), true);
    assert.equal(await verifyPassword(hash, 'yanlis parola'), false);
  });
});
