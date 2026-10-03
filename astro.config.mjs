import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL ?? 'https://aydinlar-av-bayi.probaly61.chatgpt.site';
const base = process.env.PUBLIC_BASE_PATH;

export default defineConfig({
  site,
  base,
  output: 'static',
  outDir: './dist/client',
  redirects: {
    '/galeri': '/magazamiz',
  },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
