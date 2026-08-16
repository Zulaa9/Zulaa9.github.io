import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { CoreScene } from "./core-scene";
import { EdgeLayer } from "./edge-layer";
import { BootSequence, type BootStrings } from "./boot-sequence";
import { buildSimNodes, createGraphSimulation, enforceHardBounds, type AvoidRect, type GraphSimulation } from "./graph-simulation";
import type { GraphNodeData, SimNode } from "./types";

const RESIZE_DEBOUNCE_MS = 220;

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
  if (!dataEl || !stage || !canvas || !svg || !nodeLayer) return; // not on the Core page

  const payload = JSON.parse(dataEl.textContent || "{}") as ScPayload;
  const byId = new Map(payload.nodes.map((n) => [n.id, n]));

  const nodeEls = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>(".module-trigger[data-node-id]").forEach((el) => {
    // desktop node-layer buttons only (mobile list doesn't need pixel placement)
    if (el.closest("#node-layer")) nodeEls.set(el.dataset.nodeId!, el);
  });

  // Real rendered size per node — collision uses this, never a guessed point.
  const sizes = new Map<string, { width: number; height: number }>();
  nodeEls.forEach((el, id) => sizes.set(id, { width: el.offsetWidth, height: el.offsetHeight }));

  function currentBounds() {
    const rect = stage!.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  const simNodes = buildSimNodes(payload.nodes, sizes, currentBounds());
  const simById = new Map(simNodes.map((n) => [n.id, n]));

  const scene = new CoreScene(canvas);
  const edges = new EdgeLayer(svg);
  edges.build(simNodes);

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
    const canvasBounds = canvas!.getBoundingClientRect();
    scene.resize(canvasBounds.width || stageBounds.width, canvasBounds.height || stageBounds.height);
    svg!.setAttribute("viewBox", `0 0 ${stageBounds.width} ${stageBounds.height}`);
    svg!.setAttribute("width", `${stageBounds.width}`);
    svg!.setAttribute("height", `${stageBounds.height}`);
    syncCoreRadius(); // before resize() — the collide/avoid forces read it on the very next tick
    graphSim.resize({ width: stageBounds.width, height: stageBounds.height });
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
    // Deliberately no click handler: modifier-clicks (new tab), missing
    // routes, and the actual navigation are all Astro ClientRouter's job.
    // Fighting it with our own preventDefault()+navigate() raced its native
    // handling and threw "InvalidStateError: Transition was aborted" — the
    // astro:before-preparation hook above is the correct way to inject the
    // camera-zoom delay without owning the navigation ourselves.
  });

  stage.addEventListener("pointermove", (event) => {
    if (!introComplete) return;
    const rect = stage.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    const dist = Math.hypot(pointer.x, pointer.y);
    coreHovering = dist < 0.28;
    if (!coreHovering) coreHoverTime = 0;
  });

  stage.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    coreHovering = false;
    coreHoverTime = 0;
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
      scene.setStarsVisible(true);
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
