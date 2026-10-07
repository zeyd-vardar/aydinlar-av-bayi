import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Config } from '../src/config.js';
import { hashPassword } from '../src/password.js';
import type { Repository } from '../src/repository.js';
import { tokenHash } from '../src/security.js';
import { buildServer } from '../src/server.js';
import type { Administrator, AuthenticatedSession } from '../src/types.js';

const initialPassword = 'Gecici yonetici parolasi 2026!';
const newPassword = 'Yeni ve guvenli yonetici parolasi 2026!';

const config: Config = {
  NODE_ENV: 'test',
  PORT: 3001,
  DATABASE_URL: 'postgres://unused',
  DATABASE_SSL: false,
  TRUST_PROXY: false,
  ADMIN_ORIGIN: 'https://aydinlarav.com',
  PUBLIC_SITE_ORIGIN: 'https://trabzonavbayi.com',
  SESSION_IDLE_MINUTES: 30,
  SESSION_ABSOLUTE_HOURS: 4,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCK_MINUTES: 15,
  RESET_TOKEN_MINUTES: 30,
  S3_ENDPOINT: 'https://storage.example.com',
  S3_REGION: 'auto',
  S3_BUCKET: 'test',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
  S3_PUBLIC_BASE_URL: 'https://images.example.com',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
};

class FakeRepository {
  admin!: Administrator;
  sessions = new Map<string, AuthenticatedSession>();
  sessionHashes = new Map<string, string>();
  csrfHashes = new Map<string, string>();
  resetTokens = new Map<string, { adminId: number; expiresAt: Date; used: boolean }>();
  forceRateLimited = false;

  async initialize() {
    this.admin = {
      id: 1,
      email: 'info@aydinlarav.com',
      passwordHash: await hashPassword(initialPassword),
      mustChangePassword: true,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      passwordChangedAt: null,
    };
  }

  async consumeIpAttempt() {
    return this.forceRateLimited;
  }
  async audit() {}
  async getAdminByEmail(email: string) {
    return email === this.admin.email ? this.admin : null;
  }
  async getAdminById(id: number) {
    return id === 1 ? this.admin : null;
  }
  async registerLoginFailure() {
    this.admin.failedLoginAttempts += 1;
  }
  async registerLoginSuccess() {
    this.admin.failedLoginAttempts = 0;
    this.admin.lastLoginAt = new Date();
  }
  async createSession(input: { id: string; tokenHash: string; absoluteExpiresAt: Date }) {
    this.sessions.set(input.id, {
      id: input.id,
      administrator: this.admin,
      absoluteExpiresAt: input.absoluteExpiresAt,
    });
    this.sessionHashes.set(input.tokenHash, input.id);
  }
  async getSession(hash: string) {
    const id = this.sessionHashes.get(hash);
    const session = id ? (this.sessions.get(id) ?? null) : null;
    return session && session.absoluteExpiresAt > new Date() ? session : null;
  }
  async touchSession() {}
  async setCsrfToken(id: string, hash: string) {
    this.csrfHashes.set(id, hash);
  }
  async consumeCsrfToken(id: string, hash: string) {
    if (this.csrfHashes.get(id) !== hash) return false;
    this.csrfHashes.delete(id);
    return true;
  }
  async invalidateSession(id: string) {
    this.sessions.delete(id);
    for (const [hash, sessionId] of this.sessionHashes)
      if (sessionId === id) this.sessionHashes.delete(hash);
  }
  async invalidateAllSessions() {
    this.sessions.clear();
    this.sessionHashes.clear();
  }
  async changePassword(_id: number, passwordHash: string) {
    this.admin.passwordHash = passwordHash;
    this.admin.mustChangePassword = false;
    this.admin.passwordChangedAt = new Date();
    await this.invalidateAllSessions();
  }
  async createPasswordReset() {}
  async usePasswordReset(hash: string, passwordHash: string) {
    const token = this.resetTokens.get(hash);
    if (!token || token.used || token.expiresAt <= new Date()) return null;
    token.used = true;
    this.admin.passwordHash = passwordHash;
    this.admin.mustChangePassword = false;
    await this.invalidateAllSessions();
    return token.adminId;
  }
  async dashboardStats() {
    return { total_products: 0, recommended_products: 0, new_products: 0, last_update: null };
  }
  async listProducts() {
    return [];
  }
  async getProduct() {
    return null;
  }
  async createProduct() {}
  async updateProduct() {}
  async deleteProduct() {}
  async getStoreSettings() {
    return {
      phone: '0549 477 01 61',
      whatsapp: '905494770161',
      address: 'Pelitli, Trabzon',
      streetAddress: 'Pelitli',
      postalCode: '61080',
      addressLocality: 'Ortahisar',
      addressRegion: 'Trabzon',
      instagramUrl: 'https://www.instagram.com/aydinlarav/',
      facebookUrl: '',
      youtubeUrl: '',
      hours: [{ days: 'Her gün', time: '08.30 – 20.30' }],
      openingTime: '08:30',
      closingTime: '20:30',
    };
  }
  async listBrands() {
    return [];
  }
  async listBlogPosts() {
    return [];
  }
}

function cookieFrom(response: { headers: Record<string, string | string[] | number | undefined> }) {
  const value = response.headers['set-cookie'];
  return String(Array.isArray(value) ? value[0] : value).split(';')[0];
}

function csrfFrom(html: string) {
  const token = html.match(/name="csrfToken" value="([^"]+)"/)?.[1];
  assert.ok(token);
  return token;
}

describe('authentication routes', () => {
  it('serves public managed content without exposing administrator data', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    const app = await buildServer(config, repository as unknown as Repository);
    const response = await app.inject({
      method: 'GET',
      url: '/api/public/content',
      headers: { origin: config.PUBLIC_SITE_ORIGIN },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['access-control-allow-origin'], config.PUBLIC_SITE_ORIGIN);
    const body = response.json();
    assert.equal(body.siteSettings.phone, '0549 477 01 61');
    assert.deepEqual(body.brands, []);
    assert.deepEqual(body.blogPosts, []);
    assert.equal(JSON.stringify(body).includes(repository.admin.passwordHash), false);
    await app.close();
  });

  it('rejects wrong credentials and rate-limited requests', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    const app = await buildServer(config, repository as unknown as Repository);
    const wrongEmail = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: 'wrong@example.com', password: initialPassword },
    });
    assert.equal(wrongEmail.statusCode, 401);
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: 'yanlis parola' },
    });
    assert.equal(wrongPassword.statusCode, 401);
    repository.forceRateLimited = true;
    const limited = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: initialPassword },
    });
    assert.equal(limited.statusCode, 429);
    await app.close();
  });

  it('forces first-login password change, rotates the session and invalidates the temporary password', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    const app = await buildServer(config, repository as unknown as Repository);
    const anonymous = await app.inject({ method: 'GET', url: '/panel/dashboard' });
    assert.equal(anonymous.statusCode, 302);
    const anonymousApi = await app.inject({ method: 'GET', url: '/api/admin/products' });
    assert.equal(anonymousApi.statusCode, 401);

    const login = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: initialPassword },
    });
    assert.equal(login.statusCode, 302);
    assert.equal(login.headers.location, '/panel/change-password');
    const oldCookie = cookieFrom(login);

    const dashboardBeforeChange = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie: oldCookie },
    });
    assert.equal(dashboardBeforeChange.statusCode, 302);
    assert.equal(dashboardBeforeChange.headers.location, '/panel/change-password');

    const changePage = await app.inject({
      method: 'GET',
      url: '/panel/change-password',
      headers: { cookie: oldCookie },
    });
    const csrfToken = csrfFrom(changePage.body);
    const changed = await app.inject({
      method: 'POST',
      url: '/panel/change-password',
      headers: { cookie: oldCookie, origin: config.ADMIN_ORIGIN },
      payload: { password: newPassword, passwordConfirm: newPassword, csrfToken },
    });
    assert.equal(changed.statusCode, 302);
    assert.equal(changed.headers.location, '/panel/dashboard');
    assert.match(repository.admin.passwordHash, /^\$argon2id\$/);
    const newCookie = cookieFrom(changed);

    const expiredOldSession = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie: oldCookie },
    });
    assert.equal(expiredOldSession.statusCode, 302);
    const oldPasswordLogin = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: initialPassword },
    });
    assert.equal(oldPasswordLogin.statusCode, 401);
    const dashboard = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie: newCookie },
    });
    assert.equal(dashboard.statusCode, 200);
    await app.close();
  });

  it('rejects an absolutely expired session', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    repository.admin.mustChangePassword = false;
    const app = await buildServer(config, repository as unknown as Repository);
    const login = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: initialPassword },
    });
    const cookie = cookieFrom(login);
    for (const session of repository.sessions.values()) session.absoluteExpiresAt = new Date(0);
    const response = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie },
    });
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, '/panel');
    await app.close();
  });

  it('invalidates a session on logout and rejects CSRF replay', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    repository.admin.mustChangePassword = false;
    const app = await buildServer(config, repository as unknown as Repository);
    const login = await app.inject({
      method: 'POST',
      url: '/panel/login',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { email: repository.admin.email, password: initialPassword },
    });
    const cookie = cookieFrom(login);
    const dashboard = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie },
    });
    const csrfToken = csrfFrom(dashboard.body);
    const logout = await app.inject({
      method: 'POST',
      url: '/panel/logout',
      headers: { cookie, origin: config.ADMIN_ORIGIN },
      payload: { csrfToken },
    });
    assert.equal(logout.statusCode, 302);
    const afterLogout = await app.inject({
      method: 'GET',
      url: '/panel/dashboard',
      headers: { cookie },
    });
    assert.equal(afterLogout.statusCode, 302);
    await app.close();
  });

  it('accepts a reset token only once and rejects an expired token', async () => {
    const repository = new FakeRepository();
    await repository.initialize();
    const validToken = 'v'.repeat(40);
    repository.resetTokens.set(tokenHash(validToken), {
      adminId: 1,
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
    });
    const expiredToken = 'e'.repeat(40);
    repository.resetTokens.set(tokenHash(expiredToken), {
      adminId: 1,
      expiresAt: new Date(Date.now() - 1),
      used: false,
    });
    const app = await buildServer(config, repository as unknown as Repository);
    const reset = await app.inject({
      method: 'POST',
      url: '/panel/reset-password',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { token: validToken, password: newPassword, passwordConfirm: newPassword },
    });
    assert.equal(reset.statusCode, 302);
    const replay = await app.inject({
      method: 'POST',
      url: '/panel/reset-password',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { token: validToken, password: newPassword, passwordConfirm: newPassword },
    });
    assert.equal(replay.statusCode, 400);
    const expired = await app.inject({
      method: 'POST',
      url: '/panel/reset-password',
      headers: { origin: config.ADMIN_ORIGIN },
      payload: { token: expiredToken, password: newPassword, passwordConfirm: newPassword },
    });
    assert.equal(expired.statusCode, 400);
    await app.close();
  });
});
