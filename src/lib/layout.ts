/** Disposición de los nodos del System Core (sin dependencias de Astro, se prueba con Vitest). */
import { MAX_CORE_NODES } from './schema';

/** Huecos para módulos sin posición manual, ordenados por preferencia. */
export const AUTO_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.22, y: 0.24 },
  { x: 0.78, y: 0.28 },
  { x: 0.2, y: 0.45 },
  { x: 0.74, y: 0.48 },
  { x: 0.31, y: 0.64 },
  { x: 0.86, y: 0.66 },
  { x: 0.4, y: 0.13 },
  { x: 0.6, y: 0.13 },
  { x: 0.1, y: 0.12 },
  { x: 0.9, y: 0.12 },
];

export interface LayoutInput {
  id: string;
  position?: { x: number; y: number };
  parent?: string;
}

/**
 * Posiciones de los nodos del Core. Respeta las posiciones manuales y coloca el
 * resto en el hueco libre más cercano a su padre (o en el primer hueco libre).
 */
export function layoutNodes(nodes: LayoutInput[]): Map<string, { x: number; y: number }> {
  if (nodes.length > MAX_CORE_NODES) throw new Error(`Máximo ${MAX_CORE_NODES} nodos en el Core.`);
  const result = new Map<string, { x: number; y: number }>();
  const used: Array<{ x: number; y: number }> = [];
  const free = (s: { x: number; y: number }) => used.every((u) => Math.hypot((u.x - s.x) * 1.6, u.y - s.y) > 0.14);

  for (const n of nodes) {
    if (n.position) {
      result.set(n.id, n.position);
      used.push(n.position);
    }
  }
  const pending = nodes.filter((n) => !n.position).sort((a, b) => Number(!!a.parent) - Number(!!b.parent));
  for (const n of pending) {
    const parentPos = n.parent ? result.get(n.parent)?.x : undefined;
    const candidates = AUTO_SLOTS.filter(free);
    const slot =
      parentPos === undefined
        ? candidates[0]
        : [...candidates].sort((a, b) => Number(a.x < 0.5 !== parentPos < 0.5) - Number(b.x < 0.5 !== parentPos < 0.5))[0];
    const pos = slot ?? { x: 0.5, y: 0.12 };
    result.set(n.id, pos);
    used.push(pos);
  }
  return result;
}
