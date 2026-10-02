import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://aydinlar-av-bayi.probaly61.chatgpt.site',
  output: 'static',
  outDir: './dist/client',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] }
});
