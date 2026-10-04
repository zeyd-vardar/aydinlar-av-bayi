import { readdir, readFile, writeFile } from 'node:fs/promises';

const outputDirectory = new URL('../dist/client/', import.meta.url);
const files = await readdir(outputDirectory);
const sitemapFiles = files.filter((file) => file.startsWith('sitemap') && file.endsWith('.xml'));

function formatSitemap(xml) {
  return (
    xml
      .trim()
      .replace(/>\s*</g, '><')
      .replace(/(<\?xml[^>]*\?>)/, '$1\n')
      .replace(/(<(?:sitemapindex|urlset)\b[^>]*>)/, '$1\n')
      .replace(/<(sitemap|url)>/g, '  <$1>\n')
      .replace(/<(loc|lastmod)>(.*?)<\/\1>/g, '    <$1>$2</$1>\n')
      .replace(/<\/(sitemap|url)>/g, '  </$1>\n')
      .replace(/<\/(sitemapindex|urlset)>/, '</$1>') + '\n'
  );
}

await Promise.all(
  sitemapFiles.map(async (file) => {
    const fileUrl = new URL(file, outputDirectory);
    const xml = await readFile(fileUrl, 'utf8');
    await writeFile(fileUrl, formatSitemap(xml));
  }),
);
