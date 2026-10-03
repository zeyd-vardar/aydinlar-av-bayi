import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../dist/client/', import.meta.url));
const basePath = process.env.GITHUB_PAGES_BASE ?? '/aydinlar-av-bayi';
const publicBase = `${basePath.replace(/\/$/, '')}/`;
const rewriteRootUrl = (match, quote, path) => {
  if (path.startsWith('/') || path.startsWith(basePath.slice(1))) return match;
  return `url(${quote}${publicBase}${path}${quote})`;
};

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      }),
    )
  ).flat();
};

for (const file of await walk(outputDirectory)) {
  if (!file.endsWith('.html') && !file.endsWith('.css')) continue;

  const content = await readFile(file, 'utf8');
  const updated = file.endsWith('.html')
    ? content
        .replace(/\b(href|src)="\/([^"]*)"/g, (match, attribute, path) => {
          if (path.startsWith('/') || path.startsWith(basePath.slice(1))) return match;
          return `${attribute}="${publicBase}${path}"`;
        })
        .replace(/url\((['"]?)\/([^'")]+)\1\)/g, rewriteRootUrl)
    : content.replace(/url\((['"]?)\/([^'")]+)\1\)/g, rewriteRootUrl);

  if (updated !== content) await writeFile(file, updated);
}
