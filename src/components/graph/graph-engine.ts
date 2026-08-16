import type { GraphNodeData, ResolvedNode } from "./types";

const AUTO_LAYOUT_RADIUS = 0.16; // 0..1 of stage size, relative to parent

/**
 * Resolves a 0..1 normalized position for every node.
 *
 * Two-pass on purpose, not a general topological sort: today every "auto"
 * node's parent is always a "fixed" node, so resolving all fixed positions
 * first and then placing auto nodes around their (already resolved) parent
 * is enough. A future third level of auto-inside-auto nodes would need a
 * proper dependency order instead of two passes.
 */
export function resolveLayout(nodes: GraphNodeData[]): Map<string, ResolvedNode> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resolved = new Map<string, ResolvedNode>();

  // Pass 1 — fixed nodes read their own curated position.
  for (const node of nodes) {
    if (node.layout.mode === "fixed" && node.layout.position) {
      resolved.set(node.id, { ...node, resolvedPosition: node.layout.position });
    }
  }

  // Pass 2 — auto nodes distribute radially around their resolved parent.
  const autoNodes = nodes.filter((n) => n.layout.mode === "auto");
  const byParent = new Map<string, GraphNodeData[]>();
  for (const node of autoNodes) {
    if (!node.parentId) continue;
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  for (const [parentId, siblings] of byParent) {
    const parent = resolved.get(parentId);
    if (!parent) continue; // parent itself unresolved (deeper auto chain) — not supported yet

    siblings.forEach((node, index) => {
      const angleDeg = node.layout.angleHint ?? (index / siblings.length) * 360;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = parent.resolvedPosition.x + Math.cos(angleRad) * AUTO_LAYOUT_RADIUS;
      const y = parent.resolvedPosition.y + Math.sin(angleRad) * AUTO_LAYOUT_RADIUS;
      resolved.set(node.id, {
        ...node,
        resolvedPosition: { x: clamp01(x), y: clamp01(y) },
      });
    });
  }

  // Anything left over (shouldn't happen with today's data) — fall back to center.
  for (const node of nodes) {
    if (!resolved.has(node.id)) {
      resolved.set(node.id, { ...node, resolvedPosition: { x: 0.5, y: 0.5 } });
    }
  }

  return resolved;
}

export function childrenOf(nodes: GraphNodeData[], parentId: string): GraphNodeData[] {
  return nodes.filter((n) => n.parentId === parentId);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
