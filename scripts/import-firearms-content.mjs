import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = '/Users/zeydvardar/.codex/attachments/ef570be8-830a-4dbf-a835-a3f097ccf4c1/Yapıştırılan metin.txt';
const outputRoot = new URL('../src/content/blog/avcilik/', import.meta.url);
const input = await readFile(sourcePath, 'utf8');

const groups = new Map([
  ['Tüfekler hakkında', 'Tüfekler'],
  ['Silah güvenliği', 'Silah Güvenliği'],
  ['Türkiye’de ruhsat ve mevzuat', "Türkiye'de Avcılık Mevzuatı"]
]);
const officialSources = {
  'Emniyet Genel Müdürlüğü': { institution: 'Emniyet Genel Müdürlüğü', page: 'Silah ruhsat işlemleri ve mevzuat', url: 'https://www.egm.gov.tr/' },
  'Tarım ve Orman Bakanlığı': { institution: 'Tarım ve Orman Bakanlığı', page: 'Güncel avcılık düzenlemeleri', url: 'https://www.tarimorman.gov.tr/' },
  'Doğa Koruma ve Milli Parklar Genel Müdürlüğü': { institution: 'Doğa Koruma ve Milli Parklar Genel Müdürlüğü', page: 'Avcılık duyuruları ve düzenlemeleri', url: 'https://www.tarimorman.gov.tr/DKMP' },
  'Bölge 7 Müdürlüğü': { institution: 'Bölge 7 Müdürlüğü', page: 'Avcılık belgesi başvuru bilgileri', url: 'https://bolge7.tarimorman.gov.tr/' }
};
const slugify = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clean = (value) => value.replace(/[`#]/g, '').trim();
const descriptionFor = (title, body) => {
  const paragraph = body.split(/\n\s*\n/).map(clean).find((part) => part.length > 20 && !part.startsWith('- ') && !part.endsWith(':')) ?? title;
  return paragraph.length <= 175 ? paragraph : `${paragraph.slice(0, 172).trimEnd()}…`;
};
const sourcesFor = (body) => {
  const names = [];
  if (/Emniyet Genel Müdürlüğü|EGM mevzuatı|EGM’nin/i.test(body)) names.push('Emniyet Genel Müdürlüğü');
  if (/Tarım ve Orman Bakanlığı/i.test(body)) names.push('Tarım ve Orman Bakanlığı');
  if (/DKMP/i.test(body)) names.push('Doğa Koruma ve Milli Parklar Genel Müdürlüğü');
  if (/Bölge 7 Müdürlüğü/i.test(body)) names.push('Bölge 7 Müdürlüğü');
  return [...new Set(names)].map((name) => officialSources[name]);
};
const officialNoticeFor = (title, body) => /ruhsat|mevzuat|avlanma|Merkez Av Komisyonu|MAK kararı|izin|yasal|kanun|resmi düzenleme|güncel şart/i.test(`${title} ${body}`);

let subCategory = 'Tabancalar';
let current = null;
const articles = [];
for (const rawLine of input.split('\n')) {
  const line = rawLine.trimEnd();
  const text = line.trim();
  if (groups.has(text)) {
    if (current) articles.push(current);
    current = null;
    subCategory = groups.get(text);
    continue;
  }
  if (text.endsWith('?')) {
    if (current) articles.push(current);
    current = { title: text, subCategory, lines: [] };
    continue;
  }
  if (current) current.lines.push(line);
}
if (current) articles.push(current);

for (const article of articles) {
  const body = article.lines.join('\n').trim();
  if (!body) continue;
  const slug = slugify(article.title);
  const keywords = [...new Set(`${article.title} Avcılık ${article.subCategory}`.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 2))];
  const frontmatter = {
    title: article.title,
    description: descriptionFor(article.title, body),
    mainCategory: 'Avcılık',
    subCategory: article.subCategory,
    slug,
    tags: keywords,
    keywords,
    publishedAt: '2026-10-03',
    updatedAt: '2026-10-03',
    author: 'Aydınlar Av Bayi',
    image: '/images/hunting-banner.jpg',
    imageAlt: 'Doğada avcılık ekipmanlarıyla outdoor kullanıcı',
    readingTime: Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 180)),
    officialNotice: officialNoticeFor(article.title, body),
    sources: sourcesFor(body)
  };
  await writeFile(new URL(`${slug}.md`, outputRoot), `---\n${Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body}\n`);
}

console.log(`Imported ${articles.length} firearms knowledge articles.`);
