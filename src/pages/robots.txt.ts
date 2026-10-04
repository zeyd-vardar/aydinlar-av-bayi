import type { APIRoute } from 'astro';
import { siteConfig } from '../data/siteConfig.js';

export const prerender = true;

export const GET: APIRoute = () => {
  const sitemapUrl = new URL('sitemap-index.xml', siteConfig.url).href;
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
