const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const contactModuleLink = document.getElementById("contact-module-link");
const aboutCrumbCoreLink = document.getElementById("about-crumb-core-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const entrySource = (urlParams.get("from") || "").toLowerCase();
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";

const FALLBACK_LOCALES = {
  en: {
    about: {
      page: { title: "About | System Core", description: "About Unax Zulaika Fuente." },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      crumb: { core: "Core", about: "About" },
      header: {
        eyebrow: "ABOUT",
        title: "About",
        lead: "Software developer focused on building real software products.",
        copy1: "I enjoy designing practical systems, desktop applications and security-oriented tools.",
        copy2: "Focused on product architecture, maintainable engineering and independent software builds.",
      },
      links: {
        title: "Next step",
        contact: "Open Contact",
        cv: "Download CV",
      },
      experience: {
        title: "Experience",
        role: "Integra Tecnologia - Software Developer",
        date: "2024 - Present",
        copy: "Working mainly with Angular and .NET on enterprise software systems, contributing to application development, system integration and internal tools.",
        current: {
          label: "Current position",
          value: "Software Developer @ Integra Tecnologia - Stack: Angular / .NET",
        },
      },
      focus: {
        title: "What I focus on",
        items: [
          "Building real applications, not just demos",
          "Designing maintainable system architectures",
          "Security-aware software design",
          "Creating practical developer tools",
          "Using AI as a productivity and engineering accelerator",
        ],
      },
      coreTech: {
        title: "Core technologies",
        items: ["Angular", "Electron", ".NET", "TypeScript", "JavaScript", "SQL", "Docker"],
      },
      alsoWorked: {
        title: "Also worked with",
        items: ["Unity", "Java", "C#", "HTML / CSS", "REST APIs", "Git"],
      },
      closing: "Engineering profile focused on product execution, system design and long-term maintainability.",
    },
  },
  es: {
    about: {
      page: { title: "Sobre mi | Nucleo del Sistema", description: "Sobre Unax Zulaika Fuente." },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      crumb: { core: "Core", about: "Sobre mi" },
      header: {
        eyebrow: "SOBRE MI",
        title: "Sobre mi",
        lead: "Desarrollador de software centrado en construir productos reales.",
        copy1: "Disfruto disenando sistemas practicos, aplicaciones desktop y herramientas orientadas a seguridad.",
        copy2: "Enfocado en arquitectura de producto, ingenieria mantenible y desarrollo de software independiente.",
      },
      links: {
        title: "Siguiente paso",
        contact: "Abrir contacto",
        cv: "Descargar CV",
      },
      experience: {
        title: "Experiencia",
        role: "Integra Tecnologia - Software Developer",
        date: "2024 - Actualidad",
        copy: "Trabajo principalmente con Angular y .NET en entornos empresariales, contribuyendo al desarrollo de aplicaciones, la integracion de sistemas y herramientas internas.",
        current: {
          label: "Posicion actual",
          value: "Software Developer @ Integra Tecnologia - Stack: Angular / .NET",
        },
      },
      focus: {
        title: "En que me enfoco",
        items: [
          "Construir aplicaciones reales, no solo demos",
          "Disenar arquitecturas mantenibles",
          "Diseno de software con seguridad en mente",
          "Crear herramientas practicas para desarrolladores",
          "Usar IA como acelerador de productividad e ingenieria",
        ],
      },
      coreTech: {
        title: "Tecnologias core",
        items: ["Angular", "Electron", ".NET", "TypeScript", "JavaScript", "SQL", "Docker"],
      },
      alsoWorked: {
        title: "Tambien he trabajado con",
        items: ["Unity", "Java", "C#", "HTML / CSS", "REST APIs", "Git"],
      },
      closing: "Perfil de ingenieria centrado en ejecucion de producto, diseno de sistemas y mantenibilidad a largo plazo.",
    },
  },
};

const localeCache = { en: null, es: null };
let currentLang = "en";
let isLeaving = false;

function resolveBackHref(lang) {
  if (entrySource === "contact") {
    return `contact.html?lang=${lang}&from=about`;
  }
  return `index.html?from=about&lang=${lang}`;
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
  const preferred = localeCache[lang] && localeCache[lang].about ? localeCache[lang].about : null;
  const fallbackLang = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].about ? FALLBACK_LOCALES[lang].about : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].about ? FALLBACK_LOCALES[DEFAULT_LANG].about : null;
  return textByPath(preferred, path) ?? textByPath(fallbackLang, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = localeCache[lang] && localeCache[lang].about ? localeCache[lang].about : null;
  const fallbackLang = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].about ? FALLBACK_LOCALES[lang].about : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].about ? FALLBACK_LOCALES[DEFAULT_LANG].about : null;
  return textByPath(preferred, path) ?? textByPath(fallbackLang, path) ?? textByPath(fallback, path) ?? null;
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
  if (aboutCrumbCoreLink) aboutCrumbCoreLink.href = `index.html?from=about&lang=${lang}`;
  if (contactModuleLink) contactModuleLink.href = `contact.html?lang=${lang}&from=about`;
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
    body.classList.add("is-leaving-about");
    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, 140);
  });
}

runMeteorLoop();
window.requestAnimationFrame(() => body.classList.add("is-about-ready"));

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

