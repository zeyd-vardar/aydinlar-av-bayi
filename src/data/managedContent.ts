export interface ManagedStoreSettings {
  phone: string;
  whatsapp: string;
  address: string;
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressRegion: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  hours: Array<{ days: string; time: string }>;
  openingTime: string;
  closingTime: string;
}

export interface ManagedBrand {
  id: string;
  category: 'balikcilik' | 'avcilik' | 'kampcilik';
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ManagedBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  mainCategory: 'Balıkçılık' | 'Avcılık' | 'Kampçılık';
  subCategory: string;
  content: string;
  tags: string[];
  keywords: string[];
  image: string;
  imageAlt: string;
  readingTime: number;
  isPublished: boolean;
  isDeleted: boolean;
  officialNotice: boolean;
  sources: Array<{ institution: string; page: string; url: string }>;
  publishedAt: string;
  updatedAt: string;
}

export interface ManagedContent {
  siteSettings: ManagedStoreSettings;
  brands: ManagedBrand[];
  blogPosts: ManagedBlogPost[];
}

let request: Promise<ManagedContent | null> | undefined;

export function getManagedContent(): Promise<ManagedContent | null> {
  const endpoint = import.meta.env.PUBLIC_CONTENT_API_URL?.trim();
  if (!endpoint) return Promise.resolve(null);
  request ??= fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Content API returned ${response.status}`);
      return response.json() as Promise<ManagedContent>;
    })
    .catch((error) => {
      console.warn('Yönetilen içerik alınamadı; yerel içerik kullanılacak.', error);
      return null;
    });
  return request;
}
