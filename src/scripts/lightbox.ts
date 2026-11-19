/** Visor de imágenes y vídeo de la vista de producto (antes en keyping.js). */
type MediaData =
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'video'; src: string; alt: string; caption: string }
  | { type: 'composite'; src: string; srcSecondary: string; alt: string; altSecondary: string; caption: string };

const fullSrc = (img: HTMLImageElement) => img.dataset.full || img.currentSrc || img.src;

export function initLightbox(): void {
  const body = document.body;
  const figures = [...document.querySelectorAll<HTMLElement>('.gallery__item')];
  const lightbox = document.getElementById('keyping-lightbox');
  const image = document.getElementById('keyping-lightbox-image') as HTMLImageElement | null;
  const imageSecondary = document.getElementById('keyping-lightbox-image-secondary') as HTMLImageElement | null;
  const video = document.getElementById('keyping-lightbox-video') as HTMLVideoElement | null;
  const caption = document.getElementById('keyping-lightbox-caption');
  const prev = document.getElementById('keyping-lightbox-prev');
  const next = document.getElementById('keyping-lightbox-next');
  const closeBtn = document.getElementById('keyping-lightbox-close');
  const figureEl = document.querySelector<HTMLElement>('.lightbox__figure');
  if (!lightbox || !figures.length || !image || !caption || !figureEl) return;

  let index = -1;
  let returnFocus: HTMLElement | null = null;

  const read = (i: number): MediaData | null => {
    const figure = figures[i];
    if (!figure) return null;
    const cap = figure.querySelector('figcaption')?.textContent ?? '';
    const composite = [...figure.querySelectorAll<HTMLImageElement>('.gallery__composite img')];
    if (composite.length >= 2) {
      return { type: 'composite', src: fullSrc(composite[0]!), srcSecondary: fullSrc(composite[1]!), alt: composite[0]!.alt, altSecondary: composite[1]!.alt, caption: cap };
    }
    const vid = figure.querySelector('video');
    if (vid) {
      const source = vid.querySelector('source');
      return { type: 'video', src: source ? source.src : vid.currentSrc || vid.src, alt: vid.getAttribute('aria-label') || '', caption: cap };
    }
    const img = figure.querySelector('img');
    return img ? { type: 'image', src: fullSrc(img), alt: img.alt, caption: cap } : null;
  };

  const stopVideo = () => {
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  };

  const setItem = (i: number) => {
    const safe = ((i % figures.length) + figures.length) % figures.length;
    const item = read(safe);
    if (!item) return;
    index = safe;
    figureEl.classList.remove('is-video', 'is-composite');
    stopVideo();
    if (imageSecondary) {
      imageSecondary.removeAttribute('src');
      imageSecondary.alt = '';
    }
    if (item.type === 'video') {
      figureEl.classList.add('is-video');
      image.removeAttribute('src');
      image.alt = '';
      if (video) {
        video.src = item.src;
        video.currentTime = 0;
        video.play().catch(() => {
          // La política de reproducción automática puede bloquearlo.
        });
      }
    } else if (item.type === 'composite') {
      figureEl.classList.add('is-composite');
      image.src = item.src;
      image.alt = item.alt;
      if (imageSecondary) {
        imageSecondary.src = item.srcSecondary;
        imageSecondary.alt = item.altSecondary;
      }
    } else {
      image.src = item.src;
      image.alt = item.alt;
    }
    caption.textContent = item.caption;
  };

  // Transición: el medio crece desde la miniatura pulsada y, al cerrar, vuelve a ella (técnica FLIP).
  const backdrop = lightbox.querySelector<HTMLElement>('.lightbox__backdrop');
  const chrome = [closeBtn, prev, next, caption].filter((x): x is HTMLElement => !!x);
  const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const DURATION = 440;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  /** Pares [miniatura, elemento del visor] del medio actual. */
  const pairs = (): [HTMLElement, HTMLElement][] => {
    const figure = figures[index];
    if (!figure) return [];
    const parts = [...figure.querySelectorAll<HTMLImageElement>('.gallery__composite img')];
    if (parts.length >= 2 && imageSecondary) return [[parts[0]!, image], [parts[1]!, imageSecondary]];
    const thumbVideo = figure.querySelector('video');
    if (thumbVideo && video) return [[thumbVideo, video]];
    const thumb = figure.querySelector('img');
    return thumb ? [[thumb, image]] : [];
  };

  /** Espera a que el medio del visor tenga tamaño (como mucho 450 ms). */
  const ready = () => {
    const waits: Promise<unknown>[] = pairs().map(([, el]) => {
      if (el instanceof HTMLVideoElement) {
        return el.readyState >= 1 ? Promise.resolve() : new Promise((r) => el.addEventListener('loadedmetadata', r, { once: true }));
      }
      return (el as HTMLImageElement).decode().catch(() => undefined);
    });
    return Promise.race([Promise.all(waits), new Promise((r) => window.setTimeout(r, 450))]);
  };

  const visible = (r: DOMRect) => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;

  /** Anima `to` desde la caja de `from` (o hacia ella si reverse). */
  const flip = (from: HTMLElement, to: HTMLElement, reverse: boolean) => {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    if (!visible(a) || !b.width || !b.height) return null;
    const start = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    return to.animate(
      [{ transform: start, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
      { duration: DURATION, easing: EASE, direction: reverse ? 'reverse' : 'normal', fill: reverse ? 'forwards' : 'none' },
    );
  };

  const fade = (el: HTMLElement | null | undefined, show: boolean, duration: number, delay = 0) =>
    el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: 'ease', direction: show ? 'normal' : 'reverse', fill: show ? 'backwards' : 'forwards' });

  const open = async (i: number) => {
    if (busy || lightbox.classList.contains('is-open')) return;
    returnFocus = document.activeElement as HTMLElement | null;
    setItem(i);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('is-lightbox-open');
    closeBtn?.focus({ preventScroll: true });
    if (reduced()) return;

    busy = true;
    fade(backdrop, true, 320);
    chrome.forEach((el) => fade(el, true, 260, 300));
    figureEl.style.visibility = 'hidden';
    await ready();
    figureEl.style.visibility = '';
    const anims = pairs().map(([thumb, el]) => flip(thumb, el, false)).filter((x): x is Animation => !!x);
    if (!anims.length) anims.push(fade(figureEl, true, 260)!);
    await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
    busy = false;
  };

  const close = async () => {
    if (busy || !lightbox.classList.contains('is-open')) return;
    if (!reduced()) {
      busy = true;
      const anims = pairs().map(([thumb, el]) => flip(thumb, el, true)).filter((x): x is Animation => !!x);
      if (!anims.length) anims.push(fade(figureEl, false, 240)!);
      chrome.forEach((el) => fade(el, false, 160));
      anims.push(fade(backdrop, false, DURATION)!);
      await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
    }
    stopVideo();
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('is-lightbox-open');
    lightbox.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    busy = false;
    returnFocus?.focus({ preventScroll: true });
  };

  // Precarga la imagen grande al acercar el ratón o el foco, para que la transición empiece al momento.
  const preload = (figure: HTMLElement) => {
    figure.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      const pre = new Image();
      pre.src = fullSrc(img);
    });
  };

  figures.forEach((figure, i) => {
    figure.addEventListener('pointerenter', () => preload(figure), { once: true });
    figure.addEventListener('focus', () => preload(figure), { once: true });
    figure.addEventListener('click', () => void open(i));
    figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void open(i);
      }
    });
  });
  prev?.addEventListener('click', () => setItem(index - 1));
  next?.addEventListener('click', () => setItem(index + 1));
  document.querySelectorAll('[data-lightbox-close]').forEach((n) => n.addEventListener('click', () => void close()));

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') void close();
    else if (event.key === 'ArrowLeft') setItem(index - 1);
    else if (event.key === 'ArrowRight') setItem(index + 1);
    else if (event.key === 'Tab') {
      // Mantiene el foco dentro del visor mientras está abierto.
      const focusables = [closeBtn, prev, next].filter((x): x is HTMLElement => !!x);
      const pos = focusables.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      const nextPos = event.shiftKey ? (pos <= 0 ? focusables.length - 1 : pos - 1) : (pos + 1) % focusables.length;
      focusables[nextPos]?.focus();
    }
  });
}
