import { access, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../dist/client/', import.meta.url));
const primaryOrigin = (process.env.PUBLIC_SITE_URL ?? 'https://trabzonavbayi.com').replace(
  /\/+$/,
  '',
);
const forbiddenValues = ['zeyd-vardar.github.io', '/aydinlar-av-bayi/'];
const allowedAydinlarAvPaths = new Set(['/api/public/products']);
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return files.flat();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function outputPathForUrl(url) {
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (pathname === '404/') return join(outputDirectory, '404.html');
  if (!pathname || url.pathname.endsWith('/')) return join(outputDirectory, pathname, 'index.html');
  if (extname(pathname)) return join(outputDirectory, pathname);
  return join(outputDirectory, pathname, 'index.html');
}

function collectLocalReferences(content) {
  const references = [];
  for (const match of content.matchAll(/\b(?:href|src)="([^"]+)"/g)) references.push(match[1]);
  for (const match of content.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) references.push(candidate.trim().split(/\s+/)[0]);
  }
  for (const match of content.matchAll(/url\((['"]?)([^'"\)]+)\1\)/g)) references.push(match[2]);
  return references;
}

const files = await walk(outputDirectory);
const inspectableFiles = files.filter((file) =>
  ['.html', '.css', '.xml', '.txt'].includes(extname(file)),
);

for (const file of inspectableFiles) {
  const content = await readFile(file, 'utf8');
  const relativeFile = relative(outputDirectory, file);

  for (const forbidden of forbiddenValues) {
    if (content.includes(forbidden))
      errors.push(`${relativeFile}: yasak production değeri bulundu: ${forbidden}`);
  }
  for (const match of content.matchAll(/https?:\/\/(?:www\.)?aydinlarav\.com[^\s"'<>]*/gi)) {
    const url = new URL(match[0].replace(/&amp;.*$/, ''));
    if (!allowedAydinlarAvPaths.has(url.pathname.replace(/\/$/, ''))) {
      errors.push(`${relativeFile}: yasak production değeri bulundu: ${url.href}`);
    }
  }

  if (file.endsWith('.html')) {
    const isRedirect = /http-equiv="refresh"/i.test(content);
    if (!isRedirect) {
      const mainCount = (content.match(/<main\b/g) ?? []).length;
      if (mainCount !== 1)
        errors.push(`${relativeFile}: bir adet <main> bekleniyordu, bulunan: ${mainCount}`);

      const headings = [...content.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
      const h1Count = headings.filter((level) => level === 1).length;
      if (h1Count !== 1)
        errors.push(`${relativeFile}: bir adet <h1> bekleniyordu, bulunan: ${h1Count}`);
      for (let index = 1; index < headings.length; index += 1) {
        if (headings[index] > headings[index - 1] + 1) {
          errors.push(
            `${relativeFile}: heading seviyesi h${headings[index - 1]} → h${headings[index]} atlıyor`,
          );
          break;
        }
      }

      const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      for (const id of new Set(duplicateIds)) {
        errors.push(`${relativeFile}: yinelenen id bulundu: ${id}`);
      }

      for (const match of content.matchAll(/<img\b[^>]*>/g)) {
        if (!/\balt="[^"]*"/.test(match[0]))
          errors.push(`${relativeFile}: alt niteliği olmayan görsel bulundu`);
      }

      for (const match of content.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
        const rel = match[0].match(/\brel="([^"]*)"/)?.[1].split(/\s+/) ?? [];
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
          errors.push(`${relativeFile}: target="_blank" bağlantısında güvenli rel eksik`);
        }
      }

      for (const match of content.matchAll(/<iframe\b[^>]*>/g)) {
        const iframe = match[0];
        const source = iframe.match(/\bsrc="([^"]+)"/)?.[1];
        if (!source || !source.startsWith('https://'))
          errors.push(`${relativeFile}: iframe HTTPS kaynağı kullanmıyor`);
        if (!/\btitle="[^"]+"/.test(iframe))
          errors.push(`${relativeFile}: iframe title niteliği eksik`);
        if (!/\breferrerpolicy="[^"]+"/.test(iframe))
          errors.push(`${relativeFile}: iframe referrerpolicy niteliği eksik`);
      }

      for (const match of content.matchAll(
        /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        try {
          JSON.parse(match[1]);
        } catch {
          errors.push(`${relativeFile}: geçersiz JSON-LD bulundu`);
        }
      }

      const canonicals = [...content.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)];
      if (canonicals.length !== 1) {
        errors.push(`${relativeFile}: bir canonical bekleniyordu, bulunan: ${canonicals.length}`);
      } else {
        const canonical = new URL(canonicals[0][1]);
        if (canonical.origin !== primaryOrigin)
          errors.push(`${relativeFile}: canonical primary domain kullanmıyor: ${canonical.href}`);
        if (!canonical.pathname.endsWith('/'))
          errors.push(`${relativeFile}: canonical trailing slash kullanmıyor: ${canonical.href}`);
      }
    }
  }

  for (const reference of collectLocalReferences(content)) {
    if (
      !reference ||
      reference.startsWith('#') ||
      /^(?:data:|mailto:|tel:|javascript:)/i.test(reference)
    )
      continue;

    const resolved = new URL(reference, `${primaryOrigin}/`);
    if (resolved.origin !== primaryOrigin) continue;
    const target = outputPathForUrl(resolved);
    if (!(await exists(target))) errors.push(`${relativeFile}: eksik yerel hedef: ${reference}`);
  }
}

const robots = await readFile(join(outputDirectory, 'robots.txt'), 'utf8');
const expectedSitemap = `Sitemap: ${primaryOrigin}/sitemap-index.xml`;
if (!robots.includes(expectedSitemap))
  errors.push(`robots.txt: beklenen sitemap satırı yok: ${expectedSitemap}`);

const sitemapFiles = files.filter((file) => /sitemap.*\.xml$/.test(file));
const sitemapLocations = [];
for (const file of sitemapFiles) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/<loc>(.*?)<\/loc>/g)) sitemapLocations.push(match[1]);
}

for (const location of sitemapLocations) {
  const url = new URL(location);
  if (url.origin !== primaryOrigin) errors.push(`sitemap: primary domain dışında URL: ${location}`);
  if (url.pathname.endsWith('.xml')) continue;
  if (!url.pathname.endsWith('/')) errors.push(`sitemap: trailing slash eksik: ${location}`);
  if (!(await exists(outputPathForUrl(url))))
    errors.push(`sitemap: karşılığı olmayan URL: ${location}`);
}

for (const excludedPath of [
  '/404/',
  '/cerez-politikasi/',
  '/gizlilik-politikasi/',
  '/kvkk-aydinlatma-metni/',
  '/blog/avcilik/silah-ruhsati-bilgileri-blogda-sabit-yazilmali-mi/',
]) {
  if (sitemapLocations.includes(`${primaryOrigin}${excludedPath}`))
    errors.push(`sitemap: indeks dışı URL bulundu: ${excludedPath}`);
}

if (errors.length) {
  console.error(`Production audit başarısız (${errors.length} sorun):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Production audit başarılı: ${files.filter((file) => file.endsWith('.html')).length} HTML dosyası, ${sitemapLocations.length} sitemap URL'si ve yerel hedefler doğrulandı.`,
  );
}
