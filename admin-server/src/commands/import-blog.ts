import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { loadCommandConfig } from './config.js';

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? markdownFiles(path)
        : Promise.resolve(path.endsWith('.md') ? [path] : []);
    }),
  );
  return nested.flat();
}

function field(frontmatter: string, key: string) {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

function stringValue(value: string) {
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value) as string;
  return value;
}

function stringArray(value: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function jsonArray(value: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const config = loadCommandConfig();
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
});
const contentDirectory = resolve(process.cwd(), process.argv[2] ?? '../src/content/blog');

try {
  const files = await markdownFiles(contentDirectory);
  let imported = 0;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) continue;
    const frontmatter = match[1]!;
    const content = match[2]!.trim();
    const title = stringValue(field(frontmatter, 'title'));
    const slug = stringValue(field(frontmatter, 'slug'));
    const description = stringValue(field(frontmatter, 'description'));
    const mainCategory = stringValue(field(frontmatter, 'mainCategory'));
    const subCategory = stringValue(field(frontmatter, 'subCategory'));
    const image = stringValue(field(frontmatter, 'image'));
    const imageAlt = stringValue(field(frontmatter, 'imageAlt'));
    const tags = stringArray(field(frontmatter, 'tags'));
    const keywords = stringArray(field(frontmatter, 'keywords'));
    const sources = jsonArray(field(frontmatter, 'sources'));
    const publishedAt = stringValue(field(frontmatter, 'publishedAt'));
    const readingTime = Number(field(frontmatter, 'readingTime')) || 1;
    const isPublished = field(frontmatter, 'draft') !== 'true';
    const officialNotice = field(frontmatter, 'officialNotice') === 'true';
    if (!title || !slug || !description || !content) continue;
    await pool.query(
      `INSERT INTO blog_posts
       (id, slug, title, description, main_category, sub_category, content, tags, keywords,
        image, image_alt, reading_time, is_published, official_notice, sources, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description,
         main_category = EXCLUDED.main_category, sub_category = EXCLUDED.sub_category,
         content = EXCLUDED.content, tags = EXCLUDED.tags, keywords = EXCLUDED.keywords,
         image = EXCLUDED.image,
         image_alt = EXCLUDED.image_alt, reading_time = EXCLUDED.reading_time,
         is_published = EXCLUDED.is_published, official_notice = EXCLUDED.official_notice,
         sources = EXCLUDED.sources, published_at = EXCLUDED.published_at,
         is_deleted = false, updated_at = now()`,
      [
        randomUUID(),
        slug,
        title,
        description,
        mainCategory,
        subCategory,
        content,
        JSON.stringify(tags),
        JSON.stringify(keywords),
        image,
        imageAlt,
        readingTime,
        isPublished,
        officialNotice,
        JSON.stringify(sources),
        publishedAt,
      ],
    );
    imported += 1;
  }
  process.stdout.write(`${imported} blog yazısı içe aktarıldı.\n`);
} finally {
  await pool.end();
}
