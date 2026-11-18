/** Visor de imágenes y vídeo de la vista de producto (antes en keyping.js). */
type MediaData =
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'video'; src: string; alt: string; caption: string }
  | { type: 'composite'; src: string; srcSecondary: string; alt: string; altSecondary: string; caption: string };

const fullSrc = (img: HTMLImageElement) => img.dataset.full || img.currentSrc || img.src;

export function initLightbox(): void {
  const body = document.body;
  const figures = [...document.querySelectorAll<HTMLElement>('.keyping-media')];
  const lightbox = document.getElementById('keyping-lightbox');
  const image = document.getElementById('keyping-lightbox-image') as HTMLImageElement | null;
  const imageSecondary = document.getElementById('keyping-lightbox-image-secondary') as HTMLImageElement | null;
  const video = document.getElementById('keyping-lightbox-video') as HTMLVideoElement | null;
  const caption = document.getElementById('keyping-lightbox-caption');
  const prev = document.getElementById('keyping-lightbox-prev');
  const next = document.getElementById('keyping-lightbox-next');
  const closeBtn = document.getElementById('keyping-lightbox-close');
  const figureEl = document.querySelector<HTMLElement>('.keyping-lightbox__figure');
  if (!lightbox || !figures.length || !image || !caption || !figureEl) return;

  let index = -1;
  let returnFocus: HTMLElement | null = null;

  const read = (i: number): MediaData | null => {
    const figure = figures[i];
    if (!figure) return null;
    const cap = figure.querySelector('figcaption')?.textContent ?? '';
    const composite = [...figure.querySelectorAll<HTMLImageElement>('.keyping-media-composite img')];
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

  const open = (i: number) => {
    returnFocus = document.activeElement as HTMLElement | null;
    setItem(i);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('is-lightbox-open');
    closeBtn?.focus();
  };

  const close = () => {
    if (!lightbox.classList.contains('is-open')) return;
    stopVideo();
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('is-lightbox-open');
    returnFocus?.focus();
  };

  figures.forEach((figure, i) => {
    figure.addEventListener('click', () => open(i));
    figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(i);
      }
    });
  });
  prev?.addEventListener('click', () => setItem(index - 1));
  next?.addEventListener('click', () => setItem(index + 1));
  document.querySelectorAll('[data-lightbox-close]').forEach((n) => n.addEventListener('click', close));

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
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
