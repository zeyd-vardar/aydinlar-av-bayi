import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import { hashPassword, validatePassword, verifyPassword } from './password.js';
import { randomToken, randomUUID, tokenHash, valueHash } from './security.js';
import { Repository } from './repository.js';
import type { AuditContext, AuthenticatedSession } from './types.js';

export const SESSION_COOKIE_PRODUCTION = '__Host-admin_session';
export const SESSION_COOKIE_DEVELOPMENT = 'admin_session';

export interface RequestIdentity {
  ipHash: string;
  userAgent: string;
}

export interface LoginResult {
  ok: boolean;
  reason?: 'invalid' | 'rate_limited';
  token?: string;
  session?: AuthenticatedSession;
}

type AuthRepository = Pick<
  Repository,
  | 'consumeIpAttempt'
  | 'audit'
  | 'getAdminByEmail'
  | 'getAdminById'
  | 'registerLoginFailure'
  | 'registerLoginSuccess'
  | 'createSession'
  | 'getSession'
  | 'touchSession'
  | 'setCsrfToken'
  | 'consumeCsrfToken'
  | 'changePassword'
>;

export class AuthService {
  private constructor(
    private readonly repository: AuthRepository,
    private readonly config: Config,
    private readonly dummyPasswordHash: string,
  ) {}

  static async create(repository: AuthRepository, config: Config) {
    const dummyPasswordHash = await hashPassword(randomToken());
    return new AuthService(repository, config, dummyPasswordHash);
  }

  identity(request: FastifyRequest): RequestIdentity {
    return {
      ipHash: valueHash(request.ip),
      userAgent: String(request.headers['user-agent'] ?? '').slice(0, 300),
    };
  }

  auditContext(request: FastifyRequest, administratorId: number | null): AuditContext {
    const identity = this.identity(request);
    return { administratorId, ...identity };
  }

  async login(emailInput: string, password: string, request: FastifyRequest): Promise<LoginResult> {
    const email = emailInput.trim().toLocaleLowerCase('tr-TR');
    const identity = this.identity(request);
    const ipBlocked = await this.repository.consumeIpAttempt(
      identity.ipHash,
      this.config.LOGIN_MAX_ATTEMPTS * 2,
      this.config.LOGIN_LOCK_MINUTES,
    );
    if (ipBlocked) {
      await this.repository.audit({ administratorId: null, ...identity }, 'login', 'failure', {
        reason: 'rate_limited',
      });
      return { ok: false, reason: 'rate_limited' };
    }

    const admin = await this.repository.getAdminByEmail(email);
    if (!admin) {
      await verifyPassword(this.dummyPasswordHash, password);
      await this.repository.audit({ administratorId: null, ...identity }, 'login', 'failure', {
        reason: 'invalid_credentials',
      });
      return { ok: false, reason: 'invalid' };
    }

    const locked = Boolean(admin.lockedUntil && admin.lockedUntil > new Date());
    const validPassword = await verifyPassword(admin.passwordHash, password);
    if (!admin.isActive || locked || !validPassword || admin.id !== 1) {
      if (!locked && admin.isActive && !validPassword) {
        await this.repository.registerLoginFailure(
          admin.id,
          this.config.LOGIN_MAX_ATTEMPTS,
          this.config.LOGIN_LOCK_MINUTES,
        );
      }
      await this.repository.audit({ administratorId: admin.id, ...identity }, 'login', 'failure', {
        reason: 'invalid_credentials_or_locked',
      });
      return { ok: false, reason: 'invalid' };
    }

    await this.repository.registerLoginSuccess(admin.id);
    const { token, session } = await this.createSession(admin.id, identity);
    await this.repository.audit({ administratorId: admin.id, ...identity }, 'login', 'success');
    return { ok: true, token, session };
  }

  async createSession(adminId: number, identity: RequestIdentity) {
    const token = randomToken();
    const sessionId = randomUUID();
    const absoluteExpiresAt = new Date(
      Date.now() + this.config.SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000,
    );
    await this.repository.createSession({
      id: sessionId,
      adminId,
      tokenHash: tokenHash(token),
      absoluteExpiresAt,
      ipHash: identity.ipHash,
      userAgent: identity.userAgent,
    });
    const administrator = await this.repository.getAdminById(adminId);
    if (!administrator) throw new Error('Administrator disappeared during session creation.');
    return {
      token,
      session: { id: sessionId, administrator, absoluteExpiresAt } satisfies AuthenticatedSession,
    };
  }

  async authenticate(request: FastifyRequest): Promise<AuthenticatedSession | null> {
    const cookieName = this.cookieName();
    const token = request.cookies[cookieName];
    if (!token) return null;
    const session = await this.repository.getSession(
      tokenHash(token),
      this.config.SESSION_IDLE_MINUTES,
    );
    if (!session || !session.administrator.isActive || session.administrator.id !== 1) return null;
    await this.repository.touchSession(session.id);
    return session;
  }

  async issueCsrfToken(sessionId: string): Promise<string> {
    const token = randomToken();
    await this.repository.setCsrfToken(sessionId, tokenHash(token));
    return token;
  }

  async verifyCsrfToken(sessionId: string, token: unknown): Promise<boolean> {
    return (
      typeof token === 'string' &&
      token.length >= 32 &&
      (await this.repository.consumeCsrfToken(sessionId, tokenHash(token)))
    );
  }

  async changePassword(
    session: AuthenticatedSession,
    newPassword: string,
    request: FastifyRequest,
  ) {
    const validationError = validatePassword(newPassword);
    if (validationError) return { ok: false as const, error: validationError };
    if (await verifyPassword(session.administrator.passwordHash, newPassword)) {
      return { ok: false as const, error: 'Yeni şifre mevcut şifreyle aynı olamaz.' };
    }
    const passwordHash = await hashPassword(newPassword);
    await this.repository.changePassword(session.administrator.id, passwordHash);
    const identity = this.identity(request);
    await this.repository.audit(
      { administratorId: session.administrator.id, ...identity },
      'password_change',
      'success',
    );
    return { ok: true as const, ...(await this.createSession(session.administrator.id, identity)) };
  }

  cookieName() {
    return this.config.NODE_ENV === 'production'
      ? SESSION_COOKIE_PRODUCTION
      : SESSION_COOKIE_DEVELOPMENT;
  }

  setSessionCookie(reply: FastifyReply, token: string) {
    reply.setCookie(this.cookieName(), token, {
      path: '/',
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  clearSessionCookie(reply: FastifyReply) {
    reply.clearCookie(this.cookieName(), {
      path: '/',
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
}
