import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    mainCategory: z.enum(['Balıkçılık', 'Avcılık', 'Kampçılık']),
    subCategory: z.string(),
    slug: z.string(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    author: z.string().default('Aydınlar Av Bayi'),
    image: z.string(),
    imageAlt: z.string(),
    readingTime: z.number().int().positive(),
    officialNotice: z.boolean().default(false),
    sources: z.array(z.object({
      institution: z.string(),
      page: z.string(),
      url: z.string().url()
    })).default([])
  })
});

export const collections = { blog };
