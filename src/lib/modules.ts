import { getCollection, type CollectionEntry } from 'astro:content';
import { crossValidate } from './schema';
import { localePath, tr, type Locale } from './i18n';

export type ModuleEntry = CollectionEntry<'modules'>;

let cache: Promise<ModuleEntry[]> | null = null;

/** Todos los módulos (visibles y ocultos), ordenados. Falla el build si hay incoherencias. */
export function getAllModules(): Promise<ModuleEntry[]> {
  cache ??= (async () => {
    const entries = await getCollection('modules');
    const errors = crossValidate(entries);
    if (errors.length) {
      throw new Error(`Contenido de módulos no válido:\n  - ${errors.join('\n  - ')}`);
    }
    return entries.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
  })();
  if (import.meta.env.DEV) {
    const p = cache;
    cache = null; // en desarrollo se relee siempre (el panel edita en caliente)
    return p;
  }
  return cache;
}

export async function getVisibleModules(): Promise<ModuleEntry[]> {
  return (await getAllModules()).filter((m) => m.data.visible);
}

export function moduleHref(m: ModuleEntry, lang: Locale): string {
  return localePath(lang, m.data.path);
}

export interface Crumb {
  label: string;
  href?: string;
  /** id del módulo (para el parámetro ?from) o '' para el Core */
  id: string;
}

export function breadcrumbs(m: ModuleEntry, all: ModuleEntry[], lang: Locale, coreLabel: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: coreLabel, href: localePath(lang), id: '' }];
  const parent = m.data.parent ? all.find((x) => x.id === m.data.parent) : undefined;
  if (parent) crumbs.push({ label: tr(parent.data.crumb, lang), href: moduleHref(parent, lang), id: parent.id });
  crumbs.push({ label: tr(m.data.crumb, lang), id: m.id });
  return crumbs;
}

export { layoutNodes, AUTO_SLOTS } from './layout';
