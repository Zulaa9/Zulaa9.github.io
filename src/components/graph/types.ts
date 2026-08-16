/** Shape serialized into the page as JSON for the client script to read. */
export interface GraphNodeData {
  id: string;
  type: "core" | "branch" | "project";
  parentId: string | null;
  route?: string;
  label?: {
    title: string;
    meta?: string;
    dockCopy?: string;
  };
  // Forces extra visual weight in the force simulation (shorter link to its
  // parent, stronger charge) — never a hand-placed position.
  pinned: boolean;
  // Coarse left/right tendency for the top-level identity branches — see
  // content.config.ts. Undefined for everything else; those nodes inherit
  // a side tendency transitively through the link force to a biased parent.
  sideBias?: "left" | "right";
  order?: number;
  status?: "active" | "wip" | "planned" | "archived";
  relations: { targetId: string; kind: "related" | "powers" | "depends-on" }[];
}

/**
 * A node as the physics simulation sees it. Extends d3-force's own
 * SimulationNodeDatum shape (x/y/vx/vy, optional fx/fy to pin a node) —
 * this is exactly what gets passed into d3ForceSimulation(nodes).
 */
export interface SimNode extends GraphNodeData {
  depth: number; // distance from the core, in parent-links — drives link distance
  radius: number; // half-diagonal of the node's real rendered button, in px
  // The nearest ancestor's (or own) sideBias, resolved once at build time by
  // walking parentId — lets "About"/"Projects" hand their left/right
  // tendency down to every descendant without each of those descendants
  // needing its own authored sideBias. Purely derived from topology, same
  // as depth.
  resolvedSideBias?: "left" | "right";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
