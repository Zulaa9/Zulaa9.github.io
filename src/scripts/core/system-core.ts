/**
 * System Core: arranque animado, nodos de módulos, enlaces SVG y animación de
 * la escena 3D. Es el antiguo main.js, ahora con los nodos generados a partir
 * del contenido y con ciclo de vida explícito (pausa con la pestaña oculta y
 * liberación de recursos al salir de la página).
 */
import { MathUtils } from 'three';
import { createCoreScene, LIGHTS, type CoreScene } from './scene';
import { CORE_STARTED_KEY, initShell, prefersReducedMotion, startMeteorLoop } from '../shell';

interface CoreNode {
  id: string;
  href: string;
  dock: { title: string; copy: string };
  parent?: string;
  position: { x: number; y: number };
  featured: boolean;
}

interface CoreData {
  nodes: CoreNode[];
  defaultActive: string;
  status: Record<'online' | 'offline' | 'booting' | 'loading' | 'syncing', string>;
  bootLines: string[];
  threeError: { title: string; copy: string };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const smootherstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
const getCoreBaseScale = () => (isMobile() ? 0.52 : 1);

export function initSystemCore(): void {
  const dataEl = document.getElementById('core-data');
  if (!dataEl?.textContent) return;
  const data = JSON.parse(dataEl.textContent) as CoreData;

  const body = document.body;
  const stage = document.getElementById('core-stage') as HTMLElement;
  const canvas = document.getElementById('core-canvas') as HTMLCanvasElement;
  const linksSvg = document.getElementById('node-links') as unknown as SVGSVGElement;
  const coreCenter = document.getElementById('core-center') as HTMLElement;
  const infoTitle = document.getElementById('dock-title') as HTMLElement;
  const infoCopy = document.getElementById('dock-copy') as HTMLElement;
  const bootSequence = document.getElementById('boot-sequence');
  const bootLog = document.getElementById('boot-log');
  const bootProgressFill = document.getElementById('boot-progress-fill');
  const bootProgressText = document.getElementById('boot-progress-text');
  const coreStatusText = document.getElementById('core-status-text');
  const startCoreButton = document.getElementById('start-core-button') as HTMLButtonElement | null;
  const coreCopy = document.querySelector<HTMLElement>('.core-copy');
  const infoDock = document.getElementById('info-dock');

  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const desktopNodes = [...document.querySelectorAll<HTMLElement>('.module-node')];
  const moduleTriggers = [...document.querySelectorAll<HTMLAnchorElement>('.module-trigger')];
  const entrySource = (new URLSearchParams(location.search).get('from') || '').toLowerCase();
  const returningFromModule = nodeById.has(entrySource);
  // Vista previa del panel de administración: muestra el Core ya arrancado.
  const previewMode = import.meta.env.DEV && entrySource === '__admin';
  let startedBeforeLangSwitch = false;
  try {
    startedBeforeLangSwitch = sessionStorage.getItem(CORE_STARTED_KEY) === '1';
    sessionStorage.removeItem(CORE_STARTED_KEY);
  } catch {
    // Ignorar.
  }

  initShell();

  const state = {
    statusKey: 'offline' as keyof CoreData['status'],
    statusProgress: 0,
    pointerX: 0,
    pointerY: 0,
    parallaxX: 0,
    parallaxY: 0,
    active: '',
    isTransitioning: false,
    transitionStart: 0,
    introStep: 0,
    introComplete: false,
    hasDrawnIntroLinks: false,
    introStartTime: 0,
    introDurationMs: 3440,
    spinX: 0,
    spinY: 0,
    coreHovering: false,
    coreHoverTime: 0,
    spinCooldown: 0,
    spinBurstTime: 0,
    coreImpulse: 0,
    isReturnTransition: false,
    returnStartTime: 0,
    returnDurationMs: 760,
    hasManualStart: false,
  };

  let three: CoreScene | null = null;
  try {
    three = createCoreScene(canvas);
  } catch (error) {
    console.warn('System Core: WebGL no disponible.', error);
  }

  const linesByNode = new Map<string, { line: SVGLineElement; particle: SVGCircleElement; progress: number; speed: number }>();
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  function setCoreStatus(key: keyof CoreData['status'], progress = 0) {
    state.statusKey = key;
    state.statusProgress = progress;
    if (coreStatusText) coreStatusText.textContent = data.status[key].replace('{progress}', String(progress));
  }

  /** Coloca un nodo dentro del escenario sin tapar los paneles inferiores. */
  function placeNodeWithBounds(node: HTMLElement, pos: { x: number; y: number }, rect: { width: number; height: number }, offsetX = 0, offsetY = 0) {
    const pad = 18;
    const bottomSafe = 170;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    // La posición del módulo corresponde al punto de anclaje; la etiqueta se extiende hacia fuera.
    const anchor = node.querySelector<HTMLElement>('.node-anchor');
    const ax = anchor ? anchor.offsetLeft + anchor.offsetWidth / 2 : w / 2;
    const ay = anchor ? anchor.offsetTop + anchor.offsetHeight / 2 : h / 2;
    const x = clamp(pos.x * rect.width - ax + offsetX, pad, rect.width - w - pad);
    let y = clamp(pos.y * rect.height - ay + offsetY, pad, rect.height - h - bottomSafe);

    // Corrección: si el nodo invade el panel de texto o el de módulo, sube por encima.
    for (const panel of panelRects) {
      const overlapsX = x < panel.right && x + w > panel.left;
      const overlapsY = y < panel.bottom && y + h > panel.top;
      if (overlapsX && overlapsY) y = Math.max(pad, panel.top - h - 10);
    }
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  }

  let panelRects: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  function measurePanels() {
    const stageRect = stage.getBoundingClientRect();
    panelRects = [coreCopy, infoDock]
      .filter((el): el is HTMLElement => !!el)
      .map((el) => {
        // offsetTop/offsetLeft ignoran el desplazamiento de la animación de entrada.
        return { left: el.offsetLeft, right: el.offsetLeft + el.offsetWidth, top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight };
      })
      .filter(() => stageRect.width > 0);
  }

  function centerOf(el: Element, stageRect: DOMRect) {
    const r = el.getBoundingClientRect();
    return { x: r.left - stageRect.left + r.width / 2, y: r.top - stageRect.top + r.height / 2 };
  }

  function placeNodes() {
    const rect = stage.getBoundingClientRect();
    desktopNodes.forEach((node) => {
      const n = nodeById.get(node.dataset.target ?? '');
      if (n) placeNodeWithBounds(node, n.position, rect);
    });
    if (!linesByNode.size) createLinks();
    updateLinks();
  }

  function createLinks() {
    const stageRect = stage.getBoundingClientRect();
    const c = centerOf(coreCenter, stageRect);
    desktopNodes.forEach((node) => {
      const id = node.dataset.target ?? '';
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', `${c.x}`);
      line.setAttribute('y1', `${c.y}`);
      line.setAttribute('x2', `${c.x}`);
      line.setAttribute('y2', `${c.y}`);
      line.setAttribute('class', 'link-line');
      if (!nodeById.get(id)?.parent) line.classList.add('link-line--primary');
      const particle = document.createElementNS(SVG_NS, 'circle');
      particle.setAttribute('r', '2.1');
      particle.setAttribute('cx', `${c.x}`);
      particle.setAttribute('cy', `${c.y}`);
      particle.setAttribute('class', 'link-particle');
      linksSvg.appendChild(line);
      linksSvg.appendChild(particle);
      linesByNode.set(id, { line, particle, progress: Math.random(), speed: 0.22 + Math.random() * 0.3 });
    });
  }

  function updateLinks(animate = false) {
    const stageRect = stage.getBoundingClientRect();
    const c = centerOf(coreCenter, stageRect);
    const centers = new Map(desktopNodes.map((n) => [n.dataset.target ?? '', centerOf(n.querySelector('.node-anchor') ?? n, stageRect)]));

    desktopNodes.forEach((node) => {
      const id = node.dataset.target ?? '';
      const entry = linesByNode.get(id);
      if (!entry) return;
      const { line } = entry;
      const n = centers.get(id)!;
      const parent = nodeById.get(id)?.parent;
      const start = (parent && centers.get(parent)) || c;
      line.setAttribute('x1', `${start.x}`);
      line.setAttribute('y1', `${start.y}`);
      line.setAttribute('x2', `${n.x}`);
      line.setAttribute('y2', `${n.y}`);
      if (animate) {
        const length = Math.hypot(n.x - start.x, n.y - start.y);
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;
        requestAnimationFrame(() => {
          line.style.transition = 'stroke-dashoffset 680ms cubic-bezier(0.22, 1, 0.36, 1)';
          line.style.strokeDashoffset = '0';
        });
      } else {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        line.style.transition = '';
      }
    });
    setActive(state.active || data.defaultActive);
  }

  function updateStageSize() {
    const stageBounds = stage.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const w = canvasBounds.width || stageBounds.width;
    const h = canvasBounds.height || stageBounds.height;
    if (three && w > 0 && h > 0) {
      three.renderer.setSize(w, h, false);
      three.camera.aspect = w / h;
      three.camera.updateProjectionMatrix();
    }
    linksSvg.setAttribute('viewBox', `0 0 ${stageBounds.width} ${stageBounds.height}`);
    linksSvg.setAttribute('width', `${stageBounds.width}`);
    linksSvg.setAttribute('height', `${stageBounds.height}`);
    measurePanels();
    placeNodes();
  }

  function setActive(target: string) {
    const changed = state.active !== target;
    state.active = target;
    const node = nodeById.get(target);
    const activeLines = new Set([target]);
    if (node?.parent) activeLines.add(node.parent);
    if (node) {
      infoTitle.textContent = node.dock.title;
      infoCopy.textContent = node.dock.copy;
    }
    desktopNodes.forEach((n) => n.classList.toggle('is-active', n.dataset.target === target));
    linesByNode.forEach((entry, key) => {
      const on = activeLines.has(key);
      entry.line.classList.toggle('active', on);
      entry.particle.classList.toggle('active', on);
    });
    if (changed && state.introComplete && !state.isTransitioning) state.coreImpulse = 1;
  }

  function setIntroStep(step: number) {
    state.introStep = step;
    body.classList.add(`intro-step-${step}`);
    if (step === 5 && !state.hasDrawnIntroLinks) {
      state.hasDrawnIntroLinks = true;
      updateLinks(true);
    }
    if (step === 6) {
      state.introComplete = true;
      body.classList.remove('intro-running', 'core-syncing');
      body.classList.add('intro-complete');
      setCoreStatus('online');
    }
  }

  function runIntro() {
    if (prefersReducedMotion()) {
      for (let s = 1; s <= 6; s += 1) setIntroStep(s);
      return;
    }
    body.classList.add('intro-running');
    state.introStartTime = performance.now() + 80;
    [80, 980, 1580, 2200, 2820, 3440].forEach((at, i) => later(() => setIntroStep(i + 1), at));
  }

  async function runBootSequence() {
    if (!bootSequence || !bootLog || !bootProgressFill || !bootProgressText) return;
    if (three) three.starsMesh.visible = true;
    if (prefersReducedMotion()) {
      bootSequence.remove();
      body.classList.remove('booting');
      return;
    }
    body.classList.remove('awaiting-start', 'core-offline');
    body.classList.add('booting', 'boot-offline');
    startMeteorLoop();
    setCoreStatus('offline');
    await sleep(220);
    body.classList.remove('boot-offline');
    body.classList.add('boot-loading');
    setCoreStatus('booting');

    const lines = data.bootLines;
    for (let i = 0; i < lines.length; i += 1) {
      const li = document.createElement('li');
      li.textContent = lines[i]!;
      bootLog.appendChild(li);
      if (bootLog.children.length > 8) bootLog.removeChild(bootLog.children[0]!);
      const progress = Math.round(((i + 1) / lines.length) * 100);
      bootProgressFill.style.width = `${progress}%`;
      bootProgressText.textContent = `${progress}%`;
      setCoreStatus('loading', progress);
      await sleep(180 + i * 24);
    }
    await sleep(340);
    body.classList.add('boot-unfold');
    await sleep(820);
    bootSequence.remove();
    body.classList.remove('booting', 'boot-offline', 'boot-loading');
    body.classList.add('core-syncing');
    setCoreStatus('syncing');
  }

  function beginSystemStartup() {
    if (state.hasManualStart) return;
    state.hasManualStart = true;
    body.classList.remove('awaiting-start', 'core-offline');
    if (startCoreButton) {
      startCoreButton.disabled = true;
      startCoreButton.setAttribute('aria-busy', 'true');
    }
    void runBootSequence().then(runIntro);
  }

  function enterAwaitingStart() {
    body.classList.add('awaiting-start', 'core-offline');
    setCoreStatus('offline');
    if (three) three.starsMesh.visible = false;
    if (startCoreButton) {
      startCoreButton.disabled = false;
      startCoreButton.removeAttribute('aria-busy');
      startCoreButton.addEventListener('click', beginSystemStartup, { once: true });
    }
  }

  function fastForwardToReadyState() {
    bootSequence?.remove();
    body.classList.remove('booting', 'boot-offline', 'boot-loading', 'boot-unfold', 'intro-running', 'core-syncing', 'core-offline', 'awaiting-start', 'is-transitioning');
    for (let s = 1; s <= 6; s += 1) body.classList.add(`intro-step-${s}`);
    body.classList.add('intro-complete');
    setCoreStatus('online');
    state.introStep = 6;
    state.introComplete = true;
    state.hasDrawnIntroLinks = true;
    state.isTransitioning = false;
    state.introStartTime = performance.now() - state.introDurationMs;
    if (three) {
      three.starsMesh.visible = true;
      three.camera.position.set(0, 0.15, 5.2);
      three.coreGroup.scale.setScalar(getCoreBaseScale());
      three.outer.material.opacity = 0.8;
      three.inner.material.opacity = 1;
      three.inner.material.emissiveIntensity = 1.2;
      three.shellWire.material.opacity = 0.22;
      three.setKeyIntensity(LIGHTS.keyIdle);
    }
    updateLinks(false);
  }

  function beginReturnTransition() {
    if (prefersReducedMotion() || !three) return;
    state.isReturnTransition = true;
    state.returnStartTime = performance.now();
    three.camera.position.set(0.25, -0.05, 2.55);
    three.coreGroup.scale.setScalar(getCoreBaseScale() * 1.35);
    body.classList.add('is-returning-from-keyping');
  }

  function navigateTo(href: string) {
    if (state.isTransitioning) return;
    if (prefersReducedMotion()) {
      location.assign(href);
      return;
    }
    state.isTransitioning = true;
    state.transitionStart = performance.now();
    body.classList.add('is-transitioning');
    later(() => location.assign(href), 780);
  }

  moduleTriggers.forEach((trigger) => {
    const target = trigger.dataset.target;
    if (!target) return;
    trigger.addEventListener('mouseenter', () => state.introComplete && setActive(target));
    trigger.addEventListener('focus', () => state.introComplete && setActive(target));
    trigger.addEventListener('click', (event) => {
      // Ctrl/Cmd/Mayús + clic o botón central: comportamiento normal del enlace.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (!state.introComplete) return;
      setActive(target);
      navigateTo(trigger.href);
    });
  });

  stage.addEventListener('pointermove', (event) => {
    if (!state.introComplete) return;
    const rect = stage.getBoundingClientRect();
    state.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    if (Math.hypot(state.pointerX, state.pointerY) < 0.28) {
      state.coreHoverTime += dtSafe();
      state.coreHovering = true;
    } else {
      state.coreHovering = false;
      state.coreHoverTime = 0;
    }
  });
  stage.addEventListener('pointerleave', () => {
    state.pointerX = 0;
    state.pointerY = 0;
    state.coreHovering = false;
    state.coreHoverTime = 0;
  });

  const onResize = () => updateStageSize();
  window.addEventListener('resize', onResize);

  // ---- Bucle de animación ----
  let rafId = 0;
  let running = false;
  let lastTime = performance.now();
  let dtSnapshot = 0;
  const dtSafe = () => Math.max(0.001, dtSnapshot || 0.016);

  function tick(now: number) {
    if (!running) return;
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    dtSnapshot = dt;
    state.parallaxX += (state.pointerX - state.parallaxX) * 0.04;
    state.parallaxY += (state.pointerY - state.parallaxY) * 0.04;

    if (state.introComplete && !state.isTransitioning && !state.isReturnTransition) {
      const rect = stage.getBoundingClientRect();
      const intensity = isMobile() ? 5 : 9;
      desktopNodes.forEach((node) => {
        const n = nodeById.get(node.dataset.target ?? '');
        if (!n) return;
        placeNodeWithBounds(node, n.position, rect, state.parallaxX * intensity * (0.18 + n.position.x), state.parallaxY * intensity * (0.12 + n.position.y));
      });
      updateLinks();
    }
    if (state.introStep >= 5) {
      linesByNode.forEach((entry) => {
        const x1 = Number(entry.line.getAttribute('x1'));
        const y1 = Number(entry.line.getAttribute('y1'));
        const x2 = Number(entry.line.getAttribute('x2'));
        const y2 = Number(entry.line.getAttribute('y2'));
        if (![x1, y1, x2, y2].every(Number.isFinite)) return;
        entry.progress += dt * entry.speed;
        if (entry.progress > 1) entry.progress -= 1;
        entry.particle.setAttribute('cx', `${x1 + (x2 - x1) * entry.progress}`);
        entry.particle.setAttribute('cy', `${y1 + (y2 - y1) * entry.progress}`);
      });
    }

    if (three) renderScene(now, dt, three);
    rafId = requestAnimationFrame(tick);
  }

  function renderScene(now: number, dt: number, s: CoreScene) {
    const { camera, coreGroup, outer, inner, shellWire, starsMesh } = s;
    const t = now * 0.001;
    const pulse = 1 + Math.sin(t * 2.25) * 0.03;
    const baseScale = getCoreBaseScale();

    if (state.isTransitioning) {
      const blend = smoothstep((now - state.transitionStart) / 900);
      camera.position.z = MathUtils.lerp(5.2, 2.55, blend);
      camera.position.x = MathUtils.lerp(0, 0.25, blend);
      camera.position.y = MathUtils.lerp(0.15, -0.05, blend);
      coreGroup.scale.setScalar(baseScale * (1 + blend * 0.35));
    } else if (state.isReturnTransition) {
      const progress = smoothstep((now - state.returnStartTime) / state.returnDurationMs);
      camera.position.z = MathUtils.lerp(2.55, 5.2, progress);
      camera.position.x = MathUtils.lerp(0.25, 0, progress);
      camera.position.y = MathUtils.lerp(-0.05, 0.15, progress);
      coreGroup.scale.setScalar(baseScale * MathUtils.lerp(1.35, 1, progress));
      if (progress >= 1) {
        state.isReturnTransition = false;
        body.classList.remove('is-returning-from-keyping');
      }
    } else if (!state.introComplete) {
      camera.position.z += (5.2 - camera.position.z) * 0.05;
      camera.position.x += (0 - camera.position.x) * 0.05;
      camera.position.y += (0.15 - camera.position.y) * 0.05;
      const introProgress = smootherstep((now - state.introStartTime) / state.introDurationMs);
      coreGroup.scale.setScalar(MathUtils.lerp(0.05, baseScale, introProgress));
    } else {
      camera.position.z += (5.2 - camera.position.z) * 0.04;
      camera.position.x += (state.parallaxX * 0.25 - camera.position.x) * 0.04;
      camera.position.y += (-state.parallaxY * 0.18 + 0.15 - camera.position.y) * 0.04;
      coreGroup.scale.x += (baseScale - coreGroup.scale.x) * 0.05;
      coreGroup.scale.y += (baseScale - coreGroup.scale.y) * 0.05;
      coreGroup.scale.z += (baseScale - coreGroup.scale.z) * 0.05;
    }

    state.spinCooldown = Math.max(0, state.spinCooldown - dt);
    if (state.introComplete && !state.isTransitioning && !state.isReturnTransition && state.coreHovering && state.coreHoverTime > 0.09 && state.spinCooldown <= 0 && state.spinBurstTime <= 0) {
      state.spinBurstTime = 0.22;
      state.spinCooldown = 0.8;
    }
    state.spinBurstTime = Math.max(0, state.spinBurstTime - dt);
    const burst = state.spinBurstTime > 0 ? Math.pow(state.spinBurstTime / 0.22, 0.75) : 0;
    state.spinY += dt * (0.22 + 2.8 * burst);
    state.spinX += dt * (0.08 + 0.9 * burst);
    state.coreImpulse += (0 - state.coreImpulse) * 0.1;
    coreGroup.rotation.y = state.spinY + state.parallaxX * 0.28;
    coreGroup.rotation.x = state.spinX - state.parallaxY * 0.2;
    coreGroup.position.x += (state.parallaxX * 0.16 - coreGroup.position.x) * 0.06;
    coreGroup.position.y += (-state.parallaxY * 0.12 - coreGroup.position.y) * 0.06;
    inner.rotation.y -= dt * 0.42;
    outer.rotation.x -= dt * 0.12;
    const boost = 1 + state.coreImpulse * 0.055;
    outer.scale.setScalar((state.introStep >= 2 ? pulse : 1) * boost);
    inner.scale.setScalar(boost * (1 + state.coreImpulse * 0.02));
    shellWire.rotation.y -= dt * 0.28;
    const wireTarget = state.introStep >= 4 ? 0.22 + Math.sin(t * 1.6) * 0.05 : 0;
    shellWire.material.opacity += (wireTarget - shellWire.material.opacity) * 0.08;
    outer.material.opacity += ((state.introStep >= 2 ? 0.8 : 0) - outer.material.opacity) * 0.08;
    inner.material.opacity += ((state.introStep >= 3 ? 1 : 0) - inner.material.opacity) * 0.1;
    inner.material.emissiveIntensity += ((state.introStep >= 3 ? 1.2 : 0) - inner.material.emissiveIntensity) * 0.1;
    s.setKeyIntensity(state.introStep >= 3 ? LIGHTS.keyIdle + Math.sin(t * 2.1) * LIGHTS.keyPulse + state.coreImpulse * LIGHTS.keyImpulse : 0);
    starsMesh.rotation.y += dt * 0.015;
    camera.lookAt(0, 0, 0);
    s.renderer.render(s.scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    stage.dataset.coreState = 'running';
    rafId = requestAnimationFrame(tick);
  }

  function stop(nextState: 'paused' | 'disposed') {
    running = false;
    cancelAnimationFrame(rafId);
    stage.dataset.coreState = nextState;
  }

  function dispose() {
    stop('disposed');
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    three?.dispose();
    three = null;
  }

  const onVisibility = () => (document.hidden ? stop('paused') : start());
  document.addEventListener('visibilitychange', onVisibility);

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) stop('paused');
    else dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    // Vuelta con el botón atrás desde la caché del navegador: no dejar el Core "saliendo".
    if (!three) {
      location.reload();
      return;
    }
    fastForwardToReadyState();
    start();
  });

  // ---- Arranque ----
  updateStageSize();
  setActive(data.defaultActive);

  if (!three) {
    infoTitle.textContent = data.threeError.title;
    infoCopy.textContent = data.threeError.copy;
    fastForwardToReadyState();
    startMeteorLoop();
    start();
    return;
  }

  if (previewMode || (startedBeforeLangSwitch && !returningFromModule)) {
    startMeteorLoop();
    fastForwardToReadyState();
  } else if (returningFromModule) {
    try {
      history.replaceState({}, '', location.pathname);
    } catch {
      // Ignorar.
    }
    startMeteorLoop();
    fastForwardToReadyState();
    beginReturnTransition();
  } else {
    enterAwaitingStart();
  }
  if (!document.hidden) start();
}
