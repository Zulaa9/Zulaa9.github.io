import type { ImageMetadata } from 'astro';
import type { Locale } from './i18n';

type WithSrc = { src: ImageMetadata; srcEs?: ImageMetadata };

/** Imagen según el idioma: `srcEs` (captura de la interfaz en español) si existe, si no `src`. */
export const pick = <T extends WithSrc>(img: T, lang: Locale): T => (lang === 'es' && img.srcEs ? { ...img, src: img.srcEs } : img);

/** Aplica `pick` a cada imagen de una galería (imágenes sueltas y partes de compuestas). */
export function localizeMedia<T extends { type: string }>(items: T[], lang: Locale): T[] {
  return items.map((item) => {
    const it = item as T & Partial<WithSrc> & { parts?: WithSrc[] };
    if (it.type === 'image') return pick(it as T & WithSrc, lang);
    if (it.type === 'composite' && it.parts) return { ...it, parts: it.parts.map((x) => pick(x, lang)) };
    return item;
  });
}
