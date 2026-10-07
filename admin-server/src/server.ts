import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { AuthService } from './auth.js';
import type { Config } from './config.js';
import { ResetEmailService } from './email.js';
import { hashPassword, validatePassword } from './password.js';
import { Repository } from './repository.js';
import { randomToken, randomUUID, tokenHash } from './security.js';
import { ProductImageStorage } from './storage.js';
import type { AuthenticatedSession, Product } from './types.js';
import {
  changePasswordView,
  dashboardView,
  deleteProductView,
  forgotPasswordView,
  loginView,
  productFormView,
  productsView,
  resetPasswordView,
} from './views.js';

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
const passwordSchema = z.object({
  password: z.string().min(1).max(128),
  passwordConfirm: z.string().min(1).max(128),
  csrfToken: z.string().min(32),
});
const resetPasswordSchema = passwordSchema.omit({ csrfToken: true }).extend({
  token: z.string().min(32).max(200),
});
const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  section: z.enum(['recommended', 'new']),
  imageAlt: z.string().trim().min(1).max(180),
  displayOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
  csrfToken: z.string().min(32),
});

function html(reply: FastifyReply, content: string, statusCode = 200) {
  return reply.code(statusCode).type('text/html; charset=utf-8').send(content);
}

function formValue(body: unknown, key: string): unknown {
  return body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : undefined;
}

function safeReturnMessage(value: unknown): string | undefined {
  if (value === 'created') return 'Ürün eklendi.';
  if (value === 'updated') return 'Ürün güncellendi.';
  if (value === 'deleted') return 'Ürün silindi.';
  return undefined;
}

export async function buildServer(config: Config, repository: Repository) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 6 * 1024 * 1024,
  });
  const auth = await AuthService.create(repository, config);
  const storage = new ProductImageStorage(config);
  const resetEmail = new ResetEmailService(config);
  const panelCss = await readFile(join(process.cwd(), 'public/panel.css'), 'utf8');

  await app.register(cookie);
  await app.register(formbody);
  await app.register(multipart, {
    limits: { files: 1, fileSize: 5 * 1024 * 1024, fields: 10 },
  });
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
    hsts:
      config.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  });

  app.addHook('onRequest', async (request, reply) => {
    if (config.NODE_ENV === 'production' && request.protocol !== 'https') {
      return reply.code(400).send({ error: 'HTTPS gereklidir.' });
    }
    if (request.url.startsWith('/panel') || request.url.startsWith('/api/admin')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      reply.header('Pragma', 'no-cache');
      reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.url.startsWith('/panel')) {
      const origin = request.headers.origin;
      if (origin !== config.ADMIN_ORIGIN) {
        return reply.code(403).type('text/plain').send('İstek kaynağı doğrulanamadı.');
      }
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Request failed');
    if (request.url.startsWith('/panel')) {
      return html(reply, loginView('İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.'), 500);
    }
    return reply.code(500).send({ error: 'İşlem gerçekleştirilemedi.' });
  });

  async function requireSession(
    request: FastifyRequest,
    reply: FastifyReply,
    options: { allowPasswordChange?: boolean } = {},
  ): Promise<AuthenticatedSession | null> {
    const session = await auth.authenticate(request);
    if (!session) {
      auth.clearSessionCookie(reply);
      await reply.redirect('/panel');
      return null;
    }
    if (session.administrator.mustChangePassword && !options.allowPasswordChange) {
      await reply.redirect('/panel/change-password');
      return null;
    }
    return session;
  }

  async function csrfFor(session: AuthenticatedSession) {
    return auth.issueCsrfToken(session.id);
  }

  async function requireApiSession(request: FastifyRequest, reply: FastifyReply) {
    const session = await auth.authenticate(request);
    if (!session) {
      auth.clearSessionCookie(reply);
      reply.code(401).send({ error: 'Oturum gerekli.' });
      return null;
    }
    if (session.administrator.mustChangePassword) {
      reply.code(403).send({ error: 'Önce şifre değiştirilmelidir.' });
      return null;
    }
    return session;
  }

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/panel/assets/panel.css', async (_request, reply) =>
    reply.type('text/css; charset=utf-8').send(panelCss),
  );

  app.get('/panel', async (request, reply) => {
    const session = await auth.authenticate(request);
    if (!session) return html(reply, loginView());
    return reply.redirect(
      session.administrator.mustChangePassword ? '/panel/change-password' : '/panel/dashboard',
    );
  });

  app.post('/panel/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return html(reply, loginView('E-posta veya şifre hatalı.'), 400);
    const result = await auth.login(parsed.data.email, parsed.data.password, request);
    if (!result.ok || !result.token || !result.session) {
      const status = result.reason === 'rate_limited' ? 429 : 401;
      return html(reply, loginView('E-posta veya şifre hatalı.'), status);
    }
    auth.setSessionCookie(reply, result.token);
    return reply.redirect(
      result.session.administrator.mustChangePassword
        ? '/panel/change-password'
        : '/panel/dashboard',
    );
  });

  app.post('/panel/logout', async (request, reply) => {
    const session = await requireSession(request, reply, { allowPasswordChange: true });
    if (!session) return;
    if (!(await auth.verifyCsrfToken(session.id, formValue(request.body, 'csrfToken')))) {
      return reply.code(403).type('text/plain').send('Geçersiz güvenlik doğrulaması.');
    }
    await repository.invalidateSession(session.id);
    await repository.audit(
      auth.auditContext(request, session.administrator.id),
      'logout',
      'success',
    );
    auth.clearSessionCookie(reply);
    return reply.redirect('/panel');
  });

  app.get('/panel/change-password', async (request, reply) => {
    const session = await requireSession(request, reply, { allowPasswordChange: true });
    if (!session) return;
    return html(
      reply,
      changePasswordView(await csrfFor(session), session.administrator.mustChangePassword),
    );
  });

  app.post('/panel/change-password', async (request, reply) => {
    const session = await requireSession(request, reply, { allowPasswordChange: true });
    if (!session) return;
    const parsed = passwordSchema.safeParse(request.body);
    if (!parsed.success || !(await auth.verifyCsrfToken(session.id, parsed.data.csrfToken))) {
      return reply.code(403).type('text/plain').send('Geçersiz güvenlik doğrulaması.');
    }
    if (parsed.data.password !== parsed.data.passwordConfirm) {
      return html(
        reply,
        changePasswordView(await csrfFor(session), session.administrator.mustChangePassword, {
          error: 'Şifreler eşleşmiyor.',
        }),
        400,
      );
    }
    const result = await auth.changePassword(session, parsed.data.password, request);
    if (!result.ok) {
      return html(
        reply,
        changePasswordView(await csrfFor(session), session.administrator.mustChangePassword, {
          error: result.error,
        }),
        400,
      );
    }
    auth.setSessionCookie(reply, result.token);
    return reply.redirect('/panel/dashboard');
  });

  app.get('/panel/forgot-password', async (_request, reply) => html(reply, forgotPasswordView()));

  app.post('/panel/forgot-password', async (request, reply) => {
    if (!resetEmail.isConfigured()) {
      return html(
        reply,
        forgotPasswordView({
          error: 'Şifre sıfırlama e-posta servisi henüz yapılandırılmamış.',
        }),
        503,
      );
    }
    const email = String(formValue(request.body, 'email') ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR');
    const identity = auth.identity(request);
    const rateLimited = await repository.consumeIpAttempt(
      `reset:${identity.ipHash}`,
      3,
      config.RESET_TOKEN_MINUTES,
    );
    if (!rateLimited) {
      const admin = await repository.getAdminByEmail(email);
      if (admin?.isActive && admin.id === 1) {
        const token = randomToken();
        await repository.createPasswordReset({
          id: randomUUID(),
          adminId: admin.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + config.RESET_TOKEN_MINUTES * 60 * 1000),
        });
        await resetEmail.sendPasswordReset(
          admin.email,
          `${config.ADMIN_ORIGIN}/panel/reset-password?token=${encodeURIComponent(token)}`,
        );
      }
    }
    return html(
      reply,
      forgotPasswordView({
        success: 'Hesap uygunsa şifre sıfırlama bağlantısı gönderildi.',
      }),
    );
  });

  app.get('/panel/reset-password', async (request, reply) => {
    const token = String((request.query as Record<string, unknown>).token ?? '');
    return html(reply, resetPasswordView(token));
  });

  app.post('/panel/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success)
      return html(reply, resetPasswordView('', 'Bağlantı veya form geçersiz.'), 400);
    if (parsed.data.password !== parsed.data.passwordConfirm) {
      return html(reply, resetPasswordView(parsed.data.token, 'Şifreler eşleşmiyor.'), 400);
    }
    const passwordError = validatePassword(parsed.data.password);
    if (passwordError) return html(reply, resetPasswordView(parsed.data.token, passwordError), 400);
    const passwordHash = await hashPassword(parsed.data.password);
    const adminId = await repository.usePasswordReset(tokenHash(parsed.data.token), passwordHash);
    if (!adminId) {
      return html(
        reply,
        resetPasswordView('', 'Bağlantı geçersiz, kullanılmış veya süresi dolmuş.'),
        400,
      );
    }
    await repository.audit(auth.auditContext(request, adminId), 'password_reset', 'success');
    auth.clearSessionCookie(reply);
    return reply.redirect('/panel');
  });

  app.get('/panel/dashboard', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    return html(
      reply,
      dashboardView(
        await csrfFor(session),
        session.administrator,
        await repository.dashboardStats(),
      ),
    );
  });

  app.get('/panel/products', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const notice = safeReturnMessage((request.query as Record<string, unknown>).status);
    return html(
      reply,
      productsView(await csrfFor(session), await repository.listProducts(), notice),
    );
  });

  app.get('/panel/products/new', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    return html(reply, productFormView(await csrfFor(session)));
  });

  async function parseProductForm(request: FastifyRequest) {
    const fields: Record<string, unknown> = {};
    let image: { buffer: Buffer; mimeType: string } | null = null;
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (part.fieldname === 'image' && part.filename) {
          image = { buffer: await part.toBuffer(), mimeType: part.mimetype };
        } else {
          part.file.resume();
        }
      } else {
        fields[part.fieldname] = part.value;
      }
    }
    fields.isActive = fields.isActive === 'true';
    const parsed = productSchema.safeParse(fields);
    return { parsed, image };
  }

  app.post('/panel/products', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { parsed, image } = await parseProductForm(request);
    if (!parsed.success || !(await auth.verifyCsrfToken(session.id, parsed.data.csrfToken))) {
      return reply.code(403).type('text/plain').send('Geçersiz form veya güvenlik doğrulaması.');
    }
    if (!image) {
      return html(
        reply,
        productFormView(await csrfFor(session), undefined, 'Ürün görseli gereklidir.'),
        400,
      );
    }
    let uploaded: { key: string; url: string } | null = null;
    try {
      uploaded = await storage.upload(image.buffer, image.mimeType);
      const product: Omit<Product, 'createdAt' | 'updatedAt'> = {
        id: randomUUID(),
        section: parsed.data.section,
        name: parsed.data.name,
        category: parsed.data.category,
        imageKey: uploaded.key,
        imageUrl: uploaded.url,
        imageAlt: parsed.data.imageAlt,
        displayOrder: parsed.data.displayOrder,
        isActive: parsed.data.isActive,
      };
      await repository.createProduct(product);
      await repository.audit(
        auth.auditContext(request, session.administrator.id),
        'product_create',
        'success',
        { productId: product.id },
      );
      return reply.redirect('/panel/products?status=created');
    } catch (error) {
      if (uploaded) await storage.remove(uploaded.key).catch(() => undefined);
      throw error;
    }
  });

  app.get('/panel/products/:id/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const product = await repository.getProduct(String((request.params as { id: string }).id));
    if (!product) return reply.code(404).type('text/plain').send('Ürün bulunamadı.');
    return html(reply, productFormView(await csrfFor(session), product));
  });

  app.post('/panel/products/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const id = String((request.params as { id: string }).id);
    const existing = await repository.getProduct(id);
    if (!existing) return reply.code(404).type('text/plain').send('Ürün bulunamadı.');
    const { parsed, image } = await parseProductForm(request);
    if (!parsed.success || !(await auth.verifyCsrfToken(session.id, parsed.data.csrfToken))) {
      return reply.code(403).type('text/plain').send('Geçersiz form veya güvenlik doğrulaması.');
    }
    let uploaded: { key: string; url: string } | null = null;
    try {
      if (image) uploaded = await storage.upload(image.buffer, image.mimeType);
      await repository.updateProduct({
        id,
        section: parsed.data.section,
        name: parsed.data.name,
        category: parsed.data.category,
        imageKey: uploaded?.key ?? existing.imageKey,
        imageUrl: uploaded?.url ?? existing.imageUrl,
        imageAlt: parsed.data.imageAlt,
        displayOrder: parsed.data.displayOrder,
        isActive: parsed.data.isActive,
      });
      if (uploaded) await storage.remove(existing.imageKey).catch(() => undefined);
      await repository.audit(
        auth.auditContext(request, session.administrator.id),
        'product_update',
        'success',
        { productId: id },
      );
      return reply.redirect('/panel/products?status=updated');
    } catch (error) {
      if (uploaded) await storage.remove(uploaded.key).catch(() => undefined);
      throw error;
    }
  });

  app.get('/panel/products/:id/delete', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const product = await repository.getProduct(String((request.params as { id: string }).id));
    if (!product) return reply.code(404).type('text/plain').send('Ürün bulunamadı.');
    return html(reply, deleteProductView(await csrfFor(session), product));
  });

  app.post('/panel/products/:id/delete', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (!(await auth.verifyCsrfToken(session.id, formValue(request.body, 'csrfToken')))) {
      return reply.code(403).type('text/plain').send('Geçersiz güvenlik doğrulaması.');
    }
    const id = String((request.params as { id: string }).id);
    const product = await repository.getProduct(id);
    if (!product) return reply.code(404).type('text/plain').send('Ürün bulunamadı.');
    await repository.deleteProduct(id);
    await storage
      .remove(product.imageKey)
      .catch((error) => request.log.error({ err: error }, 'Orphaned object'));
    await repository.audit(
      auth.auditContext(request, session.administrator.id),
      'product_delete',
      'success',
      { productId: id },
    );
    return reply.redirect('/panel/products?status=deleted');
  });

  app.get('/api/public/products', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin === config.PUBLIC_SITE_ORIGIN) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
    }
    reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const products = await repository.listProducts(true);
    return {
      products: products.map(({ id, section, name, category, imageUrl, imageAlt }) => ({
        id,
        section,
        name,
        category,
        imageUrl,
        imageAlt,
      })),
    };
  });

  app.get('/api/admin/products', async (request, reply) => {
    const session = await requireApiSession(request, reply);
    if (!session) return;
    return { products: await repository.listProducts() };
  });

  return app;
}
