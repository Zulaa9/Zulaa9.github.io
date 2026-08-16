/**
 * Chrome copy shared by every page (topbar, status chip).
 * Deliberately separate from page content: this is UI shell text, not
 * project/profile data — that will live in Content Collections (Fase 2).
 *
 * Real per-locale routes (astro.config.mjs `i18n`) replace the old
 * `?lang=es` query-param + client-side JSON fetch — no runtime translation
 * lookup needed, the right copy is baked in at build time per route.
 */

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const ui = {
  en: {
    "identity.role": "Systems-Oriented Software Engineer",
    "status.online": "SYSTEM CORE ONLINE",
  },
  es: {
    "identity.role": "Ingeniero de software orientado a sistemas",
    "status.online": "NÚCLEO DEL SISTEMA ONLINE",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function t(locale: string | undefined, key: keyof (typeof ui)["en"]): string {
  const resolved = (locale === "es" ? "es" : "en") as Locale;
  return ui[resolved][key];
}
