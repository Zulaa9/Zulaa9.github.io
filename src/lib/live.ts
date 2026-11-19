/**
 * Datos "en vivo" de los proyectos, leídos de fuentes públicas SOLO al compilar.
 * El navegador nunca hace estas peticiones: el sitio publicado sigue sin terceros.
 *
 * Framewise: usuarios de la ficha de Chrome Web Store (HTML) y de Edge Add-ons (JSON).
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
/** Usuarios de Framewise según cada tienda (cifra pública de su ficha). */
type FramewiseLive = { chrome: number; edge: number; users: number };
export type LiveSource = 'api' | 'fallback';
export type LiveProject = 'keyping' | 'framewise';
export type LiveData = {
  keyping: KeyPingLive;
  framewise: FramewiseLive;
  /** De dónde salió cada proyecto: de su fuente en este build o del respaldo. */
  sources: Record<LiveProject, LiveSource>;
  /** Fecha (AAAA-MM-DD) de los datos de respaldo: se muestra cuando se usan. */
  fallbackAsOf: string;
};

const REPO = 'Zulaa9/KeyPing';
const TIMEOUT_MS = 10_000;

async function get(url: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept, 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; zula-portfolio-build)' };
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

const FRAMEWISE = { chrome: 'mkpljcojmhhmkpamcdecnmjbndbabfae', edge: 'ppfmagbmfpeldadpbhbknlffhfnnhgee' };

/** Lee «N users» del HTML de la ficha de Chrome Web Store (no hay API pública). */
export function parseChromeUsers(html: string): number | null {
  const m = html.match(/>\s*([\d,]+)\s+users?\s*</) ?? html.match(/\b([\d,]+)\s+users?\b/);
  return m ? Number(m[1]!.replace(/,/g, '')) : null;
}

async function loadFramewise(): Promise<FramewiseLive> {
  const [html, edgeJson] = await Promise.all([
    get(`https://chromewebstore.google.com/detail/${FRAMEWISE.chrome}?hl=en`, 'text/html').then((r) => r.text()),
    get(`https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${FRAMEWISE.edge}`, 'application/json').then(
      (r) => r.json() as Promise<{ activeInstallCount?: unknown }>,
    ),
  ]);
  const chrome = parseChromeUsers(html);
  const edge = edgeJson.activeInstallCount;
  if (chrome === null || !Number.isInteger(chrome)) throw new Error('Chrome Web Store: no aparece la cifra de usuarios');
  if (typeof edge !== 'number' || !Number.isInteger(edge)) throw new Error('Edge Add-ons: no aparece activeInstallCount');
  return { chrome, edge, users: chrome + edge };
}

async function attempt<T>(name: string, fn: () => Promise<T>, backup: T, describe: (x: T) => string): Promise<[T, LiveSource]> {
  try {
    const x = await fn();
    console.info(`[live] ${name}: ${describe(x)}`);
    return [x, 'api'];
  } catch (err) {
    console.warn(`[live] ${name}: no se pudo consultar (${(err as Error).message}); se usan los datos de respaldo del ${fallback.asOf}`);
    return [backup, 'fallback'];
  }
}

async function load(): Promise<LiveData> {
  const base = { keyping: fallback.keyping, framewise: fallback.framewise, fallbackAsOf: fallback.asOf };
  if (process.env.LIVE_DATA_OFFLINE === '1') return { ...base, sources: { keyping: 'fallback', framewise: 'fallback' } };
  const [[keyping, k], [framewise, f]] = await Promise.all([
    attempt('KeyPing (GitHub)', loadKeyPing, fallback.keyping, (x) => `v${x.version}, ${x.releases} versiones, ${x.commits} commits, ${x.downloads} descargas`),
    attempt('Framewise (tiendas)', loadFramewise, fallback.framewise, (x) => `${x.users} usuarios (Chrome ${x.chrome} + Edge ${x.edge})`),
  ]);
  return { ...base, keyping, framewise, sources: { keyping: k, framewise: f } };
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
    'framewise.users': nf.format(data.framewise.users),
    'framewise.chrome': nf.format(data.framewise.chrome),
    'framewise.edge': nf.format(data.framewise.edge),
  };
}

/** Sustituye los marcadores {{proyecto.dato}}. Un marcador desconocido se deja tal cual. */
export function interpolateLive(text: string, lang: 'en' | 'es', data?: LiveData): string {
  if (!text.includes('{{')) return text;
  const v = values(lang, data);
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (all, key: string) => v[key] ?? all);
}
