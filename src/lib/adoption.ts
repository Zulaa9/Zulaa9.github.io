/**
 * Bloque «Adopción» de los proyectos. Reglas (ver README, «Métricas de adopción»):
 * número + unidad explícita (usuarios o descargas, nunca mezcladas) + fuente + fecha.
 * Sin número verificable no hay bloque.
 */
import type { Locale } from './schema';
import { interpolateLive, live, type LiveData, type LiveProject } from './live';
import { ui } from './i18n';

export type AdoptionInput = {
  value: string;
  unit: 'users' | 'downloads';
  source: { en: string; es?: string };
  asOf?: string;
  minimum?: number;
};

/** origin: api = leído en este build; fallback = datos de respaldo (con su fecha); manual = valor escrito a mano. */
export type Adoption = { label: string; amount: string; source: string; date: string; origin: 'api' | 'fallback' | 'manual' };

const formatDate = (d: Date, lang: Locale) =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);

export function resolveAdoption(a: AdoptionInput | undefined, lang: Locale, opts: { now?: Date; data?: LiveData } = {}): Adoption | null {
  if (!a) return null;
  const data = opts.data ?? live;
  const project = a.value.match(/\{\{\s*(\w+)\./)?.[1] as LiveProject | undefined;
  // Valor automático: fecha del build, o la de los datos de respaldo si la fuente falló.
  const origin = !project ? 'manual' : (data.sources[project] ?? 'fallback');
  const raw = interpolateLive(a.value, lang, data).replace(/[\s.,]/g, '');
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < (a.minimum ?? 0)) return null;
  const t = ui(lang).projects.adoption;
  const unit = a.unit === 'users' ? (n === 1 ? t.user : t.users) : n === 1 ? t.download : t.downloads;
  const day = origin === 'manual' ? a.asOf : origin === 'fallback' ? data.fallbackAsOf : undefined;
  const date = day ? new Date(`${day}T00:00:00Z`) : (opts.now ?? new Date());
  const source = interpolateLive((lang === 'es' && a.source.es?.trim()) || a.source.en, lang, data);
  return {
    label: t.label,
    amount: `${new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US').format(n)} ${unit}`,
    source: `${t.source}: ${source}`,
    date: formatDate(date, lang),
    origin,
  };
}
