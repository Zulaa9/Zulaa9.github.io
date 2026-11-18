import { describe, expect, it } from 'vitest';
import { layoutNodes } from '../src/lib/layout';
import { MAX_CORE_NODES } from '../src/lib/schema';
import { readModules } from './helpers';

describe('disposición de nodos del Core', () => {
  const modules = readModules().filter((m) => m.data.visible);

  it('con los módulos actuales conserva exactamente las posiciones anteriores', () => {
    const pos = layoutNodes(modules.map((m) => ({ id: m.id, position: m.data.node.position, parent: m.data.parent })));
    expect(Object.fromEntries(pos)).toEqual({
      about: { x: 0.22, y: 0.24 },
      capabilities: { x: 0.2, y: 0.45 },
      contact: { x: 0.31, y: 0.64 },
      projects: { x: 0.78, y: 0.28 },
      keyping: { x: 0.74, y: 0.48 },
      'portfolio-core': { x: 0.86, y: 0.66 },
    });
  });

  it('coloca módulos nuevos sin posición en huecos libres y separados', () => {
    const input = modules.map((m) => ({ id: m.id, position: m.data.node.position, parent: m.data.parent }));
    input.push({ id: 'nuevo-1', position: undefined, parent: 'projects' }, { id: 'nuevo-2', position: undefined, parent: undefined });
    const pos = [...layoutNodes(input).values()];
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const d = Math.hypot((pos[i]!.x - pos[j]!.x) * 1.6, pos[i]!.y - pos[j]!.y);
        expect(d).toBeGreaterThan(0.14);
      }
    }
  });

  it(`hasta ${MAX_CORE_NODES} nodos sin posición manual quedan todos separados`, () => {
    const input = Array.from({ length: MAX_CORE_NODES }, (_, i) => ({ id: `n${i}` }));
    const pos = [...layoutNodes(input).values()];
    expect(new Set(pos.map((p) => `${p.x},${p.y}`)).size).toBe(MAX_CORE_NODES);
  });

  it(`más de ${MAX_CORE_NODES} nodos es un error`, () => {
    expect(() => layoutNodes(Array.from({ length: MAX_CORE_NODES + 1 }, (_, i) => ({ id: `n${i}` })))).toThrow();
  });
});
