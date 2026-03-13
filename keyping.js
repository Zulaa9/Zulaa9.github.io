const body = document.body;
const meteorLayer = document.getElementById("meteor-layer");
const backToCoreLink = document.getElementById("back-to-core-link");
const keypingCrumbCoreLink = document.getElementById("keyping-crumb-core-link");
const keypingCrumbProjectsLink = document.getElementById("keyping-crumb-projects-link");
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
const entrySource = (urlParams.get("from") || "").toLowerCase();
const LANG_STORAGE_KEY = "system_core_lang";
const DEFAULT_LANG = "en";
const FALLBACK_LOCALES = { en: {}, es: {} };
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
  const preferred = localeCache[lang] && localeCache[lang].keyping ? localeCache[lang].keyping : null;
  const fallback = localeCache[DEFAULT_LANG] && localeCache[DEFAULT_LANG].keyping ? localeCache[DEFAULT_LANG].keyping : null;
  return textByPath(preferred, path) ?? textByPath(fallback, path) ?? "";
}

function listValue(lang, path) {
  const preferred = localeCache[lang] && localeCache[lang].keyping ? localeCache[lang].keyping : null;
  const fallback = localeCache[DEFAULT_LANG] && localeCache[DEFAULT_LANG].keyping ? localeCache[DEFAULT_LANG].keyping : null;
  return textByPath(preferred, path) ?? textByPath(fallback, path) ?? null;
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
    backToCoreLink.href = resolveBackHref(lang);
  }
  if (keypingCrumbCoreLink) keypingCrumbCoreLink.href = `index.html?from=keyping&lang=${lang}`;
  if (keypingCrumbProjectsLink) keypingCrumbProjectsLink.href = `projects.html?from=keyping&lang=${lang}`;
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

function resolveBackHref(lang) {
  if (entrySource === "projects") {
    return `projects.html?from=keyping&lang=${lang}`;
  }
  return `index.html?from=keyping&lang=${lang}`;
}

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
    const targetHref = resolveBackHref(currentLang);
    const goesToCore = targetHref.startsWith("index.html");
    if (!goesToCore) {
      window.location.assign(targetHref);
      return;
    }
    isLeaving = true;
    body.classList.add("is-leaving-keyping");
    window.setTimeout(() => {
      window.location.assign(targetHref);
    }, 140);
  });
}





