/**
 * Páginas de módulo: animación de entrada, botón "atrás" contextual y salida.
 *
 * El botón atrás vuelve al módulo desde el que se llegó (?from=<id>) o, si no
 * hay origen conocido, al Core. Es la misma regla que antes tenía cada módulo
 * por separado, ahora generalizada a cualquier módulo configurado.
 */
import { initShell, startMeteorLoop } from './shell';

interface PageData {
  id: string;
  skin: string;
  coreHref: string;
  modules: Record<string, string>;
}

function withFrom(href: string, from: string): string {
  return `${href}?from=${encodeURIComponent(from)}`;
}

export function initModulePage(): PageData | null {
  const dataEl = document.getElementById('page-data');
  if (!dataEl?.textContent) return null;
  const data = JSON.parse(dataEl.textContent) as PageData;
  const body = document.body;
  initShell();
  startMeteorLoop();

  const entrySource = (new URLSearchParams(location.search).get('from') || '').toLowerCase();
  const backLink = document.getElementById('back-to-core-link') as HTMLAnchorElement | null;
  const backTarget =
    entrySource && entrySource !== data.id && data.modules[entrySource]
      ? withFrom(data.modules[entrySource]!, data.id)
      : withFrom(data.coreHref, data.id);
  let isLeaving = false;

  if (backLink) {
    backLink.href = backTarget;
    backLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (isLeaving) return;
      if (!backTarget.startsWith(`${data.coreHref}?`)) {
        location.assign(backTarget);
        return;
      }
      isLeaving = true;
      body.classList.add('is-page-leaving');
      window.setTimeout(() => location.assign(backTarget), 140);
    });
  }

  window.requestAnimationFrame(() => body.classList.add('is-page-ready'));
  initCopyButtons();
  initScreenToggle();

  // Al volver con el botón del navegador (bfcache) la página no debe quedarse "saliendo".
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      isLeaving = false;
      body.classList.remove('is-page-leaving');
    }
  });
  return data;
}

/**
 * Ampliar/restaurar la ventana: la pantalla crece sobre la barra superior.
 * El estado se recuerda en la sesión para que siga igual al cambiar de módulo.
 */
const EXPANDED_KEY = 'zula:screen-expanded';

function initScreenToggle() {
  const root = document.documentElement;
  const btn = document.getElementById('screen-toggle') as HTMLButtonElement | null;
  const topbar = document.querySelector<HTMLElement>('.topbar');
  if (!btn) return;

  const measure = () => {
    if (topbar) root.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  };
  const sync = () => {
    const expanded = root.classList.contains('screen-expanded');
    btn.setAttribute('aria-pressed', String(expanded));
    const label = (expanded ? btn.dataset.labelCollapse : btn.dataset.labelExpand) ?? '';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    topbar?.toggleAttribute('inert', expanded && window.matchMedia('(min-width: 861px)').matches);
  };
  const set = (expanded: boolean) => {
    measure();
    root.classList.toggle('screen-expanded', expanded);
    try {
      if (expanded) {
        sessionStorage.setItem(EXPANDED_KEY, '1');
        // El Core lo usa para empezar ampliado y animar la restauración.
        if (topbar) sessionStorage.setItem('zula:topbar-h', `${topbar.offsetHeight}px`);
      } else sessionStorage.removeItem(EXPANDED_KEY);
    } catch {
      // Sin almacenamiento solo se pierde el recuerdo entre páginas.
    }
    sync();
  };

  measure();
  sync();
  // Si la página se abrió ya ampliada, se reactivan las transiciones tras el primer pintado.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.remove('screen-noanim')));
  window.addEventListener('resize', () => {
    measure();
    sync();
  });
  btn.addEventListener('click', () => set(!root.classList.contains('screen-expanded')));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !root.classList.contains('screen-expanded')) return;
    if (document.body.classList.contains('is-lightbox-open')) return;
    set(false);
  });
}

/** Botones "copiar" (p. ej. la dirección de correo en Contacto). */
function initCopyButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const state = btn.querySelector<HTMLElement>('.copy-btn__state');
    const idle = state?.textContent ?? '';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy ?? '');
      } catch {
        return;
      }
      btn.classList.add('is-copied');
      if (state) state.textContent = btn.dataset.copiedLabel ?? idle;
      window.setTimeout(() => {
        btn.classList.remove('is-copied');
        if (state) state.textContent = idle;
      }, 1800);
    });
  });
}
