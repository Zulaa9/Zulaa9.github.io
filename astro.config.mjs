// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Used only to build absolute URLs (canonical, hreflang, sitemap, OG) at
  // build time — does not deploy or touch DNS.
  site: "https://zula.dev",
  adapter: cloudflare({
    // Default routes every <Image>/getImage() through Cloudflare's runtime
    // Image Resizing service (a paid feature above the free plan) — for a
    // fully static site that should work on any host, images should be
    // optimized once at build time instead, into real static files.
    imageService: "compile",
  }),

  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: {
      // English (default) stays unprefixed at "/"; Spanish lives at "/es/…".
      // Real, indexable URLs per language — replaces the old "?lang=es" hack.
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      filter: (page) => !page.includes("/debug/"),
    }),
  ],
});