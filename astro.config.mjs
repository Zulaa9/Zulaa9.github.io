// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import adminPanel from './admin/integration.ts';

export default defineConfig({
  site: 'https://zula.dev',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
      filter: (page) => !page.includes('/404'),
    }),
    // Panel de administración: solo existe en `astro dev`; nunca entra en el build.
    adminPanel(),
  ],
});
