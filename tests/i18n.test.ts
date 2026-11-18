import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import es from '../src/i18n/es.json';
import { fillTemplate, localePath, tr, ui, withFallback } from '../src/lib/i18n';

function keys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('textos de interfaz', () => {
  it('español tiene las mismas claves que inglés', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it('ui() devuelve los textos del idioma pedido', () => {
    expect(ui('es').site.statusOnline).toBe('NÚCLEO DEL SISTEMA ONLINE');
    expect(ui('en').site.statusOnline).toBe('SYSTEM CORE ONLINE');
  });

  it('una clave ausente o vacía usa el inglés', () => {
    const merged = withFallback({ a: 'A', b: { c: 'C', d: 'D' }, list: ['x'] }, { a: '', b: { c: 'CC' }, list: [] });
    expect(merged).toEqual({ a: 'A', b: { c: 'CC', d: 'D' }, list: ['x'] });
  });

  it('tr() usa el inglés si falta el español', () => {
    expect(tr({ en: 'Hello', es: '' }, 'es')).toBe('Hello');
    expect(tr({ en: 'Hello', es: '  ' }, 'es')).toBe('Hello');
    expect(tr({ en: 'Hello', es: 'Hola' }, 'es')).toBe('Hola');
    expect(tr(undefined, 'es')).toBe('');
  });

  it('rutas por idioma: inglés sin prefijo, español con /es/', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('es')).toBe('/es/');
    expect(localePath('en', 'projects/keyping')).toBe('/projects/keyping/');
    expect(localePath('es', '/about/')).toBe('/es/about/');
  });

  it('plantillas con parámetros', () => {
    expect(fillTemplate(ui('es').core.status.loading, { progress: 50 })).toBe('CARGANDO NÚCLEO DEL SISTEMA 50%');
  });
});
