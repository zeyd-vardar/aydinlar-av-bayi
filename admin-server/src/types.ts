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
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditContext {
  administratorId: number | null;
  ipHash: string | null;
  userAgent: string | null;
}
