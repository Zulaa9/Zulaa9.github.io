/**
 * API del panel de administración (solo servidor de desarrollo).
 *
 * Seguridad: solo atiende peticiones desde la propia máquina (loopback), con
 * cabecera Host local y un token aleatorio por arranque que la página del panel
 * recibe incrustado. Nada de esto existe en el sitio publicado.
 */
import type { Connect, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

type SchemaModule = typeof import('../src/lib/schema');

const BASE = '/__admin';
const MAX_BODY = 80 * 1024 * 1024;
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];
const VIDEO_EXT = ['mp4', 'webm'];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const isLoopback = (addr?: string) => !!addr && (addr === '::1' || addr.startsWith('127.') || addr === '::ffff:127.0.0.1');
const isLocalHost = (host?: string) => !!host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);

export function createAdminMiddleware(server: ViteDevServer): Connect.NextHandleFunction {
  const root = server.config.root;
  const modulesDir = path.join(root, 'src/content/modules');
  const uploadsDir = path.join(root, 'src/assets/uploads');
  const assetsDir = path.join(root, 'src/assets');
  const mediaDir = path.join(root, 'public/assets/media');
  const uiDir = path.join(root, 'admin/ui');
  const templatesDir = path.join(root, 'admin/templates');
  const token = randomBytes(24).toString('hex');

  const loadSchema = () => server.ssrLoadModule('/src/lib/schema.ts') as Promise<SchemaModule>;

  const moduleFile = (id: string) => path.join(modulesDir, `${id}.json`);

  async function readAll(): Promise<Array<{ id: string; data: any }>> {
    const files = (await fs.readdir(modulesDir)).filter((f) => f.endsWith('.json')).sort();
    return Promise.all(
      files.map(async (f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(await fs.readFile(path.join(modulesDir, f), 'utf8')) })),
    );
  }

  /** Valida un módulo con el mismo esquema que el build, más las reglas entre módulos. */
  async function validate(id: string, data: unknown, all: Array<{ id: string; data: any }>) {
    const schema = await loadSchema();
    const image = schema.localImageHelper((rel) => existsSync(path.resolve(modulesDir, rel)));
    const moduleSchema = schema.buildModuleSchema(image, {
      videoExists: (p) => existsSync(path.join(root, 'public', p)),
    });
    const errors: string[] = [];
    if (!schema.ID_PATTERN.test(id)) errors.push('id: usa minúsculas, números y guiones (p. ej. mi-proyecto)');
    const parsed = moduleSchema.safeParse(data);
    if (!parsed.success) errors.push(...schema.formatIssues(parsed.error));
    const others = all.filter((m) => m.id !== id);
    if (parsed.success) {
      const cross = schema.crossValidate([...others, { id, data: parsed.data as any }]);
      errors.push(...cross);
    }
    return { errors, warnings: schema.findMissingTranslations(data).map((p) => `Falta la traducción al español: ${p}`) };
  }

  async function writeModule(id: string, data: unknown) {
    await fs.writeFile(moduleFile(id), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  function summary(m: { id: string; data: any }, schema: SchemaModule) {
    const d = m.data ?? {};
    const title = d.node?.title ?? {};
    return {
      id: m.id,
      template: d.template,
      layout: d.project?.layout,
      title,
      order: d.order,
      visible: d.visible,
      path: d.path,
      parent: d.parent ?? null,
      featured: !!d.node?.featured,
      missingTranslations: schema.findMissingTranslations(d).length,
    };
  }

  async function uniquePath(dir: string, base: string, ext: string) {
    let name = `${base}.${ext}`;
    for (let i = 2; existsSync(path.join(dir, name)); i += 1) name = `${base}-${i}.${ext}`;
    return name;
  }

  async function listImages(dir: string, prefix = ''): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) out.push(...(await listImages(path.join(dir, entry.name), rel)));
      else if (IMAGE_EXT.includes(path.extname(entry.name).slice(1).toLowerCase())) out.push(rel);
    }
    return out;
  }

  // ---- Rutas de la API ----
  async function api(req: IncomingMessage, url: URL): Promise<unknown> {
    const method = req.method ?? 'GET';
    const parts = url.pathname.slice(`${BASE}/api/`.length).split('/').filter(Boolean);
    const schema = await loadSchema();

    if (parts[0] === 'ready' && method === 'GET') {
      // La vista previa pregunta si astro dev ya sirve una ruta recién creada (evita cargar un 404).
      const target = url.searchParams.get('path') ?? '';
      if (!target.startsWith('/') || target.startsWith('//')) throw new HttpError(400, 'Ruta no válida.');
      try {
        const r = await fetch(`http://${req.headers.host}${target}`, { method: 'HEAD' });
        return { ok: r.ok };
      } catch {
        return { ok: false };
      }
    }

    if (parts[0] === 'modules' && parts.length === 1 && method === 'GET') {
      const all = await readAll();
      const cross = schema.crossValidate(all as any);
      const ordered = [...all].sort((a, b) => (Number(a.data.order) || 0) - (Number(b.data.order) || 0) || a.id.localeCompare(b.id));
      return { modules: ordered.map((m) => summary(m, schema)), problems: cross, maxNodes: schema.MAX_CORE_NODES };
    }

    if (parts[0] === 'modules' && parts.length === 1 && method === 'POST') {
      const body = (await readJson(req)) as { id?: string; template?: string; title?: string };
      const id = slugify(body.id || body.title || '');
      if (!id) throw new HttpError(400, 'Indica un identificador o un título.');
      if (existsSync(moduleFile(id))) throw new HttpError(409, `Ya existe un módulo con el identificador "${id}".`);
      const templateFile = path.join(templatesDir, `${slugify(body.template ?? '')}.json`);
      if (!existsSync(templateFile)) throw new HttpError(400, 'Plantilla desconocida.');
      const raw = (await fs.readFile(templateFile, 'utf8')).replaceAll('__ID__', id).replaceAll('__TITLE__', body.title?.trim() || id);
      const all = await readAll();
      const data = JSON.parse(raw);
      delete data.$admin;
      data.order = Math.max(0, ...all.map((m) => Number(m.data.order) || 0)) + 10;
      data.visible = false;
      await writeModule(id, data);
      return { id, ...(await validate(id, data, all)) };
    }

    if (parts[0] === 'modules' && parts[1]) {
      const id = parts[1];
      if (!/^[a-z0-9-]+$/.test(id)) throw new HttpError(400, 'Identificador no válido.');
      const file = moduleFile(id);
      if (!existsSync(file)) throw new HttpError(404, `No existe el módulo "${id}".`);
      const all = await readAll();

      if (parts[2] === 'duplicate' && method === 'POST') {
        const body = (await readJson(req)) as { newId?: string };
        const newId = slugify(body.newId || `${id}-copia`);
        if (existsSync(moduleFile(newId))) throw new HttpError(409, `Ya existe "${newId}".`);
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        data.visible = false;
        data.path = `${String(data.path).split('/').slice(0, -1).concat(newId).join('/')}`;
        data.order = Math.max(0, ...all.map((m) => Number(m.data.order) || 0)) + 10;
        if (data.node) data.node.featured = false;
        if (data.node) delete data.node.position;
        if (data.project) data.project.featured = false;
        await writeModule(newId, data);
        return { id: newId, ...(await validate(newId, data, [...all, { id: newId, data }])) };
      }

      if (parts.length === 2 && method === 'GET') {
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        return { id, data, ...(await validate(id, data, all)) };
      }

      if (parts.length === 2 && method === 'PUT') {
        const body = (await readJson(req)) as { data: unknown; force?: boolean };
        const result = await validate(id, body.data, all);
        if (result.errors.length) throw new HttpError(422, 'El módulo no es válido; no se ha guardado.', result);
        await writeModule(id, body.data);
        return { id, saved: true, ...result };
      }

      if (parts.length === 2 && method === 'DELETE') {
        const refs = all.filter((m) => m.id !== id && (m.data.parent === id || m.data.about?.nextStep?.contactModule === id)).map((m) => m.id);
        if (refs.length) throw new HttpError(409, `No se puede eliminar: lo usan ${refs.join(', ')}.`);
        const remaining = all.filter((m) => m.id !== id);
        const cross = schema.crossValidate(remaining as any);
        if (cross.some((e) => e.includes('destacado'))) throw new HttpError(409, 'No se puede eliminar el único módulo destacado visible.');
        await fs.unlink(file);
        return { deleted: id };
      }
    }

    if (parts[0] === 'reorder' && method === 'POST') {
      const body = (await readJson(req)) as { ids?: string[] };
      const ids = body.ids ?? [];
      const all = await readAll();
      if (ids.length !== all.length || !all.every((m) => ids.includes(m.id))) throw new HttpError(400, 'La lista de orden no coincide con los módulos.');
      for (const [i, mid] of ids.entries()) {
        const m = all.find((x) => x.id === mid)!;
        if (m.data.order !== (i + 1) * 10) {
          m.data.order = (i + 1) * 10;
          await writeModule(mid, m.data);
        }
      }
      return { ok: true };
    }

    if (parts[0] === 'templates' && method === 'GET') {
      const files = (await fs.readdir(templatesDir)).filter((f) => f.endsWith('.json'));
      return {
        templates: await Promise.all(
          files.map(async (f) => {
            const data = JSON.parse(await fs.readFile(path.join(templatesDir, f), 'utf8'));
            return { name: f.replace(/\.json$/, ''), label: data.$admin?.label ?? f, description: data.$admin?.description ?? '' };
          }),
        ),
      };
    }

    if (parts[0] === 'media' && method === 'GET') {
      const images = (await listImages(assetsDir)).map((rel) => `../../assets/${rel}`);
      const videos = existsSync(mediaDir) ? (await fs.readdir(mediaDir)).filter((f) => VIDEO_EXT.includes(path.extname(f).slice(1).toLowerCase())).map((f) => `/assets/media/${f}`) : [];
      return { images, videos };
    }

    if (parts[0] === 'upload' && method === 'POST') {
      const body = (await readJson(req)) as { moduleId?: string; filename?: string; data?: string };
      const ext = path.extname(body.filename ?? '').slice(1).toLowerCase();
      const isImage = IMAGE_EXT.includes(ext);
      const isVideo = VIDEO_EXT.includes(ext);
      if (!isImage && !isVideo) throw new HttpError(400, `Formato no admitido (.${ext}). Imágenes: ${IMAGE_EXT.join(', ')}. Vídeo: ${VIDEO_EXT.join(', ')}.`);
      const buf = Buffer.from(String(body.data ?? ''), 'base64');
      if (!buf.length) throw new HttpError(400, 'Archivo vacío.');
      if (buf.length > (isImage ? MAX_IMAGE : MAX_VIDEO)) throw new HttpError(413, 'Archivo demasiado grande.');
      const base = slugify(`${body.moduleId ?? 'media'}-${path.basename(body.filename ?? 'archivo', `.${ext}`)}`) || 'media';
      const dir = isImage ? uploadsDir : mediaDir;
      await fs.mkdir(dir, { recursive: true });
      const name = await uniquePath(dir, base, ext === 'jpeg' ? 'jpg' : ext);
      await fs.writeFile(path.join(dir, name), buf);
      return { path: isImage ? `../../assets/uploads/${name}` : `/assets/media/${name}`, kind: isImage ? 'image' : 'video' };
    }

    throw new HttpError(404, 'Ruta de la API desconocida.');
  }

  async function serveFile(res: ServerResponse, file: string) {
    const ext = path.extname(file).slice(1).toLowerCase();
    const types: Record<string, string> = {
      html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm',
    };
    res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    let content: Buffer | string = await fs.readFile(file);
    if (ext === 'html') content = content.toString('utf8').replace('__ADMIN_TOKEN__', token);
    res.end(content);
  }

  return async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return next();

    const send = (status: number, payload: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(payload));
    };

    if (!isLoopback(req.socket.remoteAddress) || !isLocalHost(req.headers.host)) {
      return send(403, { error: 'El panel solo está disponible desde esta máquina (localhost).' });
    }

    try {
      if (url.pathname === BASE) {
        res.statusCode = 302;
        res.setHeader('Location', `${BASE}/`);
        return res.end();
      }
      if (url.pathname.startsWith(`${BASE}/api/`)) {
        if (req.headers['x-admin-token'] !== token) return send(403, { error: 'Token del panel no válido. Recarga la página.' });
        return send(200, await api(req, url));
      }
      if (url.pathname === `${BASE}/file`) {
        // Miniaturas de imágenes del repositorio para el panel.
        const rel = url.searchParams.get('path') ?? '';
        const abs = rel.startsWith('/assets/media/') ? path.join(root, 'public', rel) : path.resolve(modulesDir, rel);
        if (!(abs.startsWith(assetsDir + path.sep) || abs.startsWith(mediaDir + path.sep)) || !existsSync(abs)) return send(404, { error: 'No encontrado' });
        return serveFile(res, abs);
      }
      const rel = url.pathname.slice(`${BASE}/`.length) || 'index.html';
      const abs = path.resolve(uiDir, rel);
      if (!abs.startsWith(uiDir + path.sep) || !existsSync(abs)) return send(404, { error: 'No encontrado' });
      return serveFile(res, abs);
    } catch (error) {
      if (error instanceof HttpError) return send(error.status, { error: error.message, ...(error.details ? { details: error.details } : {}) });
      server.config.logger.error(`[admin] ${(error as Error).stack ?? error}`);
      return send(500, { error: (error as Error).message });
    }
  };
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Petición demasiado grande.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new HttpError(400, 'JSON no válido.'));
      }
    });
    req.on('error', reject);
  });
}
