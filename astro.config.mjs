import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  // maxDuration 60s (Hobby's max without Fluid Compute) gives /api/edit room for the
  // 70B model's cold-start latency instead of the old 10s wall timing edits out.
  adapter: vercel({ maxDuration: 60 }),
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: 'https://ealenterprises.com',
});