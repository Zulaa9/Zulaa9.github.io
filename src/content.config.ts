import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Graph topology — one file per node (id = filename).
 * Deliberately separate from `projects`: not every node is a project
 * (about/capabilities/contact/projects are branches, not content), and the
 * render engine (Fase 3) only needs this shape to draw the graph — it never
 * needs to know a project's feature list or links.
 */
const localizedNodeLabel = z.object({
  title: z.string(),
  // short badge under the title on the node button, e.g. "Flagship Product"
  meta: z.string().optional(),
  // longer copy shown in the info dock when this node is active/hovered
  dockCopy: z.string().optional(),
});

const graphNodeSchema = z.object({
  type: z.enum(["core", "branch", "project"]),
  parentId: z.string().nullable(),
  route: z.string().optional(),
  // omitted for the core node (not a clickable button)
  label: z.object({ en: localizedNodeLabel, es: localizedNodeLabel }).optional(),
  // No position/coordinates here on purpose — the force simulation
  // (src/components/graph/graph-simulation.ts) computes every node's
  // placement at runtime from this topology alone. Adding a node never
  // means adding coordinates.
  //
  // Forces extra visual weight in the simulation (shorter link to its
  // parent, stronger charge) — how a node gets "flagship" treatment the
  // way KeyPing does, without pinning it to a hand-placed spot.
  pinned: z.boolean().default(false),
  // A coarse, semantic hint for the handful of top-level identity branches
  // (About, Projects) — "which half of the window this reads on", not a
  // coordinate. Children still find their own exact spot automatically;
  // they just inherit a leftward/rightward tendency by being linked to a
  // biased parent, the same way any other force propagates.
  sideBias: z.enum(["left", "right"]).optional(),
  order: z.number().optional(),
  status: z.enum(["active", "wip", "planned", "archived"]).optional(),
  relations: z
    .array(
      z.object({
        targetId: z.string(),
        kind: z.enum(["related", "powers", "depends-on"]),
      }),
    )
    .default([]),
});

const graph = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/graph" }),
  schema: graphNodeSchema,
});

/**
 * Project content. Only `en`/`es` title + shortDescription are required —
 * everything else models a real field from the legacy site but stays
 * optional, per the brief: not every project needs every field.
 *
 * Locale split: fields that are genuinely prose (title, eyebrow,
 * shortDescription, features) live under `en`/`es`; fields that are facts,
 * not copy (stack, dates, links, status) stay at the top level so they're
 * never duplicated between languages.
 */
const localizedProjectCopy = z.object({
  title: z.string(),
  eyebrow: z.string().optional(),
  shortDescription: z.string().max(200),
  features: z.array(z.string()).optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/index.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      en: localizedProjectCopy,
      es: localizedProjectCopy,
      cover: image().optional(),
      gallery: z.array(image()).optional(),
      stack: z.array(z.string()).default([]),
      status: z.enum(["active", "wip", "planned", "archived"]).default("active"),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      links: z
        .object({
          repo: z.string().url().optional(),
          demo: z.string().url().optional(),
          docs: z.string().url().optional(),
        })
        .optional(),
      isFlagship: z.boolean().default(false),
      relatedNodeIds: z.array(z.string()).default([]),
      // lets a project be prepared without going live — no DB "draft" state needed
      draft: z.boolean().default(false),
      order: z.number().optional(),
    }),
});

export const collections = { graph, projects };
