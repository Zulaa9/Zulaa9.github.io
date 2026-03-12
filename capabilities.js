const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const capabilitiesCrumbCoreLink = document.getElementById("capabilities-crumb-core-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const entrySource = (urlParams.get("from") || "").toLowerCase();
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";

const FALLBACK_LOCALES = {
  en: {
    capabilities: {
      page: { title: "Capabilities | System Core", description: "Engineering capabilities module for Unax Zulaika Fuente." },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      crumb: { core: "Core", capabilities: "Capabilities" },
      header: {
        eyebrow: "CAPABILITIES",
        title: "Engineering capabilities",
        lead: "How I design systems, solve product-level constraints and deliver maintainable software.",
      },
      cards: {
        system: {
          tag: "Architecture module",
          title: "System Engineering",
          desc: "I design modular software systems with clear boundaries, stable interfaces and long-term maintainability.",
          points: [
            "Modular architecture with explicit domain boundaries",
            "Structural decisions driven by maintainability and scale",
            "Layer integration without coupling business logic to UI details",
            "Codebase organization for predictable evolution over time",
          ],
        },
        desktop: {
          tag: "Delivery module",
          title: "Desktop & Product Engineering",
          desc: "I build desktop products as production software, not throwaway demos.",
          points: [
            "Electron desktop applications with real runtime constraints",
            "Offline-first behavior and local reliability by design",
            "End-to-end ownership from interface to packaging",
            "Delivery focused on usable product increments",
          ],
        },
        security: {
          tag: "Trust module",
          title: "Security-Oriented Development",
          desc: "I treat security as a system property: boundaries, data protection and predictable trust models.",
          points: [
            "Security controls built into architecture decisions",
            "Local encrypted storage and sensitive data minimization",
            "Trust boundary separation between runtime layers",
            "Integrity checks and defensive handling of critical flows",
          ],
        },
        ux: {
          tag: "Interface module",
          title: "Technical UX",
          desc: "I make technical tools understandable through structured flows, state visibility and usable interaction design.",
          points: [
            "Complex interface flows reduced to clear operator actions",
            "State visibility for diagnostics, confidence and control",
            "Interaction patterns that prioritize speed and precision",
            "Onboarding paths that lower friction in technical contexts",
          ],
        },
        ai: {
          tag: "Acceleration module",
          title: "AI-Assisted Engineering",
          desc: "I use AI as an engineering multiplier for speed, exploration and implementation quality.",
          points: [
            "Rapid exploration of architecture alternatives",
            "Faster prototyping and iteration loops",
            "Assisted refactoring with explicit technical validation",
            "AI integrated as a toolchain component, not as product noise",
          ],
        },
        integration: {
          tag: "Integration module",
          title: "Full Stack / Integration Thinking",
          desc: "I connect frontend, backend and runtime concerns into a coherent product architecture.",
          points: [
            "Frontend, backend and runtime responsibilities aligned",
            "API and application logic designed as one system",
            "Cross-layer troubleshooting with product-level context",
            "Implementation decisions tied to operational behavior",
          ],
        },
      },
      closing: "I engineer software as an integrated system: architecture, product constraints, security posture, technical UX and delivery execution.",
    },
  },
  es: {
    capabilities: {
      page: { title: "Capacidades | Nucleo del Sistema", description: "Modulo de capacidades de ingenieria de Unax Zulaika Fuente." },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      crumb: { core: "Core", capabilities: "Capacidades" },
      header: {
        eyebrow: "CAPACIDADES",
        title: "Capacidades de ingenieria",
        lead: "Como diseno sistemas, resuelvo restricciones de producto y entrego software mantenible.",
      },
      cards: {
        system: {
          tag: "Modulo de arquitectura",
          title: "System Engineering",
          desc: "Diseno sistemas de software modulares con limites claros, interfaces estables y mantenibilidad a largo plazo.",
          points: [
            "Arquitectura modular con fronteras de dominio explicitas",
            "Decisiones estructurales guiadas por mantenibilidad y escala",
            "Integracion de capas sin acoplar la logica de negocio a la UI",
            "Organizacion del codigo para evolucion predecible en el tiempo",
          ],
        },
        desktop: {
          tag: "Modulo de entrega",
          title: "Desktop & Product Engineering",
          desc: "Construyo productos desktop como software real de produccion, no como demos desechables.",
          points: [
            "Aplicaciones Electron con restricciones reales de runtime",
            "Comportamiento offline-first y fiabilidad local por diseno",
            "Ownership end-to-end desde interfaz hasta empaquetado",
            "Entrega orientada a incrementos de producto utilizables",
          ],
        },
        security: {
          tag: "Modulo de confianza",
          title: "Security-Oriented Development",
          desc: "Trato la seguridad como una propiedad del sistema: limites, proteccion de datos y modelo de confianza predecible.",
          points: [
            "Controles de seguridad integrados en decisiones de arquitectura",
            "Almacenamiento local cifrado y minimizacion de datos sensibles",
            "Separacion de fronteras de confianza entre capas de runtime",
            "Controles de integridad y manejo defensivo de flujos criticos",
          ],
        },
        ux: {
          tag: "Modulo de interfaz",
          title: "Technical UX",
          desc: "Convierto herramientas tecnicas en experiencias comprensibles mediante flujos estructurados, visibilidad de estado y diseno usable.",
          points: [
            "Flujos complejos reducidos a acciones claras para el operador",
            "Visibilidad de estado para diagnostico, control y confianza",
            "Patrones de interaccion orientados a velocidad y precision",
            "Onboarding que reduce friccion en contextos tecnicos",
          ],
        },
        ai: {
          tag: "Modulo de aceleracion",
          title: "AI-Assisted Engineering",
          desc: "Uso IA como multiplicador de ingenieria para velocidad, exploracion y calidad de implementacion.",
          points: [
            "Exploracion rapida de alternativas de arquitectura",
            "Prototipado e iteracion mas rapidos",
            "Refactor asistido con validacion tecnica explicita",
            "IA integrada como parte del toolchain, no como ruido",
          ],
        },
        integration: {
          tag: "Modulo de integracion",
          title: "Full Stack / Integration Thinking",
          desc: "Conecto frontend, backend y runtime en una arquitectura de producto coherente.",
          points: [
            "Responsabilidades de frontend, backend y runtime alineadas",
            "API y logica de aplicacion disenadas como un solo sistema",
            "Resolucion de problemas cross-layer con contexto de producto",
            "Decisiones de implementacion conectadas al comportamiento operativo",
          ],
        },
      },
      closing: "Desarrollo software como un sistema integrado: arquitectura, restricciones de producto, postura de seguridad, UX tecnica y ejecucion de entrega.",
    },
  },
};

const localeCache = { en: null, es: null };
let currentLang = "en";
let isLeaving = false;

function resolveBackHref(lang) {
  if (entrySource === "about") return `about.html?lang=${lang}&from=capabilities`;
  if (entrySource === "contact") return `contact.html?lang=${lang}&from=capabilities`;
  if (entrySource === "projects") return `projects.html?lang=${lang}&from=capabilities`;
  if (entrySource === "keyping") return `keyping.html?lang=${lang}&from=capabilities`;
  if (entrySource === "portfolio") return `portfolio-core.html?lang=${lang}&from=capabilities`;
  return `index.html?from=capabilities&lang=${lang}`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function getInitialLang() {
  const queryLang = (urlParams.get("lang") || "").toLowerCase();
  if (queryLang === "en" || queryLang === "es") return queryLang;
  try {
    const stored = (localStorage.getItem(LANG_STORAGE_KEY) || "").toLowerCase();
    if (stored === "en" || stored === "es") return stored;
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
  if (localeCache[normalized]) return localeCache[normalized];
  try {
    const response = await fetch(`i18n/${normalized}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load locale file: ${normalized}`);
    const data = await response.json();
    localeCache[normalized] = data;
    return data;
  } catch {
    localeCache[normalized] = FALLBACK_LOCALES[normalized];
    return localeCache[normalized];
  }
}

function t(lang, path) {
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].capabilities ? FALLBACK_LOCALES[lang].capabilities : null;
  const active = localeCache[lang] && localeCache[lang].capabilities ? localeCache[lang].capabilities : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].capabilities ? FALLBACK_LOCALES[DEFAULT_LANG].capabilities : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].capabilities ? FALLBACK_LOCALES[lang].capabilities : null;
  const active = localeCache[lang] && localeCache[lang].capabilities ? localeCache[lang].capabilities : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].capabilities ? FALLBACK_LOCALES[DEFAULT_LANG].capabilities : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? null;
}

function applyTranslations(lang) {
  document.documentElement.lang = lang;
  const title = document.getElementById("page-title");
  const description = document.getElementById("page-description");
  if (title) title.textContent = t(lang, "page.title");
  if (description) description.setAttribute("content", t(lang, "page.description"));
  if (coreStatusText) coreStatusText.textContent = t(lang, "status.online");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(lang, key);
  });

  document.querySelectorAll("[data-i18n-list]").forEach((node) => {
    const key = node.getAttribute("data-i18n-list");
    if (!key) return;
    const values = listValue(lang, key);
    if (!Array.isArray(values)) {
      node.innerHTML = "";
      return;
    }
    node.innerHTML = values.map((item) => `<li>${item}</li>`).join("");
  });

  langSwitchButtons.forEach((button) => {
    const active = button.getAttribute("data-lang-switch") === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (backToCoreLink) backToCoreLink.href = resolveBackHref(lang);
  if (capabilitiesCrumbCoreLink) capabilitiesCrumbCoreLink.href = `index.html?from=capabilities&lang=${lang}`;
}

async function applyLanguage(nextLang, persist = true) {
  const normalized = nextLang === "es" ? "es" : "en";
  await loadLocale(normalized);
  if (normalized !== DEFAULT_LANG && !localeCache[DEFAULT_LANG]) await loadLocale(DEFAULT_LANG);
  currentLang = normalized;
  applyTranslations(currentLang);
  if (persist) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    } catch {
      // Ignore storage access errors.
    }
  }
}

function spawnMeteor() {
  if (!meteorLayer) return;
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
  meteor.addEventListener("animationend", () => meteor.remove());
}

function runMeteorLoop() {
  if (!meteorLayer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const schedule = () => {
    const waitMs = randomRange(3600, 9800);
    window.setTimeout(() => {
      spawnMeteor();
      if (Math.random() < 0.22) window.setTimeout(spawnMeteor, randomRange(120, 340));
      schedule();
    }, waitMs);
  };
  schedule();
}

document.addEventListener("pointermove", (event) => {
  const nx = (event.clientX / window.innerWidth - 0.5) * 2;
  const ny = (event.clientY / window.innerHeight - 0.5) * 2;
  body.style.setProperty("--bg-parallax-x", `${(nx * 12).toFixed(2)}px`);
  body.style.setProperty("--bg-parallax-y", `${(ny * 10).toFixed(2)}px`);
});

langSwitchButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const nextLang = button.getAttribute("data-lang-switch");
    if (!nextLang || nextLang === currentLang) return;
    try {
      await applyLanguage(nextLang, true);
    } catch (error) {
      console.error("Could not switch language:", error);
    }
  });
});

if (backToCoreLink) {
  backToCoreLink.addEventListener("click", (event) => {
    if (isLeaving) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const targetHref = resolveBackHref(currentLang);
    const goesToCore = targetHref.startsWith("index.html");
    if (!goesToCore) {
      window.location.assign(targetHref);
      return;
    }
    isLeaving = true;
    body.classList.add("is-leaving-capabilities");
    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, 140);
  });
}

runMeteorLoop();
window.requestAnimationFrame(() => body.classList.add("is-capabilities-ready"));

(async () => {
  currentLang = getInitialLang();
  try {
    await loadLocale(DEFAULT_LANG);
    await applyLanguage(currentLang, true);
  } catch (error) {
    console.error("Could not initialize locales from i18n JSON files:", error);
    currentLang = DEFAULT_LANG;
  }
})();
