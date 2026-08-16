/** Ported verbatim from legacy-vanilla/i18n/{en,es}.json — "capabilities" scope. */
interface CapabilityCard {
  tag: string;
  title: string;
  desc: string;
  points: string[];
}

export const capabilitiesUi = {
  en: {
    pageTitle: "Capabilities | System Core",
    pageDescription: "Engineering capabilities module for Unax Zulaika Fuente.",
    crumbCore: "Core",
    crumbAbout: "About",
    crumbCapabilities: "Capabilities",
    eyebrow: "CAPABILITIES",
    title: "Engineering capabilities",
    lead: "How I design systems, solve product constraints and deliver maintainable software.",
    cards: [
      {
        tag: "Architecture module",
        title: "System Engineering",
        desc: "I design modular software systems with clear boundaries, stable interfaces and long-term maintainability.",
        points: [
          "Modular architecture with explicit domain boundaries",
          "Structural decisions guided by maintainability and scale",
          "Layer integration without coupling business logic to UI details",
          "Codebase organization for predictable evolution over time",
        ],
      },
      {
        tag: "Delivery module",
        title: "Desktop & Product Engineering",
        desc: "I build desktop products as real production software, not as throwaway demos.",
        points: [
          "Electron applications with real runtime constraints",
          "Offline-first behavior and local reliability by design",
          "End-to-end ownership from interface to packaging",
          "Delivery focused on usable product increments",
        ],
      },
      {
        tag: "Trust module",
        title: "Security-Oriented Development",
        desc: "I treat security as a system property: boundaries, data protection and predictable trust models.",
        points: [
          "Security controls integrated into architecture decisions",
          "Local encrypted storage and sensitive data minimization",
          "Trust boundary separation across runtime layers",
          "Integrity checks and defensive handling of critical flows",
        ],
      },
      {
        tag: "Interface module",
        title: "Technical UX",
        desc: "I turn technical tools into understandable experiences through structured flows, state visibility and usable interaction design.",
        points: [
          "Complex flows reduced to clear operator actions",
          "State visibility for diagnostics, confidence and control",
          "Interaction patterns designed for speed and precision",
          "Onboarding that reduces friction in technical contexts",
        ],
      },
      {
        tag: "Acceleration module",
        title: "AI-Assisted Engineering",
        desc: "I use AI as an engineering multiplier for speed, exploration and implementation quality.",
        points: [
          "Rapid exploration of architecture alternatives",
          "Faster prototyping and iteration loops",
          "Assisted refactoring with explicit technical validation",
          "AI integrated as part of the toolchain, not as superficial noise",
        ],
      },
      {
        tag: "Integration module",
        title: "Full Stack / Integration Thinking",
        desc: "I connect frontend, backend and runtime into a coherent product architecture.",
        points: [
          "Frontend, backend and runtime responsibilities aligned",
          "API and application logic designed as one system",
          "Cross-layer problem solving with product context",
          "Implementation decisions tied to operational behavior",
        ],
      },
    ] satisfies CapabilityCard[],
    closing:
      "I build software as an integrated system: architecture, product constraints, security posture, technical UX and delivery execution.",
  },
  es: {
    pageTitle: "Capacidades | Núcleo del Sistema",
    pageDescription: "Módulo de capacidades de ingeniería de Unax Zulaika Fuente.",
    crumbCore: "Core",
    crumbAbout: "Sobre mí",
    crumbCapabilities: "Capacidades",
    eyebrow: "CAPACIDADES",
    title: "Capacidades de ingeniería",
    lead: "Cómo diseño sistemas, resuelvo restricciones de producto y entrego software mantenible.",
    cards: [
      {
        tag: "Módulo de arquitectura",
        title: "Ingeniería de sistemas",
        desc: "Diseño sistemas de software modulares con límites claros, interfaces estables y mantenibilidad a largo plazo.",
        points: [
          "Arquitectura modular con fronteras de dominio explícitas",
          "Decisiones estructurales guiadas por mantenibilidad y escala",
          "Integración de capas sin acoplar la lógica de negocio a detalles de UI",
          "Organización del código para una evolución predecible en el tiempo",
        ],
      },
      {
        tag: "Módulo de entrega",
        title: "Ingeniería de escritorio y producto",
        desc: "Construyo productos de escritorio como software real de producción, no como demos desechables.",
        points: [
          "Aplicaciones Electron con restricciones reales de ejecución",
          "Comportamiento offline-first y fiabilidad local por diseño",
          "Responsabilidad end-to-end desde la interfaz hasta el empaquetado",
          "Entrega orientada a incrementos de producto utilizables",
        ],
      },
      {
        tag: "Módulo de confianza",
        title: "Desarrollo orientado a seguridad",
        desc: "Trato la seguridad como una propiedad del sistema: límites, protección de datos y modelo de confianza predecible.",
        points: [
          "Controles de seguridad integrados en decisiones de arquitectura",
          "Almacenamiento local cifrado y minimización de datos sensibles",
          "Separación de fronteras de confianza entre capas de runtime",
          "Controles de integridad y manejo defensivo de flujos críticos",
        ],
      },
      {
        tag: "Módulo de interfaz",
        title: "UX técnica",
        desc: "Convierto herramientas técnicas en experiencias comprensibles mediante flujos estructurados, visibilidad de estado y diseño usable.",
        points: [
          "Flujos complejos reducidos a acciones claras para el operador",
          "Visibilidad de estado para diagnóstico, confianza y control",
          "Patrones de interacción orientados a velocidad y precisión",
          "Onboarding que reduce fricción en contextos técnicos",
        ],
      },
      {
        tag: "Módulo de aceleración",
        title: "Ingeniería asistida por IA",
        desc: "Uso IA como multiplicador de ingeniería para velocidad, exploración y calidad de implementación.",
        points: [
          "Exploración rápida de alternativas de arquitectura",
          "Prototipado e iteración más rápidos",
          "Refactor asistido con validación técnica explícita",
          "IA integrada como parte del flujo de herramientas, no como característica superficial",
        ],
      },
      {
        tag: "Módulo de integración",
        title: "Visión full stack e integración",
        desc: "Conecto frontend, backend y runtime en una arquitectura de producto coherente.",
        points: [
          "Responsabilidades de frontend, backend y runtime alineadas",
          "API y lógica de aplicación diseñadas como un solo sistema",
          "Resolución de problemas entre capas con contexto de producto",
          "Decisiones de implementación conectadas al comportamiento operativo",
        ],
      },
    ] satisfies CapabilityCard[],
    closing:
      "Desarrollo software como un sistema integrado: arquitectura, restricciones de producto, postura de seguridad, UX técnica y ejecución de entrega.",
  },
} as const;
