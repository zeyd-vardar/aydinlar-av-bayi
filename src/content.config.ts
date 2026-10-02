import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['Balıkçılık', 'Avcılık', 'Kampçılık', 'Outdoor', 'Ekipman Rehberleri', 'Başlangıç Rehberleri']),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    author: z.string().default('Aydınlar Av Bayi'),
    image: z.string(),
    imageAlt: z.string(),
    featured: z.boolean().default(false),
    readingTime: z.number().int().positive(),
    related: z.array(z.string()).default([]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional()
  })
});

export const collections = { blog };
