import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildModuleSchema, localImageHelper } from '../src/lib/schema';

export const ROOT = path.resolve(__dirname, '..');
export const MODULES_DIR = path.join(ROOT, 'src/content/modules');

export function readModules(): Array<{ id: string; data: any }> {
  return readdirSync(MODULES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(readFileSync(path.join(MODULES_DIR, f), 'utf8')) }));
}

/** El mismo esquema que usa Astro, con image() sustituido por una comprobación de archivo. */
export const moduleSchema = buildModuleSchema(
  localImageHelper((rel) => existsSync(path.resolve(MODULES_DIR, rel))),
  { videoExists: (p) => existsSync(path.join(ROOT, 'public', p)) },
);

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
