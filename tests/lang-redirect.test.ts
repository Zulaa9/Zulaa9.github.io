import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const code = readFileSync(path.resolve(__dirname, '../src/scripts/lang-redirect.js'), 'utf8');

interface Env {
  pageLang: 'en' | 'es';
  stored?: string | null;
  navLang?: string;
  search?: string;
  ua?: string;
  storageThrows?: boolean;
}

/** Ejecuta el script de <head> en un entorno simulado y devuelve a dónde redirige. */
function run(env: Env) {
  const store = new Map<string, string>();
  if (env.stored) store.set('system_core_lang', env.stored);
  let replaced: string | null = null;
  const html = {
    lang: env.pageLang,
    getAttribute: (n: string) => (n === 'data-href-en' ? '/about/' : n === 'data-href-es' ? '/es/about/' : null),
  };
  const ctx = {
    document: { documentElement: html },
    navigator: { language: env.navLang ?? 'en-US', userAgent: env.ua ?? 'Mozilla/5.0' },
    localStorage: {
      getItem: (k: string) => {
        if (env.storageThrows) throw new Error('blocked');
        return store.get(k) ?? null;
      },
      setItem: (k: string, v: string) => {
        if (env.storageThrows) throw new Error('blocked');
        store.set(k, v);
      },
    },
    location: {
      search: env.search ?? '',
      hash: '',
      pathname: env.pageLang === 'es' ? '/es/about/' : '/about/',
      replace: (u: string) => (replaced = u),
    },
    history: { replaceState: () => undefined },
    URLSearchParams,
  };
  vm.runInNewContext(code, ctx);
  return { replaced, stored: store.get('system_core_lang') ?? null };
}

describe('idioma al entrar', () => {
  it('sin preferencia: respeta el idioma del navegador y lo guarda', () => {
    expect(run({ pageLang: 'en', navLang: 'es-ES' })).toEqual({ replaced: '/es/about/', stored: 'es' });
    expect(run({ pageLang: 'en', navLang: 'en-GB' })).toEqual({ replaced: null, stored: 'en' });
  });

  it('sin preferencia: un enlace directo a /es/ no se redirige aunque el navegador esté en inglés', () => {
    expect(run({ pageLang: 'es', navLang: 'en-US' })).toEqual({ replaced: null, stored: 'es' });
  });

  it('con preferencia guardada: lleva a la versión de ese idioma', () => {
    expect(run({ pageLang: 'es', stored: 'en', navLang: 'es-ES' }).replaced).toBe('/about/');
    expect(run({ pageLang: 'en', stored: 'es' }).replaced).toBe('/es/about/');
    expect(run({ pageLang: 'es', stored: 'es' }).replaced).toBeNull();
  });

  it('?lang= (enlaces antiguos) tiene prioridad y conserva el resto de parámetros', () => {
    expect(run({ pageLang: 'en', stored: 'en', search: '?lang=es&from=core' })).toEqual({ replaced: '/es/about/?from=core', stored: 'es' });
  });

  it('los buscadores no se redirigen', () => {
    expect(run({ pageLang: 'es', navLang: 'en-US', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }).replaced).toBeNull();
  });

  it('funciona aunque el almacenamiento esté bloqueado', () => {
    expect(run({ pageLang: 'en', navLang: 'es', storageThrows: true }).replaced).toBe('/es/about/');
  });
});
