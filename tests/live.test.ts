import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { countCodeLines, interpolateLive, live } from '../src/lib/live';

describe('datos en vivo', () => {
  it('sin red usa los datos de respaldo', () => {
    expect(live.sources).toEqual({ keyping: 'fallback', framewise: 'fallback' });
    expect(live.keyping.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('sustituye marcadores y deja los desconocidos', () => {
    const data = { sources: { keyping: 'api' as const, framewise: 'api' as const }, fallbackAsOf: '2026-11-19', framewise: { chrome: 1, edge: 1, users: 2 }, keyping: { version: '2.0.0', publishedAt: '2027-03-05T10:00:00Z', releases: 12, firstVersion: '1.0.0', commits: 1234, electron: '46', angular: '21', downloads: 66, lines: 19334 } };
    expect(interpolateLive('v{{keyping.version}} ({{keyping.date}})', 'en', data)).toBe('v2.0.0 (March 2027)');
    expect(interpolateLive('v{{keyping.version}} ({{keyping.date}})', 'es', data)).toBe('v2.0.0 (marzo de 2027)');
    expect(interpolateLive('{{keyping.commits}} commits', 'en', data)).toBe('1,234 commits');
    expect(interpolateLive('{{otro.dato}}', 'en', data)).toBe('{{otro.dato}}');
    expect(interpolateLive('sin marcadores', 'es', data)).toBe('sin marcadores');
  });
});

describe('líneas de código de KeyPing', () => {
  /** Tar mínimo (ustar) en memoria, comprimido como los de GitHub. */
  function tgz(files: Record<string, string>, pax?: { path: string; content: string }): Uint8Array {
    const blocks: Buffer[] = [];
    const header = (name: string, size: number, type: string) => {
      const h = Buffer.alloc(512);
      h.write(name, 0, 100);
      h.write(size.toString(8).padStart(11, '0') + '\0', 124);
      h.write(type, 156);
      h.write('ustar\0', 257);
      return h;
    };
    const add = (name: string, body: Buffer, type = '0') => {
      blocks.push(header(name, body.length, type), body, Buffer.alloc((512 - (body.length % 512)) % 512));
    };
    for (const [name, content] of Object.entries(files)) add(name, Buffer.from(content));
    if (pax) {
      const rec = ` path=${pax.path}\n`;
      const line = `${String(rec.length + String(rec.length).length)}${rec}`;
      add('PaxHeader', Buffer.from(line), 'x');
      add('cortado', Buffer.from(pax.content));
    }
    blocks.push(Buffer.alloc(1024));
    return new Uint8Array(gzipSync(Buffer.concat(blocks)));
  }

  it('cuenta .ts/.html/.css/.scss de keyping-ui y nada más', () => {
    const data = tgz(
      {
        'KeyPing-1.3.1/keyping-ui/src/a.ts': 'a\nb\nc\n',
        'KeyPing-1.3.1/keyping-ui/src/b.html': '<p>\n</p>',
        'KeyPing-1.3.1/keyping-ui/src/c.scss': 'x\n',
        'KeyPing-1.3.1/keyping-ui/node_modules/x/d.ts': '1\n2\n',
        'KeyPing-1.3.1/keyping-ui/README.md': 'no\n',
        'KeyPing-1.3.1/site/src/e.ts': 'no\n',
      },
      { path: 'KeyPing-1.3.1/keyping-ui/src/un/nombre/muy/largo/f.css', content: 'y\nz\n' },
    );
    expect(countCodeLines(data)).toBe(3 + 2 + 1 + 2);
  });
});
