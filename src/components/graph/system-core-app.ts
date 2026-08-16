import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { CoreScene } from "./core-scene";
import { EdgeLayer } from "./edge-layer";
import { BootSequence, type BootStrings } from "./boot-sequence";
import {
  buildSimNodes,
  createGraphSimulation,
  enforceHardBounds,
  COLLIDE_PADDING,
  CORE_CLEARANCE_MARGIN,
  type AvoidRect,
  type GraphSimulation,
} from "./graph-simulation";
import { ViewTransform } from "./view-transform";
import type { GraphNodeData, SimNode } from "./types";

const DRAG_THRESHOLD_PX = 6; // real drag vs. a click that wiggled a couple of pixels
// How far the camera can zoom out/in. MIN_SCALE in particular isn't just a
// UX choice: computeMargins() below derives how big the pannable "world"
// (and the starfield canvas behind it) needs to be directly from it, so
// that zooming out to MIN_SCALE reveals exactly the world's edge on both
// axes — never a gap of empty space past it, never room left to pan
// further. Changing MIN_SCALE changes how much of the pannable area a
// full zoom-out shows; the world size follows automatically.
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.4;

const RESIZE_DEBOUNCE_MS = 220;

/**
 * How far past the visible stage the pannable "world" (and the star-
 * covered canvas that fills it) extends on each axis, in stage-space px.
 * Derived from MIN_SCALE rather than a fixed constant: at scale s, a
 * viewport of size `boundsSize` shows `boundsSize / s` world-space px, so
 * for the world to exactly fill the viewport at MIN_SCALE (no gap of empty
 * space beyond the starfield, no leftover room to pan further), the world
 * itself has to be `boundsSize / MIN_SCALE` wide — margin on each side is
 * half of what that adds. Computed per-axis (not one shared margin) because
 * width and height are rarely equal, and a single margin applied to both
 * can only ever match one of them.
 */
function computeMargins(bounds: { width: number; height: number }): { x: number; y: number } {
  const factor = (1 / MIN_SCALE - 1) / 2;
  return { x: bounds.width * factor, y: bounds.height * factor };
}

interface ScPayload {
  nodes: GraphNodeData[];
  strings: {
    bootLines: string[];
    statusOffline: string;
    statusBooting: string;
    statusLoadingTemplate: string;
    statusSyncing: string;
    statusOnline: string;
  };
  defaultActiveId: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * The one currently-live instance, if the Core page is presently on screen.
 * `window`/`document` listeners are registered exactly once at module scope
 * (below) and always delegate through this reference instead of each being
 * re-added per visit — Astro's ClientRouter keeps this module's top-level
 * code from ever re-running (see the astro:page-load wiring in
 * SystemCore.astro), so anything added inside bootSystemCore() itself would
 * otherwise stack up: one more "astro:before-preparation" listener, one more
 * orphaned requestAnimationFrame loop rendering to a detached canvas, per
 * every return trip to "/". Reproduced and confirmed before this fix — see
 * commit history.
 */
interface CoreInstance {
  cancel: () => void;
  updateStageSize: () => void;
  handleBeforePreparation: (event: TransitionBeforePreparationEvent) => void;
}

let active: CoreInstance | null = null;

/**
 * In-memory, not sessionStorage, on purpose: this needs to survive a soft
 * ClientRouter navigation away and back (module-level state persists across
 * those — same reasoning as `active` above) but reset on an actual reload,
 * so a hard refresh of "/" always replays the boot ceremony while the
 * crumbbar's "back to core" link skips straight to the ready state.
 */
let coreHasBooted = false;

export function bootSystemCore(): void {
  active?.cancel();
  active = null;

  const dataEl = document.getElementById("sc-data");
  const stage = document.getElementById("core-stage") as HTMLElement | null;
  const canvas = document.getElementById("core-canvas") as HTMLCanvasElement | null;
  const svg = document.getElementById("node-links") as unknown as SVGSVGElement | null;
  const nodeLayer = document.getElementById("node-layer");
  const viewport = document.getElementById("core-viewport") as HTMLElement | null;
  if (!dataEl || !stage || !canvas || !svg || !nodeLayer || !viewport) return; // not on the Core page

  const payload = JSON.parse(dataEl.textContent || "{}") as ScPayload;
  const byId = new Map(payload.nodes.map((n) => [n.id, n]));

  const nodeEls = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>(".module-trigger[data-node-id]").forEach((el) => {
    // desktop node-layer buttons only (mobile list doesn't need pixel placement)
    if (el.closest("#node-layer")) nodeEls.set(el.dataset.nodeId!, el);
  });

  // Real rendered size per node — collision uses this, never a guessed
  // point. Falls back to a sensible default (matching buildSimNodes' own
  // fallback for a node with no measurement at all) if the CSS hasn't
  // actually painted yet at this exact moment — a real .module-node is
  // never genuinely 0×0 once styled, so a 0 here means "not ready", not
  // "this small." Reproduced directly: on some loads the button's
  // stylesheet application lags just behind this script running, and
  // without this guard every node's collide radius silently becomes 0,
  // which cascades into wrong-looking layouts with no error to point at.
  const sizes = new Map<string, { width: number; height: number }>();
  nodeEls.forEach((el, id) => sizes.set(id, { width: el.offsetWidth || 150, height: el.offsetHeight || 56 }));

  // How much extra room #node-layer needs beyond the pan world's own edge —
  // see updateStageSize()'s use of this. Has to be at least as wide as the
  // widest real node, so even a node sitting at the very outer edge of the
  // reachable pan area still has enough CSS "available width" (see that
  // comment for why this matters) to lay out at its natural size, not
  // whatever's left between its `left` and the container's edge.
  const maxNodeWidth = Math.max(150, ...Array.from(sizes.values()).map((s) => s.width));

  function currentBounds() {
    const rect = stage!.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function currentWorldBounds() {
    const bounds = currentBounds();
    const margins = computeMargins(bounds);
    return { width: bounds.width, height: bounds.height, marginX: margins.x, marginY: margins.y };
  }

  const simNodes = buildSimNodes(payload.nodes, sizes, currentBounds());
  const simById = new Map(simNodes.map((n) => [n.id, n]));

  const scene = new CoreScene(canvas);
  const edges = new EdgeLayer(svg);
  edges.build(simNodes);
  const view = new ViewTransform({ viewport, getBounds: currentWorldBounds, minScale: MIN_SCALE, maxScale: MAX_SCALE });

  // The core has no DOM element to measure (it's drawn on the canvas, not
  // rendered as a `.module-trigger` button like every other node), so
  // buildSimNodes fell back to a generic guessed size for it — meaningfully
  // smaller than the actual glowing sphere, which let module nodes end up
  // visually sitting on top of it even while the physics reported zero
  // overlap. The scene knows its own real on-screen size; ask it instead
  // of guessing. Re-applied in updateStageSize() too, since the sphere's
  // pixel radius scales with the stage's height.
  const coreSim = simNodes.find((n) => n.type === "core");
  function syncCoreRadius(): void {
    if (coreSim) coreSim.radius = scene.getVisualRadius(currentBounds().height);
  }
  syncCoreRadius();

  // UI chrome that lives on top of the stage but isn't part of the graph —
  // the hero copy panel and the hover info dock. Measured live (not fixed
  // numbers) so this stays correct across breakpoints and copy-length
  // changes; re-read on every simulation tick's request rather than cached,
  // since it's cheap and both panels are position:absolute (never move
  // during a tick themselves, but can resize on data change).
  function readAvoidRects(): AvoidRect[] {
    const stageRect = stage!.getBoundingClientRect();
    const rects: AvoidRect[] = [];
    document.querySelectorAll<HTMLElement>(".core-copy, .info-dock").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // not rendered (e.g. display:none on mobile)
      rects.push({
        left: r.left - stageRect.left,
        top: r.top - stageRect.top,
        right: r.right - stageRect.left,
        bottom: r.bottom - stageRect.top,
      });
    });
    return rects;
  }

  const graphSim: GraphSimulation = createGraphSimulation(simNodes, currentBounds(), readAvoidRects);

  function placeNodeEl(node: SimNode): void {
    const el = nodeEls.get(node.id);
    if (!el || node.x === undefined || node.y === undefined) return;
    el.style.left = `${node.x - el.offsetWidth / 2}px`;
    el.style.top = `${node.y - el.offsetHeight / 2}px`;
  }

  /**
   * A pinned (fx/fy-set) node can't be nudged by velocity — d3 resyncs a
   * fixed node's position from fx/fy on every tick regardless of vx/vy —
   * so forceCollide, already running every tick for the whole life of the
   * simulation, simply can't push one out of the way, no matter how long
   * it keeps trying. That's what made a previously-dragged node read as
   * welded in place around anything moving near it, live during a drag or
   * at the moment of a drop. The fix isn't to compute the push ourselves
   * (that's what produced the teleport-y, only-checks-one-neighbor
   * behavior this replaces) — it's to stop it from being un-pushable in
   * the first place: let go of its pin so the *already-running* collide
   * force can do exactly what it already does for every never-touched
   * node, live, smoothly, checking against every neighbor each tick, not
   * just the one node that happened to trigger this. `manuallyPlaced`
   * stays true so the "end" handler below can re-pin it once it settles —
   * still sticky, just wherever collision left it instead of where it was
   * before.
   */
  function releasePinnedOverlaps(active: SimNode): void {
    for (const other of simNodes) {
      if (other === active || other.type === "core" || other.fx == null) continue;
      const dist = Math.hypot(other.x! - active.x!, other.y! - active.y!);
      if (dist < other.radius + active.radius + COLLIDE_PADDING * 2) {
        other.fx = null;
        other.fy = null;
      }
    }
  }

  // Live ticks (every animation frame while the layout is moving) run the
  // soft forces only — link/charge/collide/boundary/sideBias/avoidRects —
  // so the settle animation reads as physics, not a series of corrective
  // snaps. "end" fires once, when d3's internal timer stops because alpha
  // has decayed past its threshold: that's the one moment a hard, possibly
  // non-smooth correction is actually appropriate, since nothing is
  // visibly moving through it. This is what turns "the soft forces mostly
  // avoid overlap" into the required "zero overlap, guaranteed" — without
  // that guarantee fighting the animation on every single frame, which is
  // what "se ponen locos" actually was.
  graphSim.simulation.on("tick", () => {
    simNodes.forEach(placeNodeEl);
    edges.update(simById);
  });
  graphSim.simulation.on("end", () => {
    enforceHardBounds(simNodes, currentBounds(), readAvoidRects());
    // Anything released mid-bounce by releasePinnedOverlaps is done moving
    // now that the simulation has actually gone quiet — re-pin it at
    // wherever it settled, restoring the "stays put" guarantee every
    // manual placement gets, just at its new, un-overlapping spot instead
    // of the one it got bumped out of.
    for (const node of simNodes) {
      if (node.manuallyPlaced && node.fx == null) {
        node.fx = node.x;
        node.fy = node.y;
      }
    }
    simNodes.forEach(placeNodeEl);
    edges.update(simById);
  });

  const strings: BootStrings = {
    bootLines: payload.strings.bootLines,
    statusOffline: payload.strings.statusOffline,
    statusBooting: payload.strings.statusBooting,
    statusLoading: (p) => payload.strings.statusLoadingTemplate.replace("{progress}", String(p)),
    statusSyncing: payload.strings.statusSyncing,
    statusOnline: payload.strings.statusOnline,
  };

  const boot = new BootSequence(
    {
      body: document.body,
      bootSequence: document.getElementById("boot-sequence"),
      bootLog: document.getElementById("boot-log") as HTMLUListElement | null,
      bootProgressFill: document.getElementById("boot-progress-fill"),
      bootProgressText: document.getElementById("boot-progress-text"),
      statusText: document.getElementById("core-status-text"),
      startButton: document.getElementById("start-core-button") as HTMLButtonElement | null,
    },
    strings,
    (step) => {
      scene.introStep = step;
      if (step === 6) introComplete = true;
    },
    () => scene.setStarsVisible(true),
  );

  const infoTitle = document.getElementById("dock-title");
  const infoCopy = document.getElementById("dock-copy");

  let introComplete = false;
  let activeId = payload.defaultActiveId;
  let isTransitioning = false;

  const pointer = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };
  let coreHovering = false;
  let coreHoverTime = 0;

  function setActive(id: string): void {
    const changed = activeId !== id;
    activeId = id;
    const node = byId.get(id);
    if (node?.label && infoTitle && infoCopy) {
      infoTitle.textContent = node.label.title;
      infoCopy.textContent = node.label.dockCopy ?? "";
    }
    nodeEls.forEach((el, nodeId) => el.classList.toggle("is-active", nodeId === id));
    edges.setActive(id, node?.parentId ?? null);
    if (changed && introComplete && !isTransitioning) scene.coreImpulse = 1;
  }

  let resizeTimer = 0;
  function updateStageSize(): void {
    const stageBounds = stage!.getBoundingClientRect();
    if (stageBounds.width < 200 || stageBounds.height < 200) {
      // A real .core-stage is never legitimately this small — this reading
      // is from a layout that hasn't settled yet (seen during boot, a
      // CSS/font-load race), not an actual size. Applying it would pin the
      // core (and every collision/link-distance calc that depends on real
      // bounds) to a bogus snapshot that then persists until the next
      // genuine resize. Retry shortly instead of building the whole
      // layout on top of it.
      window.setTimeout(updateStageSize, 60);
      return;
    }
    // Pan/zoom (and the expanded canvas that gives it a starfield to pan
    // into) is a desktop-only affordance, same as the interactive node
    // graph itself — below 860px both give way to the flat mobile list,
    // and .core-canvas gets its own compact, fixed CSS sizing there. Below
    // that breakpoint, clear any inline sizing from a previous desktop
    // layout (e.g. the window was resized down past it) and let that CSS
    // rule apply instead of fighting it — inline styles always win over a
    // stylesheet, media query or not.
    const isDesktopGraph = !window.matchMedia("(max-width: 860px)").matches;
    if (isDesktopGraph) {
      // The canvas is deliberately bigger than the stage — padded out by
      // computeMargins()'s per-axis margin so the starfield covers the
      // whole pannable "world", not just the original stage rect, and
      // panning finds more sky instead of empty space at the canvas's
      // edge. It's positioned with a matching negative offset so its
      // center stays exactly on the stage's own center — the sphere still
      // renders where core.fx/fy (and the collision math built on it)
      // expect it. Width and height get their own margin (not one shared
      // value) specifically so this matches what MIN_SCALE zoom-out
      // reveals on both axes at once — see computeMargins' own comment.
      const margins = computeMargins(stageBounds);
      const canvasWidth = stageBounds.width + margins.x * 2;
      const canvasHeight = stageBounds.height + margins.y * 2;
      canvas!.style.left = `${-margins.x}px`;
      canvas!.style.top = `${-margins.y}px`;
      canvas!.style.width = `${canvasWidth}px`;
      canvas!.style.height = `${canvasHeight}px`;
      scene.resize(canvasWidth, canvasHeight, stageBounds.height);
      // Matches the canvas's expansion so a link to a node the user has
      // dragged out past the original stage edge (now possible — see the
      // drag handling below) still draws instead of getting clipped at
      // the old, smaller box. The viewBox origin shifts to match too, so
      // svg-internal coordinates keep meaning exactly the same graph-space
      // stage pixels a node's x/y already are — no separate coordinate
      // translation needed anywhere link positions get set.
      svg!.style.left = `${-margins.x}px`;
      svg!.style.top = `${-margins.y}px`;
      svg!.setAttribute("viewBox", `${-margins.x} ${-margins.y} ${canvasWidth} ${canvasHeight}`);
      svg!.setAttribute("width", `${canvasWidth}`);
      svg!.setAttribute("height", `${canvasHeight}`);
      // #node-layer itself was never resized to match — it kept the CSS
      // `inset: 0` box, sized to the original (un-expanded) stage. That's
      // each module button's *containing block*, and a .module-node has no
      // explicit width, only `left`/`top` (set in placeNodeEl) — per the
      // CSS shrink-to-fit sizing algorithm for an absolutely positioned,
      // width:auto box, the "available width" it wraps its text against is
      // the containing block's width minus its own `left`. Once a node's
      // graph-space x pushed its `left` close to (or past) that original,
      // too-small containing width, the available width collapsed toward
      // zero and the browser wrapped its text as tightly as possible —
      // shrinking the box even though the *screen* had plenty of room,
      // because that room only existed via pan/zoom, not in node-layer's
      // own un-expanded box. Left/top stay put (0, matching inset: 0's
      // implied position — every node's x/y is already authored against
      // that origin) and width/height grow, rightward/downward, past the
      // pan world's own edge by maxNodeWidth — matching the edge exactly
      // isn't enough, since a node sitting right at that edge would still
      // have ~0 available width and get squeezed the same way; the extra
      // node-width's worth of headroom is what actually removes the cap.
      nodeLayer!.style.left = "0px";
      nodeLayer!.style.top = "0px";
      nodeLayer!.style.width = `${stageBounds.width + margins.x + maxNodeWidth}px`;
      nodeLayer!.style.height = `${stageBounds.height + margins.y + maxNodeWidth}px`;
    } else {
      canvas!.style.left = "";
      canvas!.style.top = "";
      canvas!.style.width = "";
      canvas!.style.height = "";
      const canvasBounds = canvas!.getBoundingClientRect();
      scene.resize(canvasBounds.width || stageBounds.width, canvasBounds.height || stageBounds.height);
      svg!.style.left = "";
      svg!.style.top = "";
      svg!.setAttribute("viewBox", `0 0 ${stageBounds.width} ${stageBounds.height}`);
      svg!.setAttribute("width", `${stageBounds.width}`);
      svg!.setAttribute("height", `${stageBounds.height}`);
      nodeLayer!.style.left = "";
      nodeLayer!.style.top = "";
      nodeLayer!.style.width = "";
      nodeLayer!.style.height = "";
    }
    syncCoreRadius(); // before resize() — the collide/avoid forces read it on the very next tick
    graphSim.resize({ width: stageBounds.width, height: stageBounds.height });
    // A resize re-settles every node into new positions, so keeping the old
    // pan/zoom framing would point the camera at coordinates that no longer
    // mean anything — reset rather than leave the view looking at empty
    // space or a now-relocated node.
    view.reset();
  }

  function handleBeforePreparation(event: TransitionBeforePreparationEvent): void {
    const trigger = event.sourceElement?.closest<HTMLElement>(".module-trigger[data-node-id]");
    if (!trigger || !introComplete || isTransitioning) return;

    const id = trigger.dataset.nodeId!;
    setActive(id);
    isTransitioning = true;
    document.body.classList.add("is-transitioning");
    scene.beginTransitionOut();

    const originalLoader = event.loader;
    event.loader = async () => {
      await sleep(780);
      await originalLoader();
    };
  }

  // ---- pan/zoom + node drag (page-local elements — discarded with the page, no cleanup needed) ----
  // `dragMoved` is what tells a node's own click handler (below) whether the
  // pointerdown-to-pointerup on it was a real drag (pan the view or move
  // the node, don't navigate) or a real click (navigate) — the same
  // threshold-based disambiguation any draggable-map UI needs, since a
  // press-and-release with a couple of pixels of jitter should still count
  // as a click. Which of the two a drag means depends on where it started:
  // on empty stage, it pans the camera; starting on a node, it repositions
  // that node instead (Obsidian-style manual layout) and leaves the camera
  // alone.
  let isPointerDown = false;
  let dragMoved = false;
  let dragTarget: SimNode | null = null;
  let dragLastX = 0;
  let dragLastY = 0;

  stage.addEventListener("pointerdown", (event) => {
    if (!introComplete || event.button !== 0) return;
    // A drag starting on the zoom/reset controls isn't a graph pan —
    // leave those buttons to behave like plain buttons.
    if ((event.target as HTMLElement).closest(".view-controls")) return;
    const triggerEl = (event.target as HTMLElement).closest<HTMLElement>(".module-trigger[data-node-id]");
    dragTarget = triggerEl ? (simById.get(triggerEl.dataset.nodeId!) ?? null) : null;
    isPointerDown = true;
    dragMoved = false;
    dragLastX = event.clientX;
    dragLastY = event.clientY;
    // Deliberately no preventDefault()/setPointerCapture() here yet — both
    // were tried eagerly on every pointerdown to stop text selection, but
    // that also intercepted normal clicks: a button needed two clicks to
    // register, and a node stopped navigating on a plain click, because
    // capturing the pointer on the stage before we even know this is a
    // drag hijacks the click-synthesis that would otherwise fire on the
    // actual target underneath the pointer. Deferred to pointermove below,
    // once a real drag is confirmed — text selection is already handled
    // separately by CSS (user-select: none on .core-viewport), which
    // doesn't have this problem since it blocks selection outright rather
    // than needing to intercept the pointer.
  });

  stage.addEventListener("pointermove", (event) => {
    if (!introComplete) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    const dist = Math.hypot(pointer.x, pointer.y);
    coreHovering = dist < 0.28;
    if (!coreHovering) coreHoverTime = 0;

    if (isPointerDown) {
      const dx = event.clientX - dragLastX;
      const dy = event.clientY - dragLastY;
      if (!dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (!dragMoved) {
        dragMoved = true;
        // Now that this is confirmed to be a real drag (not a click that
        // wiggled a couple of pixels), take over the pointer so the rest
        // of the gesture keeps tracking even if it leaves the stage.
        stage.setPointerCapture(event.pointerId);
        if (dragTarget) {
          // Pin the node under the pointer and reheat the simulation —
          // the same start-of-drag move d3-force's own drag examples use,
          // so every other node keeps flowing around wherever the user
          // is putting this one for the whole gesture, live.
          dragTarget.fx = dragTarget.x;
          dragTarget.fy = dragTarget.y;
          dragTarget.manuallyPlaced = true;
          graphSim.simulation.alphaTarget(0.3).restart();
          setActive(dragTarget.id);
        } else {
          viewport.classList.add("is-panning");
        }
      }
      dragLastX = event.clientX;
      dragLastY = event.clientY;

      if (dragTarget) {
        // Screen-space pointer movement to graph-space, so the node
        // tracks the cursor 1:1 regardless of the current zoom level.
        const bounds = currentBounds();
        const margins = computeMargins(bounds);
        const minX = -margins.x;
        const maxX = bounds.width + margins.x;
        const minY = -margins.y;
        const maxY = bounds.height + margins.y;
        dragTarget.fx = Math.min(maxX, Math.max(minX, (dragTarget.fx ?? dragTarget.x!) + dx / view.currentScale));
        dragTarget.fy = Math.min(maxY, Math.max(minY, (dragTarget.fy ?? dragTarget.y!) + dy / view.currentScale));
        // The one thing a drag must never be able to place a node on top
        // of: the core itself, which can't be released or pushed aside
        // the way everything else in the graph now can (it's the one true
        // anchor — see isAnchor() in graph-simulation.ts). Clamping this
        // live, every frame, means a drag toward the core simply can't
        // reach it — it stops right at the core's edge as you approach,
        // like hitting an invisible wall — instead of landing there and
        // needing a correction after the fact once the simulation notices
        // (which is what "pushed out ~5s later, with a teleport" was:
        // nothing was checking this during the drag or at drop, so the
        // only thing that ever caught it was the hard-guarantee pass on
        // the simulation's "end" event, which doesn't fire until alpha
        // has fully decayed).
        if (coreSim) {
          const cdx = dragTarget.fx! - coreSim.x!;
          const cdy = dragTarget.fy! - coreSim.y!;
          const cdist = Math.hypot(cdx, cdy);
          const coreMinDist = coreSim.radius + COLLIDE_PADDING + dragTarget.radius + COLLIDE_PADDING + CORE_CLEARANCE_MARGIN;
          if (cdist < coreMinDist) {
            const cux = cdist > 0.01 ? cdx / cdist : 1;
            const cuy = cdist > 0.01 ? cdy / cdist : 0;
            dragTarget.fx = coreSim.x! + cux * coreMinDist;
            dragTarget.fy = coreSim.y! + cuy * coreMinDist;
          }
        }
        // Live, not just at drop: anything the dragged node passes over
        // that's pinned from an earlier manual placement gets released
        // right now, so it starts reacting to the collide force — which
        // is already running every tick throughout this drag — the same
        // moment a never-touched node under the cursor already does,
        // instead of only once the pointer lifts.
        releasePinnedOverlaps(dragTarget);
      } else {
        view.pan(dx, dy);
      }
    }
  });

  function endDrag(event: PointerEvent): void {
    if (!isPointerDown) return;
    isPointerDown = false;
    viewport.classList.remove("is-panning");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (dragTarget) {
      const dropped = dragTarget;
      dragTarget = null;
      // Catches the exact drop position — the live releasePinnedOverlaps
      // calls during pointermove above handle everything the node passed
      // over on the way, but the very last position (where the pointer
      // actually lifted) is only checked here.
      releasePinnedOverlaps(dropped);
      // A previous version of this gave a previously-pinned neighbor a
      // full, immediate position correction of its own, right here — it
      // did stop it from being a permanent obstacle, but as a one-shot
      // pairwise fix it only ever checked *this* pair: the corrected spot
      // could still land on top of, or too close to, some third node nearby
      // that this loop never looked at, and the correction itself was an
      // instant jump rather than a bounce. releasePinnedOverlaps replaces
      // all of that: it just lets go of the pin, and the ordinary,
      // already-running collide force — which naturally checks every node
      // against every other node, every tick, not just the pair that
      // triggered this — smoothly carries it clear, live, exactly the way
      // a never-touched node already moves. The kick below is only for a
      // genuinely free node (never dragged, so never pinned in the first
      // place) still overlapping — a light nudge so its bounce starts
      // snappy instead of waiting for collide's own gradual per-tick
      // build-up.
      for (const other of simNodes) {
        if (other === dropped || other.type === "core" || other.fx != null) continue;
        const dx = other.x! - dropped.x!;
        const dy = other.y! - dropped.y!;
        const dist = Math.hypot(dx, dy);
        const minDist = other.radius + dropped.radius + COLLIDE_PADDING * 2;
        if (dist >= minDist) continue;
        const ux = dist > 0.01 ? dx / dist : Math.random() * 2 - 1;
        const uy = dist > 0.01 ? dy / dist : Math.random() * 2 - 1;
        // Reduced again (0.3 -> 0.15) — should read as barely nudging the
        // other node aside, not pushing it away; it only has to move
        // enough to stop touching, and with COLLIDE_PADDING now down to 2
        // that's already a small distance most of the time.
        const push = (minDist - dist) * 0.15;
        other.vx = (other.vx ?? 0) + ux * push;
        other.vy = (other.vy ?? 0) + uy * push;
      }
      // Collide/boundary/coreClearance/avoidRects all run at full strength
      // regardless of alpha (see their own comments — none of them are
      // alpha-scaled, on purpose), so any bounce triggered above will keep
      // resolving tick after tick even as alpha decays. This just
      // guarantees a minimum amount of *time* — ticks — for it to visibly
      // play out before the simulation goes quiet, rather than however
      // much happened to be left over from the drag itself.
      graphSim.simulation.alphaTarget(0).alpha(Math.max(graphSim.simulation.alpha(), 0.4));
      // The dropped node itself stays exactly where it was dropped (fx/fy
      // remain set) — a deliberate, sticky placement rather than springing
      // back into the automatic layout. Anything released above is sticky
      // too, just not yet — it gets re-pinned wherever it settles once the
      // simulation actually goes quiet (see the "end" handler above).
    }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    coreHovering = false;
    coreHoverTime = 0;
  });

  // Scroll to zoom, centered on the cursor — the one thing a raw CSS
  // transform can't infer on its own, so the anchor math lives in
  // ViewTransform.zoomBy() and this handler just supplies the cursor point.
  stage.addEventListener(
    "wheel",
    (event) => {
      if (!introComplete) return;
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0018);
      view.zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top);
    },
    { passive: false },
  );

  stage.addEventListener("dblclick", (event) => {
    // Same guard pointerdown already has, for the same reason: the zoom
    // buttons are DOM descendants of the stage, so a real double-click
    // on one of them (two ordinary clicks close enough together — easy
    // to do zooming in repeatedly) fires a native "dblclick" that
    // bubbles up here too, on top of the two click events each button
    // already handled correctly on its own. Without this, that
    // double-click-shaped input pattern reset the view mid-zoom, which
    // read as "using + a few times off-center randomly snaps back to
    // center" — nothing to do with zoom level or how far the view had
    // panned, just how close together the clicks landed.
    if (
      !introComplete ||
      (event.target as HTMLElement).closest(".module-trigger") ||
      (event.target as HTMLElement).closest(".view-controls")
    )
      return;
    view.reset();
  });

  const zoomInButton = document.getElementById("view-zoom-in");
  const zoomOutButton = document.getElementById("view-zoom-out");
  const zoomResetButton = document.getElementById("view-zoom-reset");
  zoomInButton?.addEventListener("click", () => {
    const rect = stage.getBoundingClientRect();
    view.zoomBy(1.3, rect.width / 2, rect.height / 2);
  });
  zoomOutButton?.addEventListener("click", () => {
    const rect = stage.getBoundingClientRect();
    view.zoomBy(1 / 1.3, rect.width / 2, rect.height / 2);
  });
  zoomResetButton?.addEventListener("click", () => view.reset());

  // ---- interaction wiring (page-local elements — discarded with the page, no cleanup needed) ----
  document.querySelectorAll<HTMLElement>(".module-trigger[data-node-id]").forEach((trigger) => {
    const id = trigger.dataset.nodeId!;
    const node = byId.get(id);
    if (!node) return;

    trigger.addEventListener("mouseenter", () => {
      if (introComplete) setActive(id);
    });
    trigger.addEventListener("focus", () => {
      if (introComplete) setActive(id);
    });
    // A drag that started on top of a node must not also navigate — this is
    // the only click-related handling this component owns; everything else
    // (modifier-clicks, missing routes, the actual navigation) is still
    // Astro ClientRouter's job via the astro:before-preparation hook below.
    trigger.addEventListener("click", (event) => {
      if (dragMoved) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });

  // ---- ambient render loop: Three.js core + edge particle flow only.
  // Node/edge *positions* are driven by the simulation's own tick above and
  // stop updating once it converges — this loop keeps running for the
  // decorative motion (core pulse, particles sliding along the now-static
  // lines) that's meant to be perpetual regardless of layout stability. ----
  let lastTime = performance.now();
  let rafId = 0;
  let cancelled = false;
  function tick(now: number): void {
    if (cancelled) return;
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    parallax.x += (pointer.x - parallax.x) * 0.04;
    parallax.y += (pointer.y - parallax.y) * 0.04;
    if (coreHovering) coreHoverTime += dt;

    scene.parallaxX = parallax.x;
    scene.parallaxY = parallax.y;
    scene.coreHovering = coreHovering;
    scene.coreHoverTime = coreHoverTime;
    scene.introComplete = introComplete;
    scene.render(now);

    edges.tickParticles(dt);

    rafId = requestAnimationFrame(tick);
  }

  active = {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      graphSim.simulation.stop();
    },
    updateStageSize: () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateStageSize, RESIZE_DEBOUNCE_MS);
    },
    handleBeforePreparation,
  };

  // Every node's radius was measured (above, building `sizes`) the instant
  // this function ran — before "Space Grotesk" (loaded with
  // font-display: swap, see BaseLayout.astro) has necessarily finished
  // downloading. Until it does, the browser measures each button using a
  // fallback font's metrics, narrower or wider per character than the real
  // one; normally that rounds away to nothing, but for a longer title the
  // accumulated difference is enough that the collide radius physics is
  // using no longer matches what actually renders once the swap happens —
  // one node's real edge can end up behind a neighbor's despite physics
  // reporting zero overlap, now that there's much less padding cushioning
  // that kind of drift (see COLLIDE_PADDING). Not worth blocking the whole
  // boot sequence on a network font load to avoid — instead, re-measure
  // once the fonts actually in use have settled, and only if a radius
  // genuinely changed, correct it and re-run the hard guarantee once.
  document.fonts.ready.then(() => {
    if (cancelled) return;
    let changed = false;
    nodeEls.forEach((el, id) => {
      const node = simById.get(id);
      if (!node) return;
      const radius = Math.hypot(el.offsetWidth || 150, el.offsetHeight || 56) / 2;
      if (Math.abs(radius - node.radius) > 1) {
        node.radius = radius;
        changed = true;
      }
    });
    if (changed) {
      enforceHardBounds(simNodes, currentBounds(), readAvoidRects());
      simNodes.forEach(placeNodeEl);
      edges.update(simById);
    }
  });

  // ---- boot ----
  updateStageSize();
  scene.introStep = 0;
  rafId = requestAnimationFrame(tick);

  if (coreHasBooted) {
    scene.setStarsVisible(true);
    scene.fastForwardToReady();
    scene.beginReturnTransition();
    boot.fastForwardReady();
    introComplete = true;
    setActive(activeId);
  } else {
    scene.setStarsVisible(false);
    boot.enterAwaitingStart(() => {
      coreHasBooted = true;
      // Deliberately not turned on here — the startup gate's own content
      // stays visible behind the closing doors (see the "keep the
      // startup gate visible during CLOSING" fix), and its background
      // is semi-transparent, so stars turned on this early were already
      // bleeding through it, showing up behind "Start System" itself.
      // BootSequence now calls setStarsVisible(true) itself (the
      // onOpeningStart callback passed into it above) at the one moment
      // that's actually supposed to reveal them: when the doors start
      // opening again, not when they start closing.
      boot.begin(() => scene.startIntro());
    });
  }
}

// Registered exactly once — the module only ever evaluates once (Astro's
// ClientRouter navigations don't re-run already-loaded modules), so these
// delegate to whichever CoreInstance is current instead of being re-added
// per visit.
window.addEventListener("resize", () => active?.updateStageSize());
document.addEventListener("astro:before-preparation", ((event: TransitionBeforePreparationEvent) => {
  active?.handleBeforePreparation(event);
}) as EventListener);
