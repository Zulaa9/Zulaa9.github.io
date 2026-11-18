import { describe, expect, it } from 'vitest';
import { crossValidate, findMissingTranslations, formatIssues, MAX_CORE_NODES } from '../src/lib/schema';
import { clone, moduleSchema, readModules } from './helpers';

const modules = readModules();
const byId = (id: string) => clone(modules.find((m) => m.id === id)!);

describe('contenido actual', () => {
  it('existen los seis módulos del portfolio', () => {
    expect(modules.map((m) => m.id).sort()).toEqual(['about', 'capabilities', 'contact', 'keyping', 'portfolio-core', 'projects']);
  });

  it.each(modules.map((m) => [m.id, m.data]))('"%s" cumple el esquema', (_id, data) => {
    const r = moduleSchema.safeParse(data);
    expect(r.success ? [] : formatIssues(r.error)).toEqual([]);
  });

  it('no hay incoherencias entre módulos', () => {
    expect(crossValidate(modules)).toEqual([]);
  });

  it('todos los textos tienen traducción al español', () => {
    for (const m of modules) expect(findMissingTranslations(m.data), m.id).toEqual([]);
  });

  it('KeyPing es el único destacado y conserva su layout flagship', () => {
    const featured = modules.filter((m) => m.data.node.featured).map((m) => m.id);
    expect(featured).toEqual(['keyping']);
    expect(byId('keyping').data.project.layout).toBe('flagship');
  });

  it('las rutas son las del sitio anterior', () => {
    expect(modules.map((m) => m.data.path).sort()).toEqual(['about', 'capabilities', 'contact', 'projects', 'projects/keyping', 'projects/portfolio-core']);
  });

  it('no quedan enlaces al repositorio antiguo ni a zulaa9.github.io como web', () => {
    const text = JSON.stringify(modules);
    expect(text).not.toContain('Unax-Zulaika-Fuente.github.io');
    expect(text).not.toMatch(/https?:\/\/zulaa9\.github\.io/i);
  });
});

describe('datos no válidos', () => {
  const issues = (data: unknown) => {
    const r = moduleSchema.safeParse(data);
    return r.success ? [] : formatIssues(r.error);
  };

  it('falta el texto obligatorio en inglés', () => {
    const d = byId('about').data;
    d.node.title.en = '';
    expect(issues(d).join('\n')).toMatch(/node\.title\.en: Falta el texto en inglés/);
  });

  it('enlace con formato incorrecto', () => {
    const d = byId('contact').data;
    d.section.blocks[0].links[0].url = 'correo@ejemplo';
    expect(issues(d).join('\n')).toMatch(/Enlace no válido/);
  });

  it('imagen inexistente', () => {
    const d = byId('portfolio-core').data;
    d.project.cover.src = '../../assets/images/no-existe.png';
    expect(issues(d).join('\n')).toMatch(/project\.cover\.src: La imagen no existe/);
  });

  it('vídeo inexistente', () => {
    const d = byId('keyping').data;
    d.project.flagship.gallery.items[0].src = '/assets/media/no-existe.mp4';
    expect(issues(d).join('\n')).toMatch(/El vídeo no existe/);
  });

  it('campo desconocido (errata) en lugar de ignorarlo', () => {
    const d = byId('projects').data;
    d.projects.header.titel = { en: 'x', es: 'x' };
    expect(issues(d).length).toBeGreaterThan(0);
  });

  it('proyecto flagship sin bloque flagship', () => {
    const d = byId('keyping').data;
    delete d.project.flagship;
    expect(issues(d).join('\n')).toMatch(/flagship/);
  });

  it('ruta reservada o con formato incorrecto', () => {
    const d = byId('about').data;
    d.path = 'es/about';
    expect(issues(d).join('\n')).toMatch(/Ruta reservada/);
    d.path = 'Sobre Mi';
    expect(issues(d).join('\n')).toMatch(/Ruta no válida/);
  });

  it('estado de proyecto: sin indicador vale "neutral" y fuera de la tarjeta; un indicador desconocido es un error', () => {
    const d = byId('portfolio-core').data;
    d.project.status = { label: { en: 'Status', es: 'Estado' }, value: { en: 'Live', es: 'Publicado' } };
    const r = moduleSchema.safeParse(d);
    expect(r.success).toBe(true);
    if (r.success && r.data.template === 'project') expect(r.data.project.status).toMatchObject({ tone: 'neutral', onCard: false });
    d.project.status.tone = 'draft';
    expect(issues(d).join('\n')).toMatch(/project\.status\.tone/);
  });

  it('plantilla desconocida', () => {
    const d = byId('about').data;
    d.template = 'blog';
    expect(issues(d).length).toBeGreaterThan(0);
  });
});

describe('reglas entre módulos', () => {
  it('rutas duplicadas', () => {
    const list = clone(modules);
    list.find((m) => m.id === 'contact')!.data.path = 'about';
    expect(crossValidate(list).join('\n')).toMatch(/misma ruta "\/about\/"/);
  });

  it('padre inexistente y padre oculto', () => {
    const list = clone(modules);
    list.find((m) => m.id === 'keyping')!.data.parent = 'nada';
    expect(crossValidate(list).join('\n')).toMatch(/el padre "nada" no existe/);
    const list2 = clone(modules);
    list2.find((m) => m.id === 'projects')!.data.visible = false;
    expect(crossValidate(list2).join('\n')).toMatch(/su padre "projects" está oculto/);
  });

  it('identificador con formato incorrecto', () => {
    const list = clone(modules);
    list[0]!.id = 'Mi_Modulo';
    expect(crossValidate(list).join('\n')).toMatch(/slug en minúsculas/);
  });

  it(`máximo de ${MAX_CORE_NODES} nodos visibles`, () => {
    const list = clone(modules);
    for (let i = 0; list.length <= MAX_CORE_NODES; i += 1) {
      const extra = clone(modules.find((m) => m.id === 'portfolio-core')!);
      extra.id = `extra-${i}`;
      extra.data.path = `projects/extra-${i}`;
      extra.data.node.featured = false;
      list.push(extra);
    }
    expect(crossValidate(list).join('\n')).toMatch(/como máximo/);
  });

  it('debe haber un módulo destacado visible', () => {
    const list = clone(modules);
    list.find((m) => m.id === 'keyping')!.data.node.featured = false;
    expect(crossValidate(list).join('\n')).toMatch(/destacado/);
  });
});
