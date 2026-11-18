import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** URL optimizada para usar como fondo CSS (las tarjetas usan background-image). */
export async function coverUrl(src: ImageMetadata, fit: 'logo' | 'cover'): Promise<string> {
  const width = fit === 'logo' ? Math.min(320, src.width) : Math.min(1280, src.width);
  const img = await getImage({ src, width, format: 'webp', quality: fit === 'logo' ? 90 : 80 });
  return img.src;
}
