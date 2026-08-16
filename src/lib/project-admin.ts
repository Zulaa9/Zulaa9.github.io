import { z } from "astro:content";
import { stringify as stringifyYaml, parse as parseYaml } from "yaml";

/**
 * Validation for the admin "save project" payload. Deliberately not the
 * same object as the `projects` collection schema in content.config.ts:
 * that schema's `image()` fields only resolve inside Astro's content-config
 * context at build time. Here we're producing the *source files* the build
 * will later read — cover comes in as a data: URL (or is omitted to keep
 * the existing one on edit), not a resolved ImageMetadata.
 */
export const adminProjectSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase letters, numbers and hyphens only"),
  en: z.object({
    title: z.string().min(1),
    eyebrow: z.string().optional(),
    shortDescription: z.string().min(1).max(200),
    features: z.array(z.string()).optional(),
  }),
  es: z.object({
    title: z.string().min(1),
    eyebrow: z.string().optional(),
    shortDescription: z.string().min(1).max(200),
    features: z.array(z.string()).optional(),
  }),
  stack: z.array(z.string()).default([]),
  status: z.enum(["active", "wip", "planned", "archived"]).default("active"),
  links: z
    .object({
      repo: z.string().url().optional().or(z.literal("")),
      demo: z.string().url().optional().or(z.literal("")),
      docs: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  isFlagship: z.boolean().default(false),
  draft: z.boolean().default(true),
  order: z.coerce.number().optional(),
  body: z.string().optional(),
  /** data: URL from a <input type="file"> read client-side; omitted on edit keeps the existing cover. */
  coverDataUrl: z.string().startsWith("data:image/").optional(),
});

export type AdminProjectPayload = z.infer<typeof adminProjectSchema>;

function pruneEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Builds the full content of src/content/projects/<slug>/index.md. */
export function serializeProjectMarkdown(payload: AdminProjectPayload, existingCoverExt?: string): string {
  const frontmatter: Record<string, unknown> = {
    en: pruneEmpty(payload.en),
    es: pruneEmpty(payload.es),
    stack: payload.stack,
    status: payload.status,
    isFlagship: payload.isFlagship,
    draft: payload.draft,
  };

  const coverExt = payload.coverDataUrl ? extensionFromDataUrl(payload.coverDataUrl) : existingCoverExt;
  if (coverExt) frontmatter.cover = `./cover.${coverExt}`;

  const links = payload.links ? pruneEmpty(payload.links) : {};
  if (Object.keys(links).length > 0) frontmatter.links = links;

  if (payload.order !== undefined) frontmatter.order = payload.order;

  return `---\n${stringifyYaml(frontmatter)}---\n\n${(payload.body ?? "").trim()}\n`;
}

/** Builds src/content/graph/<slug>.json for a new project node (sane defaults — no visual position picker in v1). */
export function serializeGraphNode(payload: AdminProjectPayload, angleHint: number): string {
  const node = {
    type: "project" as const,
    parentId: "projects",
    route: `/projects/${payload.slug}`,
    label: {
      en: { title: payload.en.title, meta: payload.en.eyebrow ?? "Personal Project" },
      es: { title: payload.es.title, meta: payload.es.eyebrow ?? "Proyecto personal" },
    },
    layout: { mode: "auto" as const, angleHint },
    pinned: payload.isFlagship,
    status: payload.status,
  };
  return JSON.stringify(node, null, 2) + "\n";
}

export function extensionFromDataUrl(dataUrl: string): string {
  const match = /^data:image\/(png|jpe?g|webp|gif|svg\+xml)/.exec(dataUrl);
  const type = match?.[1] ?? "png";
  return type === "svg+xml" ? "svg" : type === "jpeg" ? "jpg" : type;
}

export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Malformed data URL");
  return dataUrl.slice(comma + 1);
}

interface ParsedProject {
  en: { title: string; eyebrow?: string; shortDescription: string; features: string[] };
  es: { title: string; eyebrow?: string; shortDescription: string; features: string[] };
  stack: string[];
  status: string;
  links: { repo?: string; demo?: string; docs?: string };
  isFlagship: boolean;
  draft: boolean;
  order?: number;
  body: string;
  hasCover: boolean;
}

/** Reads a project file back into edit-form values, for the admin's live "current state" prefill. */
export function parseProjectMarkdown(raw: string): ParsedProject {
  const frontmatterMatch = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!frontmatterMatch) throw new Error("No frontmatter found in project file");
  const [, frontmatterYaml, body] = frontmatterMatch;
  const data = parseYaml(frontmatterYaml) as Record<string, any>;

  return {
    en: {
      title: data.en?.title ?? "",
      eyebrow: data.en?.eyebrow,
      shortDescription: data.en?.shortDescription ?? "",
      features: data.en?.features ?? [],
    },
    es: {
      title: data.es?.title ?? "",
      eyebrow: data.es?.eyebrow,
      shortDescription: data.es?.shortDescription ?? "",
      features: data.es?.features ?? [],
    },
    stack: data.stack ?? [],
    status: data.status ?? "wip",
    links: data.links ?? {},
    isFlagship: Boolean(data.isFlagship),
    draft: data.draft !== false,
    order: data.order,
    body: body.trim(),
    hasCover: Boolean(data.cover),
  };
}
