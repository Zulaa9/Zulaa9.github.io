// Panel de administración local. JavaScript sin dependencias.
// El formulario se genera a partir del JSON del módulo; las etiquetas, listas
// cerradas y elementos nuevos se describen en las tablas de abajo.

const TOKEN = document.querySelector('meta[name="admin-token"]').content;
const $ = (sel, root = document) => root.querySelector(sel);

const LABELS = {
  template: 'Plantilla', order: 'Orden', visible: 'Visible', path: 'Ruta (URL)', parent: 'Módulo padre (línea en el Core y ruta de navegación)',
  crumb: 'Nombre en la ruta de navegación', seo: 'SEO', title: 'Título', description: 'Descripción', node: 'Nodo en el System Core',
  meta: 'Subtítulo del nodo', dock: 'Panel de información del Core', copy: 'Texto', mobileLabel: 'Texto en el menú móvil',
  position: 'Posición en escritorio (0–1)', x: 'Horizontal (x)', y: 'Vertical (y)', featured: 'Destacado',
  project: 'Proyecto', layout: 'Diseño', name: 'Nombre', cardEyebrow: 'Antetítulo de la tarjeta', summary: 'Resumen (tarjeta)',
  enterLabel: 'Texto del botón para abrir', stack: 'Stack', stackTitle: 'Título del stack', cover: 'Portada', src: 'Archivo',
  alt: 'Texto alternativo', fit: 'Encaje', links: 'Enlaces', kind: 'Tipo', label: 'Texto', url: 'URL', status: 'Estado', tone: 'Indicador (neutral / publicado / no publicado)', onCard: 'Mostrar en la tarjeta del índice',
  value: 'Valor', header: 'Cabecera', eyebrow: 'Antetítulo', lead: 'Entradilla', paragraphs: 'Párrafos', sections: 'Listas',
  items: 'Elementos', media: 'Imágenes y vídeos', caption: 'Pie', placement: 'Ubicación', compact: 'Compacta', parts: 'Imágenes',
  flagship: 'Vista de producto estrella', logo: 'Logotipo', punchline: 'Frase destacada', pills: 'Etiquetas', actions: 'Botones',
  variant: 'Variante', why: 'Por qué existe', subtitle: 'Subtítulo', cards: 'Tarjetas', focus: 'Enfoque', metrics: 'Métricas',
  statement: 'Conclusión', gallery: 'Galería', moreBadge: 'Insignia "+N"', features: 'Funcionalidades', security: 'Seguridad',
  architecture: 'Arquitectura', flow: 'Flujo', integrity: 'Integridad', files: 'Archivos', verifyLabel: 'Texto previo al comando',
  command: 'Comando', roadmap: 'Hoja de ruta', about: 'Sobre mí', photo: 'Foto', nextStep: 'Siguiente paso',
  contactModule: 'Módulo de contacto', contactLabel: 'Texto del enlace de contacto', cvLabel: 'Texto del CV', cvUrl: 'URL del CV',
  experience: 'Experiencia', role: 'Puesto', date: 'Fechas', highlight: 'Dato destacado', primarySkills: 'Tecnologías principales',
  secondarySkills: 'Otras tecnologías', closing: 'Cierre', section: 'Sección', leadSize: 'Tamaño de la entradilla', blocks: 'Bloques',
  type: 'Tipo', tag: 'Etiqueta', desc: 'Descripción', points: 'Puntos', style: 'Estilo', projects: 'Índice de proyectos',
};

const ENUMS = {
  layout: ['standard', 'flagship'], fit: ['cover', 'logo'], kind: ['external', 'github', 'download'], style: ['bullets', 'chips'],
  leadSize: ['normal', 'large'], placement: ['hero', 'rail', 'extra'], tone: ['neutral', 'live', 'preview'],
};
const L = () => ({ en: '', es: '' });
const BLOCK_SKELETONS = {
  text: () => ({ type: 'text', variant: 'plain', paragraphs: [L()] }),
  list: () => ({ type: 'list', title: L(), style: 'bullets', items: [L()] }),
  cards: () => ({ type: 'cards', cards: [{ tag: L(), title: L(), desc: L(), points: [L()] }] }),
  image: () => ({ type: 'image', src: '../../assets/images/placeholder.png', alt: L(), caption: L() }),
  links: () => ({ type: 'links', links: [{ label: L(), subtitle: L(), url: 'https://' }] }),
};
const MEDIA_SKELETONS = {
  image: () => ({ type: 'image', placement: 'rail', src: '../../assets/images/placeholder.png', alt: L(), caption: L() }),
  video: () => ({ type: 'video', placement: 'hero', src: '', alt: L(), caption: L() }),
};
/** Elementos nuevos para listas vacías, según el nombre de la lista. */
const ARRAY_SKELETONS = {
  paragraphs: L, items: L, points: L, pills: L, stack: L, flow: L, files: L,
  links: () => ({ kind: 'external', label: L(), url: 'https://' }),
  sections: () => ({ title: L(), items: [L()] }),
};
/** Campos opcionales que se pueden añadir o quitar, por tipo de objeto (ruta sin índices). */
const OPTIONAL = {
  node: { mobileLabel: L, position: () => ({ x: 0.5, y: 0.14 }), featured: () => false },
  project: { status: () => ({ label: L(), value: L(), tone: 'neutral', onCard: false }), stackTitle: L },
  about: { photo: () => ({ src: '../../assets/images/placeholder.png', alt: L() }), nextStep: () => ({ title: L(), contactModule: 'contact', contactLabel: L() }), closing: L },
  'about.nextStep': { cvLabel: L, cvUrl: () => 'https://' },
  'about.experience.items[]': { highlight: () => ({ label: L(), value: L() }) },
  'section.blocks[]': { title: L },
  'project.flagship.why': { focus: () => ({ title: L(), copy: L() }) },
};
const READONLY = new Set(['template', 'type']);
const HIDDEN_TOP = new Set(['order']);

const state = { modules: [], selected: null, data: null, dirty: false, media: { images: [], videos: [] }, templates: [] };

async function api(path, options = {}) {
  const res = await fetch(`/__admin/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': TOKEN, ...(options.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Error ${res.status}`);
    err.details = json.details;
    throw err;
  }
  return json;
}

const isLocalized = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && 'en' in v && 'es' in v && typeof v.en === 'string';
const clone = (v) => JSON.parse(JSON.stringify(v));
const shapeOf = (path) => path.replace(/\[\d+\]/g, '[]');
const KEEP_ON_CLEAR = new Set(['tone', 'onCard', 'type', 'kind', 'variant', 'style', 'placement', 'fit', 'layout', 'src', 'logo', 'compact']);
function cleared(v, key = '') {
  if (Array.isArray(v)) return v.length ? [cleared(v[0])] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, KEEP_ON_CLEAR.has(k) ? clone(x) : cleared(x, k)]));
  if (typeof v === 'string') return key === 'url' ? 'https://' : '';
  return v;
}
function title(m) {
  return (m.title && (m.title.es || m.title.en)) || m.id;
}

// ---------- Lista de módulos ----------
function renderList() {
  const list = $('#module-list');
  list.innerHTML = '';
  state.modules.forEach((m, i) => {
    const li = document.createElement('li');
    li.className = `module-item${m.id === state.selected ? ' is-selected' : ''}${m.visible ? '' : ' is-hidden'}`;
    li.draggable = true;
    li.tabIndex = 0;
    li.dataset.id = m.id;
    li.innerHTML = `
      <span class="module-item__title"></span>
      <span class="module-item__move">
        <button type="button" class="btn btn--small" data-move="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn btn--small" data-move="1" aria-label="Bajar" ${i === state.modules.length - 1 ? 'disabled' : ''}>↓</button>
      </span>
      <span class="module-item__meta">
        <span class="badge">${m.template}${m.layout === 'flagship' ? ' · flagship' : ''}</span>
        <span class="badge ${m.visible ? 'badge--ok' : 'badge--off'}">${m.visible ? 'visible' : 'oculto'}</span>
        ${m.featured ? '<span class="badge badge--star">★ destacado</span>' : ''}
        ${m.missingTranslations ? `<span class="badge badge--warn" title="Textos sin traducir al español">${m.missingTranslations} sin ES</span>` : ''}
        <span class="badge">/${m.path ?? ''}/</span>
      </span>`;
    li.querySelector('.module-item__title').textContent = title(m);
    li.addEventListener('click', (e) => {
      if (e.target.closest('[data-move]')) return;
      select(m.id);
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') select(m.id);
    });
    li.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => move(i, Number(b.dataset.move))));
    li.addEventListener('dragstart', (e) => {
      li.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', m.id);
    });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = state.modules.findIndex((x) => x.id === e.dataTransfer.getData('text/plain'));
      if (from >= 0 && from !== i) move(from, i - from);
    });
    list.appendChild(li);
  });
  const visible = state.modules.filter((m) => m.visible).length;
  $('#node-count').textContent = `${visible} de ${state.maxNodes} nodos visibles como máximo en el Core.`;
}

async function move(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.modules.length) return;
  const ids = state.modules.map((m) => m.id);
  const [id] = ids.splice(index, 1);
  ids.splice(target, 0, id);
  try {
    await api('reorder', { method: 'POST', body: JSON.stringify({ ids }) });
    await loadList();
    if (state.selected && state.data) state.data.order = state.modules.find((m) => m.id === state.selected)?.order ?? state.data.order;
    reloadPreview();
  } catch (e) {
    showMessages([{ kind: 'error', text: e.message }]);
  }
}

async function loadList() {
  const res = await api('modules');
  state.modules = res.modules;
  state.maxNodes = res.maxNodes;
  const box = $('#problems');
  box.hidden = !res.problems.length;
  box.innerHTML = res.problems.length ? '<strong>Problemas en el contenido (el build fallará):</strong><ul></ul>' : '';
  res.problems.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    box.querySelector('ul').appendChild(li);
  });
  renderList();
}

// ---------- Editor ----------
async function select(id) {
  if (state.dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
  const res = await api(`modules/${id}`);
  state.selected = id;
  state.data = res.data;
  state.dirty = false;
  renderList();
  renderEditor();
  showValidation(res);
  reloadPreview();
}

function renderEditor() {
  const form = $('#editor');
  form.hidden = !state.data;
  $('#editor-empty').hidden = !!state.data;
  if (!state.data) return;
  const d = state.data;
  $('#editor-title').textContent = `${(d.node?.title?.es || d.node?.title?.en || state.selected)}`;
  $('#editor-meta').textContent = `Archivo: src/content/modules/${state.selected}.json · plantilla ${d.template}${d.project?.layout ? ` (${d.project.layout})` : ''}`;
  $('#btn-toggle').textContent = d.visible ? 'Ocultar' : 'Hacer visible';
  const fields = $('#fields');
  fields.innerHTML = '';
  for (const [key, value] of Object.entries(d)) {
    if (HIDDEN_TOP.has(key)) continue;
    fields.appendChild(renderField(d, key, value, key));
  }
}

function markDirty() {
  state.dirty = true;
  $('#btn-save').textContent = 'Guardar *';
}

function label(key) {
  return LABELS[key] || key;
}

function renderField(parent, key, value, path) {
  if (isLocalized(value)) return renderLocalized(parent, key, value);
  if (Array.isArray(value)) return renderArray(parent, key, value, path);
  if (value && typeof value === 'object') return renderObject(parent, key, value, path);
  return renderScalar(parent, key, value, path);
}

function renderLocalized(_parent, key, value) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = label(key);
  wrap.appendChild(span);
  const grid = document.createElement('div');
  grid.className = 'l10n';
  for (const lang of ['en', 'es']) {
    const lab = document.createElement('label');
    lab.textContent = lang === 'en' ? 'Inglés (obligatorio)' : 'Español';
    const ta = document.createElement('textarea');
    ta.rows = Math.min(6, Math.max(1, Math.ceil((value[lang] || '').length / 60)));
    ta.value = value[lang] || '';
    ta.lang = lang;
    const refresh = () => ta.classList.toggle('is-missing', lang === 'es' && !ta.value.trim() && !!value.en);
    refresh();
    ta.addEventListener('input', () => {
      value[lang] = ta.value;
      refresh();
      markDirty();
    });
    lab.appendChild(ta);
    grid.appendChild(lab);
  }
  wrap.appendChild(grid);
  return wrap;
}

function moduleOptions(exclude) {
  return state.modules.filter((m) => m.id !== exclude).map((m) => m.id);
}

function renderScalar(parent, key, value, _path) {
  const wrap = document.createElement('label');
  wrap.className = typeof value === 'boolean' ? 'field field--inline' : 'field';
  const span = document.createElement('span');
  span.textContent = label(key);
  let input;
  const isImage = typeof value === 'string' && (key === 'src' || key === 'logo') && !value.startsWith('/assets/media/') && parent.type !== 'video';
  const isVideo = key === 'src' && parent.type === 'video';
  if (isImage || isVideo) return renderMedia(parent, key, value, isVideo ? 'video' : 'image');

  if (typeof value === 'boolean') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.addEventListener('change', () => {
      parent[key] = input.checked;
      markDirty();
    });
    wrap.append(input, span);
    return wrap;
  }
  const enumValues =
    key === 'variant' ? (parent.url !== undefined ? ['download', 'website', 'github'] : ['plain', 'closing', 'lines']) :
    key === 'parent' || key === 'contactModule' ? ['', ...moduleOptions(state.selected)] :
    ENUMS[key];
  if (enumValues && !READONLY.has(key)) {
    input = document.createElement('select');
    for (const v of enumValues) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v || '(ninguno)';
      input.appendChild(o);
    }
    input.value = value ?? '';
    input.addEventListener('change', () => {
      if (input.value === '' && (key === 'parent')) delete parent[key];
      else parent[key] = input.value;
      markDirty();
      if (key === 'layout') renderEditor();
    });
  } else {
    input = document.createElement('input');
    input.value = value ?? '';
    if (typeof value === 'number') {
      input.type = 'number';
      input.step = key === 'x' || key === 'y' ? '0.01' : '1';
    }
    if (key === 'url' || key === 'cvUrl') input.type = 'url';
    input.readOnly = READONLY.has(key);
    input.addEventListener('input', () => {
      parent[key] = typeof value === 'number' ? Number(input.value) : input.value;
      markDirty();
    });
  }
  wrap.append(span, input);
  return wrap;
}

function thumbUrl(p) {
  return p ? `/__admin/file?path=${encodeURIComponent(p)}` : '';
}

function renderMedia(parent, key, value, kind) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = `${label(key)} (${kind === 'video' ? 'vídeo en public/assets/media/' : 'imagen en src/assets/'})`;
  const row = document.createElement('div');
  row.className = 'media-field';
  const preview = document.createElement(kind === 'video' ? 'video' : 'img');
  preview.src = thumbUrl(value);
  if (kind === 'video') preview.muted = true;
  else preview.alt = '';
  const controls = document.createElement('div');
  controls.className = 'media-field__controls';
  const select = document.createElement('select');
  const options = kind === 'video' ? state.media.videos : state.media.images;
  for (const p of new Set([value, ...options].filter(Boolean))) {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = p.replace('../../assets/', 'src/assets/').replace('/assets/media/', 'public/assets/media/');
    select.appendChild(o);
  }
  if (!value) select.insertAdjacentHTML('afterbegin', '<option value="">(elige un archivo)</option>');
  select.value = value || '';
  select.addEventListener('change', () => {
    parent[key] = select.value;
    preview.src = thumbUrl(select.value);
    markDirty();
  });
  const upload = document.createElement('button');
  upload.type = 'button';
  upload.className = 'btn';
  upload.textContent = 'Subir…';
  upload.addEventListener('click', () => pickFile(kind, async (res) => {
    await loadMedia();
    parent[key] = res.path;
    markDirty();
    renderEditor();
  }));
  controls.append(select, upload);
  row.append(preview, controls);
  wrap.append(span, row);
  return wrap;
}

function pickFile(kind, done) {
  const input = $('#file-input');
  input.accept = kind === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/avif,image/gif';
  input.value = '';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    try {
      const res = await api('upload', { method: 'POST', body: JSON.stringify({ moduleId: state.selected, filename: file.name, data }) });
      showMessages([{ kind: 'ok', text: `Archivo guardado como ${res.path.replace('../../assets/', 'src/assets/')}. Guarda el módulo para aplicarlo.` }]);
      done(res);
    } catch (e) {
      showMessages([{ kind: 'error', text: e.message }]);
    }
  };
  input.click();
}

function renderObject(_parent, key, value, path) {
  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = label(key);
  fs.appendChild(legend);
  const shape = shapeOf(path);
  const optional = OPTIONAL[shape] || OPTIONAL[key] || {};
  for (const [k, v] of Object.entries(value)) {
    const child = renderField(value, k, v, `${path}.${k}`);
    if (k in optional) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn--small';
      remove.textContent = `Quitar «${label(k)}»`;
      remove.addEventListener('click', () => {
        delete value[k];
        markDirty();
        renderEditor();
      });
      child.appendChild(remove);
    }
    fs.appendChild(child);
  }
  const missing = Object.keys(optional).filter((k) => !(k in value));
  if (missing.length) {
    const adders = document.createElement('div');
    adders.className = 'optional-adders';
    for (const k of missing) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--small';
      b.textContent = `+ ${label(k)}`;
      b.addEventListener('click', () => {
        value[k] = optional[k]();
        markDirty();
        renderEditor();
      });
      adders.appendChild(b);
    }
    fs.appendChild(adders);
  }
  return fs;
}

function renderArray(_parent, key, arr, path) {
  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = `${label(key)} (${arr.length})`;
  fs.appendChild(legend);
  arr.forEach((item, i) => {
    const box = document.createElement('div');
    box.className = 'array-item';
    const bar = document.createElement('div');
    bar.className = 'array-item__bar';
    const name = item && typeof item === 'object' && item.type ? `${i + 1} · ${item.type}` : `${i + 1}`;
    bar.innerHTML = `<span>${name}</span><span></span>`;
    const actions = bar.lastElementChild;
    const mk = (text, aria, fn, disabled) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--small';
      b.textContent = text;
      b.setAttribute('aria-label', aria);
      b.disabled = !!disabled;
      b.addEventListener('click', () => {
        fn();
        markDirty();
        renderEditor();
      });
      actions.appendChild(b);
    };
    mk('↑', 'Subir', () => arr.splice(i - 1, 0, arr.splice(i, 1)[0]), i === 0);
    mk('↓', 'Bajar', () => arr.splice(i + 1, 0, arr.splice(i, 1)[0]), i === arr.length - 1);
    mk('⧉', 'Duplicar', () => arr.splice(i + 1, 0, clone(item)));
    mk('✕', 'Quitar', () => {
      if (confirm('¿Quitar este elemento?')) arr.splice(i, 1);
    });
    box.appendChild(bar);
    const child = isLocalized(item) ? renderLocalized(arr, i, item) : renderField(arr, i, item, `${path}[${i}]`);
    if (child.querySelector(':scope > span')?.textContent === String(i)) child.querySelector(':scope > span').remove();
    if (child.tagName === 'FIELDSET') child.querySelector('legend').textContent = name;
    box.appendChild(child);
    fs.appendChild(box);
  });

  const add = document.createElement('div');
  add.className = 'array-add';
  const typed = key === 'blocks' ? BLOCK_SKELETONS : key === 'media' || (key === 'items' && path.endsWith('gallery.items')) ? MEDIA_SKELETONS : null;
  let typeSelect;
  if (typed) {
    typeSelect = document.createElement('select');
    typeSelect.setAttribute('aria-label', 'Tipo de elemento');
    Object.keys(typed).forEach((t) => typeSelect.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));
    add.appendChild(typeSelect);
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--small';
  btn.textContent = `+ Añadir a ${label(key).toLowerCase()}`;
  btn.addEventListener('click', () => {
    let item;
    if (typed) item = typed[typeSelect.value]();
    else if (arr.length) item = cleared(arr[arr.length - 1]);
    else item = (ARRAY_SKELETONS[key] || L)();
    arr.push(item);
    markDirty();
    renderEditor();
  });
  add.appendChild(btn);
  fs.appendChild(add);
  return fs;
}

// ---------- Mensajes y validación ----------
function showMessages(list) {
  const box = $('#messages');
  box.innerHTML = '';
  for (const m of list) {
    const div = document.createElement('div');
    div.className = `msg msg--${m.kind}`;
    const strong = document.createElement('strong');
    strong.textContent = m.text;
    div.appendChild(strong);
    if (m.items?.length) {
      const ul = document.createElement('ul');
      m.items.forEach((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
      });
      div.appendChild(ul);
    }
    box.appendChild(div);
  }
}

function showValidation(res, okText) {
  const list = [];
  if (okText) list.push({ kind: 'ok', text: okText });
  if (res.errors?.length) list.push({ kind: 'error', text: 'Errores (el build fallaría):', items: res.errors });
  if (res.warnings?.length) list.push({ kind: 'warn', text: 'Traducciones vacías (se mostrará el texto en inglés):', items: res.warnings });
  showMessages(list);
}

// ---------- Vista previa ----------
function previewUrl() {
  const lang = $('#preview-lang').value;
  const prefix = lang === 'es' ? '/es' : '';
  if ($('#preview-target').value === 'core' || !state.data) return `${prefix}/?from=__admin`;
  return `${prefix}/${state.data.path}/`;
}
function reloadPreview() {
  const url = previewUrl();
  $('#preview-open').href = url;
  // Fija la preferencia de idioma de la vista previa para que no redirija.
  try {
    localStorage.setItem('system_core_lang', $('#preview-lang').value);
  } catch {}
  const frame = $('#preview-frame');
  frame.src = 'about:blank';
  const ticket = (reloadPreview.ticket = (reloadPreview.ticket || 0) + 1);
  // Tras crear o guardar, astro dev tarda un momento en registrar la ruta: espera a que exista.
  (async () => {
    for (let i = 0; i < 20; i += 1) {
      try {
        if ((await api(`ready?path=${encodeURIComponent(url)}`)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (ticket === reloadPreview.ticket) frame.src = url;
  })();
}

// ---------- Acciones ----------
$('#editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await api(`modules/${state.selected}`, { method: 'PUT', body: JSON.stringify({ data: state.data }) });
    state.dirty = false;
    $('#btn-save').textContent = 'Guardar';
    $('#btn-toggle').textContent = state.data.visible ? 'Ocultar' : 'Hacer visible';
    showValidation(res, 'Guardado.');
    await loadList();
    setTimeout(reloadPreview, 400);
  } catch (err) {
    showValidation(err.details || { errors: [err.message] });
  }
});
$('#btn-revert').addEventListener('click', () => {
  state.dirty = false;
  select(state.selected);
});
$('#btn-toggle').addEventListener('click', async () => {
  state.data.visible = !state.data.visible;
  $('#editor').requestSubmit();
  // Si no se puede guardar (p. ej. el padre está oculto), se deshace el cambio.
  setTimeout(() => {
    if ($('.msg--error')) state.data.visible = !state.data.visible;
  }, 600);
});
$('#btn-delete').addEventListener('click', async () => {
  const id = state.selected;
  if (!confirm(`¿Eliminar el módulo "${id}"? Se borrará src/content/modules/${id}.json (recuperable con Git).`)) return;
  try {
    await api(`modules/${id}`, { method: 'DELETE' });
    state.selected = null;
    state.data = null;
    state.dirty = false;
    renderEditor();
    await loadList();
    showMessages([{ kind: 'ok', text: `Módulo "${id}" eliminado.` }]);
  } catch (err) {
    showMessages([{ kind: 'error', text: err.message }]);
  }
});
$('#btn-duplicate').addEventListener('click', async () => {
  const newId = prompt('Identificador del nuevo módulo:', `${state.selected}-copia`);
  if (!newId) return;
  try {
    const res = await api(`modules/${state.selected}/duplicate`, { method: 'POST', body: JSON.stringify({ newId }) });
    await loadList();
    state.dirty = false;
    await select(res.id);
  } catch (err) {
    showMessages([{ kind: 'error', text: err.message }]);
  }
});

$('#new-module').addEventListener('click', () => $('#new-dialog').showModal());
$('#new-template').addEventListener('change', () => {
  $('#new-template-desc').textContent = state.templates.find((t) => t.name === $('#new-template').value)?.description ?? '';
});
$('#new-title').addEventListener('input', () => {
  $('#new-id').placeholder = $('#new-title').value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
});
$('#new-dialog').addEventListener('close', async () => {
  if ($('#new-dialog').returnValue !== 'ok') return;
  try {
    const res = await api('modules', {
      method: 'POST',
      body: JSON.stringify({ template: $('#new-template').value, title: $('#new-title').value, id: $('#new-id').value || $('#new-id').placeholder }),
    });
    await loadList();
    state.dirty = false;
    await select(res.id);
    showValidation(res, `Módulo "${res.id}" creado (oculto).`);
  } catch (err) {
    showMessages([{ kind: 'error', text: err.message }]);
  }
});
['#preview-lang', '#preview-target'].forEach((s) => $(s).addEventListener('change', reloadPreview));
$('#preview-reload').addEventListener('click', reloadPreview);
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

async function loadMedia() {
  state.media = await api('media');
}

(async function init() {
  const [tpl] = await Promise.all([api('templates'), loadMedia(), loadList()]);
  state.templates = tpl.templates;
  for (const t of tpl.templates) $('#new-template').insertAdjacentHTML('beforeend', `<option value="${t.name}">${t.label}</option>`);
  $('#new-template').dispatchEvent(new Event('change'));
  const first = new URLSearchParams(location.search).get('module') || state.modules[0]?.id;
  if (first) await select(first);
})();
