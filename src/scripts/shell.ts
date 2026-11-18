/**
 * Comportamiento común de todas las páginas: lluvia de meteoritos, parallax del
 * fondo y recordar el idioma elegido al pulsar EN/ES.
 */
export const LANG_STORAGE_KEY = 'system_core_lang';

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function storeLang(lang: string): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // El almacenamiento puede estar bloqueado; la URL ya lleva el idioma.
  }
}

function spawnMeteor(layer: HTMLElement): void {
  const meteor = document.createElement('span');
  meteor.className = 'meteor';
  const startX = randomRange(48, 108);
  const startY = randomRange(-20, 22);
  const dx = randomRange(-980, -560);
  const dy = randomRange(360, 640);
  const dur = randomRange(1700, 2900);
  const len = randomRange(110, 180);
  const trailAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
  meteor.style.left = `${startX}%`;
  meteor.style.top = `${startY}%`;
  meteor.style.setProperty('--meteor-dx', `${dx.toFixed(1)}px`);
  meteor.style.setProperty('--meteor-dy', `${dy.toFixed(1)}px`);
  meteor.style.setProperty('--meteor-dur', `${dur.toFixed(0)}ms`);
  meteor.style.setProperty('--meteor-angle', `${trailAngle.toFixed(1)}deg`);
  meteor.style.setProperty('--meteor-len', `${len.toFixed(0)}px`);
  layer.appendChild(meteor);
  meteor.addEventListener('animationend', () => meteor.remove());
}

let meteorTimer: number | undefined;

/** Programa meteoritos aleatorios. Se pausa con la pestaña oculta. */
export function startMeteorLoop(): void {
  const layer = document.getElementById('meteor-layer');
  if (!layer || meteorTimer !== undefined || prefersReducedMotion()) return;
  const schedule = () => {
    meteorTimer = window.setTimeout(() => {
      if (!document.hidden) {
        spawnMeteor(layer);
        if (Math.random() < 0.22) window.setTimeout(() => spawnMeteor(layer), randomRange(120, 340));
      }
      schedule();
    }, randomRange(3600, 9800));
  };
  schedule();
}

export function initShell(): void {
  const body = document.body;
  document.addEventListener('pointermove', (event) => {
    const nx = (event.clientX / window.innerWidth - 0.5) * 2;
    const ny = (event.clientY / window.innerHeight - 0.5) * 2;
    body.style.setProperty('--bg-parallax-x', `${(nx * 12).toFixed(2)}px`);
    body.style.setProperty('--bg-parallax-y', `${(ny * 10).toFixed(2)}px`);
  });

  document.querySelectorAll<HTMLAnchorElement>('a[data-lang-switch]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const lang = link.dataset.langSwitch;
      if (!lang) return;
      if (link.classList.contains('is-active')) {
        event.preventDefault();
        return;
      }
      storeLang(lang);
      // Conserva el contexto de navegación (?from=…) al cambiar de idioma.
      const params = new URLSearchParams(location.search);
      params.delete('lang');
      const search = params.toString();
      if (search) {
        event.preventDefault();
        location.assign(`${link.getAttribute('href')}?${search}${location.hash}`);
      }
    });
  });
}
