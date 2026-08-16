# Fase 6 — Panel de administración

Lo que hay: `/admin` (listado), `/admin/projects/new`, `/admin/projects/<slug>/edit` —
guardan directamente en GitHub vía su API de contenidos (commit real, sin base
de datos), y crean/actualizan el nodo del grafo correspondiente en el mismo
guardado.

**No he podido probar el flujo de guardado de extremo a extremo.** Escribir y
verificar código de admin sin escribir de verdad en tu repositorio, y sin un
token de GitHub, es la única forma responsable de hacerlo — no voy a crear ni
pedirte un token por chat (ver más abajo). Lo que sí verifiqué:

- El formulario carga y valida en el navegador (`npm run dev`).
- El serializador Markdown↔YAML tiene *round-trip* comprobado con `yaml`
  (librería real, no un parser hecho a mano — la primera versión que escribí
  era frágil y la descarté antes de commitear nada).
- El parser de lectura funciona sobre un fichero real ya existente
  (`src/content/projects/keyping/index.md`), no solo sobre lo que él mismo
  genera.
- La página de edición, sin `GITHUB_TOKEN` configurado, cae a leer del build
  local (para poder probar el formulario aquí) — con el token puesto, lee en
  vivo de GitHub.
- Probé el envío real del formulario (crear y editar) contra el endpoint:
  llega correctamente hasta el punto de necesitar el token y falla ahí con
  el mensaje esperado — es la prueba más profunda posible sin credenciales
  reales.

Dos bugs reales que solo aparecieron al probar el envío de verdad (no al
solo mirar el código):

1. `Astro.locals.runtime.env` está eliminado en Astro v6+ (usamos v7) — la
   API actual es `import { env } from "cloudflare:workers"`. El primer
   intento crasheaba en cuanto se enviaba el formulario.
2. El campo `slug` en modo edición era `disabled`, y los campos
   `disabled` no se envían con el formulario — guardar una edición habría
   fallado la validación por "slug vacío" cada vez. Cambiado a `readonly`
   (no editable, pero sí se envía).

Lo que **no** he verificado porque no puedo: una llamada real a la API de
GitHub que escriba en tu repo. Antes de confiar en esto, prueba tú mismo un
guardado real (crea un proyecto de prueba, comprueba el commit en GitHub,
bórralo) antes de darlo por bueno para uso diario.

## Lo que tienes que hacer tú (no puedo hacerlo yo)

### 1. Token de GitHub

Crea un **fine-grained personal access token** en GitHub
(Settings → Developer settings → Fine-grained tokens):
- Repository access: solo `Zulaa9.github.io`.
- Permissions: **Contents: Read and write**. Nada más.

No me pegues el token en el chat bajo ningún concepto — configúralo
directamente como secreto de Cloudflare Pages:

```bash
wrangler secret put GITHUB_TOKEN
```

(o desde el dashboard de Cloudflare Pages → tu proyecto → Settings →
Environment variables → Add secret).

Variables opcionales (con valores por defecto si no las pones):
`GITHUB_OWNER` (`Zulaa9`), `GITHUB_REPO` (`Zulaa9.github.io`), `GITHUB_BRANCH` (`main`).

### 2. Cloudflare Access delante de `/admin/*`

Nada en el código de esta app protege `/admin` — la Fase 6 del plan siempre
asumió que el gating real lo pone Cloudflare Access en el borde, antes de que
la petición llegue a la aplicación. Sin este paso, `/admin` es una página
pública para cualquiera que adivine la URL (el formulario en sí no
funcionaría sin el token, pero mejor no depender solo de eso).

En el dashboard de Cloudflare → Zero Trust → Access → Applications:
1. Añade una aplicación de tipo "Self-hosted" para `zula.dev/admin*`.
2. Política de acceso: por email (el tuyo) o login de GitHub — con esto
   basta para un panel de un solo usuario.
3. Zero Trust tiene un plan gratuito hasta 50 usuarios; para un panel
   personal no debería costarte nada.

### 3. Probar antes de confiar

Con el token puesto y Access configurado: crea un proyecto de prueba desde
`/admin/projects/new`, confirma que aparece el commit en GitHub, y bórralo.
Así sabemos que la ruta completa (formulario → función → API de GitHub →
commit) funciona en tu entorno real, no solo en mi verificación local.

## Lo que falta para una v1 "completa" del plan (a propósito, no por descuido)

- **Selector visual de posición en el grafo**: hoy un proyecto nuevo entra
  siempre en modo `auto` bajo "Projects", con un ángulo determinista
  calculado del slug. No hay UI para fijar una posición curada o marcar
  relaciones (`relations[]`) a mano — el motor ya lo soporta (Fase 3), pero
  construir el editor visual es una pieza de trabajo separada y no
  pequeña. Lo dejo para cuando lo necesites de verdad.
- **Subida de galería/capturas múltiples**: el formulario solo sube la
  portada. `gallery[]` existe en el esquema pero no tiene UI de admin
  todavía.
- **Autenticación de la propia función**: la función de guardado no verifica
  el JWT de Cloudflare Access — confía en que Access ya filtró la petición
  antes de que llegue. Es válido mientras el paso 2 de arriba esté bien
  configurado, pero es una capa menos de defensa en profundidad si algún día
  quieres reforzarlo.
