const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const coreStatusText = document.getElementById("core-status-text");
const keypingOpenBtn = document.getElementById("keyping-open-btn");
const portfolioOpenBtn = document.getElementById("portfolio-open-btn");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";

const FALLBACK_LOCALES = {
  en: {
    projects: {
      page: { title: "Projects | System Core", description: "Project gallery for Unax Zulaika Fuente." },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      crumb: { core: "Core", projects: "Projects" },
      header: {
        eyebrow: "PROJECTS",
        title: "Projects",
        lead: "Selected software products built with real architecture, constraints and delivery quality.",
      },
      cards: {
        actions: { enter: "Enter project", github: "GitHub" },
        keyping: {
          eyebrow: "FLAGSHIP PRODUCT",
          title: "KeyPing",
          desc: "Local-first password security desktop app focused on credential hygiene, encrypted vault workflows and practical hardening controls.",
          stack: ["Electron", "Angular", "TypeScript", "Node.js", "SQLite", "GPG"],
        },
        portfolio: {
          eyebrow: "SYSTEM INTERFACE",
          title: "Portfolio Core",
          desc: "Interactive portfolio built as a system concept with Three.js rendering, UI architecture, motion layers, state-driven navigation and module transitions.",
          stack: ["Three.js", "JavaScript", "CSS", "UI Architecture", "State", "Animation"],
        },
      },
    },
  },
  es: {
    projects: {
      page: { title: "Proyectos | Nucleo del Sistema", description: "Galeria de proyectos de Unax Zulaika Fuente." },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      crumb: { core: "Core", projects: "Proyectos" },
      header: {
        eyebrow: "PROYECTOS",
        title: "Proyectos",
        lead: "Productos de software seleccionados, construidos con arquitectura real, restricciones y calidad de entrega.",
      },
      cards: {
        actions: { enter: "Entrar al proyecto", github: "GitHub" },
        keyping: {
          eyebrow: "PRODUCTO PRINCIPAL",
          title: "KeyPing",
          desc: "App desktop de seguridad de contrasenas local-first, centrada en higiene de credenciales, vault cifrado y controles practicos de hardening.",
          stack: ["Electron", "Angular", "TypeScript", "Node.js", "SQLite", "GPG"],
        },
        portfolio: {
          eyebrow: "INTERFAZ DE SISTEMA",
          title: "Portfolio Core",
          desc: "Portfolio interactivo construido como concepto de sistema con renderizado Three.js, arquitectura UI, capas de animacion, estado y transiciones entre modulos.",
          stack: ["Three.js", "JavaScript", "CSS", "Arquitectura UI", "Estado", "Animacion"],
        },
      },
    },
  },
};

const localeCache = { en: null, es: null };
let currentLang = "en";
let isLeaving = false;

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
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].projects ? FALLBACK_LOCALES[lang].projects : null;
  const active = localeCache[lang] && localeCache[lang].projects ? localeCache[lang].projects : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].projects ? FALLBACK_LOCALES[DEFAULT_LANG].projects : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].projects ? FALLBACK_LOCALES[lang].projects : null;
  const active = localeCache[lang] && localeCache[lang].projects ? localeCache[lang].projects : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].projects ? FALLBACK_LOCALES[DEFAULT_LANG].projects : null;
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

  if (backToCoreLink) backToCoreLink.href = `index.html?from=projects&lang=${lang}`;
  if (keypingOpenBtn) keypingOpenBtn.href = `keyping.html?lang=${lang}&from=projects`;
  if (portfolioOpenBtn) portfolioOpenBtn.href = `index.html?from=projects&lang=${lang}`;
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
    isLeaving = true;
    body.classList.add("is-leaving-projects");
    window.setTimeout(() => {
      window.location.assign(`index.html?from=projects&lang=${currentLang}`);
    }, 420);
  });
}

runMeteorLoop();
window.requestAnimationFrame(() => body.classList.add("is-projects-ready"));

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
