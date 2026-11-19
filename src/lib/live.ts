/**
 * Datos "en vivo" de los proyectos, leídos de la API pública de GitHub SOLO al compilar.
 * El navegador nunca hace estas peticiones: el sitio publicado sigue sin terceros.
 *
 * Los textos de los módulos pueden usar marcadores {{keyping.version}}, {{keyping.date}}, etc.
 * Cuando sale una versión nueva, el deploy hook de Cloudflare recompila el sitio y los
 * marcadores toman el valor nuevo. Si la API falla, se usa src/data/live-fallback.json.
 */
import fallback from '../data/live-fallback.json';

type KeyPingLive = {
  version: string;
  publishedAt: string;
  releases: number;
  firstVersion: string;
  commits: number;
  electron: string;
  angular: string;
  /** Descargas de instaladores (.exe y .AppImage) de todas las versiones publicadas. */
  downloads: number;
};
export type LiveData = { keyping: KeyPingLive; source: 'api' | 'fallback' };

const REPO = 'Zulaa9/KeyPing';
const TIMEOUT_MS = 10_000;

async function get(url: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'zula-portfolio-build' };
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Número total de elementos de un listado paginado de GitHub pidiendo 1 por página. */
async function countPaged(url: string): Promise<number> {
  const res = await get(url);
  const last = res.headers.get('link')?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (last) return Number(last[1]);
  return ((await res.json()) as unknown[]).length;
}

/**
 * Solo cuentan los instaladores: .blockmap, latest*.yml y SHA256SUMS los piden el
 * autoactualizador o quien verifica, y no son descargas de la app. Una actualización
 * automática sí descarga el instalador, así que esto cuenta descargas, no personas.
 */
export function countInstallerDownloads(releases: { assets?: { name: string; download_count: number }[] }[]): number {
  return releases.flatMap((r) => r.assets ?? []).filter((a) => /\.(exe|AppImage)$/.test(a.name)).reduce((sum, a) => sum + a.download_count, 0);
}

const major = (range: string | undefined) => range?.match(/(\d+)/)?.[1] ?? '';

async function loadKeyPing(): Promise<KeyPingLive> {
  const api = `https://api.github.com/repos/${REPO}`;
  const [latest, releases, commits, pkg] = await Promise.all([
    get(`${api}/releases/latest`).then((r) => r.json() as Promise<{ tag_name: string; published_at: string }>),
    get(`${api}/releases?per_page=100`).then(
      (r) => r.json() as Promise<{ tag_name: string; draft: boolean; prerelease: boolean; assets: { name: string; download_count: number }[] }[]>,
    ),
    countPaged(`${api}/commits?sha=main&per_page=1`),
    get(`https://raw.githubusercontent.com/${REPO}/main/keyping-ui/package.json`).then(
      (r) => r.json() as Promise<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>,
    ),
  ]);
  const published = releases.filter((r) => !r.draft && !r.prerelease);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const data: KeyPingLive = {
    version: latest.tag_name.replace(/^v/, ''),
    publishedAt: latest.published_at,
    releases: published.length,
    firstVersion: (published.at(-1)?.tag_name ?? 'v1.0.0').replace(/^v/, ''),
    commits,
    electron: major(deps.electron),
    angular: major(deps['@angular/core']),
    downloads: countInstallerDownloads(published),
  };
  if (!data.version || !data.releases || !data.electron || !data.angular) throw new Error('datos incompletos');
  return data;
}

async function load(): Promise<LiveData> {
  if (process.env.LIVE_DATA_OFFLINE === '1') return { ...fallback, source: 'fallback' };
  try {
    const keyping = await loadKeyPing();
    console.info(`[live] KeyPing v${keyping.version}, ${keyping.releases} versiones, ${keyping.commits} commits, ${keyping.downloads} descargas (API de GitHub)`);
    return { keyping, source: 'api' };
  } catch (err) {
    console.warn(`[live] no se pudo consultar GitHub (${(err as Error).message}); se usan los datos de respaldo`);
    return { ...fallback, source: 'fallback' };
  }
}

export const live: LiveData = await load();

const MONTHS: Record<'en' | 'es', string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

function values(lang: 'en' | 'es', data: LiveData = live): Record<string, string> {
  const k = data.keyping;
  const d = new Date(k.publishedAt);
  const ok = !Number.isNaN(d.getTime());
  const month = ok ? MONTHS[lang][d.getUTCMonth()] : '';
  const nf = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US');
  return {
    'keyping.version': k.version,
    'keyping.date': ok ? (lang === 'es' ? `${month} de ${d.getUTCFullYear()}` : `${month} ${d.getUTCFullYear()}`) : '',
    'keyping.releases': nf.format(k.releases),
    'keyping.firstVersion': k.firstVersion,
    'keyping.commits': nf.format(k.commits),
    'keyping.electron': k.electron,
    'keyping.angular': k.angular,
    'keyping.downloads': nf.format(k.downloads),
  };
}

/** Sustituye los marcadores {{proyecto.dato}}. Un marcador desconocido se deja tal cual. */
export function interpolateLive(text: string, lang: 'en' | 'es', data?: LiveData): string {
  if (!text.includes('{{')) return text;
  const v = values(lang, data);
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (all, key: string) => v[key] ?? all);
}
