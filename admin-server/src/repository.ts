import type { Pool, PoolClient } from 'pg';
import type {
  Administrator,
  AuditContext,
  AuthenticatedSession,
  BlogPost,
  Brand,
  BrandCategory,
  Product,
  ProductSection,
  StoreSettings,
} from './types.js';

function mapAdministrator(row: Record<string, unknown>): Administrator {
  return {
    id: Number(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    mustChangePassword: Boolean(row.must_change_password),
    isActive: Boolean(row.is_active),
    failedLoginAttempts: Number(row.failed_login_attempts),
    lockedUntil: row.locked_until ? new Date(String(row.locked_until)) : null,
    lastLoginAt: row.last_login_at ? new Date(String(row.last_login_at)) : null,
    passwordChangedAt: row.password_changed_at ? new Date(String(row.password_changed_at)) : null,
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    section: row.section as ProductSection,
    name: String(row.name),
    category: String(row.category),
    imageKey: String(row.image_key),
    imageUrl: String(row.image_url),
    imageAlt: String(row.image_alt),
    description: String(row.description ?? ''),
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    displayOrder: Number(row.display_order),
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapBrand(row: Record<string, unknown>): Brand {
  return {
    id: String(row.id),
    category: row.category as BrandCategory,
    name: String(row.name),
    displayOrder: Number(row.display_order),
    isActive: Boolean(row.is_active),
  };
}

function mapBlogPost(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    mainCategory: row.main_category as BlogPost['mainCategory'],
    subCategory: String(row.sub_category),
    content: String(row.content),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    image: String(row.image),
    imageAlt: String(row.image_alt),
    readingTime: Number(row.reading_time),
    isPublished: Boolean(row.is_published),
    isDeleted: Boolean(row.is_deleted),
    officialNotice: Boolean(row.official_notice),
    sources: Array.isArray(row.sources) ? (row.sources as BlogPost['sources']) : [],
    publishedAt: new Date(String(row.published_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapStoreSettings(row: Record<string, unknown>): StoreSettings {
  return {
    phone: String(row.phone),
    whatsapp: String(row.whatsapp),
    address: String(row.address),
    streetAddress: String(row.street_address),
    postalCode: String(row.postal_code),
    addressLocality: String(row.address_locality),
    addressRegion: String(row.address_region),
    instagramUrl: String(row.instagram_url ?? ''),
    facebookUrl: String(row.facebook_url ?? ''),
    youtubeUrl: String(row.youtube_url ?? ''),
    hours: Array.isArray(row.hours) ? (row.hours as StoreSettings['hours']) : [],
    openingTime: String(row.opening_time).slice(0, 5),
    closingTime: String(row.closing_time).slice(0, 5),
  };
}

export class Repository {
  constructor(private readonly pool: Pool) {}

  async getAdminByEmail(email: string): Promise<Administrator | null> {
    const result = await this.pool.query('SELECT * FROM administrators WHERE email = $1', [email]);
    return result.rows[0] ? mapAdministrator(result.rows[0]) : null;
  }

  async getAdminById(id: number): Promise<Administrator | null> {
    const result = await this.pool.query('SELECT * FROM administrators WHERE id = $1', [id]);
    return result.rows[0] ? mapAdministrator(result.rows[0]) : null;
  }

  async registerLoginFailure(adminId: number, maxAttempts: number, lockMinutes: number) {
    await this.pool.query(
      `UPDATE administrators
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE
             WHEN failed_login_attempts + 1 >= $2 THEN now() + make_interval(mins => $3)
             ELSE locked_until
           END,
           updated_at = now()
       WHERE id = $1`,
      [adminId, maxAttempts, lockMinutes],
    );
  }

  async registerLoginSuccess(adminId: number) {
    await this.pool.query(
      `UPDATE administrators
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now(), updated_at = now()
       WHERE id = $1`,
      [adminId],
    );
  }

  async consumeIpAttempt(keyHash: string, maxAttempts: number, windowMinutes: number) {
    const result = await this.pool.query(
      `INSERT INTO login_rate_limits (key_hash, attempt_count, window_started_at, updated_at)
       VALUES ($1, 1, now(), now())
       ON CONFLICT (key_hash) DO UPDATE SET
         attempt_count = CASE
           WHEN login_rate_limits.window_started_at < now() - make_interval(mins => $3)
             THEN 1
           ELSE login_rate_limits.attempt_count + 1
         END,
         window_started_at = CASE
           WHEN login_rate_limits.window_started_at < now() - make_interval(mins => $3)
             THEN now()
           ELSE login_rate_limits.window_started_at
         END,
         blocked_until = CASE
           WHEN login_rate_limits.window_started_at >= now() - make_interval(mins => $3)
             AND login_rate_limits.attempt_count + 1 > $2
             THEN now() + make_interval(mins => $3)
           WHEN login_rate_limits.window_started_at < now() - make_interval(mins => $3)
             THEN NULL
           ELSE login_rate_limits.blocked_until
         END,
         updated_at = now()
       RETURNING blocked_until`,
      [keyHash, maxAttempts, windowMinutes],
    );
    const blockedUntil = result.rows[0]?.blocked_until;
    return blockedUntil ? new Date(blockedUntil) > new Date() : false;
  }

  async createSession(input: {
    id: string;
    adminId: number;
    tokenHash: string;
    absoluteExpiresAt: Date;
    ipHash: string;
    userAgent: string;
  }) {
    await this.pool.query(
      `INSERT INTO admin_sessions
        (id, administrator_id, token_hash, absolute_expires_at, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.id,
        input.adminId,
        input.tokenHash,
        input.absoluteExpiresAt,
        input.ipHash,
        input.userAgent,
      ],
    );
  }

  async getSession(tokenHash: string, idleMinutes: number): Promise<AuthenticatedSession | null> {
    const result = await this.pool.query(
      `SELECT s.id AS session_id, s.absolute_expires_at, a.*
       FROM admin_sessions s
       JOIN administrators a ON a.id = s.administrator_id
       WHERE s.token_hash = $1
         AND s.invalidated_at IS NULL
         AND s.absolute_expires_at > now()
         AND s.last_seen_at > now() - make_interval(mins => $2)
       LIMIT 1`,
      [tokenHash, idleMinutes],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.session_id),
      administrator: mapAdministrator(row),
      absoluteExpiresAt: new Date(row.absolute_expires_at),
    };
  }

  async touchSession(sessionId: string) {
    await this.pool.query('UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1', [
      sessionId,
    ]);
  }

  async setCsrfToken(sessionId: string, csrfTokenHash: string) {
    await this.pool.query('UPDATE admin_sessions SET csrf_token_hash = $2 WHERE id = $1', [
      sessionId,
      csrfTokenHash,
    ]);
  }

  async consumeCsrfToken(sessionId: string, csrfTokenHash: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE admin_sessions SET csrf_token_hash = NULL
       WHERE id = $1 AND csrf_token_hash = $2 AND invalidated_at IS NULL
       RETURNING id`,
      [sessionId, csrfTokenHash],
    );
    return result.rowCount === 1;
  }

  async invalidateSession(sessionId: string) {
    await this.pool.query('UPDATE admin_sessions SET invalidated_at = now() WHERE id = $1', [
      sessionId,
    ]);
  }

  async invalidateAllSessions(adminId: number, client: Pool | PoolClient = this.pool) {
    await client.query(
      'UPDATE admin_sessions SET invalidated_at = now() WHERE administrator_id = $1 AND invalidated_at IS NULL',
      [adminId],
    );
  }

  async changePassword(adminId: number, passwordHash: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE administrators
         SET password_hash = $2, must_change_password = false,
             password_changed_at = now(), failed_login_attempts = 0,
             locked_until = NULL, updated_at = now()
         WHERE id = $1`,
        [adminId, passwordHash],
      );
      await this.invalidateAllSessions(adminId, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createPasswordReset(input: {
    id: string;
    adminId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM password_reset_tokens WHERE administrator_id = $1 AND used_at IS NULL',
        [input.adminId],
      );
      await client.query(
        `INSERT INTO password_reset_tokens (id, administrator_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [input.id, input.adminId, input.tokenHash, input.expiresAt],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async usePasswordReset(tokenHash: string, passwordHash: string): Promise<number | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const token = await client.query(
        `SELECT id, administrator_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         FOR UPDATE`,
        [tokenHash],
      );
      if (!token.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const adminId = Number(token.rows[0].administrator_id);
      await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [
        token.rows[0].id,
      ]);
      await client.query(
        `UPDATE administrators
         SET password_hash = $2, must_change_password = false,
             password_changed_at = now(), failed_login_attempts = 0,
             locked_until = NULL, updated_at = now()
         WHERE id = $1`,
        [adminId, passwordHash],
      );
      await this.invalidateAllSessions(adminId, client);
      await client.query('COMMIT');
      return adminId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async audit(
    context: AuditContext,
    eventType: string,
    outcome: 'success' | 'failure',
    metadata: Record<string, unknown> = {},
  ) {
    await this.pool.query(
      `INSERT INTO admin_audit_logs
        (administrator_id, event_type, outcome, ip_hash, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        context.administratorId,
        eventType,
        outcome,
        context.ipHash,
        context.userAgent,
        JSON.stringify(metadata),
      ],
    );
  }

  async listProducts(activeOnly = false): Promise<Product[]> {
    const result = await this.pool.query(
      `SELECT * FROM products
       ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY section, display_order, created_at DESC`,
    );
    return result.rows.map(mapProduct);
  }

  async getProduct(id: string): Promise<Product | null> {
    const result = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async createProduct(product: Omit<Product, 'createdAt' | 'updatedAt'>) {
    await this.pool.query(
      `INSERT INTO products
        (id, section, name, category, image_key, image_url, image_alt, description, features,
         display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        product.id,
        product.section,
        product.name,
        product.category,
        product.imageKey,
        product.imageUrl,
        product.imageAlt,
        product.description,
        JSON.stringify(product.features),
        product.displayOrder,
        product.isActive,
      ],
    );
  }

  async updateProduct(product: Omit<Product, 'createdAt' | 'updatedAt'>) {
    await this.pool.query(
      `UPDATE products SET
         section = $2, name = $3, category = $4, image_key = $5, image_url = $6,
         image_alt = $7, description = $8, features = $9, display_order = $10,
         is_active = $11, updated_at = now()
       WHERE id = $1`,
      [
        product.id,
        product.section,
        product.name,
        product.category,
        product.imageKey,
        product.imageUrl,
        product.imageAlt,
        product.description,
        JSON.stringify(product.features),
        product.displayOrder,
        product.isActive,
      ],
    );
  }

  async deleteProduct(id: string) {
    await this.pool.query('DELETE FROM products WHERE id = $1', [id]);
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const result = await this.pool.query('SELECT * FROM store_settings WHERE id = 1');
    if (!result.rows[0]) throw new Error('Store settings are missing');
    return mapStoreSettings(result.rows[0]);
  }

  async updateStoreSettings(settings: StoreSettings) {
    await this.pool.query(
      `UPDATE store_settings SET
         phone = $1, whatsapp = $2, address = $3, street_address = $4, postal_code = $5,
         address_locality = $6, address_region = $7, instagram_url = $8, facebook_url = $9,
         youtube_url = $10, hours = $11, opening_time = $12, closing_time = $13,
         updated_at = now()
       WHERE id = 1`,
      [
        settings.phone,
        settings.whatsapp,
        settings.address,
        settings.streetAddress,
        settings.postalCode,
        settings.addressLocality,
        settings.addressRegion,
        settings.instagramUrl,
        settings.facebookUrl,
        settings.youtubeUrl,
        JSON.stringify(settings.hours),
        settings.openingTime,
        settings.closingTime,
      ],
    );
  }

  async listBrands(activeOnly = false): Promise<Brand[]> {
    const result = await this.pool.query(
      `SELECT * FROM brands ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY category, display_order, name`,
    );
    return result.rows.map(mapBrand);
  }

  async getBrand(id: string): Promise<Brand | null> {
    const result = await this.pool.query('SELECT * FROM brands WHERE id = $1', [id]);
    return result.rows[0] ? mapBrand(result.rows[0]) : null;
  }

  async createBrand(brand: Brand) {
    await this.pool.query(
      `INSERT INTO brands (id, category, name, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [brand.id, brand.category, brand.name, brand.displayOrder, brand.isActive],
    );
  }

  async updateBrand(brand: Brand) {
    await this.pool.query(
      `UPDATE brands SET category = $2, name = $3, display_order = $4,
       is_active = $5, updated_at = now() WHERE id = $1`,
      [brand.id, brand.category, brand.name, brand.displayOrder, brand.isActive],
    );
  }

  async deleteBrand(id: string) {
    await this.pool.query('DELETE FROM brands WHERE id = $1', [id]);
  }

  async listBlogPosts(publishedOnly = false, includeDeleted = false): Promise<BlogPost[]> {
    const conditions = [
      publishedOnly ? 'is_published = true' : '',
      includeDeleted ? '' : 'is_deleted = false',
    ].filter(Boolean);
    const result = await this.pool.query(
      `SELECT * FROM blog_posts ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY main_category, title`,
    );
    return result.rows.map(mapBlogPost);
  }

  async getBlogPost(id: string): Promise<BlogPost | null> {
    const result = await this.pool.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    return result.rows[0] ? mapBlogPost(result.rows[0]) : null;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    const result = await this.pool.query('SELECT * FROM blog_posts WHERE slug = $1', [slug]);
    return result.rows[0] ? mapBlogPost(result.rows[0]) : null;
  }

  async createBlogPost(post: BlogPost) {
    await this.pool.query(
      `INSERT INTO blog_posts
       (id, slug, title, description, main_category, sub_category, content, tags, keywords, image,
        image_alt, reading_time, is_published, is_deleted, official_notice, sources,
        published_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        post.id,
        post.slug,
        post.title,
        post.description,
        post.mainCategory,
        post.subCategory,
        post.content,
        JSON.stringify(post.tags),
        JSON.stringify(post.keywords),
        post.image,
        post.imageAlt,
        post.readingTime,
        post.isPublished,
        post.isDeleted,
        post.officialNotice,
        JSON.stringify(post.sources),
        post.publishedAt,
        post.updatedAt,
      ],
    );
  }

  async updateBlogPost(post: BlogPost) {
    await this.pool.query(
      `UPDATE blog_posts SET slug = $2, title = $3, description = $4, main_category = $5,
       sub_category = $6, content = $7, tags = $8, keywords = $9, image = $10,
       image_alt = $11, reading_time = $12, is_published = $13, is_deleted = false,
       official_notice = $14, sources = $15, published_at = $16, updated_at = now()
       WHERE id = $1`,
      [
        post.id,
        post.slug,
        post.title,
        post.description,
        post.mainCategory,
        post.subCategory,
        post.content,
        JSON.stringify(post.tags),
        JSON.stringify(post.keywords),
        post.image,
        post.imageAlt,
        post.readingTime,
        post.isPublished,
        post.officialNotice,
        JSON.stringify(post.sources),
        post.publishedAt,
      ],
    );
  }

  async deleteBlogPost(id: string) {
    await this.pool.query(
      'UPDATE blog_posts SET is_deleted = true, is_published = false, updated_at = now() WHERE id = $1',
      [id],
    );
  }

  async dashboardStats() {
    const result = await this.pool.query(
      `SELECT
         count(*)::integer AS total_products,
         count(*) FILTER (WHERE section = 'recommended')::integer AS recommended_products,
         count(*) FILTER (WHERE section = 'new')::integer AS new_products,
         (SELECT count(*)::integer FROM brands) AS total_brands,
         (SELECT count(*)::integer FROM blog_posts) AS total_blog_posts,
         max(updated_at) AS last_update
       FROM products`,
    );
    return result.rows[0];
  }
}
