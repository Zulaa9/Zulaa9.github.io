import { describe, expect, it } from 'vitest';
import { interpolateLive, live } from '../src/lib/live';

describe('datos en vivo', () => {
  it('sin red usa los datos de respaldo', () => {
    expect(live.source).toBe('fallback');
    expect(live.keyping.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('sustituye marcadores y deja los desconocidos', () => {
    const data = { source: 'api' as const, keyping: { version: '2.0.0', publishedAt: '2027-03-05T10:00:00Z', releases: 12, firstVersion: '1.0.0', commits: 1234, electron: '46', angular: '21', downloads: 66 } };
    expect(interpolateLive('v{{keyping.version}} ({{keyping.date}})', 'en', data)).toBe('v2.0.0 (March 2027)');
    expect(interpolateLive('v{{keyping.version}} ({{keyping.date}})', 'es', data)).toBe('v2.0.0 (marzo de 2027)');
    expect(interpolateLive('{{keyping.commits}} commits', 'en', data)).toBe('1,234 commits');
    expect(interpolateLive('{{otro.dato}}', 'en', data)).toBe('{{otro.dato}}');
    expect(interpolateLive('sin marcadores', 'es', data)).toBe('sin marcadores');
  });
});
