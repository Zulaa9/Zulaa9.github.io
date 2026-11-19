# Zulaa9 — Software Systems Portfolio

This repository contains an interactive portfolio designed as a software system rather than a traditional static website.

The goal is to communicate engineering thinking through structure, interaction, and architecture, not just through visual presentation.

The interface is intentionally built around the concept of a **System Core**, where each module represents a domain of software engineering practice: product delivery, system design, technical identity, and execution.

---

## Concept

Instead of a conventional landing page, this portfolio is structured as an operational metaphor.

The **System Core** acts as a central runtime interface:
- Each node represents a functional domain
- Navigation follows a system → module transition model
- Interaction reflects architectural thinking
- Visual language mirrors technical intent

This approach aims to reflect how real software systems are structured: modular, intentional, and execution-focused.

---

## Flagship Product — KeyPing

**KeyPing** is a local-first desktop credential hygiene system focused on real-world password security practices.

It is not a browser autofill tool, nor a cloud-centric password manager.

Its purpose is to provide:

- detection of weak, reused, or similar credentials
- local vault control and integrity validation
- versioned password history management
- risk scoring and actionable security insights
- encrypted import/export workflows
- offline-first security guarantees

### Architecture

- Angular (standalone components)
- Electron runtime
- Local encrypted vault model
- IPC-mediated security boundaries
- Update distribution via GitHub Releases

KeyPing is treated as a product, not a demo.

---

## Portfolio Architecture

The portfolio itself follows a modular system model:

- System Core → navigation orchestration layer
- Modules → domain-specific views generated from content files
- Flagship dominance → KeyPing as primary node
- Secondary domains:
  - About (technical identity)
  - Capabilities (engineering scope)
  - Projects (execution record)
  - Contact (technical communication channel)

Each module is isolated in responsibility but unified in narrative.

---

## Technical Stack

- [Astro](https://astro.build/) static site generation (`output: 'static'`, no server runtime)
- Strict TypeScript
- Modules described as JSON content files, validated with a schema at build time
- Reusable page templates (project, about, generic section, project index)
- Three.js (from npm) for the System Core scene, loaded only on the core page
- CSS-driven visual system and motion language
- Language-specific routes (`/` and `/es/`) with a remembered language preference
- Performance-aware animation design; touch-adaptive interaction model
- A local-only admin panel for editing content (never part of the published site)

---

## UX Philosophy

This portfolio is built around several principles:

- Software systems should communicate intent through structure
- Interaction can act as technical storytelling
- Minimalism supports clarity of engineering thought
- Visual systems should remain subordinate to architectural meaning
- Execution credibility matters more than visual novelty

---

## Internationalization

- English (default, `/…`) and Spanish (`/es/…`), prerendered as separate pages.
- Interface texts: `src/i18n/en.json` and `src/i18n/es.json`.
- Module texts: every visible field in `src/content/modules/*.json` holds `{ "en": …, "es": … }`.
- Missing Spanish text falls back to English.
- The chosen language is remembered (`localStorage` key `system_core_lang`); on first visit the browser language decides.

---

## Performance Considerations

- The 3D scene pauses when the tab is hidden and releases its WebGL resources when leaving the core.
- Reduced-motion preferences are respected.
- Images are converted to WebP at build time; fonts are self-hosted.
- No analytics, cookies or third-party requests on the published site.

---

## Author

**Unax Zulaika Fuente (Zulaa9)**  
Software Systems Engineer  

---

## Links

- Live portfolio: `https://zula.dev/`
- KeyPing repository: `https://github.com/Zulaa9/KeyPing`
- LinkedIn: `https://www.linkedin.com/in/unax-zulaika-fuente/`

---

# Guía de mantenimiento (ES)

## Requisitos y comandos

Node.js 22 o superior.

```bash
npm install          # una vez
npm run dev          # sitio en http://localhost:4321/
npm run admin        # igual que dev, pero abre el panel en /__admin/
npm run check        # astro check (tipos y plantillas)
npm test             # pruebas (vitest)
npm run build        # genera dist/
npm run preview      # sirve dist/ para revisarlo
npm run verify       # check + test + build
```

## Estructura

```
src/
  content/modules/*.json   Un archivo por módulo (página + nodo del Core)
  content.config.ts        Colección "modules" con el esquema
  lib/schema.ts            Esquema, plantillas, validaciones cruzadas, máximo de nodos
  lib/layout.ts            Posiciones de los nodos del Core
  i18n/en.json, es.json    Textos de interfaz
  components/templates/    Una plantilla por tipo de módulo
  components/ModulePage.astro  Elige plantilla y estilos
  pages/                   Rutas: /, /es/, /[...path], /es/[...path], 404
  scripts/                 Cliente: escena 3D, navegación, lightbox, idioma
  styles/                  base.css (todas), core.css (Core), page.css (páginas de módulo)
  assets/                  Imágenes optimizadas por Astro (WebP)
public/                    Favicon, iconos, robots.txt, vídeo
admin/                     Panel local (solo en `astro dev`)
tests/                     Pruebas
```

### Cómo funciona el contenido

Cada archivo de `src/content/modules/` es un módulo con:

- `template`: `project`, `about`, `section` o `projects`.
- `order`: orden de los nodos, del menú móvil y de la galería de proyectos.
- `visible`: si es `false`, no se publica (se puede previsualizar en desarrollo).
- `path`: ruta (`about` → `/about/` y `/es/about/`; `projects/keyping` → `/projects/keyping/`).
- `parent`: módulo padre para las migas de pan y la posición del nodo (un solo nivel).
- `seo`, `crumb` y `node`: título y descripción por idioma, texto de la miga y nodo del Core (título, metadato, texto del panel inferior, posición opcional `x`/`y` entre 0.08 y 0.92 y `featured`).
- Un bloque con el nombre de la plantilla (`project`, `about`, `section`, `projects`) con su contenido.

En la plantilla `project`, `status` (opcional) lleva `label` y `value` por idioma y dos campos más:

- `tone`: `neutral` (por defecto; el estado sale como dato en el lateral de la cabecera), `live` (publicado, punto verde) o `preview` (aún no publicado, punto ámbar). Con `live` o `preview` el estado se muestra bajo la entradilla de la página.
- `onCard`: `true` para mostrar el estado también en la tarjeta del índice de proyectos (por defecto `false`).

Los módulos que no tienen estos campos siguen funcionando igual.

El build valida todo y falla con un mensaje claro cuando falta un campo obligatorio, hay rutas repetidas, una URL no es válida (`https://` o `mailto:`), una imagen o vídeo no existe, el padre no existe, hay más de 10 módulos visibles o ninguno destacado.

### Datos en vivo (versión de KeyPing, etc.)

Los textos de los módulos pueden llevar marcadores que se rellenan **al compilar** con la API pública de GitHub (`src/lib/live.ts`); el navegador no hace ninguna petición a terceros:

| Marcador | Valor |
|---|---|
| `{{keyping.version}}` | Última versión publicada (p. ej. `1.3.1`) |
| `{{keyping.date}}` | Mes y año de esa versión, según el idioma |
| `{{keyping.releases}}` | Número de versiones publicadas |
| `{{keyping.firstVersion}}` | Primera versión publicada |
| `{{keyping.commits}}` | Commits en `main` |
| `{{keyping.electron}}`, `{{keyping.angular}}` | Versión principal de Electron y Angular en `keyping-ui/package.json` |

Si la API no responde, el build usa `src/data/live-fallback.json` (actualízalo de vez en cuando) y lo indica en el log. Con `LIVE_DATA_OFFLINE=1` se usan siempre los datos de respaldo (las pruebas lo hacen así).

Para que zula.dev se actualice al publicar una versión de KeyPing, el proyecto de Cloudflare Pages `zula-portfolio` tiene un *deploy hook*; su URL se guarda en el repositorio de KeyPing como secreto `PORTFOLIO_DEPLOY_HOOK`, y el workflow `site.yml` de KeyPing lo llama tras cada release.

### Nodos del Core

- Hay un nodo por módulo visible, en el orden de `order`.
- El nodo `featured` (KeyPing) se dibuja como principal; tiene que haber al menos uno visible.
- Si el módulo tiene `node.position`, se respeta; si no, se coloca en el hueco libre más cercano al lado de su padre.
- Un nodo que tapa la tarjeta de texto o el panel inferior se sube por encima.
- **Máximo: 10 nodos visibles** (`MAX_CORE_NODES` en `src/lib/schema.ts`). Con más, el Core deja de ser legible en 390 px de ancho y el build falla. Para cambiarlo hay que añadir huecos en `AUTO_SLOTS` (`src/lib/layout.ts`) y comprobarlo en escritorio y móvil.

## Panel de administración local

Se evaluó [Keystatic](https://keystatic.com/). Se descartó porque necesita `output: 'server'` o un adaptador y añade rutas sin prerenderizar, y además no ofrece de serie la lista con orden, los avisos de traducción ni la vista previa con el Core. El panel de este repo es una pieza de Vite que **solo existe con `astro dev`**: el build no contiene `/__admin`, ni backend, ni credenciales.

Seguridad: solo acepta conexiones desde la propia máquina (`127.0.0.1`/`localhost`), comprueba la cabecera `Host` y usa un token nuevo en cada arranque.

### 1. Arrancar el panel

```bash
npm run admin
```

Abre `http://localhost:4321/__admin/`. A la izquierda aparece la lista de módulos con su tipo, si es visible u oculto y su orden. En el centro está el editor y a la derecha la vista previa.

### 2. Crear un módulo

1. Pulsa **+ Nuevo**.
2. Elige plantilla: *Proyecto*, *Sobre mí*, *Sección genérica* o *Índice de proyectos*.
3. Escribe el título y el identificador (minúsculas y guiones; es el nombre del archivo y de la URL).
4. Pulsa **Crear**. Se guarda en `src/content/modules/<id>.json` **oculto**.

### 3. Editar un módulo

1. Selecciónalo en la lista.
2. Cada texto tiene dos casillas, EN y ES. Las casillas ES vacías se marcan en amarillo y, al guardar, aparece un aviso (la página usará el texto en inglés).
3. Las listas (enlaces, tarjetas, bloques…) tienen botones para añadir, mover, duplicar y quitar elementos.
4. Imágenes: elige una existente o pulsa **Subir…**. Se guarda en `src/assets/uploads/<módulo>-<nombre>.<ext>` (los vídeos, en `public/assets/media/`).
5. Pulsa **Guardar**. Si algo no es válido (campo obligatorio, URL, ruta repetida, imagen inexistente), no se guarda y se indica qué campo falla.
6. Revisa la vista previa (EN/ES, página del módulo o System Core). Es el sitio real servido por `astro dev`.
7. **Ocultar/Mostrar** cambia `visible`. **Duplicar** crea una copia oculta. **Eliminar** pide confirmación y no deja borrar un módulo del que dependen otros o el único destacado. Arrastra los módulos (o usa ↑ ↓) para reordenarlos.

Los cambios son archivos normales: revísalos con `git diff` y haz commit.

### 4. Añadir una plantilla nueva

1. **Esquema**: en `src/lib/schema.ts`, añade el nombre a `TEMPLATES` y una rama nueva a la unión de `buildModuleSchema` con su bloque de contenido (usa `localized` para los textos).
2. **Componente**: crea `src/components/templates/MiPlantilla.astro`, que recibe `module` y `lang` y usa `tr()` para los textos.
3. **Estilos**: crea `src/styles/<skin>.css` (o reutiliza `section.css`).
4. **Selección**: en `src/components/ModulePage.astro`, añade la plantilla al cálculo de `skin`, importa su CSS con `?url` en el mapa `css` y añade el render.
5. **Panel**: crea `admin/templates/<nombre>.json` con `$admin.label`, `$admin.description` y un contenido de ejemplo válido (`__ID__` y `__TITLE__` se sustituyen al crear). Si hay campos nuevos, añade sus etiquetas en `LABELS` y los opcionales en `OPTIONAL` en `admin/ui/app.js`.
6. Ejecuta `npm run verify` y prueba a crear un módulo con la plantilla desde el panel.

## Build

```bash
npm run verify    # o solo: npm run build
```

El resultado queda en **`dist/`**: HTML prerenderizado, `_astro/` (CSS, JS e imágenes con hash), iconos, `robots.txt`, `sitemap-index.xml` y `404.html`.

### Rutas prerenderizadas y 404

- Cada ruta es una carpeta con `index.html`: `/about/` → `dist/about/index.html`, `/es/projects/keyping/` → `dist/es/projects/keyping/index.html`.
- Las URL canónicas terminan en `/`. El servidor debe servir `index.html` de la carpeta y redirigir `/about` → `/about/`.
- `dist/404.html` es la página de error, en inglés y en español según la ruta (`/es/…`) o la preferencia guardada. El servidor debe devolverla con código 404.
- No hace falta reescribir rutas (no es una SPA).

## Subir a zula.dev

zula.dev está detrás de Cloudflare y sirve la rama `main` de este repositorio (proyecto de Cloudflare Pages `zula-portfolio`). Con Astro, el proyecto de Cloudflare Pages tiene que compilar antes de publicar (Settings → Builds & deployments):

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Versión de Node: la fija `.node-version` (22); si el panel no la toma, añade la variable `NODE_VERSION=22`.

Sin esos ajustes, Cloudflare publicaría los archivos fuente tal cual y el sitio dejaría de funcionar.

Cloudflare Pages también publica una vista previa de cada rama (`<rama>.zula-portfolio.pages.dev`), útil para revisar antes de integrar en `main`.

### Otros servidores

En el repositorio no hay configuración del servidor de zula.dev (no hay `CNAME`, workflows ni archivos de servidor), así que estos pasos son genéricos:

1. `npm ci && npm run build`.
2. Sube el **contenido** de `dist/` a la raíz web del dominio, sustituyendo los archivos antiguos (por ejemplo, `rsync -av --delete dist/ usuario@servidor:/var/www/zula.dev/`, o por SFTP).
3. Comprueba `https://zula.dev/`, `/es/`, una ruta interna recargando la página y una ruta inexistente (debe mostrar la 404).

### Apache (`.htaccess` en la raíz)

```apache
Options -MultiViews
DirectoryIndex index.html
DirectorySlash On
ErrorDocument 404 /404.html

# HTML siempre fresco; recursos con hash (/_astro/) con caché larga (Apache 2.4)
<IfModule mod_headers.c>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <If "%{REQUEST_URI} =~ m#^/_astro/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
</IfModule>
```

### Nginx

```nginx
server {
  server_name zula.dev;
  root /var/www/zula.dev;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }
  location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  error_page 404 /404.html;
}
```

Con `try_files $uri $uri/`, Nginx redirige `/about` a `/about/` y sirve su `index.html`.

### GitHub Pages

El repositorio se llamaba `Zulaa9.github.io` y GitHub Pages lo publicaba en `https://zulaa9.github.io/`. Desde el 19-11-2026 Pages está desactivado y el repositorio se llama `portfolio`: el sitio solo se publica en zula.dev, mediante Cloudflare Pages. No hay que volver a activar Pages, porque publicaría el código fuente sin compilar.

## Notas

- `npm audit` muestra una vulnerabilidad alta en `picomatch` (dependencia transitiva de las herramientas de build) sin versión corregida todavía. Afecta solo a las herramientas locales, no a los archivos publicados.

---

## License

This project is licensed under the MIT License.
