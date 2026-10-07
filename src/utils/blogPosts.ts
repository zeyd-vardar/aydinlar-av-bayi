import { getCollection, type CollectionEntry } from 'astro:content';
import { getManagedContent, type ManagedBlogPost } from '../data/managedContent';

export type BlogData = CollectionEntry<'blog'>['data'];

export type UnifiedBlogPost =
  | { kind: 'local'; id: string; data: BlogData; entry: CollectionEntry<'blog'> }
  | { kind: 'managed'; id: string; data: BlogData; content: string };

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeManaged(post: ManagedBlogPost): UnifiedBlogPost {
  return {
    kind: 'managed',
    id: post.id,
    content: post.content,
    data: {
      title: post.title,
      description: post.description,
      mainCategory: post.mainCategory,
      subCategory: post.subCategory,
      slug: post.slug,
      tags: post.tags,
      keywords: post.keywords,
      publishedAt: validDate(post.publishedAt),
      updatedAt: validDate(post.updatedAt),
      author: 'Aydınlar Av Bayii',
      image: post.image,
      imageAlt: post.imageAlt,
      readingTime: post.readingTime,
      draft: !post.isPublished,
      officialNotice: post.officialNotice,
      sources: post.sources,
    },
  };
}

export async function getAllBlogPosts(): Promise<UnifiedBlogPost[]> {
  const [localPosts, managedContent] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getManagedContent(),
  ]);
  const allManagedPosts = managedContent?.blogPosts ?? [];
  const managedPosts = allManagedPosts
    .filter((post) => post.isPublished && !post.isDeleted)
    .map(normalizeManaged);
  const managedKeys = new Set(allManagedPosts.map((post) => `${post.mainCategory}:${post.slug}`));
  const local = localPosts
    .filter((post) => !managedKeys.has(`${post.data.mainCategory}:${post.data.slug}`))
    .map((entry) => ({ kind: 'local' as const, id: entry.id, data: entry.data, entry }));
  return [...local, ...managedPosts];
}
