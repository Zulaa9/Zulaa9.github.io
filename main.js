document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo({ top: 0, behavior: 'auto' });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25 }
  );

  document.querySelectorAll('.fade').forEach((el) => observer.observe(el));

  const filterButtons = document.querySelectorAll('[data-filter]');
  const projectCards = document.querySelectorAll('[data-type]');
  const langOptions = document.querySelectorAll('.lang-option');
  const langToggle = document.querySelector('.lang-toggle');
  const langLabel = document.querySelector('[data-lang-label]');
  const langFlag = document.querySelector('[data-flag-current]');
  const langMenu = document.querySelector('.lang-menu');
  const translationsCache = {};
  let currentLang = localStorage.getItem('lang') || 'es';

  const fallbackTranslations = {
    es: {
      nav: { home: 'Home', projects: 'Projects', about: 'About', contact: 'Contact', playground: 'Playground' },
      ctaScroll: 'Scroll to discover',
      hero: {
        title: 'Hola, soy Zula.',
        subtitle: 'Desarrollo aplicaciones reales listas para producción con Angular, .NET y Electron. Arquitectura limpia, interfaces claras y software que funciona sin complicaciones.',
        ctaProjects: 'Explorar proyectos',
        ctaGithub: 'GitHub',
        ctaCv: 'Descargar CV'
      },
      whatIDo: {
        title: 'Lo que hago',
        lead: 'Desarrollo software real en producción usando Angular, .NET y Electron, con enfoque en claridad, arquitectura limpia e integraciones fiables.',
        items: [
          { title: 'Aplicaciones Web (Angular)', desc: 'Componentes modulares, formularios avanzados, patrones de estado, i18n, UI limpia y accesible. Experiencia en paneles, datatables, dashboards e interfaces empresariales.' },
          { title: 'APIs y Backends con .NET / C#', desc: 'APIs REST con validación robusta, Entity Framework, seguridad básica, arquitectura por capas y servicios separados. Integración con bases de datos SQL reales.' },
          { title: 'Aplicaciones de Escritorio (Electron)', desc: 'Angular + Electron, integración con SO, control de multimedia, drag & drop, persistencia local y entregas listas para producción.' },
          { title: 'Integraciones y Servicios Externos', desc: 'MQTT con dispositivos (cámaras, barreras, sensores), Redsys (firma 3DES), Google APIs, SendGrid y APIs de terceros en entornos reales.' },
          { title: 'Bases de Datos & Consultas', desc: 'SQL Server, PL/SQL, modelos de datos, migraciones, consultas optimizadas y gestión de datos para web y escritorio.' },
          { title: 'DevOps & Flujo de Trabajo', desc: 'Docker, entornos de prueba, control de versiones, CI/CD básico, ramas limpias, PRs claros y colaboración con buenas prácticas.' }
        ]
      },
      projects: {
        title: 'Proyectos destacados',
        lead: 'Soluciones reales enfocadas en casos de uso, no solo en tecnologías.',
        cards: [
          { title: 'KeyPing', desc: 'Gestor de contraseñas con análisis de patrones y sincronización segura.', cta: 'Ver proyecto' },
          { title: 'Saica Conductores', desc: 'Panel empresarial para gestión de personal y cumplimiento operativo.', cta: 'Ver proyecto' },
          { title: 'App MQTT para dispositivos', desc: 'Control y monitorización de barreras y cámaras con integraciones reales.', cta: 'Ver proyecto' },
          { title: 'Reproductor Multimedia Dual', desc: 'Control simultáneo de dos pistas, efectos y drag & drop intuitivo.', cta: 'Ver proyecto' },
          { title: 'Proyecto adicional', desc: 'Espacio para añadir más proyectos y experimentos.', cta: 'Ver proyecto' }
        ]
      },
      workflow: {
        title: 'Cómo trabajo',
        items: [
          { title: 'Enfoque', desc: 'Comprensión del problema, arquitectura clara y iteración rápida.' },
          { title: 'Código', desc: 'Mantenibilidad, capas bien definidas y estándares consistentes.' },
          { title: 'Colaboración', desc: 'Trabajo en equipo, revisiones de código y documentación precisa.' },
          { title: 'Entrega', desc: 'Prototipos rápidos, ciclos cortos y mejoras basadas en feedback.' }
        ]
      },
      stack: { title: 'Tech Stack', lead: 'Tecnologías que utilizo a diario.' },
      aboutMini: {
        title: 'Sobre mí',
        desc: 'Soy Unax, desarrollador de software de Bilbao. Trabajo con Angular, .NET y Electron creando software real en producción y aplicaciones personales enfocadas en utilidad y claridad. Me gusta resolver problemas con arquitectura limpia y ofrecer interfaces intuitivas.',
        cta: 'Ver más',
        collabTitle: '¿Quieres colaborar en un proyecto o contratarme?',
        collabLead: 'Hablemos.',
        collabCta: 'Contactar'
      },
      footer: '© 2025 Zula. Portafolio.'
    },
    en: {
      nav: { home: 'Home', projects: 'Projects', about: 'About', contact: 'Contact', playground: 'Playground' },
      ctaScroll: 'Scroll to discover',
      hero: {
        title: "Hi, I'm Zula.",
        subtitle: 'I build production-ready apps with Angular, .NET and Electron. Clean architecture, clear interfaces and software that simply works.',
        ctaProjects: 'View projects',
        ctaGithub: 'GitHub',
        ctaCv: 'Download CV'
      },
      whatIDo: {
        title: 'What I do',
        lead: 'I build real-world software with Angular, .NET and Electron, focusing on clarity, clean architecture and reliable integrations.',
        items: [
          { title: 'Web Apps (Angular)', desc: 'Modular components, advanced forms, state patterns, i18n, clean and accessible UI. Hands-on with panels, datatables, dashboards and enterprise interfaces.' },
          { title: 'APIs & Backends with .NET / C#', desc: 'REST APIs with solid validation, Entity Framework, basic security, layered architecture and separated services. Integration with real SQL databases.' },
          { title: 'Desktop Apps (Electron)', desc: 'Angular + Electron, OS integration, media control, drag & drop, local persistence and production-ready deliveries.' },
          { title: 'Integrations & External Services', desc: 'MQTT with devices (cameras, barriers, sensors), Redsys (3DES signing), Google APIs, SendGrid and third-party APIs in real environments.' },
          { title: 'Databases & Queries', desc: 'SQL Server, PL/SQL, data models, migrations, optimized queries and data management for web and desktop.' },
          { title: 'DevOps & Workflow', desc: 'Docker, test environments, version control, basic CI/CD, clean branches, clear PRs and collaborative best practices.' }
        ]
      },
      projects: {
        title: 'Featured projects',
        lead: 'Real solutions focused on use cases, not just technologies.',
        cards: [
          { title: 'KeyPing', desc: 'Password manager with pattern analysis and secure sync.', cta: 'View project' },
          { title: 'Saica Conductores', desc: 'Enterprise panel for workforce management and compliance.', cta: 'View project' },
          { title: 'MQTT device app', desc: 'Control and monitoring of barriers and cameras with real integrations.', cta: 'View project' },
          { title: 'Dual Media Player', desc: 'Dual-track control, effects and intuitive drag & drop.', cta: 'View project' },
          { title: 'Additional project', desc: 'Space to add more projects and experiments.', cta: 'View project' }
        ]
      },
      workflow: {
        title: 'How I work',
        items: [
          { title: 'Approach', desc: 'Understand the problem, clear architecture and fast iteration.' },
          { title: 'Code', desc: 'Maintainability, well-defined layers and consistent standards.' },
          { title: 'Collaboration', desc: 'Teamwork, code reviews and precise documentation.' },
          { title: 'Delivery', desc: 'Quick prototypes, short cycles and feedback-driven improvements.' }
        ]
      },
      stack: { title: 'Tech Stack', lead: 'Technologies I use every day.' },
      aboutMini: {
        title: 'About me',
        desc: 'I’m Unax, a software developer from Bilbao. I work with Angular, .NET and Electron building production software and personal apps focused on utility and clarity. I like solving problems with clean architecture and delivering intuitive interfaces.',
        cta: 'Learn more',
        collabTitle: 'Want to collaborate on a project or hire me?',
        collabLead: 'Let’s talk.',
        collabCta: 'Contact'
      },
      footer: '© 2025 Zula. Portfolio.'
    }
  };

  const getNested = (obj, path) =>
    path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

  const applyTranslations = (data) => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const val = getNested(data, key);
      if (val !== undefined) {
        el.innerHTML = val;
      }
    });
  };

  const setLangActive = (lang) => {
    langOptions.forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === lang));
    if (langLabel) langLabel.textContent = lang.toUpperCase();
    if (langFlag) {
      const activeBtn = Array.from(langOptions).find((btn) => btn.dataset.lang === lang);
      const src = activeBtn?.dataset.flagSrc || (lang === 'en' ? 'https://flagcdn.com/w24/gb.png' : 'https://flagcdn.com/w24/es.png');
      langFlag.src = src;
      langFlag.alt = lang.toUpperCase();
    }
  };

  const loadLang = async (lang) => {
    if (translationsCache[lang]) {
      applyTranslations(translationsCache[lang]);
      setLangActive(lang);
      currentLang = lang;
      localStorage.setItem('lang', lang);
      return;
    }
    try {
      const res = await fetch(`i18n/${lang}.json`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      translationsCache[lang] = json;
      applyTranslations(json);
      setLangActive(lang);
      currentLang = lang;
      localStorage.setItem('lang', lang);
    } catch (err) {
      const fallback = fallbackTranslations[lang];
      if (fallback) {
        translationsCache[lang] = fallback;
        applyTranslations(fallback);
        setLangActive(lang);
        currentLang = lang;
        localStorage.setItem('lang', lang);
      }
      console.error('Error loading language', err);
    }
  };

  langOptions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang && lang !== currentLang) {
        loadLang(lang);
      } else {
        setLangActive(lang);
      }
      langMenu?.classList.remove('open');
      langToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  langToggle?.addEventListener('click', () => {
    const isOpen = langMenu?.classList.toggle('open');
    langToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!langMenu || !langToggle) return;
    if (!langMenu.contains(e.target) && !langToggle.contains(e.target)) {
      langMenu.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });

  loadLang(currentLang);

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.filter;

      projectCards.forEach((card) => {
        card.style.display = type === 'all' || card.dataset.type === type ? '' : 'none';
      });
    });
  });

  const scrollIndicator = document.querySelector('.scroll-indicator');
  const snapSections = Array.from(document.querySelectorAll('.snap'));
  let snapLock = false;
  let snapTimeout;

  const currentSnapIndex = () => {
    const viewCenter = window.scrollY + window.innerHeight / 2;
    let idx = 0;
    let bestDist = Infinity;
    snapSections.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();
      const center = window.scrollY + rect.top + rect.height / 2;
      const dist = Math.abs(center - viewCenter);
      if (dist < bestDist) {
        bestDist = dist;
        idx = i;
      }
    });
    return idx;
  };

  const goToSnap = (target) => {
    if (target < 0 || target >= snapSections.length) return;
    snapLock = true;
    clearTimeout(snapTimeout);
    const top = target === 0 ? 0 : snapSections[target].offsetTop;
    window.scrollTo({ top, behavior: 'smooth' });
    snapTimeout = setTimeout(() => {
      snapLock = false;
      window.scrollTo({ top, behavior: 'auto' });
      updateIndicator(target);
    }, 750);
  };

  const scrollToNext = () => {
    const current = currentSnapIndex();
    goToSnap(Math.min(current + 1, snapSections.length - 1));
  };

  const updateIndicator = (idx) => {
    if (!scrollIndicator) return;
    scrollIndicator.classList.remove('hidden');
  };

  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', scrollToNext);
  }

  snapSections.forEach((sec) => {
    sec.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (snapLock) return;
        const dir = e.deltaY > 0 ? 1 : -1;
        const current = currentSnapIndex();
        const target = Math.min(Math.max(current + dir, 0), snapSections.length - 1);
        if (target !== current) {
          goToSnap(target);
        }
      },
      { passive: false }
    );
  });

  window.addEventListener(
    'scroll',
    () => {
      if (snapLock) return;
      updateIndicator(currentSnapIndex());
    },
    { passive: true }
  );

  updateIndicator(0);

  const carousels3d = document.querySelectorAll('[data-carousel-3d]');
  carousels3d.forEach((carousel) => {
    const stage = carousel.querySelector('[data-stage]');
    const cards = Array.from(carousel.querySelectorAll('[data-card]'));
    const prev = carousel.querySelector('[data-prev-3d]');
    const next = carousel.querySelector('[data-next-3d]');
    const dotsContainer = carousel.querySelector('[data-dots-3d]');
    let current = 0;

    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      cards.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Proyecto ${idx + 1}`);
        dot.addEventListener('click', () => {
          current = idx;
          render();
        });
        dotsContainer.appendChild(dot);
      });
    }

    const render = () => {
      const total = cards.length;
      const levels = {
        0: { z: 200, x: 0, scale: 1, opacity: 1, blur: 0, saturate: 1 },
        1: { z: 90, x: 260, scale: 0.86, opacity: 0.55, blur: 1, saturate: 0.78 },
        2: { z: -20, x: 340, scale: 0.76, opacity: 0.12, blur: 3, saturate: 0.5 },
      };

      const shortest = (idx) => {
        let diff = idx - current;
        const wrapDiff = diff > 0 ? diff - total : diff + total;
        if (Math.abs(wrapDiff) < Math.abs(diff)) diff = wrapDiff;
        const dist = Math.min(Math.abs(diff), 2); // cap to 2+
        const sign = diff === 0 ? 0 : diff > 0 ? 1 : -1;
        return { dist, sign };
      };

      cards.forEach((card, idx) => {
        const { dist, sign } = shortest(idx);
        const lvl = levels[dist] || levels[2];
        const x = lvl.x * (sign === 0 ? 0 : sign);
        card.style.transform = `translate(-50%, -50%) translateX(${x}px) translateZ(${lvl.z}px) scale(${lvl.scale})`;
        card.style.opacity = lvl.opacity;
        card.style.filter = `blur(${lvl.blur}px) saturate(${lvl.saturate})`;
        card.style.zIndex = Math.round(lvl.z + 500);
        card.classList.toggle('is-center', dist === 0);
      });
      if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, idx) => {
          dot.classList.toggle('active', idx === current);
        });
      }
    };

    const rotate = (delta) => {
      current = (current + delta + cards.length) % cards.length;
      render();
    };

    prev?.addEventListener('click', () => rotate(-1));
    next?.addEventListener('click', () => rotate(1));

    let dragging = false;
    let startX = 0;
    let deltaX = 0;
    const onDown = (e) => {
      dragging = true;
      startX = e.clientX || e.touches?.[0]?.clientX || 0;
      deltaX = 0;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.clientX || e.touches?.[0]?.clientX || 0;
      deltaX = x - startX;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (deltaX > 40) rotate(-1);
      if (deltaX < -40) rotate(1);
      deltaX = 0;
    };
    stage.addEventListener('mousedown', onDown);
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseup', onUp);
    stage.addEventListener('mouseleave', onUp);
    stage.addEventListener('dragstart', (e) => e.preventDefault());
    stage.addEventListener('touchstart', onDown, { passive: true });
    stage.addEventListener('touchmove', onMove, { passive: true });
    stage.addEventListener('touchend', onUp);

    render();
  });
});
