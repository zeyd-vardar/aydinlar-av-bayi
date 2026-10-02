import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';

const sourcePath = '/Users/zeydvardar/.codex/attachments/d166c59d-fe6c-4380-b334-a03df824ab31/Yapıştırılan metin.txt';
const outputRoot = new URL('../src/content/blog/', import.meta.url);
const input = await readFile(sourcePath, 'utf8');
const corpus = input.split('# 11. İÇERİK KORPUSU')[1].split('# 12. ANA SAYFADA BLOG TANITIMI')[0];

const categorySlugs = { 'BALIKÇILIK': 'balikcilik', 'AVCILIK': 'avcilik', 'KAMPÇILIK': 'kampcilik' };
const categoryNames = { 'BALIKÇILIK': 'Balıkçılık', 'AVCILIK': 'Avcılık', 'KAMPÇILIK': 'Kampçılık' };
const faqMap = {
  '10–30 gram kamış ne demek?': ['Balıkçılık','Olta Kamışları'],
  "3000'lik makine ne demek?": ['Balıkçılık','Olta Makineleri'],
  'Örgü ip mi misina mı?': ['Balıkçılık','Misina ve Örgü İp'],
  'Levrek için hangi yem kullanılır?': ['Balıkçılık','Balık Türleri'],
  'LRF ile at-çek arasındaki fark nedir?': ['Balıkçılık','Balıkçılık Yöntemleri'],
  'Çadır kaç mevsim olmalı?': ['Kampçılık','Çadır'],
  'Uyku tulumundaki derece ne anlama gelir?': ['Kampçılık','Uyku Tulumu'],
  'Kamp için hangi mat alınmalı?': ['Kampçılık','Kamp Matı'],
  'Dürbündeki 10x42 ne demek?': ['Avcılık','Dürbün'],
  'Yağmurda kamp yapılır mı?': ['Kampçılık','Hava Koşulları'],
  'Kışın kamp yapılır mı?': ['Kampçılık','Hava Koşulları']
};

const officialSources = {
  'Tarım ve Orman Bakanlığı': { institution:'Tarım ve Orman Bakanlığı', page:'Güncel resmî düzenlemeler', url:'https://www.tarimorman.gov.tr/' },
  'Doğa Koruma ve Milli Parklar Genel Müdürlüğü': { institution:'Doğa Koruma ve Milli Parklar Genel Müdürlüğü', page:'Güncel avcılık duyuruları ve düzenlemeleri', url:'https://www.tarimorman.gov.tr/DKMP' },
  'AVBİS': { institution:'AVBİS', page:'Avcılık işlemleri ve avlak bilgileri', url:'https://avbis.tarimorman.gov.tr/' },
  'Orman Genel Müdürlüğü': { institution:'Orman Genel Müdürlüğü', page:'Güncel orman duyuruları', url:'https://www.ogm.gov.tr/' },
  'Meteoroloji Genel Müdürlüğü': { institution:'Meteoroloji Genel Müdürlüğü', page:'Güncel tahmin ve meteorolojik uyarılar', url:'https://www.mgm.gov.tr/' },
  'Sağlık Bakanlığı': { institution:'Sağlık Bakanlığı', page:'Güncel sağlık bilgilendirmeleri', url:'https://www.saglik.gov.tr/' }
};

const slugify = (value) => value.toLocaleLowerCase('tr-TR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const clean = (value) => value.replace(/\*\*/g,'').replace(/[`#]/g,'').trim();
const descriptionFor = (title, body) => {
  const paragraph = body.split(/\n\s*\n/).map(clean).find((part) => part.length > 20 && !part.startsWith('- ') && !part.endsWith(':')) ?? title;
  return paragraph.length <= 175 ? paragraph : `${paragraph.slice(0,172).trimEnd()}…`;
};
const keywordsFor = (title, mainCategory, subCategory) => [...new Set(`${title} ${mainCategory} ${subCategory}`.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9 ]/g,' ').split(/\s+/).filter((word) => word.length > 2))];
const sourcesFor = (title, body, mainCategory) => {
  const haystack = `${title} ${body}`;
  const names = [];
  if (mainCategory === 'Balıkçılık' && /asgari boy|miktar sınır|yasak dönem|yasak alan|güncel amatör su ürünleri|güncel düzenleme|güncel resmî/i.test(haystack)) names.push('Tarım ve Orman Bakanlığı');
  if (mainCategory === 'Avcılık' && /avlanma dönem|avına izin|korunan tür|Merkez Av Komisyonu|avcılık mevzuatı|güncel resmî/i.test(haystack)) names.push('Doğa Koruma ve Milli Parklar Genel Müdürlüğü');
  if (/AVBİS/i.test(haystack)) names.push('AVBİS');
  if (/kamp ateşi|ateş yakma yasa|ormana giriş yasa/i.test(haystack)) names.push('Orman Genel Müdürlüğü');
  if (/meteoroloji|hava durumu|fırtına|rüzgâr|yıldırım|sisli hava/i.test(haystack)) names.push('Meteoroloji Genel Müdürlüğü');
  if (/112|sağlık kuruluş|kene|yılan ısır|ilk yardım|sıcak çarpması/i.test(haystack)) names.push('Sağlık Bakanlığı');
  return [...new Set(names)].map((name) => officialSources[name]);
};
const imageFor = (mainCategory) => mainCategory === 'Balıkçılık' ? '/images/hero-fishing.jpg' : mainCategory === 'Avcılık' ? '/images/hunting-banner.jpg' : '/images/category-atlas.jpg';
const imageAltFor = (mainCategory) => mainCategory === 'Balıkçılık' ? 'Kıyıda balıkçılık görünümü' : mainCategory === 'Avcılık' ? 'Doğada dürbünle gözlem yapan outdoor kullanıcısı' : 'Dağlık alanda kamp görünümü';

const articles = [];
let mainKey = '';
let subCategory = '';
let current = null;
for (const rawLine of corpus.split('\n')) {
  const line = rawLine.trimEnd();
  const exact = line.trim();
  if (categorySlugs[exact]) {
    if (current) articles.push(current);
    current = null; mainKey = exact; subCategory = '';
    continue;
  }
  if (exact.startsWith('# ') && !exact.startsWith('## ')) {
    if (current) articles.push(current);
    current = null; subCategory = exact.slice(2).trim();
    continue;
  }
  if (exact.startsWith('## ')) {
    if (current) articles.push(current);
    current = { title: exact.slice(3).trim(), mainCategory: categoryNames[mainKey], mainSlug: categorySlugs[mainKey], subCategory, lines: [] };
    continue;
  }
  if (current && exact !== '---' && !/^[-]{10,}$/.test(exact)) current.lines.push(line);
}
if (current) articles.push(current);

await rm(outputRoot, { recursive:true, force:true });
const usedPaths = new Set();
for (const article of articles) {
  let { mainCategory, mainSlug, subCategory } = article;
  if (faqMap[article.title]) {
    [mainCategory, subCategory] = faqMap[article.title];
    mainSlug = slugify(mainCategory);
  }
  const body = article.lines.join('\n').trim();
  if (!body || !mainCategory || !subCategory) continue;
  let slug = slugify(article.title);
  let relative = `${mainSlug}/${slug}.md`;
  if (usedPaths.has(relative)) { slug = `${slug}-bilgi`; relative = `${mainSlug}/${slug}.md`; }
  usedPaths.add(relative);
  const sources = sourcesFor(article.title, body, mainCategory);
  const officialNotice = /av sezon|avlanma gün|günlük av limit|asgari boy|boy sınır|miktar sınır|yasak dönem|korunan tür|belge ücret|yasak avlak|kamp ateşi|ormana giriş yasa|avlanma dönem|avına izin|avcılık mevzuatı|güncel resmî düzenleme/i.test(`${article.title} ${body}`);
  const words = body.split(/\s+/).filter(Boolean).length;
  const frontmatter = {
    title: article.title,
    description: descriptionFor(article.title, body),
    mainCategory,
    subCategory,
    slug,
    tags: keywordsFor(article.title, mainCategory, subCategory),
    keywords: keywordsFor(article.title, mainCategory, subCategory),
    publishedAt: '2026-10-02',
    updatedAt: '2026-10-02',
    author: 'Aydınlar Av Bayi',
    image: imageFor(mainCategory),
    imageAlt: imageAltFor(mainCategory),
    readingTime: Math.max(1, Math.ceil(words / 180)),
    officialNotice,
    sources
  };
  const dir = new URL(`${mainSlug}/`, outputRoot);
  await mkdir(dir, { recursive:true });
  await writeFile(new URL(`${mainSlug}/${slug}.md`, outputRoot), `---\n${Object.entries(frontmatter).map(([key,value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body}\n`);
}

console.log(`Imported ${usedPaths.size} knowledge articles.`);
