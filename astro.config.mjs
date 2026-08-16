// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: {
      // English (default) stays unprefixed at "/"; Spanish lives at "/es/…".
      // Real, indexable URLs per language — replaces the old "?lang=es" hack.
      prefixDefaultLocale: false,
    },
  },
});