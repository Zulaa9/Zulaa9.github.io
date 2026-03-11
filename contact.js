const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const contactCrumbCoreLink = document.getElementById("contact-crumb-core-link");
const contactCrumbAboutLink = document.getElementById("contact-crumb-about-link");
const contactCrumbSelfLink = document.getElementById("contact-crumb-self-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const entrySource = (urlParams.get("from") || "").toLowerCase();
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";

const FALLBACK_LOCALES = {
  en: {
    contact: {
      page: { title: "Contact | System Core", description: "Contact Unax Zulaika Fuente." },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      crumb: { core: "Core", about: "About", contact: "Contact" },
      header: {
        eyebrow: "CONTACT",
        title: "Contact",
        lead: "Interested in collaborating or discussing projects.",
      },
      channels: {
        email: { title: "Email", subtitle: "Send message" },
        github: { title: "GitHub", subtitle: "View repositories" },
        linkedin: { title: "LinkedIn", subtitle: "Professional profile" },
      },
      presence: {
        location: "Based in Bilbao, Spain",
        remote: "Open to remote opportunities",
      },
    },
  },
  es: {
    contact: {
      page: { title: "Contacto | Nucleo del Sistema", description: "Contacto de Unax Zulaika Fuente." },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      crumb: { core: "Core", about: "Sobre mi", contact: "Contacto" },
      header: {
        eyebrow: "CONTACTO",
        title: "Contacto",
        lead: "Interesado en colaborar o comentar proyectos.",
      },
      channels: {
        email: { title: "Email", subtitle: "Enviar mensaje" },
        github: { title: "GitHub", subtitle: "Ver repositorios" },
        linkedin: { title: "LinkedIn", subtitle: "Perfil profesional" },
      },
      presence: {
        location: "Ubicado en Bilbao, Espana",
        remote: "Abierto a oportunidades en remoto",
      },
    },
  },
};

const localeCache = { en: null, es: null };
let currentLang = "en";
let isLeaving = false;

function resolveBackHref(lang) {
  if (entrySource === "about") {
    return `about.html?lang=${lang}`;
  }
  return `index.html?from=contact&lang=${lang}`;
}

function resolveContactSelfHref(lang) {
  const from = entrySource || "core";
  return `contact.html?lang=${lang}&from=${from}`;
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
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].contact ? FALLBACK_LOCALES[lang].contact : null;
  const active = localeCache[lang] && localeCache[lang].contact ? localeCache[lang].contact : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].contact ? FALLBACK_LOCALES[DEFAULT_LANG].contact : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? "";
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

  langSwitchButtons.forEach((button) => {
    const active = button.getAttribute("data-lang-switch") === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (backToCoreLink) backToCoreLink.href = resolveBackHref(lang);
  if (contactCrumbCoreLink) contactCrumbCoreLink.href = `index.html?from=contact&lang=${lang}`;
  if (contactCrumbAboutLink) contactCrumbAboutLink.href = `about.html?lang=${lang}&from=contact`;
  if (contactCrumbSelfLink) contactCrumbSelfLink.href = resolveContactSelfHref(lang);
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
    body.classList.add("is-leaving-contact");
    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, 140);
  });
}

runMeteorLoop();
window.requestAnimationFrame(() => body.classList.add("is-contact-ready"));

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

