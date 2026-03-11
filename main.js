const THREE = window.THREE;

if (!THREE) {
  const infoTitle = document.getElementById("dock-title");
  const infoCopy = document.getElementById("dock-copy");
  if (infoTitle) {
    infoTitle.textContent = "Three.js load error";
  }
  if (infoCopy) {
    infoCopy.textContent = "Could not load 3D engine. Check internet connection or use a local server.";
  }
  throw new Error("Three.js was not loaded.");
}

const body = document.body;
const stage = document.getElementById("core-stage");
const canvas = document.getElementById("core-canvas");
const linksSvg = document.getElementById("node-links");
const coreCenter = document.getElementById("core-center");
const infoTitle = document.getElementById("dock-title");
const infoCopy = document.getElementById("dock-copy");
const bootSequence = document.getElementById("boot-sequence");
const bootLog = document.getElementById("boot-log");
const bootProgressFill = document.getElementById("boot-progress-fill");
const bootProgressText = document.getElementById("boot-progress-text");
const coreStatusText = document.getElementById("core-status-text");
const startCoreButton = document.getElementById("start-core-button");
const meteorLayer = document.getElementById("meteor-layer");
const urlParams = new URLSearchParams(window.location.search);
const returningFromModule = ["keyping", "about", "contact", "projects"].includes((urlParams.get("from") || "").toLowerCase());
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";
const FALLBACK_LOCALES = {
  en: {
    systemCore: {
      page: {
        title: "Unax Zulaika | System Core",
        description: "System Core interface for Unax Zulaika Fuente portfolio and KeyPing flagship.",
      },
      identity: { role: "Software Systems Engineer" },
      startup: {
        eyebrow: "SYSTEM CORE // OFFLINE",
        title: "Manual startup required",
        copy: "Initialize the core runtime and load module graph.",
        cta: "Start System",
      },
      boot: {
        eyebrow: "SYSTEM CORE // INIT",
        lines: [
          "[sys] initializing core context",
          "[io] probing local environment",
          "[sec] validating entropy source",
          "[pkg] loading module map",
          "[core] handshake complete",
          "[core] system architecture online",
        ],
      },
      nodes: {
        keyping: { title: "KeyPing", meta: "Flagship" },
        about: { title: "About", meta: "Identity" },
        capabilities: { title: "Capabilities", meta: "Stack" },
        projects: { title: "Projects", meta: "Builds" },
        contact: { title: "Contact", meta: "Channel" },
        future: { title: "Future Builds", meta: "Locked" },
      },
      copy: {
        eyebrow: "SYSTEM ENTRY",
        title: "Interactive architecture view built around a real product core.",
        body: "This interface is not a static portfolio shell. It is a live system map where <strong>KeyPing</strong> acts as the primary operational node.",
      },
      dock: {
        label: "Module",
        defaultTitle: "Select a node",
        defaultCopy: "Hover or tap any module to inspect system context.",
      },
      mobile: {
        keyping: "KeyPing",
        about: "About",
        capabilities: "Capabilities",
        projects: "Projects",
        contact: "Contact",
        future: "Future",
      },
      modules: {
        keyping: { title: "KeyPing", copy: "Primary module. Open dedicated product view." },
        about: { title: "About", copy: "Engineer focused on practical software architecture, security boundaries and maintainable delivery." },
        capabilities: { title: "Capabilities", copy: "Electron desktop architecture, Angular frontend systems, secure local storage flows and build automation." },
        projects: { title: "Projects", copy: "Selected real builds with product intent, operational constraints and technical ownership." },
        contact: { title: "Contact", copy: "Direct technical conversations and collaboration opportunities." },
        future: { title: "Future Builds", copy: "Locked modules reserved for upcoming systems currently in development." },
      },
      status: {
        online: "SYSTEM CORE ONLINE",
        offline: "SYSTEM CORE OFFLINE",
        booting: "SYSTEM CORE BOOTING",
        loading: "SYSTEM CORE LOADING {progress}%",
        syncing: "SYSTEM CORE SYNCING VISUAL LAYER",
      },
    },
  },
  es: {
    systemCore: {
      page: {
        title: "Unax Zulaika | Nucleo del Sistema",
        description: "Interfaz de Nucleo del Sistema para el portfolio de Unax Zulaika Fuente y KeyPing.",
      },
      identity: { role: "Ingeniero de Sistemas de Software" },
      startup: {
        eyebrow: "NUCLEO DEL SISTEMA // APAGADO",
        title: "Arranque manual requerido",
        copy: "Inicializa el runtime del core y carga el grafo de modulos.",
        cta: "Iniciar Sistema",
      },
      boot: {
        eyebrow: "NUCLEO DEL SISTEMA // INICIO",
        lines: [
          "[sys] inicializando contexto del core",
          "[io] sondeando entorno local",
          "[sec] validando fuente de entropia",
          "[pkg] cargando mapa de modulos",
          "[core] handshake completado",
          "[core] arquitectura del sistema online",
        ],
      },
      nodes: {
        keyping: { title: "KeyPing", meta: "Principal" },
        about: { title: "Sobre mi", meta: "Identidad" },
        capabilities: { title: "Capacidades", meta: "Stack" },
        projects: { title: "Proyectos", meta: "Builds" },
        contact: { title: "Contacto", meta: "Canal" },
        future: { title: "Futuros Builds", meta: "Bloqueado" },
      },
      copy: {
        eyebrow: "ENTRADA DEL SISTEMA",
        title: "Vista de arquitectura interactiva construida alrededor de un core de producto real.",
        body: "Esta interfaz no es una portada estatica. Es un mapa de sistema vivo donde <strong>KeyPing</strong> actua como nodo operativo principal.",
      },
      dock: {
        label: "Modulo",
        defaultTitle: "Selecciona un nodo",
        defaultCopy: "Pasa el raton o toca cualquier modulo para inspeccionar su contexto.",
      },
      mobile: {
        keyping: "KeyPing",
        about: "Sobre mi",
        capabilities: "Capacidades",
        projects: "Proyectos",
        contact: "Contacto",
        future: "Futuro",
      },
      modules: {
        keyping: { title: "KeyPing", copy: "Modulo principal. Abre la vista dedicada del producto." },
        about: { title: "Sobre mi", copy: "Ingeniero centrado en arquitectura de software practica, limites de seguridad y entrega mantenible." },
        capabilities: { title: "Capacidades", copy: "Arquitectura desktop con Electron, sistemas frontend con Angular, flujos de almacenamiento seguro y automatizacion de builds." },
        projects: { title: "Proyectos", copy: "Construcciones reales seleccionadas con intencion de producto, restricciones operativas y ownership tecnico." },
        contact: { title: "Contacto", copy: "Conversaciones tecnicas directas y oportunidades de colaboracion." },
        future: { title: "Futuros Builds", copy: "Modulos bloqueados reservados para sistemas proximos en desarrollo." },
      },
      status: {
        online: "NUCLEO DEL SISTEMA ONLINE",
        offline: "NUCLEO DEL SISTEMA APAGADO",
        booting: "ARRANCANDO NUCLEO DEL SISTEMA",
        loading: "CARGANDO NUCLEO DEL SISTEMA {progress}%",
        syncing: "SINCRONIZANDO CAPA VISUAL DEL NUCLEO DEL SISTEMA",
      },
    },
  },
};

const desktopNodes = [...document.querySelectorAll(".module-node")];
const moduleTriggers = [...document.querySelectorAll(".module-trigger")];
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const localeCache = {
  en: null,
  es: null,
};

const nodePositions = {
  about: { x: 0.22, y: 0.24 },
  capabilities: { x: 0.2, y: 0.45 },
  contact: { x: 0.31, y: 0.64 },
  projects: { x: 0.78, y: 0.28 },
  keyping: { x: 0.74, y: 0.48 },
  future: { x: 0.8, y: 0.66 },
};

const nodeParents = {
  capabilities: "about",
  contact: "about",
  keyping: "projects",
  future: "projects",
};

const state = {
  lang: "en",
  statusKey: "status.online",
  statusProgress: null,
  pointerX: 0,
  pointerY: 0,
  parallaxX: 0,
  parallaxY: 0,
  active: "",
  isTransitioning: false,
  transitionStart: 0,
  transitionDir: 0,
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
  meteorLoopStarted: false,
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x06090e, 6, 13);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0.06, 2.25);

const coreGroup = new THREE.Group();
coreGroup.scale.setScalar(0.05);
scene.add(coreGroup);

const outer = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.84, 2),
  new THREE.MeshPhysicalMaterial({
    color: 0x2e5f76,
    emissive: 0x1f89aa,
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.56,
    transparent: true,
    opacity: 0,
  })
);

const inner = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.4, 1),
  new THREE.MeshStandardMaterial({
    color: 0x90ddff,
    emissive: 0x5bcbe2,
    emissiveIntensity: 0,
    roughness: 0.26,
    metalness: 0.12,
    transparent: true,
    opacity: 0,
  })
);

const shellWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.98, 1)),
  new THREE.LineBasicMaterial({ color: 0x66d8ff, transparent: true, opacity: 0 })
);

coreGroup.add(outer, inner, shellWire);

const ambient = new THREE.AmbientLight(0x8cb6cf, 0.4);
const key = new THREE.PointLight(0x68d5ff, 4.2, 16, 1.7);
key.position.set(0, 0, 2.8);
const rim = new THREE.PointLight(0x4d80ad, 1.8, 16, 1.8);
rim.position.set(-2.8, -1.2, -1.8);
scene.add(ambient, key, rim);

const starsGeo = new THREE.BufferGeometry();
const stars = [];
for (let i = 0; i < 120; i += 1) {
  stars.push((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8 - 1.5);
}
starsGeo.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
const starsMesh = new THREE.Points(
  starsGeo,
  new THREE.PointsMaterial({
    color: 0x93d8f8,
    size: 0.02,
    transparent: true,
    opacity: 0.48,
  })
);
scene.add(starsMesh);

const linesByNode = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function getInitialLang() {
  const queryLang = (urlParams.get("lang") || "").toLowerCase();
  if (queryLang === "en" || queryLang === "es") {
    return queryLang;
  }

  try {
    const stored = (localStorage.getItem(LANG_STORAGE_KEY) || "").toLowerCase();
    if (stored === "en" || stored === "es") {
      return stored;
    }
  } catch {
    // Ignore storage access errors.
  }

  const navLang = (navigator.language || "en").toLowerCase();
  return navLang.startsWith("es") ? "es" : "en";
}

function textByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), obj);
}

async function loadLocale(lang) {
  const normalized = lang === "es" ? "es" : "en";
  if (localeCache[normalized]) {
    return localeCache[normalized];
  }

  try {
    const response = await fetch(`i18n/${normalized}.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load locale file: ${normalized}`);
    }
    const data = await response.json();
    localeCache[normalized] = data;
    return data;
  } catch {
    localeCache[normalized] = FALLBACK_LOCALES[normalized];
    return localeCache[normalized];
  }
}

function getLocaleScope(lang) {
  const active = localeCache[lang] && localeCache[lang].systemCore ? localeCache[lang].systemCore : null;
  const fallback = localeCache[DEFAULT_LANG] && localeCache[DEFAULT_LANG].systemCore ? localeCache[DEFAULT_LANG].systemCore : null;
  return { active, fallback };
}

function localizedValue(path) {
  const { active, fallback } = getLocaleScope(state.lang);
  return textByPath(active, path) ?? textByPath(fallback, path) ?? null;
}

function t(path, params = {}) {
  const raw = localizedValue(path);
  if (typeof raw !== "string") {
    return "";
  }
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

function applyStaticTranslations() {
  document.documentElement.lang = state.lang;

  const title = document.getElementById("page-title");
  const description = document.getElementById("page-description");
  if (title) {
    title.textContent = t("page.title");
  }
  if (description) {
    description.setAttribute("content", t("page.description"));
  }

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-html]").forEach((node) => {
    const key = node.getAttribute("data-i18n-html");
    if (!key) {
      return;
    }
    node.innerHTML = t(key);
  });
}

function refreshLangButtons() {
  langSwitchButtons.forEach((button) => {
    const lang = button.getAttribute("data-lang-switch");
    const active = lang === state.lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function refreshCoreStatus() {
  if (state.statusKey === "status.loading") {
    setCoreStatus("status.loading", state.statusProgress);
    return;
  }
  setCoreStatus(state.statusKey);
}

async function setLanguage(nextLang, persist = true) {
  const normalized = nextLang === "es" ? "es" : "en";
  await loadLocale(normalized);
  if (normalized !== DEFAULT_LANG && !localeCache[DEFAULT_LANG]) {
    await loadLocale(DEFAULT_LANG);
  }
  state.lang = normalized;
  applyStaticTranslations();
  refreshLangButtons();
  setActive(state.active || "keyping");
  refreshCoreStatus();

  if (persist) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage access errors.
    }
  }
}

function setupLanguageSwitch() {
  langSwitchButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const nextLang = button.getAttribute("data-lang-switch");
      if (!nextLang || nextLang === state.lang) {
        return;
      }
      try {
        await setLanguage(nextLang, true);
      } catch (error) {
        console.error("Could not switch language:", error);
      }
    });
  });
}

function setCoreStatus(statusKey, progress = null) {
  state.statusKey = statusKey;
  state.statusProgress = progress;
  if (coreStatusText) {
    if (statusKey === "status.loading") {
      coreStatusText.textContent = t(statusKey, { progress: progress ?? 0 });
      return;
    }
    coreStatusText.textContent = t(statusKey);
  }
}

async function runBootSequence() {
  if (!bootSequence || !bootLog || !bootProgressFill || !bootProgressText) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    starsMesh.visible = true;
    bootSequence.remove();
    body.classList.remove("booting");
    return;
  }

  body.classList.remove("awaiting-start", "core-offline");
  body.classList.add("booting", "boot-offline");
  starsMesh.visible = true;
  runMeteorLoop();
  setCoreStatus("status.offline");
  await sleep(220);
  body.classList.remove("boot-offline");
  body.classList.add("boot-loading");
  setCoreStatus("status.booting");

  const bootLines = localizedValue("boot.lines");
  const lines = Array.isArray(bootLines) && bootLines.length
    ? bootLines
    : FALLBACK_LOCALES[state.lang].systemCore.boot.lines;

  for (let i = 0; i < lines.length; i += 1) {
    const line = document.createElement("li");
    line.textContent = lines[i];
    bootLog.appendChild(line);

    if (bootLog.children.length > 8) {
      bootLog.removeChild(bootLog.children[0]);
    }

    const progress = Math.round(((i + 1) / lines.length) * 100);
    bootProgressFill.style.width = `${progress}%`;
    bootProgressText.textContent = `${progress}%`;
    setCoreStatus("status.loading", progress);
    await sleep(180 + i * 24);
  }

  await sleep(340);
  body.classList.add("boot-unfold");
  await sleep(820);

  bootSequence.remove();
  body.classList.remove("booting", "boot-offline", "boot-loading");
  body.classList.add("core-syncing");
  setCoreStatus("status.syncing");
}

function beginSystemStartup() {
  if (state.hasManualStart) {
    return;
  }

  state.hasManualStart = true;
  body.classList.remove("awaiting-start", "core-offline");
  if (startCoreButton) {
    startCoreButton.disabled = true;
    startCoreButton.setAttribute("aria-busy", "true");
  }

  runBootSequence().then(() => {
    runIntro();
  });
}

function enterAwaitingStart() {
  body.classList.add("awaiting-start", "core-offline");
  setCoreStatus("status.offline");
  starsMesh.visible = false;

  if (startCoreButton) {
    startCoreButton.disabled = false;
    startCoreButton.removeAttribute("aria-busy");
    startCoreButton.addEventListener("click", beginSystemStartup, { once: true });
  }
}

function spawnMeteor() {
  if (!meteorLayer) {
    return;
  }
  const meteor = document.createElement("span");
  meteor.className = "meteor";

  const startX = randomRange(48, 108);
  const startY = randomRange(-20, 22);
  const dx = randomRange(-980, -560);
  const dy = randomRange(360, 640);
  const dur = randomRange(1700, 2900);
  const len = randomRange(110, 180);
  const moveAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const trailAngle = moveAngle + 180;

  meteor.style.left = `${startX}%`;
  meteor.style.top = `${startY}%`;
  meteor.style.setProperty("--meteor-dx", `${dx.toFixed(1)}px`);
  meteor.style.setProperty("--meteor-dy", `${dy.toFixed(1)}px`);
  meteor.style.setProperty("--meteor-dur", `${dur.toFixed(0)}ms`);
  meteor.style.setProperty("--meteor-angle", `${trailAngle.toFixed(1)}deg`);
  meteor.style.setProperty("--meteor-len", `${len.toFixed(0)}px`);
  meteorLayer.appendChild(meteor);

  meteor.addEventListener("animationend", () => {
    meteor.remove();
  });
}

function runMeteorLoop() {
  if (state.meteorLoopStarted || !meteorLayer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  state.meteorLoopStarted = true;

  const schedule = () => {
    const waitMs = randomRange(3600, 9800);
    window.setTimeout(() => {
      spawnMeteor();
      if (Math.random() < 0.22) {
        window.setTimeout(spawnMeteor, randomRange(120, 340));
      }
      schedule();
    }, waitMs);
  };

  schedule();
}

function placeNodeWithBounds(node, pos, rect, offsetX = 0, offsetY = 0) {
  const pad = 18;
  const bottomSafe = 170;
  const nodeWidth = node.offsetWidth;
  const nodeHeight = node.offsetHeight;

  const rawX = pos.x * rect.width - nodeWidth / 2 + offsetX;
  const rawY = pos.y * rect.height - nodeHeight / 2 + offsetY;

  const x = clamp(rawX, pad, rect.width - nodeWidth - pad);
  const y = clamp(rawY, pad, rect.height - nodeHeight - bottomSafe);

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
}

function updateStageSize() {
  const bounds = stage.getBoundingClientRect();
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  linksSvg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  linksSvg.setAttribute("width", `${bounds.width}`);
  linksSvg.setAttribute("height", `${bounds.height}`);
  placeNodes();
  updateLinks();
}

function placeNodes() {
  const stageRect = stage.getBoundingClientRect();
  const width = stageRect.width;
  const height = stageRect.height;

  desktopNodes.forEach((node) => {
    const target = node.dataset.target;
    const pos = nodePositions[target];
    if (!pos) {
      return;
    }

    placeNodeWithBounds(node, pos, { width, height });
  });

  if (!linesByNode.size) {
    createLinks();
  }
  updateLinks();
}

function createLinks() {
  const centerRect = coreCenter.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const cx = centerRect.left - stageRect.left + centerRect.width / 2;
  const cy = centerRect.top - stageRect.top + centerRect.height / 2;

  desktopNodes.forEach((node) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${cx}`);
    line.setAttribute("y1", `${cy}`);
    line.setAttribute("x2", `${cx}`);
    line.setAttribute("y2", `${cy}`);
    line.setAttribute("class", "link-line");
    if (node.dataset.target === "about" || node.dataset.target === "projects") {
      line.classList.add("link-line--primary");
    }

    const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    particle.setAttribute("r", "2.1");
    particle.setAttribute("cx", `${cx}`);
    particle.setAttribute("cy", `${cy}`);
    particle.setAttribute("class", "link-particle");

    linksSvg.appendChild(line);
    linksSvg.appendChild(particle);
    linesByNode.set(node.dataset.target, {
      line,
      particle,
      progress: Math.random(),
      speed: 0.22 + Math.random() * 0.3,
    });
  });
}

function nodeCenterByTarget(target, stageRect) {
  const node = desktopNodes.find((entry) => entry.dataset.target === target);
  if (!node) {
    return null;
  }
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left - stageRect.left + rect.width / 2,
    y: rect.top - stageRect.top + rect.height / 2,
  };
}

function updateLinks(animate = false) {
  const centerRect = coreCenter.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const cx = centerRect.left - stageRect.left + centerRect.width / 2;
  const cy = centerRect.top - stageRect.top + centerRect.height / 2;
  const aboutCenter = nodeCenterByTarget("about", stageRect);
  const projectsCenter = nodeCenterByTarget("projects", stageRect);

  desktopNodes.forEach((node) => {
    const entry = linesByNode.get(node.dataset.target);
    if (!entry) {
      return;
    }
    const { line } = entry;
    const rect = node.getBoundingClientRect();
    const nx = rect.left - stageRect.left + rect.width / 2;
    const ny = rect.top - stageRect.top + rect.height / 2;

    const startX =
      node.dataset.target === "contact" && aboutCenter
        ? aboutCenter.x
        : node.dataset.target === "capabilities" && aboutCenter
          ? aboutCenter.x
        : node.dataset.target === "keyping" && projectsCenter
          ? projectsCenter.x
          : node.dataset.target === "future" && projectsCenter
            ? projectsCenter.x
          : cx;
    const startY =
      node.dataset.target === "contact" && aboutCenter
        ? aboutCenter.y
        : node.dataset.target === "capabilities" && aboutCenter
          ? aboutCenter.y
        : node.dataset.target === "keyping" && projectsCenter
          ? projectsCenter.y
          : node.dataset.target === "future" && projectsCenter
            ? projectsCenter.y
          : cy;
    line.setAttribute("x1", `${startX}`);
    line.setAttribute("y1", `${startY}`);
    line.setAttribute("x2", `${nx}`);
    line.setAttribute("y2", `${ny}`);

    if (animate) {
      const length = Math.hypot(nx - startX, ny - startY);
      line.style.strokeDasharray = `${length}`;
      line.style.strokeDashoffset = `${length}`;
      requestAnimationFrame(() => {
        line.style.transition = "stroke-dashoffset 680ms cubic-bezier(0.22, 1, 0.36, 1)";
        line.style.strokeDashoffset = "0";
      });
    } else {
      line.style.strokeDasharray = "";
      line.style.strokeDashoffset = "";
      line.style.transition = "";
    }
  });

  setActive(state.active || "keyping");
}

function setIntroStep(step) {
  state.introStep = step;
  body.classList.add(`intro-step-${step}`);

  if (step === 5) {
    if (!state.hasDrawnIntroLinks) {
      state.hasDrawnIntroLinks = true;
      updateLinks(true);
    }
  }

  if (step === 6) {
    state.introComplete = true;
    body.classList.remove("intro-running");
    body.classList.add("intro-complete");
    body.classList.remove("core-syncing");
    setCoreStatus("status.online");
  }
}

function runIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setIntroStep(1);
    setIntroStep(2);
    setIntroStep(3);
    setIntroStep(4);
    setIntroStep(5);
    setIntroStep(6);
    return;
  }

  body.classList.add("intro-running");
  state.introStartTime = performance.now() + 80;
  const timeline = [
    { step: 1, at: 80 },
    { step: 2, at: 980 },
    { step: 3, at: 1580 },
    { step: 4, at: 2200 },
    { step: 5, at: 2820 },
    { step: 6, at: 3440 },
  ];

  timeline.forEach((entry) => {
    window.setTimeout(() => setIntroStep(entry.step), entry.at);
  });
}

function fastForwardToReadyState() {
  if (bootSequence) {
    bootSequence.remove();
  }
  body.classList.remove("booting", "boot-offline", "boot-loading", "boot-unfold", "intro-running", "core-syncing", "core-offline", "awaiting-start");
  for (let step = 1; step <= 6; step += 1) {
    body.classList.add(`intro-step-${step}`);
  }
  body.classList.add("intro-complete");
  setCoreStatus("status.online");

  state.introStep = 6;
  state.introComplete = true;
  state.hasDrawnIntroLinks = true;
  state.introStartTime = performance.now() - state.introDurationMs;

  camera.position.set(0, 0.15, 5.2);
  coreGroup.scale.setScalar(1);
  outer.material.opacity = 0.8;
  inner.material.opacity = 1;
  inner.material.emissiveIntensity = 1.2;
  shellWire.material.opacity = 0.22;
  key.intensity = 4;

  updateLinks(false);
}

function beginReturnTransition() {
  state.isReturnTransition = true;
  state.returnStartTime = performance.now();
  camera.position.set(0.25, -0.05, 2.55);
  coreGroup.scale.setScalar(1.35);
  body.classList.add("is-returning-from-keyping");
}

function setActive(target) {
  const changed = state.active !== target;
  state.active = target;
  const module = localizedValue(`modules.${target}`);
  const parent = nodeParents[target] || null;
  const activeLineTargets = new Set([target]);
  if (parent) {
    activeLineTargets.add(parent);
  }

  if (module) {
    infoTitle.textContent = module.title;
    infoCopy.textContent = module.copy;
  }

  desktopNodes.forEach((node) => {
    node.classList.toggle("is-active", node.dataset.target === target);
  });

  linesByNode.forEach((line, key) => {
    const isActiveLine = activeLineTargets.has(key);
    line.line.classList.toggle("active", isActiveLine);
    line.particle.classList.toggle("active", isActiveLine);
  });

  if (changed && state.introComplete && !state.isTransitioning) {
    state.coreImpulse = 1;
  }
}

function updateLinkParticles(dt) {
  linesByNode.forEach((entry) => {
    const { line, particle } = entry;
    const x1 = Number(line.getAttribute("x1"));
    const y1 = Number(line.getAttribute("y1"));
    const x2 = Number(line.getAttribute("x2"));
    const y2 = Number(line.getAttribute("y2"));
    if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(y1) || !Number.isFinite(y2)) {
      return;
    }

    entry.progress += dt * entry.speed;
    if (entry.progress > 1) {
      entry.progress -= 1;
    }

    const t = entry.progress;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    particle.setAttribute("cx", `${px}`);
    particle.setAttribute("cy", `${py}`);
  });
}

function activateKeypingView() {
  if (state.isTransitioning) {
    return;
  }

  state.isTransitioning = true;
  state.transitionDir = 1;
  state.transitionStart = performance.now();
  body.classList.add("is-transitioning");

  window.setTimeout(() => {
    window.location.href = `keyping.html?lang=${state.lang}`;
  }, 780);
}

function activateAboutView() {
  if (state.isTransitioning) {
    return;
  }

  state.isTransitioning = true;
  state.transitionDir = 1;
  state.transitionStart = performance.now();
  body.classList.add("is-transitioning");

  window.setTimeout(() => {
    window.location.href = `about.html?lang=${state.lang}`;
  }, 780);
}

function activateContactView() {
  if (state.isTransitioning) {
    return;
  }

  state.isTransitioning = true;
  state.transitionDir = 1;
  state.transitionStart = performance.now();
  body.classList.add("is-transitioning");

  window.setTimeout(() => {
    window.location.href = `contact.html?lang=${state.lang}&from=core`;
  }, 780);
}

function activateProjectsView() {
  if (state.isTransitioning) {
    return;
  }

  state.isTransitioning = true;
  state.transitionDir = 1;
  state.transitionStart = performance.now();
  body.classList.add("is-transitioning");

  window.setTimeout(() => {
    window.location.href = `projects.html?lang=${state.lang}`;
  }, 780);
}

function onTrigger(target) {
  setActive(target);

  if (target === "keyping") {
    activateKeypingView();
    return;
  }

  if (target === "about") {
    activateAboutView();
    return;
  }

  if (target === "projects") {
    activateProjectsView();
    return;
  }

  if (target === "contact") {
    activateContactView();
  }
}

moduleTriggers.forEach((trigger) => {
  const target = trigger.dataset.target;
  if (!target) {
    return;
  }

  trigger.addEventListener("mouseenter", () => {
    if (!state.introComplete) {
      return;
    }
    setActive(target);
  });
  trigger.addEventListener("focus", () => {
    if (!state.introComplete) {
      return;
    }
    setActive(target);
  });
  trigger.addEventListener("click", () => {
    if (!state.introComplete) {
      return;
    }
    onTrigger(target);
  });
});

document.addEventListener("pointermove", (event) => {
  const nx = (event.clientX / window.innerWidth - 0.5) * 2;
  const ny = (event.clientY / window.innerHeight - 0.5) * 2;
  body.style.setProperty("--bg-parallax-x", `${(nx * 12).toFixed(2)}px`);
  body.style.setProperty("--bg-parallax-y", `${(ny * 10).toFixed(2)}px`);
});

stage.addEventListener("pointermove", (event) => {
  if (!state.introComplete) {
    return;
  }

  const rect = stage.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;

  state.pointerX = relX * 2 - 1;
  state.pointerY = relY * 2 - 1;

  const coreHitRadius = 0.28;
  const distToCore = Math.hypot(state.pointerX, state.pointerY);
  const isInCoreZone = distToCore < coreHitRadius;
  if (isInCoreZone) {
    state.coreHoverTime += dtSafe();
    if (!state.coreHovering) {
      state.coreHovering = true;
    }
  } else {
    state.coreHovering = false;
    state.coreHoverTime = 0;
  }
});

stage.addEventListener("pointerleave", () => {
  state.pointerX = 0;
  state.pointerY = 0;
  state.coreHovering = false;
  state.coreHoverTime = 0;
});

window.addEventListener("resize", updateStageSize);

let lastTime = performance.now();
let dtSnapshot = 0;

function dtSafe() {
  return Math.max(0.001, dtSnapshot || 0.016);
}

function tick(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  dtSnapshot = dt;

  state.parallaxX += (state.pointerX - state.parallaxX) * 0.04;
  state.parallaxY += (state.pointerY - state.parallaxY) * 0.04;

  const t = now * 0.001;
  const pulse = 1 + Math.sin(t * 2.25) * 0.03;

  if (state.isTransitioning) {
    const elapsed = (now - state.transitionStart) / (state.transitionDir > 0 ? 900 : 760);
    const eased = smoothstep(elapsed);
    const blend = state.transitionDir > 0 ? eased : 1 - eased;

    camera.position.z = THREE.MathUtils.lerp(5.2, 2.55, blend);
    camera.position.x = THREE.MathUtils.lerp(0, 0.25, blend);
    camera.position.y = THREE.MathUtils.lerp(0.15, -0.05, blend);
    coreGroup.scale.setScalar(1 + blend * 0.35);
  } else if (state.isReturnTransition) {
    const progress = smoothstep((now - state.returnStartTime) / state.returnDurationMs);
    camera.position.z = THREE.MathUtils.lerp(2.55, 5.2, progress);
    camera.position.x = THREE.MathUtils.lerp(0.25, 0, progress);
    camera.position.y = THREE.MathUtils.lerp(-0.05, 0.15, progress);
    coreGroup.scale.setScalar(THREE.MathUtils.lerp(1.35, 1, progress));
    if (progress >= 1) {
      state.isReturnTransition = false;
      body.classList.remove("is-returning-from-keyping");
    }
  } else if (!state.introComplete) {
    camera.position.z += (5.2 - camera.position.z) * 0.05;
    camera.position.x += (0 - camera.position.x) * 0.05;
    camera.position.y += (0.15 - camera.position.y) * 0.05;

    const introElapsed = now - state.introStartTime;
    const introProgress = smootherstep(introElapsed / state.introDurationMs);
    const introScale = THREE.MathUtils.lerp(0.05, 1, introProgress);
    coreGroup.scale.setScalar(introScale);
  } else {
    camera.position.z += (5.2 - camera.position.z) * 0.04;
    camera.position.x += (state.parallaxX * 0.25 - camera.position.x) * 0.04;
    camera.position.y += (-state.parallaxY * 0.18 + 0.15 - camera.position.y) * 0.04;
    coreGroup.scale.x += (1 - coreGroup.scale.x) * 0.05;
    coreGroup.scale.y += (1 - coreGroup.scale.y) * 0.05;
    coreGroup.scale.z += (1 - coreGroup.scale.z) * 0.05;
  }

  if (state.introComplete && !state.isTransitioning && !state.isReturnTransition) {
    const rect = stage.getBoundingClientRect();
    const intensity = window.matchMedia("(max-width: 860px)").matches ? 5 : 9;
    desktopNodes.forEach((node) => {
      const target = node.dataset.target;
      const pos = nodePositions[target];
      if (!pos) {
        return;
      }
      const driftX = state.parallaxX * intensity * (0.18 + pos.x);
      const driftY = state.parallaxY * intensity * (0.12 + pos.y);
      placeNodeWithBounds(node, pos, rect, driftX, driftY);
    });
    updateLinks();
  }

  if (state.introStep >= 5) {
    updateLinkParticles(dt);
  }

  state.spinCooldown = Math.max(0, state.spinCooldown - dt);
  if (
    state.introComplete &&
    !state.isTransitioning &&
    !state.isReturnTransition &&
    state.coreHovering &&
    state.coreHoverTime > 0.09 &&
    state.spinCooldown <= 0 &&
    state.spinBurstTime <= 0
  ) {
    state.spinBurstTime = 0.22;
    state.spinCooldown = 0.8;
  }

  state.spinBurstTime = Math.max(0, state.spinBurstTime - dt);
  const burstFactor = state.spinBurstTime > 0 ? Math.pow(state.spinBurstTime / 0.22, 0.75) : 0;
  const burstY = 2.8 * burstFactor;
  const burstX = 0.9 * burstFactor;
  state.spinY += dt * (0.22 + burstY);
  state.spinX += dt * (0.08 + burstX);
  state.coreImpulse += (0 - state.coreImpulse) * 0.1;
  const tiltY = state.parallaxX * 0.28;
  const tiltX = -state.parallaxY * 0.2;
  coreGroup.rotation.y = state.spinY + tiltY;
  coreGroup.rotation.x = state.spinX + tiltX;
  coreGroup.position.x += ((state.parallaxX * 0.16) - coreGroup.position.x) * 0.06;
  coreGroup.position.y += ((-state.parallaxY * 0.12) - coreGroup.position.y) * 0.06;
  inner.rotation.y -= dt * 0.42;
  outer.rotation.x -= dt * 0.12;
  const coreImpulseBoost = 1 + state.coreImpulse * 0.055;
  outer.scale.setScalar((state.introStep >= 2 ? pulse : 1) * coreImpulseBoost);
  inner.scale.setScalar(coreImpulseBoost * (1 + state.coreImpulse * 0.02));
  shellWire.rotation.y -= dt * 0.28;
  const wirePulse = 0.22 + Math.sin(t * 1.6) * 0.05;
  const wireTarget = state.introStep >= 4 ? wirePulse : 0;
  shellWire.material.opacity += (wireTarget - shellWire.material.opacity) * 0.08;

  const outerTarget = state.introStep >= 2 ? 0.8 : 0;
  outer.material.opacity += (outerTarget - outer.material.opacity) * 0.08;
  const innerTarget = state.introStep >= 3 ? 1 : 0;
  inner.material.opacity += (innerTarget - inner.material.opacity) * 0.1;
  const emissiveTarget = state.introStep >= 3 ? 1.2 : 0;
  inner.material.emissiveIntensity += (emissiveTarget - inner.material.emissiveIntensity) * 0.1;

  key.intensity = state.introStep >= 3 ? 4 + Math.sin(t * 2.1) * 0.45 + state.coreImpulse * 0.55 : 0;
  starsMesh.rotation.y += dt * 0.015;

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

updateStageSize();
state.lang = getInitialLang();
state.statusKey = returningFromModule ? "status.online" : "status.offline";
setupLanguageSwitch();
requestAnimationFrame(tick);

(async () => {
  try {
    await loadLocale(DEFAULT_LANG);
    await setLanguage(state.lang, true);
  } catch (error) {
    console.error("Could not initialize locales from i18n JSON files:", error);
    state.lang = DEFAULT_LANG;
  }
})();

if (returningFromModule) {
  try {
    window.history.replaceState({}, "", window.location.pathname);
  } catch {
    // Ignore history replace issues.
  }
  starsMesh.visible = true;
  runMeteorLoop();
  fastForwardToReadyState();
  beginReturnTransition();
} else {
  enterAwaitingStart();
}
