# Fase 5 — Imágenes y rendimiento

La mayor parte de esta fase ya quedó resuelta como parte de la Fase 4 (el
fix de `imageService: "compile"` — todas las imágenes de proyecto y el
retrato de About ya se optimizan en build time, verificado en `dist/`).

Lo que queda de esta fase y por qué no está hecho:

## Vídeo pesado → R2

`legacy-vanilla/assets/media/keyping-password-generator-flow.mp4` (5 MB) no
se ha migrado. Motivo: el plan de la Fase 5 lo mueve a Cloudflare R2, y eso
requiere tu cuenta de Cloudflare (crear el bucket, subir el fichero, obtener
la URL pública) — no es algo que pueda hacer sin acceso a tu cuenta.
Tampoco se referencia en ningún sitio del nuevo contenido todavía (el
contenido de KeyPing portado en la Fase 2 no incluyó la sección de
"visuals"/capturas del sitio original — quedó fuera a propósito, ver nota en
`src/content/projects/keyping/index.md`).

**Cuando quieras hacerlo:** crea un bucket R2, sube el vídeo, y añade la URL
resultante como un campo `demoVideo: z.string().url().optional()` al schema
de `projects` en `src/content.config.ts` — el resto (tag `<video>` con
`preload="metadata"` y póster) es una tarea de 15 minutos una vez tengas la
URL.

## Favicon sin optimizar

`public/favicon.svg` pesa 348 KB — ya pesaba eso en el sitio original
(`legacy-vanilla/favicon.svg`, mismo tamaño exacto), así que no es una
regresión de la migración. Es un SVG con un único `<path>` muy detallado, no
una imagen embebida. Impacto real bajo (el navegador lo descarga una vez por
pestaña, no en cada navegación de `ClientRouter`), así que no es urgente,
pero si en algún momento quieres bajarlo, lo más simple es exportar
versiones PNG pequeñas (32×32, 180×180 para `apple-touch-icon`) desde el
propio SVG y mantener el SVG como fallback — no toqué el trazado en sí
porque es tu marca/logo, no una decisión mía que tomar.

## Bundle de Three.js

`npm run build` avisa de un chunk >500 kB — es el motor del grafo
(`SystemCore.astro`'s script, con Three.js dentro). Verificado en
`dist/client/_astro/`: es el **único** archivo grande, y solo lo carga la
página del Core (`/`, `/es/`) — no contamina About/Capabilities/Contact ni
las páginas de proyecto. Es el tamaño esperado para Three.js integrado así;
no hace falta actuar ahora. Si algún día se queda corto, la palanca es
retrasar la construcción del `CoreScene` hasta después del clic en "Start
System" en vez de crearla en cuanto carga la página — no lo he tocado
porque el degradado de estrellas detrás de la puerta de arranque depende de
que la escena ya exista, y es un cambio que preferiría verificar
visualmente antes de aplicar (ver limitación de herramientas de la Fase 3).
