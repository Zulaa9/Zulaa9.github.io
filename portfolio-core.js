const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const portfolioCrumbCoreLink = document.getElementById("portfolio-crumb-core-link");
const portfolioCrumbProjectsLink = document.getElementById("portfolio-crumb-projects-link");
const portfolioCrumbSelfLink = document.getElementById("portfolio-crumb-self-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const entrySource = (urlParams.get("from") || "").toLowerCase();
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";

const FALLBACK_LOCALES = {
  en: {
    portfolioCore: {
      page: { title: "Portfolio Core | System Core", description: "Portfolio Core dedicated project view." },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      crumb: { core: "Core", projects: "Projects", portfolio: "Portfolio Core" },
      header: {
        eyebrow: "PROJECT MODULE // PC-01",
        title: "Portfolio Core",
        lead: "Interactive system-style portfolio built as a real frontend product, not a static landing page.",
      },
      overview: {
        title: "What this project is",
        lead: "This exact website is the project itself. You are currently navigating Portfolio Core.",
        copy: "It is built as an engineered interface: navigable module graph, dedicated views, transition choreography, language state and contextual routing composed as a system.",
      },
      actions: { github: "GitHub" },
      stack: { title: "Stack", items: ["Three.js", "JavaScript", "CSS", "UI Architecture", "State", "Animation"] },
      architecture: {
        title: "Architecture highlights",
        items: [
          "Interactive Core graph with parent-child node relationships",
          "Dedicated module pages with shared system visual language",
          "Context-aware back navigation between modules",
          "Language propagation through module links",
        ],
      },
      engineering: {
        title: "Engineering focus",
        items: [
          "Intentional motion and transition timing across views",
          "Readable structure and reusable layout patterns",
          "Separation of concerns per module (HTML/CSS/JS)",
          "Consistent accessibility labels and keyboard-friendly controls",
        ],
      },
    },
  },
  es: {
    portfolioCore: {
      page: { title: "Portfolio Core | Nucleo del Sistema", description: "Vista dedicada del proyecto Portfolio Core." },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      crumb: { core: "Core", projects: "Proyectos", portfolio: "Portfolio Core" },
      header: {
        eyebrow: "MODULO DE PROYECTO // PC-01",
        title: "Portfolio Core",
        lead: "Portfolio interactivo con estilo de sistema, construido como producto frontend real y no como landing estatica.",
      },
      overview: {
        title: "Que es este proyecto",
        lead: "Esta web exacta es el propio proyecto. Ahora mismo estas navegando Portfolio Core.",
        copy: "Esta construido como interfaz de ingenieria: grafo navegable de modulos, vistas dedicadas, coreografia de transiciones, estado de idioma y routing contextual compuesto como sistema.",
      },
      actions: { github: "GitHub" },
      stack: { title: "Stack", items: ["Three.js", "JavaScript", "CSS", "Arquitectura UI", "Estado", "Animacion"] },
      architecture: {
        title: "Puntos de arquitectura",
        items: [
          "Grafo interactivo del Core con relaciones padre-hijo",
          "Paginas de modulo dedicadas con lenguaje visual compartido",
          "Navegacion de vuelta contextual entre modulos",
          "Propagacion de idioma en los enlaces entre modulos",
        ],
      },
      engineering: {
        title: "Foco de ingenieria",
        items: [
          "Movimiento intencional y timing de transiciones entre vistas",
          "Estructura legible y patrones de layout reutilizables",
          "Separacion de responsabilidades por modulo (HTML/CSS/JS)",
          "Etiquetas de accesibilidad consistentes y controles keyboard-friendly",
        ],
      },
    },
  },
};

const localeCache = { en: null, es: null };
let currentLang = "en";
let isLeaving = false;

function randomRange(min, max) { return min + Math.random() * (max - min); }

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

function textByPath(obj, path) { return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), obj); }

function resolveBackHref(lang) {
  if (entrySource === "projects") {
    return `projects.html?from=portfolio&lang=${lang}`;
  }
  return `index.html?from=portfolio&lang=${lang}`;
}

function resolvePortfolioSelfHref(lang) {
  const from = entrySource || "core";
  return `portfolio-core.html?lang=${lang}&from=${from}`;
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
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].portfolioCore ? FALLBACK_LOCALES[lang].portfolioCore : null;
  const active = localeCache[lang] && localeCache[lang].portfolioCore ? localeCache[lang].portfolioCore : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].portfolioCore ? FALLBACK_LOCALES[DEFAULT_LANG].portfolioCore : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].portfolioCore ? FALLBACK_LOCALES[lang].portfolioCore : null;
  const active = localeCache[lang] && localeCache[lang].portfolioCore ? localeCache[lang].portfolioCore : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].portfolioCore ? FALLBACK_LOCALES[DEFAULT_LANG].portfolioCore : null;
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
  if (portfolioCrumbCoreLink) portfolioCrumbCoreLink.href = `index.html?from=portfolio&lang=${lang}`;
  if (portfolioCrumbProjectsLink) portfolioCrumbProjectsLink.href = `projects.html?from=portfolio&lang=${lang}`;
  if (portfolioCrumbSelfLink) portfolioCrumbSelfLink.href = resolvePortfolioSelfHref(lang);
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
    body.classList.add("is-leaving-portfolio");
    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, 140);
  });
}

runMeteorLoop();
window.requestAnimationFrame(() => body.classList.add("is-portfolio-ready"));

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

