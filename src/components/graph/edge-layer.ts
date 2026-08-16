import type { SimNode } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

interface LinkEntry {
  line: SVGLineElement;
  particle: SVGCircleElement;
  progress: number;
  speed: number;
  isRelation: boolean;
}

/**
 * SVG connective tissue between nodes: one hierarchy line per node (drawn
 * from its parent's position, or the core's for top-level nodes) plus one
 * dashed line per explicit `relations` entry. Ported from the
 * createLinks/updateLinks/updateLinkParticles trio in legacy-vanilla/main.js
 * — positions now come straight from the force simulation's node.x/node.y
 * instead of a DOM getBoundingClientRect() round-trip.
 */
export class EdgeLayer {
  private hierarchyLinks = new Map<string, LinkEntry>();
  private relationLinks: { link: LinkEntry; from: string; to: string }[] = [];

  constructor(private svg: SVGSVGElement) {}

  build(nodes: SimNode[]): void {
    this.svg.innerHTML = "";
    this.hierarchyLinks.clear();
    this.relationLinks = [];

    for (const node of nodes) {
      if (node.type === "core") continue;
      const entry = this.createEntry(node.type === "project" && node.pinned);
      this.hierarchyLinks.set(node.id, entry);
    }

    for (const node of nodes) {
      for (const relation of node.relations) {
        const entry = this.createEntry(false, true);
        this.relationLinks.push({ link: entry, from: node.id, to: relation.targetId });
      }
    }
  }

  private createEntry(primary: boolean, isRelation = false): LinkEntry {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", `link-line${primary ? " link-line--primary" : ""}${isRelation ? " link-line--relation" : ""}`);
    const particle = document.createElementNS(SVG_NS, "circle");
    particle.setAttribute("r", "2.1");
    particle.setAttribute("class", "link-particle");
    this.svg.appendChild(line);
    if (!isRelation) this.svg.appendChild(particle);
    return { line, particle, progress: Math.random(), speed: 0.22 + Math.random() * 0.3, isRelation };
  }

  /** Recomputes every line's endpoints from the simulation's current node positions. */
  update(nodes: Map<string, SimNode>): void {
    for (const node of nodes.values()) {
      if (node.type === "core" || node.x === undefined || node.y === undefined) continue;
      const entry = this.hierarchyLinks.get(node.id);
      if (!entry) continue;

      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      const start = parent && parent.x !== undefined && parent.y !== undefined ? parent : nodes.get("core");
      if (!start || start.x === undefined || start.y === undefined) continue;

      entry.line.setAttribute("x1", `${start.x}`);
      entry.line.setAttribute("y1", `${start.y}`);
      entry.line.setAttribute("x2", `${node.x}`);
      entry.line.setAttribute("y2", `${node.y}`);
    }

    for (const { link, from, to } of this.relationLinks) {
      const fromNode = nodes.get(from);
      const toNode = nodes.get(to);
      if (!fromNode || !toNode || fromNode.x === undefined || toNode.x === undefined) continue;
      link.line.setAttribute("x1", `${fromNode.x}`);
      link.line.setAttribute("y1", `${fromNode.y}`);
      link.line.setAttribute("x2", `${toNode.x}`);
      link.line.setAttribute("y2", `${toNode.y}`);
    }
  }

  setActive(activeId: string, parentId: string | null): void {
    const activeSet = new Set([activeId]);
    if (parentId) activeSet.add(parentId);
    this.hierarchyLinks.forEach((entry, id) => {
      const isActive = activeSet.has(id);
      entry.line.classList.toggle("active", isActive);
      entry.particle.classList.toggle("active", isActive);
    });
  }

  tickParticles(dt: number): void {
    this.hierarchyLinks.forEach((entry) => this.advanceParticle(entry, dt));
  }

  private advanceParticle(entry: LinkEntry, dt: number): void {
    const x1 = Number(entry.line.getAttribute("x1"));
    const y1 = Number(entry.line.getAttribute("y1"));
    const x2 = Number(entry.line.getAttribute("x2"));
    const y2 = Number(entry.line.getAttribute("y2"));
    if (![x1, y1, x2, y2].every(Number.isFinite)) return;

    entry.progress += dt * entry.speed;
    if (entry.progress > 1) entry.progress -= 1;

    const px = x1 + (x2 - x1) * entry.progress;
    const py = y1 + (y2 - y1) * entry.progress;
    entry.particle.setAttribute("cx", `${px}`);
    entry.particle.setAttribute("cy", `${py}`);
  }
}
