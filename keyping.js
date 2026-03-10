const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const coreStatusText = document.getElementById("core-status-text");
const langSwitchButtons = [...document.querySelectorAll("[data-lang-switch]")];
const mediaFigures = [...document.querySelectorAll(".keyping-media")];
const lightbox = document.getElementById("keyping-lightbox");
const lightboxImage = document.getElementById("keyping-lightbox-image");
const lightboxImageSecondary = document.getElementById("keyping-lightbox-image-secondary");
const lightboxVideo = document.getElementById("keyping-lightbox-video");
const lightboxCaption = document.getElementById("keyping-lightbox-caption");
const lightboxPrev = document.getElementById("keyping-lightbox-prev");
const lightboxNext = document.getElementById("keyping-lightbox-next");
const lightboxClose = document.getElementById("keyping-lightbox-close");
const lightboxCloseTargets = [...document.querySelectorAll("[data-lightbox-close]")];
const lightboxFigure = document.querySelector(".keyping-lightbox__figure");
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
      crumb: {
        core: "Core",
        keyping: "KeyPing",
      },
      header: {
        eyebrow: "FLAGSHIP MODULE // KP-01",
        title: "KeyPing",
        tagline: "Local-first password security system.",
        punchline: "Detect weak credentials, enforce hygiene and keep your vault fully offline.",
      },
      health: {
        label: "Module Health",
        state: "Active development / Stable core / Daily use",
      },
      pills: {
        privacy: "Privacy-first",
        offline: "Fully offline",
        local: "Local encrypted vault",
        cross: "Windows / Linux / macOS",
      },
      overview: {
        title: "What KeyPing is",
        lead: "KeyPing is a desktop password manager that focuses on password hygiene: detecting weak, reused and risky credentials while keeping all data local and offline.",
        copy: "This is not a concept demo. It is an actively developed product with stable core features, production-style release discipline, and security controls designed for real usage.",
      },
      why: {
        title: "Why I Built KeyPing",
        subtitle: "Why this project exists",
        lead: "KeyPing was built to solve real password pain under real pressure, not just to store entries in a vault.",
        cards: {
          reuse: {
            title: "Password reuse",
            copy: "Reused credentials multiply risk across services. One leaked password can compromise several accounts.",
          },
          weak: {
            title: "Weak passwords",
            copy: "Weak patterns are still common. Users need clear signals, not vague warnings, to improve hygiene quickly.",
          },
          cloud: {
            title: "Cloud dependency",
            copy: "Many managers require cloud trust by default. KeyPing is designed for local-first control.",
          },
          privacy: {
            title: "Privacy under stress",
            copy: "When incidents happen, privacy and response speed matter at the same time.",
          },
        },
        focus: {
          title: "Critical response feature",
          copy: "Each credential can store a direct password-change URL. In a breach situation, that one-click path reduces friction and reaction time exactly when stress is highest.",
        },
      },
      metrics: {
        title: "Engineering Proof",
        subtitle: "Real build signals",
        items: [
          "15.5k+ lines of code",
          "74 commits",
          "443 tracked files",
          "Electron + Angular architecture",
          "Offline-first encrypted vault",
          "Signed releases (SHA256 + GPG)",
        ],
        statement: "Built as a real desktop product with security boundaries between renderer, preload and main process.",
      },
      actions: {
        downloadEyebrow: "Get KeyPing",
        download: "Download Latest Release",
        githubEyebrow: "Source Code",
        github: "Open on GitHub",
      },
      visuals: {
        title: "Product in action",
        lead: "Real product walkthrough: from vault activity and password creation to health diagnostics, generator controls and security settings.",
        moreBadge: "+3 more",
        captions: {
          flow: "Starts in the password list, opens Create Password, generates a new credential, and returns to an updated list with the new password details selected.",
          dashboard: "Security overview with strong/medium/weak distribution, 2FA count, folders, duplicate passwords, recent activity, and about section.",
          list: "Operational password list with selected-entry details, letting you inspect records quickly without leaving the vault view.",
          health: "Password Health ring with global score plus weak/medium/strong breakdown, reasons, and duplicate-risk visibility.",
          health2: "Extended health insights panel that complements the score view with additional diagnostics and actionable context.",
          healthCombo: "Complete Password Health view: global score, quality distribution, risk reasons, duplicate detection, and extended diagnostics.",
          generator: "Password generator with configurable length and toggles for uppercase, lowercase, numbers, and symbols.",
          settings: "Vault protection settings: master password change, auto-lock timeout by inactivity, failed-attempt controls, and delay policy.",
          settings2: "System settings: language selection, automatic updates, retained vault version history, and encrypted import/export options.",
        },
      },
      features: {
        title: "Core features",
        items: [
          "Local-only encrypted vault (AES-256-GCM)",
          "Password similarity and reuse detection",
          "Password health analysis and scoring",
          "Version history per password",
          "Advanced filtering and search",
          "Folder organization with drag and drop",
          "Offline encrypted import/export",
          "Auto-updates via GitHub Releases",
          "Interactive onboarding and demo mode",
          "ES / EN interface",
        ],
      },
      security: {
        title: "Security model",
        items: [
          "Vault encrypted on disk using AES-256-GCM",
          "No mandatory cloud sync, no account required",
          "PBKDF2-HMAC-SHA512 key derivation (120000 iterations)",
          "Clipboard auto-clear only when copied secret still matches",
          "Escalating cooldown delays after failed master unlock attempts",
          "Vault structure and corruption/timestamp anomaly checks",
        ],
      },
      architecture: {
        title: "Architecture",
        stack: {
          frontend: {
            label: "Frontend",
            value: "Angular standalone components",
          },
          runtime: {
            label: "Runtime",
            value: "Electron",
          },
          bridge: {
            label: "IPC bridge",
            value: "Secure preload API with contextIsolation enabled",
          },
          vault: {
            label: "Vault",
            value: "Encrypted local file managed by Electron main process",
          },
        },
        flow: [
          "UI requests operations through preload IPC",
          "Main process validates and executes secure operations",
          "Vault module encrypts/decrypts local storage",
          "UI receives sanitized metadata and operation state",
        ],
      },
      integrity: {
        title: "Release integrity",
        copy: "Each release ships with checksums and detached signature files.",
        files: [
          "SHA256SUMS.txt",
          "SHA256SUMS.txt.asc (detached ASCII-armored GPG signature)",
        ],
        fingerprintLabel: "Signing key fingerprint",
        verifySig: "Verify signature:",
        verifySha: "Verify checksums:",
      },
      roadmap: {
        title: "Roadmap",
        items: [
          "Optional breach-check integrations with privacy-preserving approach",
          "Expanded automated IPC and vault tests",
          "Improved import conflict resolution UX",
          "Signed and notarized macOS pipeline",
          "Optional portable mode",
          "More accessibility and keyboard navigation polish",
        ],
      },
      lightbox: {
        close: "Close",
        prev: "Prev",
        next: "Next",
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
      crumb: {
        core: "Core",
        keyping: "KeyPing",
      },
      header: {
        eyebrow: "MODULO PRINCIPAL // KP-01",
        title: "KeyPing",
        tagline: "Sistema local-first de seguridad de contrasenas.",
        punchline: "Detecta credenciales debiles, refuerza la higiene y manten tu vault totalmente offline.",
      },
      health: {
        label: "Salud del Modulo",
        state: "Desarrollo activo / Core estable / Uso diario",
      },
      pills: {
        privacy: "Privacy-first",
        offline: "Totalmente offline",
        local: "Boveda local cifrada",
        cross: "Windows / Linux / macOS",
      },
      overview: {
        title: "Que es KeyPing",
        lead: "KeyPing es un gestor de contrasenas de escritorio centrado en higiene de credenciales: detecta contrasenas debiles, reutilizadas y riesgosas manteniendo todos los datos en local y offline.",
        copy: "No es una demo conceptual. Es un producto en desarrollo activo, con funcionalidades core estables, disciplina de release tipo produccion y controles de seguridad pensados para uso real.",
      },
      why: {
        title: "Por que construi KeyPing",
        subtitle: "Por que existe este proyecto",
        lead: "KeyPing nace para resolver problemas reales de contrasenas bajo presion real, no solo para guardar entradas en una boveda.",
        cards: {
          reuse: {
            title: "Reutilizacion de contrasenas",
            copy: "Reutilizar credenciales multiplica el riesgo entre servicios. Una sola filtracion puede comprometer varias cuentas.",
          },
          weak: {
            title: "Contrasenas debiles",
            copy: "Los patrones debiles siguen siendo comunes. El usuario necesita senales claras, no avisos vagos, para mejorar rapido.",
          },
          cloud: {
            title: "Dependencia cloud",
            copy: "Muchos gestores exigen confianza en la nube por defecto. KeyPing esta pensado para control local-first.",
          },
          privacy: {
            title: "Privacidad bajo estres",
            copy: "Cuando hay incidentes, privacidad y velocidad de respuesta importan al mismo tiempo.",
          },
        },
        focus: {
          title: "Funcion critica de respuesta",
          copy: "Cada credencial puede guardar un enlace directo para cambiar la contrasena. En una brecha, ese click unico reduce friccion y tiempo de reaccion justo cuando el estres es mayor.",
        },
      },
      metrics: {
        title: "Prueba de Ingenieria",
        subtitle: "Senales reales de construccion",
        items: [
          "15.5k+ lineas de codigo",
          "74 commits",
          "443 archivos versionados",
          "Arquitectura Electron + Angular",
          "Boveda cifrada offline-first",
          "Releases firmadas (SHA256 + GPG)",
        ],
        statement: "Construido como producto desktop real con limites de seguridad entre renderer, preload y main process.",
      },
      actions: {
        downloadEyebrow: "Consigue KeyPing",
        download: "Descargar Ultima Release",
        githubEyebrow: "Codigo Fuente",
        github: "Abrir en GitHub",
      },
      visuals: {
        title: "Producto en accion",
        lead: "Recorrido real del producto: desde actividad del vault y creacion de contrasenas hasta diagnostico de salud, controles del generador y ajustes de seguridad.",
        moreBadge: "+3 mas",
        captions: {
          flow: "Empieza en el listado de contrasenas, entra en Crear contrasena, genera una nueva credencial y vuelve al listado actualizado con el nuevo detalle seleccionado.",
          dashboard: "Resumen de seguridad con distribucion fuerte/media/debil, conteo de 2FA, carpetas, duplicadas, actividad reciente y seccion de informacion.",
          list: "Listado operativo de contrasenas con panel de detalle de la entrada seleccionada para revisar registros sin salir del vault.",
          health: "Rosco de Salud de Contrasenas con puntuacion global y desglose fuerte/media/debil, razones y visibilidad de riesgo por duplicados.",
          health2: "Panel ampliado de salud que complementa la vista principal con diagnostico adicional y contexto accionable.",
          healthCombo: "Vista completa de Salud de Contrasenas: puntuacion global, distribucion de calidad, razones de riesgo, deteccion de duplicados y diagnostico ampliado.",
          generator: "Generador de contrasenas con longitud configurable y toggles para mayusculas, minusculas, numeros y simbolos.",
          settings: "Ajustes de proteccion del vault: cambio de contrasena maestra, tiempo de autobloqueo por inactividad, intentos fallidos y politica de delay.",
          settings2: "Ajustes de sistema: idioma, actualizaciones automaticas, versiones conservadas del vault y opciones de importacion/exportacion cifrada.",
        },
      },
      features: {
        title: "Funcionalidades clave",
        items: [
          "Boveda cifrada solo local (AES-256-GCM)",
          "Deteccion de similitud y reutilizacion de contrasenas",
          "Analisis y puntuacion de salud de contrasenas",
          "Historial de versiones por contrasena",
          "Busqueda y filtros avanzados",
          "Organizacion por carpetas con drag and drop",
          "Importacion/exportacion cifrada en modo offline",
          "Auto-actualizaciones via GitHub Releases",
          "Onboarding interactivo y modo demo",
          "Interfaz ES / EN",
        ],
      },
      security: {
        title: "Modelo de seguridad",
        items: [
          "Boveda cifrada en disco con AES-256-GCM",
          "Sin sincronizacion cloud obligatoria y sin cuenta requerida",
          "Derivacion PBKDF2-HMAC-SHA512 (120000 iteraciones)",
          "Auto-limpieza del portapapeles solo si el secreto sigue coincidiendo",
          "Retardos progresivos tras intentos fallidos de desbloqueo maestro",
          "Validaciones de estructura de boveda y deteccion de anomalias/corrupcion",
        ],
      },
      architecture: {
        title: "Arquitectura",
        stack: {
          frontend: {
            label: "Frontend",
            value: "Angular con componentes standalone",
          },
          runtime: {
            label: "Runtime",
            value: "Electron",
          },
          bridge: {
            label: "Puente IPC",
            value: "API preload segura con contextIsolation activado",
          },
          vault: {
            label: "Boveda",
            value: "Archivo local cifrado gestionado por el main process de Electron",
          },
        },
        flow: [
          "La UI solicita operaciones a traves del IPC del preload",
          "El proceso principal valida y ejecuta operaciones seguras",
          "El modulo de boveda cifra/descifra almacenamiento local",
          "La UI recibe metadatos saneados y estado de operacion",
        ],
      },
      integrity: {
        title: "Integridad de releases",
        copy: "Cada release incluye checksums y archivos de firma detached.",
        files: [
          "SHA256SUMS.txt",
          "SHA256SUMS.txt.asc (firma GPG detached en formato ASCII-armored)",
        ],
        fingerprintLabel: "Fingerprint de la clave de firma",
        verifySig: "Verificar firma:",
        verifySha: "Verificar checksums:",
      },
      roadmap: {
        title: "Roadmap",
        items: [
          "Integraciones opcionales de breach-check con enfoque de privacidad",
          "Mayor cobertura de tests automaticos en IPC y boveda",
          "Mejor UX para resolucion de conflictos de importacion",
          "Pipeline de firma y notarizacion en macOS",
          "Modo portable opcional",
          "Mas mejoras de accesibilidad y navegacion por teclado",
        ],
      },
      lightbox: {
        close: "Cerrar",
        prev: "Anterior",
        next: "Siguiente",
      },
    },
  },
};
let isLeaving = false;
let lightboxIndex = -1;

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
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].keyping ? FALLBACK_LOCALES[lang].keyping : null;
  const active = localeCache[lang] && localeCache[lang].keyping ? localeCache[lang].keyping : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].keyping ? FALLBACK_LOCALES[DEFAULT_LANG].keyping : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = FALLBACK_LOCALES[lang] && FALLBACK_LOCALES[lang].keyping ? FALLBACK_LOCALES[lang].keyping : null;
  const active = localeCache[lang] && localeCache[lang].keyping ? localeCache[lang].keyping : null;
  const fallback = FALLBACK_LOCALES[DEFAULT_LANG] && FALLBACK_LOCALES[DEFAULT_LANG].keyping ? FALLBACK_LOCALES[DEFAULT_LANG].keyping : null;
  return textByPath(preferred, path) ?? textByPath(active, path) ?? textByPath(fallback, path) ?? null;
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

  document.querySelectorAll("[data-i18n-list]").forEach((node) => {
    const key = node.getAttribute("data-i18n-list");
    if (!key) {
      return;
    }
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

  if (backToCoreLink) {
    backToCoreLink.href = `index.html?from=keyping&lang=${lang}`;
  }
  if (lightboxPrev) {
    lightboxPrev.setAttribute("aria-label", t(lang, "lightbox.prev"));
  }
  if (lightboxNext) {
    lightboxNext.setAttribute("aria-label", t(lang, "lightbox.next"));
  }
  if (lightboxClose) {
    lightboxClose.setAttribute("aria-label", t(lang, "lightbox.close"));
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

function readMediaData(index) {
  const figure = mediaFigures[index];
  if (!figure) {
    return null;
  }
  const compositeImages = [...figure.querySelectorAll(".keyping-media-composite img")];
  if (compositeImages.length >= 2) {
    const caption = figure.querySelector("figcaption");
    return {
      type: "composite",
      src: compositeImages[0].currentSrc || compositeImages[0].src,
      srcSecondary: compositeImages[1].currentSrc || compositeImages[1].src,
      alt: compositeImages[0].alt || "",
      altSecondary: compositeImages[1].alt || "",
      caption: caption ? caption.textContent || "" : "",
    };
  }

  const img = figure.querySelector("img");
  const video = figure.querySelector("video");
  const caption = figure.querySelector("figcaption");
  if (!img && !video) {
    return null;
  }

  if (video) {
    const source = video.querySelector("source");
    return {
      type: "video",
      src: source ? source.src : video.currentSrc || video.src,
      alt: video.getAttribute("aria-label") || "",
      caption: caption ? caption.textContent || "" : "",
    };
  }

  return {
    type: "image",
    src: img.currentSrc || img.src,
    alt: img.alt || "",
    caption: caption ? caption.textContent || "" : "",
  };
}

function stopLightboxVideo() {
  if (!lightboxVideo) {
    return;
  }
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
}

function setLightboxItem(index) {
  const safeIndex = ((index % mediaFigures.length) + mediaFigures.length) % mediaFigures.length;
  const item = readMediaData(safeIndex);
  if (!item || !lightboxImage || !lightboxCaption || !lightboxFigure) {
    return;
  }
  lightboxIndex = safeIndex;
  lightboxFigure.classList.remove("is-video", "is-composite");
  stopLightboxVideo();
  if (lightboxImageSecondary) {
    lightboxImageSecondary.removeAttribute("src");
    lightboxImageSecondary.alt = "";
  }

  if (item.type === "video") {
    lightboxFigure.classList.add("is-video");
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    if (lightboxVideo) {
      lightboxVideo.src = item.src;
      lightboxVideo.currentTime = 0;
      lightboxVideo.play().catch(() => {
        // User gesture policy may block autoplay in some browsers.
      });
    }
  } else if (item.type === "composite") {
    lightboxFigure.classList.add("is-composite");
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    if (lightboxImageSecondary) {
      lightboxImageSecondary.src = item.srcSecondary;
      lightboxImageSecondary.alt = item.altSecondary;
    }
  } else {
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
  }

  lightboxCaption.textContent = item.caption;
}

function openLightbox(index) {
  if (!lightbox || !mediaFigures.length) {
    return;
  }
  setLightboxItem(index);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  body.classList.add("is-lightbox-open");
}

function closeLightbox() {
  if (!lightbox || !lightbox.classList.contains("is-open")) {
    return;
  }
  stopLightboxVideo();
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  body.classList.remove("is-lightbox-open");
}

function setupLightbox() {
  if (!lightbox || !mediaFigures.length) {
    return;
  }

  mediaFigures.forEach((figure, index) => {
    figure.addEventListener("click", () => openLightbox(index));
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(index);
      }
    });
  });

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => setLightboxItem(lightboxIndex - 1));
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => setLightboxItem(lightboxIndex + 1));
  }
  lightboxCloseTargets.forEach((node) => {
    node.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) {
      return;
    }
    if (event.key === "Escape") {
      closeLightbox();
      return;
    }
    if (event.key === "ArrowLeft") {
      setLightboxItem(lightboxIndex - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      setLightboxItem(lightboxIndex + 1);
    }
  });
}

let currentLang = getInitialLang();
setupLightbox();

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
