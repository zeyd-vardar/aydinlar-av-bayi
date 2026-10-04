import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const site = process.env.PUBLIC_SITE_URL ?? 'https://trabzonavbayi.com';
const configuredBase = process.env.PUBLIC_BASE_PATH?.trim();
const base = configuredBase && configuredBase !== '/' ? configuredBase : undefined;
const basePath = base ? `/${base.replace(/^\/+|\/+$/g, '')}` : '';

function getBlogLastmodDates(directory) {
  const dates = new Map();

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      for (const [url, date] of getBlogLastmodDates(entryPath)) dates.set(url, date);
      continue;
    }

    if (extname(entry.name) !== '.md') continue;

    const source = readFileSync(entryPath, 'utf8');
    const updatedAt = source.match(/^updatedAt:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1];
    if (!updatedAt) continue;

    const slug = relative('src/content/blog', entryPath).split(sep).join('/').replace(/\.md$/, '');
    dates.set(`/blog/${slug}/`, new Date(updatedAt));
  }

  return dates;
}

const blogLastmodDates = getBlogLastmodDates('src/content/blog');

function getLocalPath(url) {
  const pathname = new URL(url).pathname;
  if (!base) return pathname;

  const basePath = `/${base.replace(/^\/+|\/+$/g, '')}`;
  return pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;
}

export default defineConfig({
  site,
  base,
  output: 'static',
  outDir: './dist/client',
  trailingSlash: 'always',
  compressHTML: false,
  redirects: {
    '/galeri': `${basePath}/magazamiz/`,
  },
  integrations: [
    sitemap({
      filter(page) {
        const path = getLocalPath(page);
        return ![
          '/404/',
          '/cerez-politikasi/',
          '/gizlilik-politikasi/',
          '/kvkk-aydinlatma-metni/',
        ].includes(path);
      },
      serialize(item) {
        const lastmod = blogLastmodDates.get(getLocalPath(item.url));
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
