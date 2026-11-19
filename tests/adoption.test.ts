import { describe, expect, it } from 'vitest';
import { resolveAdoption } from '../src/lib/adoption';
import { countInstallerDownloads, type LiveData } from '../src/lib/live';

const api: LiveData = {
  source: 'api',
  keyping: { version: '1.3.1', publishedAt: '2026-11-19T03:31:14Z', releases: 9, firstVersion: '1.0.0', commits: 167, electron: '45', angular: '20', downloads: 1234 },
};
const now = new Date('2026-11-20T12:00:00Z');

describe('bloque Adopción', () => {
  it('valor automático: número, unidad, fuente y fecha del build', () => {
    const a = resolveAdoption({ value: '{{keyping.downloads}}', unit: 'downloads', source: { en: 'GitHub Releases' } }, 'es', { data: api, now });
    expect(a).toEqual({ label: 'Adopción', amount: '1234 descargas', source: 'Fuente: GitHub Releases', date: '20 nov 2026' });
    expect(resolveAdoption({ value: '{{keyping.downloads}}', unit: 'downloads', source: { en: 'GitHub Releases' } }, 'en', { data: api, now })?.amount).toBe('1,234 downloads');
  });

  it('valor manual: usa su fecha y la unidad en singular si es 1', () => {
    const a = resolveAdoption({ value: '1', unit: 'users', source: { en: 'Store', es: 'Tienda' }, asOf: '2026-11-19' }, 'es', { data: api, now });
    expect(a).toMatchObject({ amount: '1 usuario', source: 'Fuente: Tienda', date: '19 nov 2026' });
  });

  it('se oculta sin número, por debajo del mínimo o con datos de respaldo', () => {
    expect(resolveAdoption(undefined, 'en')).toBeNull();
    expect(resolveAdoption({ value: 'muchos', unit: 'users', source: { en: 'x' }, asOf: '2026-11-19' }, 'en', { data: api })).toBeNull();
    expect(resolveAdoption({ value: '{{otro.dato}}', unit: 'users', source: { en: 'x' } }, 'en', { data: api })).toBeNull();
    expect(resolveAdoption({ value: '40', unit: 'users', source: { en: 'x' }, asOf: '2026-11-19', minimum: 50 }, 'en', { data: api })).toBeNull();
    expect(resolveAdoption({ value: '{{keyping.downloads}}', unit: 'downloads', source: { en: 'x' } }, 'en', { data: { ...api, source: 'fallback' } })).toBeNull();
  });

  it('solo cuenta instaladores, no blockmap, yml ni SHA256SUMS', () => {
    const releases = [
      { assets: [{ name: 'KeyPing-Setup-1.3.1.exe', download_count: 4 }, { name: 'KeyPing-1.3.1.AppImage', download_count: 3 }, { name: 'KeyPing-Setup-1.3.1.exe.blockmap', download_count: 2 }, { name: 'latest.yml', download_count: 9 }, { name: 'SHA256SUMS.txt', download_count: 10 }] },
      { assets: [{ name: 'KeyPing-Setup-1.0.0.exe', download_count: 1 }] },
    ];
    expect(countInstallerDownloads(releases)).toBe(8);
  });
});
