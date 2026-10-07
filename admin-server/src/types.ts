export type ProductSection = 'recommended' | 'new';

export interface Administrator {
  id: number;
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
}

export interface AuthenticatedSession {
  id: string;
  administrator: Administrator;
  absoluteExpiresAt: Date;
}

export interface Product {
  id: string;
  section: ProductSection;
  name: string;
  category: string;
  imageKey: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  features: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BrandCategory = 'balikcilik' | 'avcilik' | 'kampcilik';

export interface Brand {
  id: string;
  category: BrandCategory;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface StoreSettings {
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

export type BlogCategory = 'Balıkçılık' | 'Avcılık' | 'Kampçılık';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  mainCategory: BlogCategory;
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
  publishedAt: Date;
  updatedAt: Date;
}

export interface AuditContext {
  administratorId: number | null;
  ipHash: string | null;
  userAgent: string | null;
}
