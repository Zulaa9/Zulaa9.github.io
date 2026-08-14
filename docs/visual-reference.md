# Referencia visual del comportamiento actual (Fase 0)

Documento de aceptación para la Fase 3 (portado del grafo a Astro). Todos los valores están extraídos directamente de `main.js` en el commit `749e8ff` (estado vanilla, el que sigue en producción) y verificados en ejecución local (`python -m http.server`, sin errores de consola).

No se pudo grabar vídeo en este entorno (el panel de navegador de esta sesión no compone frames para captura), así que la referencia es el propio *state machine* con sus tiempos exactos — es más preciso que un vídeo para verificar regresiones.

## 1. Secuencia de arranque (startup gate)

Estado inicial: `body.awaiting-start.core-offline`, estrellas ocultas, botón "Start System" habilitado. Verificado en runtime: sin clic, el sitio permanece en este estado indefinidamente (arranque manual real, no autoplay).

Al pulsar el botón (`beginSystemStartup`):

| Paso | Clases en `body` | Duración |
|---|---|---|
| Offline | `booting boot-offline` | 220 ms |
| Boot log (líneas del terminal, una a una) | `booting boot-loading` | `180 + i·24` ms por línea (≈ 8 líneas visibles a la vez, máx.) |
| Pausa tras el log | — | 340 ms |
| Despliegue del panel | `boot-unfold` | 820 ms |
| Sincronizando | `core-syncing` | hasta que arranca el intro |

`setCoreStatus` pasa por `status.offline → status.booting → status.loading (con %) → status.syncing → status.online`.

## 2. Intro del núcleo (timeline coreografiada)

Constantes exactas de `runIntro()` (`introDurationMs = 3440`):

| Paso | `t` (ms desde inicio) | Clase añadida |
|---|---|---|
| 1 | 80 | `intro-step-1` |
| 2 | 980 | `intro-step-2` |
| 3 | 1580 | `intro-step-3` |
| 4 | 2200 | `intro-step-4` |
| 5 | 2820 | `intro-step-5` — aquí se dibujan las líneas SVG por primera vez (`updateLinks(true)`, con `stroke-dashoffset` animado 680 ms) |
| 6 | 3440 | `intro-step-6` + `intro-complete`, se quita `core-syncing`, estado pasa a `status.online` |

Verificado en runtime: tras ~4 s desde el clic, `body.className` termina exactamente en
`boot-unfold intro-step-1 intro-step-2 intro-step-3 intro-step-4 intro-step-5 intro-step-6 intro-complete` — coincide con el código.

Con `prefers-reduced-motion: reduce`, todo lo anterior se salta: los 6 pasos se aplican de golpe, sin boot log ni delays (`runIntro` early-return).

## 3. Transición a un módulo (clic en nodo)

Verificado con clic real en el nodo "Sobre mí": navega a `/about/?lang=es&from=core` (parámetro de idioma actual + `from=core`), sin errores de consola. Antes del salto:

- `state.isTransitioning = true`, `body.is-transitioning`.
- Cámara interpola `z: 5.2 → 2.55`, `x: 0 → 0.25`, `y: 0.15 → −0.05` a lo largo de 900 ms (`smoothstep`).
- El salto real (`window.location.href`) ocurre a los **780 ms**, no al terminar la animación de cámara — el cambio de página corta la transición visual, es una recarga completa.

## 4. Retorno desde un módulo (`?from=<módulo>`)

Al cargar una página con `from` reconocido (`fastForwardToReadyState` + `beginReturnTransition`):

- Se salta boot/intro por completo, se fuerza el estado final (`intro-complete`, opacidades finales de los meshes, `key.intensity = 4`).
- Cámara arranca en `z: 2.55` (posición "dentro" de un módulo) y hace `lerp` hasta `z: 5.2` en **760 ms**, con `coreGroup.scale` interpolando de `1.35×` a `1×` la escala base.
- `body.is-returning-from-keyping` se añade durante esta transición (nombre heredado de cuando solo existía KeyPing; se aplica a cualquier retorno).

## 5. Hover / impulso del núcleo

- Radio de detección de hover sobre el núcleo: `distToCore < 0.28` (coordenadas normalizadas −1..1 respecto al centro del stage).
- Tras **90 ms** de hover continuo y con `spinCooldown <= 0`, se dispara un impulso de giro de 220 ms (`spinBurstTime`), con cooldown de 800 ms antes del siguiente.
- Cambiar de nodo activo (`setActive`) dispara `state.coreImpulse = 1`, que decae con factor `0.1` por frame — es el "pulso" visual al pasar el ratón entre nodos.

## 6. Escala responsive

`getCoreBaseScale()`: `0.52` si `max-width: 860px`, si no `1`. Es el único breakpoint de escala del núcleo — cualquier port debe reproducir este umbral exacto o el núcleo se verá desproporcionado en tablet/móvil.

## 7. Checklist de aceptación para la Fase 3

- [ ] Los tiempos de la tabla del punto 2 se reproducen dentro de ±50 ms.
- [ ] `prefers-reduced-motion` salta boot + intro sin parpadeos.
- [ ] El breakpoint de escala del núcleo sigue en 860px.
- [ ] El impulso de giro al hacer hover sigue el umbral de 90 ms / cooldown 800 ms.
- [ ] La transición de salida tarda 900 ms visualmente aunque la navegación (ahora View Transition, no reload) pueda ocurrir antes.
- [ ] El retorno a un nodo concreto (antes vía `?from=`, ahora vía estado de navegación) sigue arrancando la cámara en la posición "dentro" (`z: 2.55`) y no repite el boot sequence.
