/**
 * Chrome copy specific to the System Core page (startup gate, boot terminal,
 * hero panel, info dock defaults). Ported verbatim from
 * legacy-vanilla/i18n/{en,es}.json under the "systemCore" scope.
 */
import type { Locale } from "./ui";

export const systemCoreUi = {
  en: {
    pageTitle: "Unax Zulaika | System Core",
    pageDescription:
      "System Core interface for Unax Zulaika Fuente portfolio and KeyPing as the flagship product.",
    startupEyebrow: "SYSTEM CORE // OFFLINE",
    startupTitle: "Manual startup required",
    startupCopy: "Initialize the core runtime and load the module graph.",
    startupCta: "Start System",
    bootEyebrow: "SYSTEM CORE // INIT",
    bootLines: [
      "[sys] initializing core context",
      "[io] probing local environment",
      "[sec] validating entropy source",
      "[pkg] loading module map",
      "[core] handshake complete",
      "[core] system architecture online",
    ],
    heroEyebrow: "SYSTEM ENTRY",
    heroTitle: "Product and system engineering portfolio built as an operational software core.",
    heroBodyHtml:
      "This is an engineered software system map, not a static showcase. <strong>KeyPing</strong> is the flagship product node, supported by architecture, capabilities and execution modules.",
    dockLabel: "Module",
    dockDefaultTitle: "Inspect a module",
    dockDefaultCopy: "Open any module to review engineering scope, product decisions and system constraints.",
    statusOffline: "SYSTEM CORE OFFLINE",
    statusBooting: "SYSTEM CORE BOOTING",
    statusSyncing: "SYSTEM CORE SYNCING VISUAL LAYER",
    statusOnline: "SYSTEM CORE ONLINE",
  },
  es: {
    pageTitle: "Unax Zulaika | Núcleo del Sistema",
    pageDescription:
      "Interfaz de Núcleo del Sistema para el portfolio de Unax Zulaika Fuente y KeyPing como producto principal.",
    startupEyebrow: "NÚCLEO DEL SISTEMA // APAGADO",
    startupTitle: "Arranque manual requerido",
    startupCopy: "Inicializa el entorno de ejecución del core y carga el grafo de módulos.",
    startupCta: "Iniciar Sistema",
    bootEyebrow: "NÚCLEO DEL SISTEMA // INICIO",
    bootLines: [
      "[sys] inicializando contexto del core",
      "[io] sondeando entorno local",
      "[sec] validando fuente de entropía",
      "[pkg] cargando mapa de módulos",
      "[core] handshake completado",
      "[core] arquitectura del sistema online",
    ],
    heroEyebrow: "ENTRADA DEL SISTEMA",
    heroTitle: "Portfolio de ingeniería de producto y sistemas construido como un núcleo operativo de software.",
    heroBodyHtml:
      "Esto es un mapa de sistema de software ingenierizado, no una portada estática. <strong>KeyPing</strong> es el nodo de producto principal, respaldado por módulos de arquitectura, capacidades y ejecución.",
    dockLabel: "Módulo",
    dockDefaultTitle: "Inspecciona un módulo",
    dockDefaultCopy: "Abre cualquier módulo para revisar alcance de ingeniería, decisiones de producto y restricciones del sistema.",
    statusOffline: "NÚCLEO DEL SISTEMA APAGADO",
    statusBooting: "ARRANCANDO NÚCLEO DEL SISTEMA",
    statusSyncing: "SINCRONIZANDO CAPA VISUAL DEL NÚCLEO DEL SISTEMA",
    statusOnline: "NÚCLEO DEL SISTEMA ONLINE",
  },
} as const;

export function scUi(locale: string | undefined): (typeof systemCoreUi)["en"] {
  const resolved = (locale === "es" ? "es" : "en") as Locale;
  return systemCoreUi[resolved];
}
