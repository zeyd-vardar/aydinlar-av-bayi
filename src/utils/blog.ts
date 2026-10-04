const TURKISH_LOCALE = 'tr-TR';

export function slugifyTurkish(value: string) {
  return value
    .toLocaleLowerCase(TURKISH_LOCALE)
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getBlogPostPath(mainCategory: string, postSlug: string) {
  return `/blog/${slugifyTurkish(mainCategory)}/${postSlug}`;
}

export function formatTurkishDate(date: Date) {
  return date.toLocaleDateString(TURKISH_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
