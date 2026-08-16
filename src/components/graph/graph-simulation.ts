import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type Simulation, type Force } from "d3-force";
import type { GraphNodeData, SimNode } from "./types";

/**
 * Force-directed layout, replacing the old resolveLayout()'s hardcoded
 * fixed/radial-auto positions. No node ever stores a position — this
 * module is the only thing that ever computes one, from topology alone
 * (parentId + pinned + sideBias), every time the Core boots.
 */

export interface Bounds {
  width: number;
  height: number;
}

export interface AvoidRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface SimLink {
  source: string;
  target: string;
}

// Extra breathing room a link adds on top of the two nodes' own collide
// radii — NOT the whole link distance. The whole distance is derived per
// link from each pair's real measured size (see createGraphSimulation),
// on purpose: a fixed distance-per-depth-tier constant was tried first and
// was a real, structural bug, not just a tuning issue — for any pair whose
// combined collide radius exceeds that constant (which real content sizes
// routinely do; a two-line project title is enough), the link force pulls
// the pair closer together than collide will ever allow them to rest, and
// no amount of overlap-resolution can satisfy both at once. Deriving the
// target distance from the pair's own radii makes that contradiction
// impossible by construction, for today's nodes and for anything added
// later. Primary branches (About/Projects) get more of the bonus than
// deeper nodes, for a bit of visual hierarchy.
// `nested` cut hard (28 -> 8): direct feedback that a branch and its own
// children should be able to sit right next to each other by default, not
// just "closer than before" — collideMin (see distance() below) is still
// the real floor, this is just how much extra room gets added past it as
// a preference. `primary` (core-to-branch) is untouched here — that's a
// different, separately-tuned distance (see CORE_CLEARANCE_MARGIN).
const LINK_BREATHING_ROOM = { primary: 90, nested: 8 } as const;
// Halved (-140 -> -70): this is ambient, always-on repulsion between every
// pair regardless of distance, not just an overlap response — at -140 it
// was keeping siblings and parent/child pairs from ever resting close
// together even with nothing actually overlapping. Same feedback as
// LINK_BREATHING_ROOM.nested above, different mechanism.
const CHARGE_STRENGTH = -70;
const CHARGE_MIN_DISTANCE = 40; // caps the repulsion spike for nodes seeded close together — see buildSimNodes
// Real, measured root cause of "dragging one branch visibly moves
// unrelated branches on the far side of the core": forceManyBody is an
// all-pairs force with no distance falloff by default — every node
// repels every other node a little, no matter how far apart, and that
// stays true for as long as alpha is non-zero, which a drag's
// alphaTarget(0.3) makes true simulation-wide (see the pointermove
// handler in system-core-app.ts), not just near the dragged node. capped
// here at a plain distance cutoff, not a strength reduction — d3-force's
// own mechanism for "this force only matters locally," verified against
// the actual layout: a branch's own children typically sit within ~150
// stage px of it, while About and Projects sit roughly 500-700px apart
// on opposite sides of the core, so 400 comfortably covers "a branch and
// its own cluster" while genuinely zeroing out interaction with the
// other side.
const CHARGE_DISTANCE_MAX = 400;
export const COLLIDE_PADDING = 2; // reduced from 6 — collision should trigger right at actually touching, not meaningfully before it
const CENTER_PULL = 0.012; // gentle — real space-filling comes from link distance + repulsion, this just stops long-term drift
const SIDE_BIAS_STRENGTH = 0.12;
const SIDE_BIAS_MARGIN = 60; // px past the split line a biased node is allowed to sit before the push kicks in
// Pulls a primary branch (About/Projects themselves, not their children)
// toward the core's own height — see forceHorizontalAnchor.
const HORIZONTAL_ANCHOR_STRENGTH = 0.12;
// Minimum visible gap between the core's edge and a primary branch's edge,
// on top of the raw collide requirement — see enforceCoreClearance.
export const CORE_CLEARANCE_MARGIN = 18;
const BOUNDARY_PADDING = 28;
const AVOID_PADDING = 16;
const VELOCITY_DECAY = 0.62; // more damping than d3's 0.4 default — fewer overshoots/oscillations while settling
const MAX_SPEED = 34; // px/tick, pre-decay — hard velocity cap so no single tick can fling a node across the stage regardless of what the other forces compute; this is the direct fix for "se ponen locos"

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Wider stages get proportionally more spread, not just more empty margin. */
function scaleForBounds(bounds: Bounds): number {
  return clamp(bounds.width / 1200, 0.5, 1.4);
}

function computeDepths(nodes: GraphNodeData[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  function resolve(id: string): number {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    if (!node || node.parentId === null) {
      depth.set(id, 0);
      return 0;
    }
    const d = resolve(node.parentId) + 1;
    depth.set(id, d);
    return d;
  }
  for (const n of nodes) resolve(n.id);
  return depth;
}

/** Walks each node up to the nearest ancestor (or itself) carrying an authored sideBias, so "About" and "Projects" hand their tendency down to every descendant automatically. */
function resolveSideBiases(nodes: GraphNodeData[]): Map<string, "left" | "right" | undefined> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resolved = new Map<string, "left" | "right" | undefined>();
  function resolve(id: string): "left" | "right" | undefined {
    if (resolved.has(id)) return resolved.get(id);
    const node = byId.get(id);
    if (!node) return undefined;
    if (node.sideBias) {
      resolved.set(id, node.sideBias);
      return node.sideBias;
    }
    if (node.parentId === null) {
      resolved.set(id, undefined);
      return undefined;
    }
    const inherited = resolve(node.parentId);
    resolved.set(id, inherited);
    return inherited;
  }
  for (const n of nodes) resolve(n.id);
  return resolved;
}

export function buildSimNodes(nodes: GraphNodeData[], sizes: Map<string, { width: number; height: number }>, seedCenter: Bounds): SimNode[] {
  const depths = computeDepths(nodes);
  const sideBiases = resolveSideBiases(nodes);
  return nodes.map((n, i) => {
    const size = sizes.get(n.id) ?? { width: 150, height: 56 };
    const resolvedSideBias = sideBiases.get(n.id);
    // Seed near the core's actual position, not d3's origin-based default —
    // every non-fixed node used to start clustered near (0,0) while the
    // fixed core sat at the real stage center, so the first ticks were one
    // long, chaotic-looking cross-viewport journey instead of a settled
    // node making small adjustments. A jittered ring around the core's real
    // position gives the physics a plausible starting guess instead of a
    // blank slate. Depth spreads the ring radius a little so siblings don't
    // start perfectly on top of each other's eventual link line, and the
    // ring is biased toward its resolved side so the layout doesn't have to
    // fight its way there against collision from an arbitrary starting angle.
    const angleSpan = resolvedSideBias === "left" ? [Math.PI * 0.55, Math.PI * 1.45] : resolvedSideBias === "right" ? [-Math.PI * 0.45, Math.PI * 0.45] : [0, Math.PI * 2];
    const t = nodes.length > 1 ? i / (nodes.length - 1) : 0;
    const angle = angleSpan[0] + t * (angleSpan[1] - angleSpan[0]);
    const seedRadius = 70 + (depths.get(n.id) ?? 0) * 26;
    return {
      ...n,
      depth: depths.get(n.id) ?? 0,
      radius: Math.hypot(size.width, size.height) / 2,
      resolvedSideBias,
      x: seedCenter.width / 2 + Math.cos(angle) * seedRadius,
      y: seedCenter.height / 2 + Math.sin(angle) * seedRadius,
    };
  });
}

/**
 * A fixed per-depth link distance works fine until one parent has enough
 * children that they can't all fit around it at that radius without
 * overlapping each other — six children (Projects) is exactly that case,
 * and no amount of pairwise overlap-resolution can fix a ring that's
 * geometrically too small to hold everyone at their target distance in
 * the first place. This computes, per parent, the minimum ring radius
 * that lets its children sit side by side around a full circle (their
 * combined "diameters" divided by the circle's circumference), then pads
 * it — the arc actually available near a node is realistically well
 * short of a full 360° once the viewport edges, the exclusion panels, and
 * the pull back toward the parent's own side of the split are accounted
 * for. Purely derived from sibling count and real sizes, so a parent
 * gaining a seventh child pushes its ring out automatically instead of
 * needing a hand-tuned distance.
 */
function computeMinRingRadii(nodes: SimNode[]): Map<string, number> {
  const totalChord = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentId == null) continue;
    const chord = 2 * (n.radius + COLLIDE_PADDING);
    totalChord.set(n.parentId, (totalChord.get(n.parentId) ?? 0) + chord);
  }
  const radii = new Map<string, number>();
  for (const [parentId, chord] of totalChord) {
    radii.set(parentId, (chord / (2 * Math.PI)) * 1.5);
  }
  return radii;
}

function buildLinks(nodes: SimNode[]): SimLink[] {
  const links: SimLink[] = [];
  for (const n of nodes) {
    if (n.parentId) links.push({ source: n.parentId, target: n.id });
  }
  return links;
}

/**
 * Soft containment: nudges velocity toward the inside of the stage. Not
 * scaled by alpha — a boundary has to keep its teeth even after the
 * simulation has mostly cooled down, otherwise a node that got pushed out
 * during the energetic early ticks can be left stranded once alpha decays
 * to the point d3 stops ticking. (The hard clamp in enforceHardBounds is
 * the actual guarantee; this is what makes approaching it look like part
 * of the physics instead of a sudden snap.)
 */
function forceBoundary(getBounds: () => Bounds, padding: number): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  function force() {
    const bounds = getBounds();
    for (const node of nodes) {
      if (node.fx != null && node.fy != null) continue;
      const minX = padding + node.radius;
      const maxX = bounds.width - padding - node.radius;
      const minY = padding + node.radius;
      const maxY = bounds.height - padding - node.radius;
      if (node.x! < minX) node.vx = (node.vx ?? 0) + (minX - node.x!) * 0.4;
      else if (node.x! > maxX) node.vx = (node.vx ?? 0) + (maxX - node.x!) * 0.4;
      if (node.y! < minY) node.vy = (node.vy ?? 0) + (minY - node.y!) * 0.4;
      else if (node.y! > maxY) node.vy = (node.vy ?? 0) + (maxY - node.y!) * 0.4;
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/**
 * "Stay on your half" rather than "converge on one exact column": only
 * pushes a biased node back when it has drifted past `core.x ± margin`
 * onto the wrong side; otherwise applies no force at all and leaves
 * collide/link/charge completely free to spread same-side siblings across
 * their whole half. An earlier version pulled every biased node toward one
 * fixed target x — which worked for "About"/"Projects" themselves, but for
 * a crowded branch (Projects has six children) it collapsed every sibling
 * onto the same narrow column and forced collide into an unwinnable fight
 * for vertical room. This version only ever fights collide right at the
 * midline, so it doesn't compete for space with siblings and doesn't cost
 * the layout any of the "use the full width" spread.
 *
 * The line itself is always the stage's true center — the core sits
 * exactly there (core.fx = bounds.width / 2) — not a packing-weighted
 * split. An earlier version shifted the line to give Projects' six
 * children more room, but that meant "right of center" wasn't actually
 * required for a right-biased node, only "right of a line that itself
 * sat left of center" — which reads as About/Projects not reliably being
 * on the correct side of the *core*, the one thing this force exists to
 * guarantee. The packing problem that split was solving is handled
 * elsewhere now (computeMinRingRadii's ring floor, real-radius link
 * distances), so the boundary can stay honest.
 *
 * Deliberately NOT scaled by alpha, same reasoning as forceBoundary/
 * forceAvoidRects: it needs to keep its teeth for as long as collide is
 * still active, not fade out early.
 */
function forceSideBias(getBounds: () => Bounds): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  function force() {
    const bounds = getBounds();
    const midX = bounds.width / 2;
    for (const node of nodes) {
      if (!node.resolvedSideBias || (node.fx != null && node.fy != null)) continue;
      if (node.resolvedSideBias === "left") {
        const boundary = midX - SIDE_BIAS_MARGIN;
        if (node.x! > boundary) node.vx = (node.vx ?? 0) - (node.x! - boundary) * SIDE_BIAS_STRENGTH;
      } else {
        const boundary = midX + SIDE_BIAS_MARGIN;
        if (node.x! < boundary) node.vx = (node.vx ?? 0) + (boundary - node.x!) * SIDE_BIAS_STRENGTH;
      }
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/**
 * forceSideBias only ever guarantees "past the midline" — it says nothing
 * about height, so a branch is free to settle anywhere in its half,
 * including tucked underneath the core near the bottom panels (which is
 * exactly what happened: About and Projects ended up close together,
 * both low and close to center, instead of reading as "9 o'clock" and "3
 * o'clock"). This pulls just the primary branches — About and Projects
 * themselves, not their children, who still need the freedom to spread
 * around their own parent — toward the core's own height, so "left"/
 * "right" reads as literally beside the core, not just somewhere in a
 * vague half. Deliberately weaker than forceSideBias and the collide/
 * avoidRects forces: this is a preference about where in the half a
 * branch sits, not a hard requirement, so it shouldn't win a fight against
 * genuine space constraints (e.g. a panel actually sitting at that
 * height).
 */
function forceHorizontalAnchor(getBounds: () => Bounds): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  function force() {
    const bounds = getBounds();
    const targetY = bounds.height / 2;
    for (const node of nodes) {
      if (!node.resolvedSideBias || node.depth > 1 || (node.fx != null && node.fy != null)) continue;
      node.vy = (node.vy ?? 0) + (targetY - node.y!) * HORIZONTAL_ANCHOR_STRENGTH;
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/**
 * Live-tick counterpart to enforceCoreClearance — pushes any node outward,
 * along the core-to-node line, whenever it's inside the minimum-gap
 * radius. Same not-scaled-by-alpha reasoning as forceBoundary: needs to
 * keep pushing back for as long as collide is still shoving the node the
 * other way, not fade out early.
 *
 * Applies to every node, not just primary branches (About/Projects
 * themselves) — it used to stop at depth 1, which left sub-branches free
 * to settle at the bare collide minimum from the core (no
 * CORE_CLEARANCE_MARGIN), a real gap from what dragging one enforces (see
 * the core-clamp in system-core-app.ts's pointermove handler, which
 * checks every dragged node regardless of depth). A sub-branch that
 * happened to rest that close would then visibly jump on the very first
 * pointermove past the drag threshold — far more motion than the actual
 * few-px gesture that triggered it — reported as "barely touching a
 * branch reorders everything." Matching the two clearance checks removes
 * the discontinuity at its source: nothing should ever rest closer to the
 * core than a drag would allow it to end up.
 */
function forceCoreClearance(getNodes: () => SimNode[]): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  let core: SimNode | undefined;
  function force() {
    if (!core) core = getNodes().find((n) => n.type === "core");
    if (!core) return;
    for (const node of nodes) {
      if (!node.resolvedSideBias || (node.fx != null && node.fy != null)) continue;
      const dx = node.x! - core.x!;
      const dy = node.y! - core.y!;
      const dist = Math.hypot(dx, dy);
      const minDist = core.radius + COLLIDE_PADDING + node.radius + COLLIDE_PADDING + CORE_CLEARANCE_MARGIN;
      if (dist >= minDist) continue;
      const ux = dist > 0.01 ? dx / dist : 1;
      const uy = dist > 0.01 ? dy / dist : 0;
      // 0.5 (a soft, proportional spring) could be — and, measured, was —
      // overpowered by whatever else was pulling a node core-ward (mainly
      // the link force, itself alpha-scaled) at the same time, letting the
      // two settle into a stable tug-of-war exactly at the point where
      // they balance — which, since forceCoreClearance's activation zone
      // starts exactly at the required minimum, is inside it: a real,
      // persistent violation the live physics alone would never escape on
      // its own, confirmed directly (ran 2500+ ticks from a fresh boot
      // with no further intervention — the violation never improved by
      // even one pixel). Strong enough now to reliably win that fight
      // instead of merely resisting it.
      const push = (minDist - dist) * 1.6;
      node.vx = (node.vx ?? 0) + ux * push;
      node.vy = (node.vy ?? 0) + uy * push;
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/** Keeps nodes clear of fixed UI chrome (the hero panel, the info dock) that lives inside the same stage — without this, the layout only knew about the four outer edges, not the furniture sitting on top of it. Same not-scaled-by-alpha reasoning as forceBoundary. */
function forceAvoidRects(getRects: () => AvoidRect[]): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  function force() {
    const rects = getRects();
    if (rects.length === 0) return;
    for (const node of nodes) {
      if (node.fx != null && node.fy != null) continue;
      for (const rect of rects) {
        const closestX = clamp(node.x!, rect.left - AVOID_PADDING, rect.right + AVOID_PADDING);
        const closestY = clamp(node.y!, rect.top - AVOID_PADDING, rect.bottom + AVOID_PADDING);
        const dx = node.x! - closestX;
        const dy = node.y! - closestY;
        const dist = Math.hypot(dx, dy);
        const minDist = node.radius;
        if (dist < minDist) {
          if (dist < 0.5) {
            // node center landed inside the rect — push away from its middle
            const rcx = (rect.left + rect.right) / 2;
            const rcy = (rect.top + rect.bottom) / 2;
            const ax = node.x! - rcx || 1;
            const ay = node.y! - rcy || 1;
            const len = Math.hypot(ax, ay);
            node.vx = (node.vx ?? 0) + (ax / len) * minDist * 0.5;
            node.vy = (node.vy ?? 0) + (ay / len) * minDist * 0.5;
          } else {
            const push = (minDist - dist) / dist;
            node.vx = (node.vx ?? 0) + dx * push * 0.5;
            node.vy = (node.vy ?? 0) + dy * push * 0.5;
          }
        }
      }
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/** Hard velocity cap, applied last so it sees the sum of every other force's contribution for this tick before it becomes a position change. This is the direct fix for the reported "se ponen locos" chaotic motion: no matter how strong a repulsion burst is, no node can be flung more than a bounded distance in a single tick. */
function forceVelocityLimit(): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];
  function force() {
    for (const node of nodes) {
      if (node.fx != null && node.fy != null) continue;
      const speed = Math.hypot(node.vx ?? 0, node.vy ?? 0);
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        node.vx = (node.vx ?? 0) * scale;
        node.vy = (node.vy ?? 0) * scale;
      }
    }
  }
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}

/**
 * Hard guarantee counterpart to forceSideBias, same reasoning as
 * resolveOverlaps vs forceCollide: a lopsided tree (Projects has six
 * children, About has two) can out-muscle the soft per-tick push and leave
 * a biased node stranded on the wrong side when the simulation goes quiet.
 * A one-time, final correction, not a per-tick force, so it never fights
 * the live animation; resolveOverlaps immediately after cleans up whatever
 * the flip disturbed.
 *
 * Mirrors around the stage's true center (core.fx = bounds.width / 2),
 * matching forceSideBias — "About left of the core, Projects right of the
 * core" has to hold against the core's actual position, not a packing-
 * weighted line that can itself sit left of center. One flip always lands
 * exactly as far into the correct half as the node was into the wrong one.
 */
function enforceSideBias(nodes: SimNode[], bounds: Bounds): void {
  const midX = bounds.width / 2;
  const leftBoundary = midX - SIDE_BIAS_MARGIN;
  const rightBoundary = midX + SIDE_BIAS_MARGIN;
  for (const node of nodes) {
    if (!node.resolvedSideBias || (node.fx != null && node.fy != null)) continue;
    if (node.resolvedSideBias === "left" && node.x! > leftBoundary) {
      node.x = 2 * leftBoundary - node.x!;
    } else if (node.resolvedSideBias === "right" && node.x! < rightBoundary) {
      node.x = 2 * rightBoundary - node.x!;
    }
  }
}

/**
 * Hard-correction counterpart to forceHorizontalAnchor: nudges About and
 * Projects a fraction of the way back toward the core's own height every
 * round, instead of only the soft per-tick pull. A partial nudge, not a
 * snap — this is a "read as beside the core" preference, not a same-class
 * invariant as zero overlap, so it shouldn't override the rest of the
 * resolution loop finding them a spot that also happens to avoid a panel.
 */
function enforceHorizontalAnchor(nodes: SimNode[], bounds: Bounds): void {
  const targetY = bounds.height / 2;
  for (const node of nodes) {
    if (!node.resolvedSideBias || node.depth > 1 || (node.fx != null && node.fy != null)) continue;
    node.y = node.y! + (targetY - node.y!) * 0.3;
  }
}

/**
 * A hard floor under how close any node is allowed to sit to the core, on
 * top of whatever resolveOverlaps already guarantees from plain
 * collision. The link force's target distance is only ever a preference
 * competing with everything else pulling on that node — for Projects
 * specifically, six children pulling inward for their own reasons can win
 * that tug of war and leave a branch (or one of those children) resting
 * only barely clear of the core's edge, which reads as glued on rather
 * than orbiting it. This pushes straight out along the core-to-node line
 * whenever the gap is under CORE_CLEARANCE_MARGIN, regardless of what the
 * rest of the layout wants — a floor, not a target, so it never fights
 * for more separation than the minimum once that minimum is already met.
 *
 * Covers every node now, not just primary branches — see
 * forceCoreClearance's own comment for why a sub-branch settling any
 * closer than this floor was a real, reported bug (not just a theoretical
 * inconsistency): the interactive drag clamp enforces this same distance
 * for anything being dragged regardless of depth, so a sub-branch resting
 * closer than that would visibly jump the instant a drag nudged it past
 * the movement threshold.
 */
function enforceCoreClearance(nodes: SimNode[]): void {
  const core = nodes.find((n) => n.type === "core");
  if (!core) return;
  for (const node of nodes) {
    if (!node.resolvedSideBias || (node.fx != null && node.fy != null)) continue;
    const dx = node.x! - core.x!;
    const dy = node.y! - core.y!;
    const dist = Math.hypot(dx, dy);
    const minDist = core.radius + COLLIDE_PADDING + node.radius + COLLIDE_PADDING + CORE_CLEARANCE_MARGIN;
    if (dist >= minDist) continue;
    const ux = dist > 0.01 ? dx / dist : 1;
    const uy = dist > 0.01 ? dy / dist : 0;
    node.x = core.x! + ux * minDist;
    node.y = core.y! + uy * minDist;
  }
}
// Tried, this session, and reverted: a version of this function that
// walked around the core's exclusion circle looking for an angle that
// also cleared every sibling before snapping (avoiding the pure-radial
// snap creating a fresh sibling collision for resolveOverlaps to push
// back into violation next round), plus a separate forceChildArc /
// enforceChildArc pair that geometrically barred a crowded branch's
// children from the core-facing wedge of their own ring. Both were
// individually well-reasoned and directly targeted at a real, confirmed
// deadlock (Projects' children occasionally landing somewhere no
// available angle satisfies both core-clearance and sibling-collision at
// once — see the still-open note about this in the audit report).
// Measured directly, though, the combination made the actual reported
// symptom *worse*, not better: a synthetic drag-and-settle on About that
// previously moved its farthest unrelated node (keyping) about 116px net
// now moved portfolio-core net ~389px. Reverted rather than shipped
// hoping further tuning would fix a regression that size — the plain
// radial version above is what's actually been verified not to make
// things worse.

/**
 * Direct pairwise separation, the same guarantee-vs-tendency reasoning as
 * the boundary/rect clamp below: forceCollide is what makes the *approach*
 * to a non-overlapping layout look like physics, but with eleven sizeable
 * nodes plus two exclusion zones plus a directional pull all competing for
 * the same modest viewport, it doesn't always finish the job before alpha
 * crosses its threshold and the simulation's timer stops ticking — leaving
 * whatever overlap still existed at that instant permanently on screen.
 * A few iterations of exact push-apart is cheap at this node count (~11)
 * and closes that gap deterministically instead of hoping more ticks
 * would have gotten there eventually.
 */
/**
 * The *only* node collision resolution won't move: the true center the
 * whole graph is built around (core.fx/fy is pinned by applyBounds to the
 * stage's exact center, and every other bit of layout math assumes it
 * stays there). A branch or sub-branch the user has dragged is *also*
 * fx/fy-pinned (that's what makes its placement stick instead of springing
 * back into the automatic layout — see endDrag's own comment), but it's
 * not this kind of anchor: it was free a moment ago and there's no reason
 * dragging it once should weld it in place forever, immune to ever being
 * bumped by a later drag/drop the way every other node still is. Collision
 * resolution treats those two cases differently below; every *other*
 * force in this file (side bias, horizontal anchor, core clearance, ...)
 * still skips any fx/fy-pinned node on purpose — placement bypassing those
 * preferences is the whole point of a manual drag, and that's unrelated to
 * whether it can still be pushed aside by a fresh overlap.
 */
function isAnchor(node: SimNode): boolean {
  return node.type === "core";
}

/** Moving a fixed (fx/fy-pinned) node's x/y alone isn't enough — d3 resyncs a fixed node's position from fx/fy on every subsequent tick, so the correction has to move the pin itself to actually stick. */
function syncPin(node: SimNode): void {
  if (node.fx != null) node.fx = node.x;
  if (node.fy != null) node.fy = node.y;
}

function resolveOverlaps(nodes: SimNode[]): void {
  // Same fixed i/j processing order every call can lock a tightly
  // constrained group into a stable-but-wrong pattern: fixing pair A-B
  // re-violates B-C, fixing B-C re-violates A-B, forever, in exactly the
  // same way each round — more rounds don't help because the order never
  // changes. Shuffling which node gets processed first breaks that: it's
  // the standard fix for a Gauss-Seidel relaxation stuck in a cycle rather
  // than actually converging.
  const order = nodes.map((_, i) => i);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }

  for (let iter = 0; iter < 4; iter++) {
    for (let oi = 0; oi < order.length; oi++) {
      const a = nodes[order[oi]];
      const aAnchor = isAnchor(a);
      for (let oj = oi + 1; oj < order.length; oj++) {
        const b = nodes[order[oj]];
        const bAnchor = isAnchor(b);
        if (aAnchor && bAnchor) continue; // can't happen (one core) — defensive only

        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius + COLLIDE_PADDING * 2;
        if (dist >= minDist) continue;

        // Nodes started on the exact same seed point in a degenerate case —
        // pick an arbitrary axis rather than dividing by zero.
        const ux = dist > 0.01 ? dx / dist : 1;
        const uy = dist > 0.01 ? dy / dist : 0;
        // A little over-relaxation (push slightly past the exact overlap)
        // still helps convergence — with ~11 nodes all constraining each
        // other, resolving pair A-B exactly can immediately re-violate
        // pair B-C — but this used to be 1.6, enough overshoot that a
        // correction read as a shove past where the two nodes actually
        // needed to end up. Cut close to 1 (minimal overshoot) since
        // resolveRounds already has plenty of iteration budget (350
        // rounds x 4 passes) to make up for slower convergence per round.
        const overlap = (minDist - dist) * 1.15;

        if (aAnchor) {
          b.x! += ux * overlap;
          b.y! += uy * overlap;
          syncPin(b);
        } else if (bAnchor) {
          a.x! -= ux * overlap;
          a.y! -= uy * overlap;
          syncPin(a);
        } else {
          a.x! -= ux * (overlap / 2);
          a.y! -= uy * (overlap / 2);
          b.x! += ux * (overlap / 2);
          b.y! += uy * (overlap / 2);
          syncPin(a);
          syncPin(b);
        }

        // Repositioning alone isn't enough for a still-free node: if it
        // still carries velocity driving it back in, next tick's
        // integration recreates the exact overlap this pass just fixed,
        // forever — the "hard guarantee" and the physics fighting each
        // other tick after tick reads as jitter. Cancel the closing
        // component (like an inelastic collision) so the correction
        // actually sticks. (A pinned node's velocity doesn't move it
        // regardless — see syncPin above — so this is skipped for one,
        // same as before, just keyed to pinned-ness now instead of the
        // old fixed/anchor conflation.) ux/uy point from a toward b.
        if (a.fx == null) {
          const va = (a.vx ?? 0) * ux + (a.vy ?? 0) * uy; // >0 means a is moving toward b
          if (va > 0) {
            a.vx = (a.vx ?? 0) - ux * va;
            a.vy = (a.vy ?? 0) - uy * va;
          }
        }
        if (b.fx == null) {
          const vb = (b.vx ?? 0) * ux + (b.vy ?? 0) * uy; // <0 means b is moving toward a
          if (vb < 0) {
            b.vx = (b.vx ?? 0) - ux * vb;
            b.vy = (b.vy ?? 0) - uy * vb;
          }
        }
      }
    }
  }
}

function clampToViewport(node: SimNode, bounds: Bounds): void {
  if (node.fx != null && node.fy != null) return;
  const minX = BOUNDARY_PADDING + node.radius;
  const maxX = bounds.width - BOUNDARY_PADDING - node.radius;
  const minY = BOUNDARY_PADDING + node.radius;
  const maxY = bounds.height - BOUNDARY_PADDING - node.radius;
  if (node.x! < minX) {
    node.x = minX;
    if ((node.vx ?? 0) < 0) node.vx = 0;
  } else if (node.x! > maxX) {
    node.x = maxX;
    if ((node.vx ?? 0) > 0) node.vx = 0;
  }
  if (node.y! < minY) {
    node.y = minY;
    if ((node.vy ?? 0) < 0) node.vy = 0;
  } else if (node.y! > maxY) {
    node.y = maxY;
    if ((node.vy ?? 0) > 0) node.vy = 0;
  }
}

function clampOutOfRects(node: SimNode, rects: AvoidRect[], bounds: Bounds): void {
  if (node.fx != null && node.fy != null) return;
  const minX = BOUNDARY_PADDING + node.radius;
  const maxX = bounds.width - BOUNDARY_PADDING - node.radius;
  const minY = BOUNDARY_PADDING + node.radius;
  const maxY = bounds.height - BOUNDARY_PADDING - node.radius;

  for (const rect of rects) {
    const left = rect.left - AVOID_PADDING - node.radius;
    const right = rect.right + AVOID_PADDING + node.radius;
    const top = rect.top - AVOID_PADDING - node.radius;
    const bottom = rect.bottom + AVOID_PADDING + node.radius;
    if (node.x! <= left || node.x! >= right || node.y! <= top || node.y! >= bottom) continue;

    // Center is inside the padded rect — snap out through the nearest
    // edge, but only among edges that actually land inside the viewport.
    // Both of our panels sit flush against a viewport edge, so "exit
    // downward"/"exit sideways" can be numerically nearest while leading
    // straight off the visible stage; a candidate that does that isn't a
    // real option.
    type Candidate = { dist: number; apply: () => void };
    const candidates: Candidate[] = [];
    if (left >= minX) {
      candidates.push({
        dist: node.x! - left,
        apply: () => {
          node.x = left;
          if ((node.vx ?? 0) > 0) node.vx = 0;
        },
      });
    }
    if (right <= maxX) {
      candidates.push({
        dist: right - node.x!,
        apply: () => {
          node.x = right;
          if ((node.vx ?? 0) < 0) node.vx = 0;
        },
      });
    }
    if (top >= minY) {
      candidates.push({
        dist: node.y! - top,
        apply: () => {
          node.y = top;
          if ((node.vy ?? 0) > 0) node.vy = 0;
        },
      });
    }
    if (bottom <= maxY) {
      candidates.push({
        dist: bottom - node.y!,
        apply: () => {
          node.y = bottom;
          if ((node.vy ?? 0) < 0) node.vy = 0;
        },
      });
    }

    if (candidates.length === 0) continue; // boxed in on every side — leave it for clampToViewport/resolveOverlaps to keep refining next round
    candidates.sort((a, b) => a.dist - b.dist);
    candidates[0].apply();
  }
}

/**
 * The actual guarantee (called every tick from outside the simulation, not
 * registered as a force): directly repositions any node still overlapping
 * a sibling, the viewport edge, or a UI panel after the soft forces above
 * have had their say. Zero overlap is a hard requirement here, not a
 * tendency — d3's own alpha-driven forces are unsuitable for that on their
 * own because they intentionally weaken as the simulation cools, and the
 * simulation's internal timer stops ticking altogether once alpha crosses
 * its threshold. This runs unconditionally, so the invariant holds even
 * one tick after the sim has effectively gone to sleep.
 *
 * The three passes (overlaps, viewport, panels) can each reintroduce a
 * violation the others just fixed — pushing a node off a panel can shove
 * it into a sibling, for instance — so the whole cycle repeats a few
 * times. Called once (on the simulation's "end" event, not per tick — see
 * system-core-app.ts), so there's no reason to be stingy with rounds.
 */
function findStuckNodes(nodes: SimNode[]): Set<SimNode> {
  const stuck = new Set<SimNode>();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dist = Math.hypot(a.x! - b.x!, a.y! - b.y!);
      const minDist = a.radius + b.radius + COLLIDE_PADDING * 2;
      if (dist >= minDist - 0.5) continue;
      // A dragged (pinned) node is still eligible here — only the core
      // itself can't be nudged by the perturbation retry below. See
      // isAnchor's own comment for why fx/fy-pinned isn't the same thing
      // as immovable.
      if (!isAnchor(a)) stuck.add(a);
      if (!isAnchor(b)) stuck.add(b);
    }
  }
  // Core clearance (enforceCoreClearance) is a stricter, separate
  // requirement from plain pairwise collision above — its minimum
  // distance is bigger by CORE_CLEARANCE_MARGIN, so a node can clear the
  // check above yet still be crowding the core. Confirmed this needed its
  // own check, not just an assumption: stress-testing enforceHardBounds
  // against randomized starting layouts found real, reproducible cases
  // where a node was still under the core-clearance floor after all 350
  // resolveRounds — resolveRounds' own round-robin order runs the
  // viewport/panel clamps *after* enforceCoreClearance every round, so
  // those can reintroduce a violation that (without this) nothing ever
  // rechecks. Folding it in here gives it the same random-kick escape
  // hatch below that already reliably resolves stuck pairwise overlaps.
  const core = nodes.find((n) => n.type === "core");
  if (core) {
    for (const node of nodes) {
      if (!node.resolvedSideBias || isAnchor(node)) continue;
      const dist = Math.hypot(node.x! - core.x!, node.y! - core.y!);
      const minDist = core.radius + COLLIDE_PADDING + node.radius + COLLIDE_PADDING + CORE_CLEARANCE_MARGIN;
      if (dist < minDist - 0.5) stuck.add(node);
    }
  }
  return stuck;
}

export function enforceHardBounds(nodes: SimNode[], bounds: Bounds, rects: AvoidRect[]): void {
  // A tightly packed constraint graph (~11 sizeable nodes, two exclusion
  // zones, a side split) is a Gauss-Seidel-style relaxation, not something
  // guaranteed to fall out in a handful of passes — dense constraint
  // solvers routinely need dozens of sweeps to fully settle. This runs
  // once, so there's no reason to be stingy. enforceSideBias reruns every
  // round too: overlap resolution in a later round can push a node back
  // across the midline that an earlier round had just corrected.
  function resolveRounds(count: number): void {
    for (let round = 0; round < count; round++) {
      enforceSideBias(nodes, bounds);
      enforceHorizontalAnchor(nodes, bounds);
      resolveOverlaps(nodes);
      // After overlaps, not before: enforceCoreClearance can push a branch
      // into its own children (who'd just been resolved relative to its
      // old position) — running it last gives it the final say for this
      // round, and the next round's resolveOverlaps cleans up whatever
      // that disturbed, the same push/settle pattern already used for
      // viewport and panel clamping below.
      enforceCoreClearance(nodes);
      for (const node of nodes) {
        // clampOutOfRects picks whichever edge of the panel is nearest to
        // exit through — for a panel sitting flush against the viewport
        // edge (both of ours do, by design), that "nearest" exit can
        // itself land outside the viewport. Re-clamping to the viewport
        // after catches that; it's the same node, immediately, not next
        // round, so it never renders in the invalid spot even transiently.
        clampToViewport(node, bounds);
        clampOutOfRects(node, rects, bounds);
        clampToViewport(node, bounds);
      }
    }
  }

  resolveRounds(350);

  // Some configurations (a large core exclusion plus a crowded branch,
  // for instance) leave a pair genuinely stuck: not slowly converging,
  // but sitting in a stable local minimum that identical rounds reproduce
  // forever — confirmed empirically, running hundreds more rounds here
  // reliably reproduces the exact same residual overlap every time.
  // Gauss-Seidel relaxation on its own has no way out of that; a small
  // random kick to just the nodes still in violation gives the next batch
  // of rounds a different starting point to resolve from, the same
  // "perturb and keep optimizing" idea behind simulated annealing.
  //
  // Bumped from 14 attempts: with COLLIDE_PADDING/LINK_BREATHING_ROOM cut
  // down (nodes now allowed to rest much closer together by default —
  // see those constants), there's less slack to route a stuck pair around
  // each other through, so a single attempt is more likely to still be
  // stuck when this loop's out of tries. Confirmed directly: re-running
  // just this perturbation search a few more times on an already-"final"
  // state that still had one real overlap reliably found a fully clean
  // one within a handful of extra tries — cheap (still just this one
  // node count, still just a one-time pass at "end"), so there's no
  // reason to be stingy with how many it gets in a single real call.
  let best: Map<SimNode, { x: number; y: number }> | null = null;
  let bestStuckCount = Infinity;
  for (let attempt = 0; attempt < 40; attempt++) {
    const stuck = findStuckNodes(nodes);
    if (stuck.size === 0) {
      best = null; // current state already fully resolved — keep it as-is
      break;
    }
    if (stuck.size < bestStuckCount) {
      bestStuckCount = stuck.size;
      // Snapshot every non-anchor node, not just never-dragged ones — a
      // pinned node's position can change here too now (see isAnchor).
      best = new Map(nodes.filter((n) => !isAnchor(n)).map((n) => [n, { x: n.x!, y: n.y! }]));
    }
    for (const node of stuck) {
      const angle = Math.random() * Math.PI * 2;
      // Was 24-94px — sized for a much looser layout than the current one
      // (COLLIDE_PADDING is 2px now). Measured directly that jittering a
      // stuck node by that much routinely landed it on top of an
      // uninvolved sibling that had nothing to do with the original
      // conflict, making *that* one "stuck" too on the next check — a
      // single localized 2-3 node overlap cascading into a much larger
      // set getting relocated, which is what actually produced the large,
      // graph-wide reshuffles this was traced back from (not the original
      // conflict itself — a 2-3 node fix should never need to touch six
      // other siblings). Scaled down to match the tight packing this
      // actually has to search around now.
      const jitter = 6 + Math.random() * 18;
      node.x! += Math.cos(angle) * jitter;
      node.y! += Math.sin(angle) * jitter;
      syncPin(node);
    }
    resolveRounds(80);
  }
  // The perturbation search can wander to a worse state than one it already
  // found (it's not hill-climbing, just resampling) — if the final attempt
  // isn't at least as good as the best one seen, restore that instead of
  // shipping whatever the last random kick happened to produce.
  if (best && findStuckNodes(nodes).size > bestStuckCount) {
    for (const [node, pos] of best) {
      node.x = pos.x;
      node.y = pos.y;
      syncPin(node);
    }
  }
}

export interface GraphSimulation {
  simulation: Simulation<SimNode, SimLink>;
  nodes: SimNode[];
  /** Call after a resize: updates bounds/center and gently reheats instead of a full reset. */
  resize: (bounds: Bounds) => void;
}

export function createGraphSimulation(
  nodes: SimNode[],
  initialBounds: Bounds,
  getAvoidRects: () => AvoidRect[],
): GraphSimulation {
  const links = buildLinks(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const minRingRadii = computeMinRingRadii(nodes);

  const core = nodes.find((n) => n.type === "core");

  let currentBounds = initialBounds;
  function applyBounds(bounds: Bounds) {
    currentBounds = bounds;
    if (core) {
      core.fx = bounds.width / 2;
      core.fy = bounds.height / 2;
    }
  }
  applyBounds(initialBounds);

  const linkForce = forceLink<SimNode, SimLink>(links)
    .id((d) => d.id)
    .strength(0.85)
    .distance((link) => {
      const source = (typeof link.source === "object" ? link.source : byId.get(link.source as unknown as string)) as SimNode;
      const target = (typeof link.target === "object" ? link.target : byId.get(link.target as unknown as string)) as SimNode;
      const scale = scaleForBounds(currentBounds);
      // Always at least the two nodes' own collide requirement — see
      // LINK_BREATHING_ROOM's comment for why that's load-bearing, not
      // just a nicety.
      const collideMin = source.radius + COLLIDE_PADDING + (target.radius + COLLIDE_PADDING);
      const breathingRoom = target.depth <= 1 ? LINK_BREATHING_ROOM.primary : LINK_BREATHING_ROOM.nested;
      const ringFloor = target.parentId ? (minRingRadii.get(target.parentId) ?? 0) : 0;
      const distance = Math.max(collideMin + breathingRoom, ringFloor);
      return distance * scale * (target.pinned ? 0.9 : 1);
    });

  const simulation = forceSimulation(nodes)
    .velocityDecay(VELOCITY_DECAY)
    .force("link", linkForce)
    .force("charge", forceManyBody().strength(CHARGE_STRENGTH).distanceMin(CHARGE_MIN_DISTANCE).distanceMax(CHARGE_DISTANCE_MAX))
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((d) => d.radius + COLLIDE_PADDING)
        // Restored to 0.85 (was reduced to 0.5 for a gentler drop-bounce
        // feel) — measured directly that 0.5 was too weak to reliably
        // resolve sibling overlap on its own: a 6-way tight ring (Projects'
        // children) settled into a *stable* configuration with two real,
        // persistent overlaps that 2500+ additional ticks never improved,
        // only the discrete hard-guarantee ever fixed — which is exactly
        // the mechanism behind "dragging one branch reorders unrelated
        // ones": the soft forces kept pulling back toward that same
        // invalid equilibrium every time alpha went non-zero for any
        // reason, forcing a full, randomized re-solve each time. The
        // "gentle bounce" feel this was tuned for lives in the drop-time
        // impulse instead (system-core-app.ts's endDrag), a separate,
        // one-shot nudge — this is the always-on per-tick force that
        // actually has to win, reliably, or nothing above it can hold.
        .strength(0.85),
    )
    // Zero strength for anything with a resolved side bias: pulling every
    // node toward the exact vertical center fights the layout's own goals
    // for those nodes in two ways at once. It works against forceSideBias
    // horizontally, and — less obviously but more damaging in practice —
    // it crowds them toward y = bounds.height / 2 vertically, which is
    // exactly where the core's circular exclusion is widest, squeezing a
    // biased branch into the single worst band for clearing it instead of
    // letting it drift toward the top or bottom where there's real room.
    // Unbiased nodes (currently just the core itself, which is pinned
    // anyway) are unaffected.
    .force("x", forceX<SimNode>(() => currentBounds.width / 2).strength((d) => (d.resolvedSideBias ? 0 : CENTER_PULL)))
    .force("y", forceY<SimNode>(() => currentBounds.height / 2).strength((d) => (d.resolvedSideBias ? 0 : CENTER_PULL)))
    .force("boundary", forceBoundary(() => currentBounds, BOUNDARY_PADDING))
    .force("sideBias", forceSideBias(() => currentBounds))
    .force("horizontalAnchor", forceHorizontalAnchor(() => currentBounds))
    .force("coreClearance", forceCoreClearance(() => nodes))
    .force("avoidRects", forceAvoidRects(getAvoidRects))
    .force("velocityLimit", forceVelocityLimit())
    .alphaDecay(0.045);

  return {
    simulation,
    nodes,
    resize(bounds) {
      applyBounds(bounds);
      simulation.alpha(0.35).restart();
    },
  };
}
