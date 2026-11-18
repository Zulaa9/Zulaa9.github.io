/**
 * Textos de interfaz (no de módulos) e utilidades de idioma.
 * Fuente única por idioma: src/i18n/<lang>.json. Si falta una clave en un idioma
 * se usa la inglesa.
 */
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import { DEFAULT_LOCALE, LOCALES, type Locale, type Localized } from './schema';

export { DEFAULT_LOCALE, LOCALES, type Locale };

export type UiStrings = typeof en;
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const dictionaries: Record<Locale, unknown> = { en, es };

/** Mezcla profunda: lo que falte (o esté vacío) en `primary` se toma de `fallback`. */
export function withFallback<T>(fallback: T, primary: unknown): T {
  if (Array.isArray(fallback)) {
    return (Array.isArray(primary) && primary.length ? primary : fallback) as T;
  }
  if (fallback && typeof fallback === 'object') {
    const out: Record<string, unknown> = {};
    const p = (primary && typeof primary === 'object' ? primary : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(fallback as Record<string, Json>)) out[k] = withFallback(v, p[k]);
    return out as T;
  }
  if (typeof primary === typeof fallback && !(typeof primary === 'string' && !primary.trim())) return primary as T;
  return fallback;
}

export function ui(lang: Locale): UiStrings {
  return withFallback(dictionaries[DEFAULT_LOCALE] as UiStrings, dictionaries[lang]);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Texto de un campo traducido, con respaldo en inglés si el español está vacío. */
export function tr(value: Localized | undefined, lang: Locale): string {
  if (!value) return '';
  const v = value[lang];
  return v && v.trim() ? v : value.en;
}

/** Ruta pública de una página. `path` vacío = System Core. */
export function localePath(lang: Locale, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = lang === DEFAULT_LOCALE ? '' : `/${lang}`;
  return clean ? `${prefix}/${clean}/` : `${prefix}/`;
}

export function fillTemplate(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}
