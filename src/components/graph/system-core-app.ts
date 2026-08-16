import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import { CoreScene } from "./core-scene";
import { EdgeLayer } from "./edge-layer";
import { BootSequence, type BootStrings } from "./boot-sequence";
import { resolveLayout } from "./graph-engine";
import type { GraphNodeData, ResolvedNode } from "./types";

const NODE_PAD = 18;
const NODE_BOTTOM_SAFE = 170;
const CORE_HOVER_RADIUS = 0.28;

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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
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
 * commit message.
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
 * sessionStorage would have gotten this backwards: it survives a reload
 * just as much as a soft navigation, so refreshing the page would have
 * silently skipped the boot sequence too.
 */
let coreHasBooted = false;

export function bootSystemCore(): void {
  active?.cancel();
  active = null;

  const dataEl = document.getElementById("sc-data");
  const stage = document.getElementById("core-stage") as HTMLElement | null;
  const canvas = document.getElementById("core-canvas") as HTMLCanvasElement | null;
  const svg = document.getElementById("node-links") as unknown as SVGSVGElement | null;
  const coreCenter = document.getElementById("core-center");
  const nodeLayer = document.getElementById("node-layer");
  if (!dataEl || !stage || !canvas || !svg || !coreCenter || !nodeLayer) return; // not on the Core page

  const payload = JSON.parse(dataEl.textContent || "{}") as ScPayload;
  const nodes = payload.nodes;
  const resolvedNodes = resolveLayout(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const nodeEls = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>(".module-trigger[data-node-id]").forEach((el) => {
    // desktop node-layer buttons only (mobile list doesn't need pixel placement)
    if (el.closest("#node-layer")) nodeEls.set(el.dataset.nodeId!, el);
  });

  const scene = new CoreScene(canvas);
  const edges = new EdgeLayer(svg);
  edges.build(Array.from(resolvedNodes.values()));

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
      if (step === 5) edges.update(resolvedNodes, pixelPositions(), corePixelCenter());
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

  function corePixelCenter(): { x: number; y: number } {
    const centerRect = coreCenter!.getBoundingClientRect();
    const stageRect = stage!.getBoundingClientRect();
    return {
      x: centerRect.left - stageRect.left + centerRect.width / 2,
      y: centerRect.top - stageRect.top + centerRect.height / 2,
    };
  }

  function pixelPositions(): Map<string, { x: number; y: number }> {
    const stageRect = stage!.getBoundingClientRect();
    const result = new Map<string, { x: number; y: number }>();
    resolvedNodes.forEach((node, id) => {
      if (node.type === "core") {
        result.set(id, corePixelCenter());
        return;
      }
      const el = nodeEls.get(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      result.set(id, {
        x: rect.left - stageRect.left + rect.width / 2,
        y: rect.top - stageRect.top + rect.height / 2,
      });
    });
    return result;
  }

  function placeNode(node: ResolvedNode, driftX = 0, driftY = 0): void {
    const el = nodeEls.get(node.id);
    if (!el) return;
    const rect = stage!.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const rawX = node.resolvedPosition.x * rect.width - w / 2 + driftX;
    const rawY = node.resolvedPosition.y * rect.height - h / 2 + driftY;
    el.style.left = `${clamp(rawX, NODE_PAD, rect.width - w - NODE_PAD)}px`;
    el.style.top = `${clamp(rawY, NODE_PAD, rect.height - h - NODE_BOTTOM_SAFE)}px`;
  }

  function placeAllNodes(): void {
    resolvedNodes.forEach((node) => {
      if (node.type === "core") return;
      if (!introComplete) {
        placeNode(node);
        return;
      }
      const intensity = window.matchMedia("(max-width: 860px)").matches ? 5 : 9;
      const driftX = parallax.x * intensity * (0.18 + node.resolvedPosition.x);
      const driftY = parallax.y * intensity * (0.12 + node.resolvedPosition.y);
      placeNode(node, driftX, driftY);
    });
  }

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

  function updateStageSize(): void {
    const stageBounds = stage!.getBoundingClientRect();
    const canvasBounds = canvas!.getBoundingClientRect();
    scene.resize(canvasBounds.width || stageBounds.width, canvasBounds.height || stageBounds.height);
    svg!.setAttribute("viewBox", `0 0 ${stageBounds.width} ${stageBounds.height}`);
    svg!.setAttribute("width", `${stageBounds.width}`);
    svg!.setAttribute("height", `${stageBounds.height}`);
    placeAllNodes();
    edges.update(resolvedNodes, pixelPositions(), corePixelCenter());
    setActive(activeId);
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
    coreHovering = dist < CORE_HOVER_RADIUS;
    if (!coreHovering) coreHoverTime = 0;
  });

  stage.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    coreHovering = false;
    coreHoverTime = 0;
  });

  // ---- unified render loop ----
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

    if (introComplete && !isTransitioning) {
      placeAllNodes();
      edges.update(resolvedNodes, pixelPositions(), corePixelCenter());
    }
    edges.tickParticles(dt);

    rafId = requestAnimationFrame(tick);
  }

  active = {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    },
    updateStageSize,
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
