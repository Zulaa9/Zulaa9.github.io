import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildModuleSchema } from './lib/schema';

const publicDir = new URL('../public/', import.meta.url);

/**
 * Módulos del portfolio: un archivo JSON por módulo en src/content/modules/.
 * El nombre del archivo es el identificador del módulo.
 */
const modules = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: './src/content/modules',
    generateId: ({ entry }) => entry.replace(/\.json$/, ''),
  }),
  schema: ({ image }) =>
    buildModuleSchema(image, {
      videoExists: (p) => existsSync(fileURLToPath(new URL(`.${p}`, publicDir))),
    }),
});

export const collections = { modules };
