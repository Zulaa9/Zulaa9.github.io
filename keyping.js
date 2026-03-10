const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const urlParams = new URLSearchParams(window.location.search);
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";
const FALLBACK_LOCALES = {
  en: {
    keyping: {
      page: {
        title: "KeyPing | System Core",
        description: "KeyPing dedicated product view.",
      },
      identity: { role: "Software Systems Engineer" },
      status: { online: "SYSTEM CORE ONLINE" },
      back: "Back to Core",
      header: {
        eyebrow: "FLAGSHIP MODULE // KP-01",
        title: "KeyPing",
        tagline: "Desktop credential hygiene system engineered for local trust.",
      },
      health: {
        label: "Module Health",
        state: "Secure / Local / Active",
      },
      cards: {
        boundary: {
          title: "Process Boundary Map",
          copy: "Renderer, preload and main process lanes are isolated and validated through typed IPC contracts.",
        },
        vault: {
          title: "Credential Vault Engine",
          copy: "Local vault records are encrypted using AES-256-GCM + PBKDF2 with deterministic lock and timeout policies.",
        },
        runtime: {
          title: "Runtime Safeguards",
          copy: "Clipboard exposure windows, brute-force protection and offline-only execution constraints are enforced by policy.",
        },
        release: {
          title: "Release Integrity Pipeline",
          copy: "Artifacts are distributed with checksums and signature verification to preserve trust from build to install.",
        },
      },
    },
  },
  es: {
    keyping: {
      page: {
        title: "KeyPing | Nucleo del Sistema",
        description: "Vista dedicada del producto KeyPing.",
      },
      identity: { role: "Ingeniero de Sistemas de Software" },
      status: { online: "NUCLEO DEL SISTEMA ONLINE" },
      back: "Volver al Core",
      header: {
        eyebrow: "MODULO PRINCIPAL // KP-01",
        title: "KeyPing",
        tagline: "Sistema desktop de higiene de credenciales disenado para confianza local.",
      },
      health: {
        label: "Salud del Modulo",
        state: "Seguro / Local / Activo",
      },
      cards: {
        boundary: {
          title: "Mapa de Limites de Proceso",
          copy: "Los canales renderer, preload y main process estan aislados y validados mediante contratos IPC tipados.",
        },
        vault: {
          title: "Motor del Vault de Credenciales",
          copy: "Los registros locales del vault se cifran con AES-256-GCM + PBKDF2 y politicas deterministas de bloqueo y timeout.",
        },
        runtime: {
          title: "Salvaguardas de Runtime",
          copy: "Las ventanas de exposicion del clipboard, la proteccion anti brute-force y las restricciones offline se aplican por politica.",
        },
        release: {
          title: "Pipeline de Integridad de Release",
          copy: "Los artefactos se distribuyen con checksums y verificacion de firma para preservar la confianza desde build hasta instalacion.",
        },
      },
    },
  },
};
let isLeaving = false;

const localeCache = {
  en: null,
  es: null,
};

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

function t(lang, path) {
  const active = localeCache[lang] && localeCache[lang].keyping ? localeCache[lang].keyping : null;
  const fallback = localeCache[DEFAULT_LANG] && localeCache[DEFAULT_LANG].keyping ? localeCache[DEFAULT_LANG].keyping : null;
  return textByPath(active, path) ?? textByPath(fallback, path) ?? "";
}

function applyTranslations(lang) {
  document.documentElement.lang = lang;

  const title = document.getElementById("page-title");
  const description = document.getElementById("page-description");
  if (title) {
    title.textContent = t(lang, "page.title");
  }
  if (description) {
    description.setAttribute("content", t(lang, "page.description"));
  }
  if (coreStatusText) {
    coreStatusText.textContent = t(lang, "status.online");
  }

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) {
      node.textContent = t(lang, key);
    }
  });

  langSwitchButtons.forEach((button) => {
    const active = button.getAttribute("data-lang-switch") === lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (backToCoreLink) {
    backToCoreLink.href = `index.html?from=keyping&lang=${lang}`;
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
  if (!meteorLayer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

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

document.addEventListener("pointermove", (event) => {
  const nx = (event.clientX / window.innerWidth - 0.5) * 2;
  const ny = (event.clientY / window.innerHeight - 0.5) * 2;
  body.style.setProperty("--bg-parallax-x", `${(nx * 12).toFixed(2)}px`);
  body.style.setProperty("--bg-parallax-y", `${(ny * 10).toFixed(2)}px`);
});

runMeteorLoop();
window.requestAnimationFrame(() => {
  body.classList.add("is-keyping-ready");
});

let currentLang = getInitialLang();

async function applyLanguage(nextLang, persist = true) {
  const normalized = nextLang === "es" ? "es" : "en";
  await loadLocale(normalized);
  if (normalized !== DEFAULT_LANG && !localeCache[DEFAULT_LANG]) {
    await loadLocale(DEFAULT_LANG);
  }
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

langSwitchButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const nextLang = button.getAttribute("data-lang-switch");
    if (!nextLang || nextLang === currentLang) {
      return;
    }
    try {
      await applyLanguage(nextLang, true);
    } catch (error) {
      console.error("Could not switch language:", error);
    }
  });
});

(async () => {
  try {
    await loadLocale(DEFAULT_LANG);
    await applyLanguage(currentLang, true);
  } catch (error) {
    console.error("Could not initialize locales from i18n JSON files:", error);
    currentLang = DEFAULT_LANG;
  }
})();

if (backToCoreLink) {
  backToCoreLink.addEventListener("click", (event) => {
    if (isLeaving) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    isLeaving = true;
    body.classList.add("is-leaving-keyping");
    window.setTimeout(() => {
      window.location.assign(`index.html?from=keyping&lang=${currentLang}`);
    }, 420);
  });
}
