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

  // Al volver con el botón del navegador (bfcache) la página no debe quedarse "saliendo".
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      isLeaving = false;
      body.classList.remove('is-page-leaving');
    }
  });
  return data;
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
