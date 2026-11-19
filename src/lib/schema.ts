/**
 * Esquema de los módulos del portfolio.
 *
 * Es la única definición de qué puede contener un módulo. La usan:
 *  - `src/content.config.ts` (validación en `astro build` / `astro dev`),
 *  - el panel de administración local (`admin/`), antes de escribir un archivo,
 *  - los tests (`tests/`).
 *
 * `image` es el helper de Astro (`SchemaContext.image`). Fuera de Astro se
 * pasa un sustituto que valida que el archivo exista (ver `tests/helpers.ts`).
 */
import { z } from 'astro/zod';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Máximo de módulos visibles como nodo en el System Core (ver README). */
export const MAX_CORE_NODES = 10;

export const TEMPLATES = ['project', 'about', 'section', 'projects'] as const;
export type TemplateName = (typeof TEMPLATES)[number];

/** Rutas que no puede usar un módulo. */
export const RESERVED_PATHS = ['es', 'en', '__admin', '404', 'assets', '_astro', 'api', 'admin'];

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PATH_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const URL_PATTERN = /^(?:https?:\/\/[^\s/$.?#][^\s]*|mailto:[^\s@]+@[^\s@]+\.[^\s@]+)$/i;

/** Texto traducido. El inglés es obligatorio (idioma por defecto y fallback). */
export const localized = z.strictObject({
  en: z.string().trim().min(1, 'Falta el texto en inglés (es obligatorio: es el idioma de respaldo).'),
  es: z.string().trim(),
});
export type Localized = z.infer<typeof localized>;

const localizedList = z.array(localized);

export const externalUrl = z
  .string()
  .trim()
  .regex(URL_PATTERN, 'Enlace no válido: usa una URL completa (https://…) o mailto:correo@dominio');

/** Vídeo servido desde `public/`. Ruta absoluta del sitio, p. ej. `/assets/media/demo.mp4`. */
export const publicVideoPath = z
  .string()
  .regex(/^\/assets\/media\/[a-z0-9][a-z0-9._-]*\.(?:mp4|webm)$/i, 'El vídeo debe estar en public/assets/media/ (ruta /assets/media/nombre.mp4)');


export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];

/**
 * Sustituto de `image()` fuera de Astro (panel y tests): acepta una ruta relativa
 * al archivo del módulo y comprueba que la imagen exista.
 */
export function localImageHelper(exists: (relativePath: string) => boolean) {
  return () =>
    z
      .string()
      .min(1, 'Falta la imagen')
      .refine((p) => new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i').test(p), { message: 'Formato de imagen no admitido' })
      .refine((p) => exists(p), { message: 'La imagen no existe en el repositorio' });
}

/** Convierte los errores de Zod en líneas legibles: "campo.subcampo: mensaje". */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.map(String).join('.') || '(módulo)'}: ${i.message}`);
}

export function buildModuleSchema<I extends z.ZodType>(image: () => I, extra?: { videoExists?: (path: string) => boolean }) {
  const video = extra?.videoExists
    ? publicVideoPath.refine((p) => extra.videoExists!(p), { message: 'El vídeo no existe en public/' })
    : publicVideoPath;

  const position = z.strictObject({
    x: z.number().min(0.08).max(0.92),
    y: z.number().min(0.08).max(0.92),
  });

  const node = z.strictObject({
    title: localized,
    meta: localized,
    dock: z.strictObject({ title: localized, copy: localized }),
    mobileLabel: localized.optional(),
    /** Posición relativa (0–1) en el escritorio. Si falta, se asigna un hueco libre automáticamente. */
    position: position.optional(),
    featured: z.boolean().optional(),
  });

  const titledList = z.strictObject({ title: localized, items: localizedList });

  const link = z.strictObject({
    kind: z.enum(['github', 'download', 'external']).default('external'),
    label: localized,
    url: externalUrl,
    // Opcional: otra URL para las páginas en español (p. ej. la versión /es/ de una web).
    urlEs: externalUrl.optional(),
  });

  // `srcEs` (opcional): la misma captura con la interfaz en español; se usa en las páginas /es/.
  const imageRef = z.strictObject({ src: image(), srcEs: image().optional(), alt: localized, caption: localized.optional() });

  const mediaItem = z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('image'),
      placement: z.enum(['hero', 'rail', 'extra']).default('rail'),
      compact: z.boolean().optional(),
      src: image(),
      srcEs: image().optional(),
      alt: localized,
      caption: localized,
    }),
    z.strictObject({
      type: z.literal('video'),
      placement: z.enum(['hero', 'rail', 'extra']).default('hero'),
      src: video,
      srcEs: video.optional(),
      alt: localized,
      caption: localized,
    }),
    z.strictObject({
      type: z.literal('composite'),
      placement: z.enum(['hero', 'rail', 'extra']).default('rail'),
      caption: localized,
      parts: z.array(imageRef).length(2, 'Una imagen compuesta lleva exactamente 2 imágenes'),
    }),
  ]);

  const header = z.strictObject({ eyebrow: localized, title: localized, lead: localized });

  const flagship = z.strictObject({
    logo: image(),
    /** Fila «Última versión» de la columna derecha (admite marcadores en vivo). */
    release: z.strictObject({ label: localized, value: localized }).optional(),
    punchline: localized,
    pills: localizedList,
    actions: z.array(
      z.strictObject({
        variant: z.enum(['download', 'website', 'github']),
        eyebrow: localized,
        label: localized,
        url: externalUrl,
        // Opcional: otra URL para las páginas en español.
        urlEs: externalUrl.optional(),
      }),
    ),
    why: z.strictObject({
      title: localized,
      subtitle: localized,
      lead: localized,
      cards: z.array(z.strictObject({ title: localized, copy: localized })),
      focus: z.strictObject({ title: localized, copy: localized }).optional(),
    }),
    metrics: z.strictObject({ title: localized, subtitle: localized, items: localizedList, statement: localized }),
    gallery: z.strictObject({ title: localized, lead: localized, moreBadge: localized, items: z.array(mediaItem) }),
    features: titledList,
    security: titledList,
    architecture: z.strictObject({
      title: localized,
      stack: z.array(z.strictObject({ label: localized, value: localized })),
      flow: localizedList,
    }),
    integrity: z.strictObject({
      title: localized,
      copy: localized,
      files: localizedList,
      verifyLabel: localized,
      command: z.string().min(1),
    }),
    roadmap: titledList,
  });

  const project = z
    .strictObject({
      /** standard = plantilla genérica de proyecto; flagship = vista de producto estrella (KeyPing). */
      layout: z.enum(['standard', 'flagship']).default('standard'),
      name: localized,
      cardEyebrow: localized,
      summary: localized,
      enterLabel: localized,
      featured: z.boolean().default(false),
      stack: localizedList,
      stackTitle: localized.optional(),
      cover: z.strictObject({ src: image(), alt: localized, fit: z.enum(['logo', 'cover']).default('cover') }),
      links: z.array(link).default([]),
      /**
       * Estado del proyecto. `tone` cambia el indicador (neutral, live = publicado,
       * preview = aún no publicado) y `onCard` lo muestra también en la tarjeta del índice.
       */
      status: z
        .strictObject({
          label: localized,
          value: localized,
          tone: z.enum(['neutral', 'live', 'preview']).default('neutral'),
          onCard: z.boolean().default(false),
        })
        .optional(),
      /**
       * Bloque «Adopción» (reglas en README, «Métricas de adopción»).
       * `value`: número o marcador en vivo ({{keyping.downloads}}). `unit`: users si la
       * fuente mide usuarios, downloads si no. `asOf` (AAAA-MM-DD) es obligatorio para
       * valores manuales; si falta, el valor es automático y se fecha con el build.
       * Si el valor no es un número o es menor que `minimum`, el bloque no se muestra.
       */
      adoption: z
        .strictObject({
          value: z.string().min(1),
          unit: z.enum(['users', 'downloads']),
          source: localized,
          asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha AAAA-MM-DD').optional(),
          minimum: z.number().int().nonnegative().default(0),
        })
        .refine((a) => !!a.asOf || a.value.includes('{{'), {
          message: 'Un valor manual necesita la fecha "asOf" (AAAA-MM-DD).',
          path: ['asOf'],
        })
        .optional(),
      header,
      description: z.strictObject({ title: localized, paragraphs: localizedList.min(1) }),
      sections: z.array(titledList).default([]),
      media: z.array(mediaItem).default([]),
      /**
       * Sección propia para la galería (opcional). Con ella, la galería va numerada con su título
       * y entradilla, y los vídeos se muestran grandes arriba, en bucle y sin sonido.
       */
      mediaSection: z.strictObject({ title: localized, lead: localized.optional() }).optional(),
      flagship: flagship.optional(),
    })
    .refine((p) => p.layout !== 'flagship' || !!p.flagship, {
      message: 'Un proyecto con layout "flagship" necesita el bloque "flagship".',
      path: ['flagship'],
    });

  const about = z.strictObject({
    header: z.strictObject({ eyebrow: localized, title: localized, lead: localized, paragraphs: localizedList }),
    photo: z.strictObject({ src: image(), alt: localized }).optional(),
    nextStep: z
      .strictObject({
        title: localized,
        contactModule: z.string().regex(ID_PATTERN),
        contactLabel: localized,
        cvLabel: localized.optional(),
        cvUrl: externalUrl.optional(),
      })
      .optional(),
    experience: z.strictObject({
      title: localized,
      items: z.array(
        z.strictObject({
          role: localized,
          date: localized,
          copy: localized,
          highlight: z.strictObject({ label: localized, value: localized }).optional(),
        }),
      ),
    }),
    focus: titledList,
    primarySkills: titledList,
    secondarySkills: titledList,
    closing: localized.optional(),
  });

  const block = z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('text'),
      title: localized.optional(),
      variant: z.enum(['plain', 'closing', 'lines']).default('plain'),
      paragraphs: localizedList.min(1),
    }),
    z.strictObject({
      type: z.literal('list'),
      title: localized,
      style: z.enum(['bullets', 'chips']).default('bullets'),
      items: localizedList.min(1),
    }),
    z.strictObject({
      type: z.literal('cards'),
      title: localized.optional(),
      cards: z
        .array(z.strictObject({ tag: localized.optional(), title: localized, desc: localized, points: localizedList.default([]) }))
        .min(1),
    }),
    z.strictObject({ type: z.literal('image'), src: image(), alt: localized, caption: localized.optional() }),
    z.strictObject({
      type: z.literal('links'),
      title: localized.optional(),
      links: z.array(z.strictObject({ label: localized, subtitle: localized.optional(), url: externalUrl })).min(1),
    }),
  ]);

  const section = z.strictObject({
    header: header.extend({ leadSize: z.enum(['normal', 'large']).default('normal') }),
    blocks: z.array(block),
  });

  const projectsIndex = z.strictObject({ header });

  const common = {
    order: z.number().int().min(0),
    visible: z.boolean(),
    path: z
      .string()
      .regex(PATH_PATTERN, 'Ruta no válida: minúsculas, números y guiones, separados por "/" (p. ej. projects/mi-app)')
      .refine((p) => !RESERVED_PATHS.includes(p.split('/')[0]!), { message: 'Ruta reservada' }),
    parent: z.string().regex(ID_PATTERN).optional(),
    crumb: localized,
    seo: z.strictObject({ title: localized, description: localized }),
    node,
  };

  return z.discriminatedUnion('template', [
    z.strictObject({ template: z.literal('project'), ...common, project }),
    z.strictObject({ template: z.literal('about'), ...common, about }),
    z.strictObject({ template: z.literal('section'), ...common, section }),
    z.strictObject({ template: z.literal('projects'), ...common, projects: projectsIndex }),
  ]);
}

/** Problemas que dependen de varios módulos a la vez (ids, rutas, padres…). */
export interface ModuleLike {
  id: string;
  data: {
    template: string;
    visible: boolean;
    path: string;
    parent?: string;
    node: { featured?: boolean; position?: { x: number; y: number } };
    about?: { nextStep?: { contactModule: string } };
  };
}

export function crossValidate(modules: ModuleLike[]): string[] {
  const errors: string[] = [];
  const byId = new Map(modules.map((m) => [m.id, m]));
  const paths = new Map<string, string>();

  for (const m of modules) {
    if (!ID_PATTERN.test(m.id)) errors.push(`"${m.id}": el identificador (nombre del archivo) debe ser un slug en minúsculas.`);
    const other = paths.get(m.data.path);
    if (other) errors.push(`"${m.id}" y "${other}" usan la misma ruta "/${m.data.path}/".`);
    paths.set(m.data.path, m.id);

    if (m.data.parent) {
      if (m.data.parent === m.id) errors.push(`"${m.id}": un módulo no puede ser su propio padre.`);
      else if (!byId.has(m.data.parent)) errors.push(`"${m.id}": el padre "${m.data.parent}" no existe.`);
      else {
        const parent = byId.get(m.data.parent)!;
        if (parent.data.parent) errors.push(`"${m.id}": el padre "${parent.id}" ya tiene padre (solo se admite un nivel).`);
        if (m.data.visible && !parent.data.visible) errors.push(`"${m.id}" es visible pero su padre "${parent.id}" está oculto.`);
      }
    }
    const contact = m.data.about?.nextStep?.contactModule;
    if (contact && !byId.has(contact)) errors.push(`"${m.id}": el módulo de contacto "${contact}" no existe.`);
  }

  const visible = modules.filter((m) => m.data.visible);
  if (visible.length > MAX_CORE_NODES) {
    errors.push(`Hay ${visible.length} módulos visibles; el System Core admite como máximo ${MAX_CORE_NODES}.`);
  }
  if (!visible.some((m) => m.data.node.featured)) {
    errors.push('Debe haber al menos un módulo visible marcado como destacado (node.featured).');
  }
  return errors;
}

/** Textos con traducción al español vacía (avisos, no errores). */
export function findMissingTranslations(value: unknown, path = ''): string[] {
  const out: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...findMissingTranslations(v, `${path}[${i}]`)));
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 2 && 'en' in obj && 'es' in obj && typeof obj.en === 'string') {
      if (!String(obj.es ?? '').trim()) out.push(path);
      return out;
    }
    for (const k of keys) out.push(...findMissingTranslations(obj[k], path ? `${path}.${k}` : k));
  }
  return out;
}
