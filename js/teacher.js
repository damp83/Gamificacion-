/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — teacher.js
   Panel de Configuración del docente: edita en caliente el curso,
   las recompensas, el almacén, los yacimientos, la economía y las
   cuadrillas. Todo se guarda como una capa sobre js/config.js.
   ═══════════════════════════════════════════════════════════ */

const CFG_SECTIONS = [
  { id: 'curso',      icon: '📅', name: 'Curso y trimestres' },
  { id: 'premios',    icon: '🏅', name: 'Comportamientos, tareas y actividades' },
  { id: 'equipos',    icon: '🛖', name: 'Cuadrillas de excavación' },
  { id: 'yacimient',  icon: '🏛️', name: 'Yacimientos y pozos' },
  { id: 'almacen',    icon: '🏪', name: 'Almacén' },
  { id: 'economia',   icon: '⚖️', name: 'Economía' },
  { id: 'acceso',     icon: '🔐', name: 'Acceso y nube' },
  { id: 'copia',      icon: '💾', name: 'Copia de seguridad' }
];

let cfgSection = 'curso';
/* Aviso que debe sobrevivir al repintado del panel: si se pintara y el
   repintado lo borrase, la corrección ocurriría en silencio. */
let cfgNotice = '';

/* Genera un id estable a partir de un nombre escrito por el docente */
function slugify(text, fallback) {
  const base = String(text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return base || fallback + '_' + Date.now().toString(36);
}

/* ── Chasis ── */
function renderTeacherConfig() {
  $('#cfg-nav').innerHTML = CFG_SECTIONS.map(sec =>
    `<button class="cfg-nav-btn${sec.id === cfgSection ? ' active' : ''}" data-cfg="${sec.id}">
      <span>${sec.icon}</span>${sec.name}</button>`).join('');
  $$('#cfg-nav .cfg-nav-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.cfg !== cfgSection) cfgNotice = '';
    cfgSection = b.dataset.cfg;
    renderTeacherConfig();
  }));

  const body = $('#cfg-body');
  const renderers = {
    curso: cfgCurso, premios: cfgPremios, equipos: cfgEquipos,
    yacimient: cfgYacimientos, almacen: cfgAlmacen, economia: cfgEconomia,
    acceso: cfgAcceso, copia: cfgCopia
  };
  body.innerHTML = '';
  renderers[cfgSection](body);
}

/* Guarda y repinta, avisando de que el cambio ya está aplicado */
function cfgSave(path, value, msg) {
  setTeacherConfig(path, value);
  renderTeacherConfig();
  if (msg !== false) toast(msg || 'Cambio guardado ✓', 1600);
}

/* Fila de campo con etiqueta */
function field(label, inputHtml, hint) {
  /* Las casillas sí/no leen mejor junto a su etiqueta que debajo de ella */
  const inline = inputHtml.includes('type="checkbox"');
  return `<label class="cfg-field${inline ? ' cfg-field-inline' : ''}">
    <span class="cfg-label">${label}</span>${inputHtml}
    ${hint ? `<small class="cfg-hint">${hint}</small>` : ''}</label>`;
}
function onInput(sel, handler, event) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.addEventListener(event || 'change', handler);
}

/* ══════════ CURSO ══════════ */
function cfgCurso(body) {
  const c = ATLAS_CONFIG.course;
  body.innerHTML = `
    <p class="cfg-intro">Las fechas deciden a qué trimestre se asigna cada progreso.
    Nada se reinicia al cambiar de trimestre: mapa, rango y museo son del curso entero.</p>
    ${field('Nombre del curso', `<input type="text" id="cfg-course-label" value="${c.label}">`)}
    <div class="cfg-list">
      ${c.trimesters.map((t, i) => `
        <div class="cfg-card">
          <input type="text" class="cfg-tri-name" data-i="${i}" value="${t.name}">
          <div class="cfg-row">
            <label>Del <input type="date" class="cfg-tri-start" data-i="${i}" value="${t.start}"></label>
            <label>al <input type="date" class="cfg-tri-end" data-i="${i}" value="${t.end}"></label>
          </div>
        </div>`).join('')}
    </div>`;

  onInput('#cfg-course-label', e => cfgSave('course.label', e.target.value));
  const writeTri = (i, key, val) => {
    const list = deepClone(ATLAS_CONFIG.course.trimesters);
    list[i][key] = val;
    cfgSave('course.trimesters', list);
  };
  $$('.cfg-tri-name').forEach(el => onInput(el, e => writeTri(+e.target.dataset.i, 'name', e.target.value)));
  $$('.cfg-tri-start').forEach(el => onInput(el, e => writeTri(+e.target.dataset.i, 'start', e.target.value)));
  $$('.cfg-tri-end').forEach(el => onInput(el, e => writeTri(+e.target.dataset.i, 'end', e.target.value)));
}

/* ══════════ COMPORTAMIENTOS · TAREAS · ACTIVIDADES ══════════ */
const CATEGORIES = [
  { id: 'comportamiento', label: 'Comportamiento' },
  { id: 'tarea',          label: 'Tarea' },
  { id: 'actividad',      label: 'Actividad' }
];

function cfgPremios(body) {
  const list = ATLAS_CONFIG.behaviors;
  body.innerHTML = `
    <p class="cfg-intro">Todo lo de aquí da <strong>Doblones, nunca PE</strong>: así el rango
    sigue midiendo solo aprendizaje. Y solo suma, nunca resta.
    El <strong>tope</strong> es cuántas veces al día puede concederse a un mismo alumno.</p>
    <div class="cfg-list">
      ${list.map((b, i) => `
        <div class="cfg-card cfg-premio">
          <div class="cfg-row">
            <input type="text" class="cfg-b-icon" data-i="${i}" value="${b.icon}" maxlength="4" title="Icono">
            <input type="text" class="cfg-b-name" data-i="${i}" value="${b.name}" placeholder="Nombre">
          </div>
          <div class="cfg-row">
            <label>Doblones <input type="number" class="cfg-b-coins" data-i="${i}" value="${b.coins}" min="1" max="200"></label>
            <label>Tope/día <input type="number" class="cfg-b-cap" data-i="${i}" value="${b.perDay}" min="1" max="20"></label>
            <select class="cfg-b-cat" data-i="${i}">
              ${CATEGORIES.map(c => `<option value="${c.id}"${(b.category || 'comportamiento') === c.id ? ' selected' : ''}>${c.label}</option>`).join('')}
            </select>
            <button class="cfg-del" data-del="${i}" title="Eliminar">🗑️</button>
          </div>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-small" id="cfg-add-premio">➕ Añadir</button>`;

  const write = (i, key, val) => {
    const l = deepClone(ATLAS_CONFIG.behaviors);
    l[i][key] = val;
    cfgSave('behaviors', l);
  };
  $$('.cfg-b-icon').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'icon', e.target.value || '⭐')));
  $$('.cfg-b-name').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'name', e.target.value || 'Sin nombre')));
  $$('.cfg-b-coins').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'coins', Math.max(1, +e.target.value || 1))));
  $$('.cfg-b-cap').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'perDay', Math.max(1, +e.target.value || 1))));
  $$('.cfg-b-cat').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'category', e.target.value)));
  $$('.cfg-del').forEach(el => el.addEventListener('click', async () => {
    const i = +el.dataset.del;
    const l = deepClone(ATLAS_CONFIG.behaviors);
    /* Se quita del catálogo, pero lo ya concedido a los niños NO se toca:
       el historial es suyo y «nada se pierde nunca». */
    if (!(await askConfirm(`¿Quitar «${l[i].name}»? Los méritos ya concedidos se conservan.`, 'Quitar'))) return;
    l.splice(i, 1);
    cfgSave('behaviors', l, 'Eliminado del catálogo ✓');
  }));
  $('#cfg-add-premio').addEventListener('click', () => {
    const l = deepClone(ATLAS_CONFIG.behaviors);
    l.push({ id: slugify('nuevo', 'premio'), icon: '⭐', name: 'Nuevo reconocimiento', coins: 10, perDay: 1, category: 'comportamiento' });
    cfgSave('behaviors', l, 'Añadido: ponle nombre ✓');
  });
}

/* ══════════ CUADRILLAS ══════════ */
function cfgEquipos(body) {
  const t = ATLAS_CONFIG.teams;
  body.innerHTML = `
    <p class="cfg-intro">Las cuadrillas son <strong>cooperativas</strong>: todas suman a una meta
    común de clase. El PRD desaconseja rankings entre niños, por eso la comparación
    entre cuadrillas viene desactivada.</p>
    ${field('Cuadrillas activas', `<input type="checkbox" id="cfg-team-on"${t.enabled ? ' checked' : ''}>`)}
    ${field('Nombre de la meta común', `<input type="text" id="cfg-team-goal" value="${t.goalLabel}">`)}
    ${field('Meta en Doblones', `<input type="number" id="cfg-team-target" value="${t.goalTarget}" min="100" step="100">`)}
    ${field('Aportación por Doblón ganado', `<input type="number" id="cfg-team-rate" value="${Math.round((t.contributionRate || 0) * 100)}" min="0" max="100">`,
      'En %. No se descuenta de la bolsa del niño: cooperar no cuesta nada.')}
    ${field('Mostrar comparación entre cuadrillas', `<input type="checkbox" id="cfg-team-cmp"${t.showComparison ? ' checked' : ''}>`,
      'Actívalo solo si tu grupo lleva bien la comparación.')}

    <div class="cfg-list">
      ${t.list.map((team, i) => `
        <div class="cfg-card">
          <div class="cfg-row">
            <input type="text" class="cfg-t-icon" data-i="${i}" value="${team.icon}" maxlength="4">
            <input type="text" class="cfg-t-name" data-i="${i}" value="${team.name}">
            <button class="cfg-del" data-delteam="${i}" title="Eliminar">🗑️</button>
          </div>
          <label class="cfg-label">Miembros (un nombre de explorador por línea)</label>
          <textarea class="cfg-t-members" data-i="${i}" rows="4"
            placeholder="Escribe aquí un nombre por línea…">${(team.members || []).join('\n')}</textarea>
          <small class="cfg-hint">${(team.members || []).length
            ? (team.members || []).length + ' miembro(s) asignado(s).'
            : 'Sin miembros todavía.'} El nombre debe coincidir con el que escribió el niño al crear su diario.</small>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-small" id="cfg-add-team">➕ Nueva cuadrilla</button>`;

  onInput('#cfg-team-on', e => cfgSave('teams.enabled', e.target.checked));
  onInput('#cfg-team-goal', e => cfgSave('teams.goalLabel', e.target.value));
  onInput('#cfg-team-target', e => cfgSave('teams.goalTarget', Math.max(1, +e.target.value || 1)));
  onInput('#cfg-team-rate', e => cfgSave('teams.contributionRate', Math.min(1, Math.max(0, (+e.target.value || 0) / 100))));
  onInput('#cfg-team-cmp', e => cfgSave('teams.showComparison', e.target.checked));

  const write = (i, key, val) => {
    const l = deepClone(ATLAS_CONFIG.teams.list);
    l[i][key] = val;
    cfgSave('teams.list', l, false);
  };
  $$('.cfg-t-icon').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'icon', e.target.value || '🛖')));
  $$('.cfg-t-name').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'name', e.target.value || 'Cuadrilla')));
  $$('.cfg-t-members').forEach(el => onInput(el, e => {
    const members = e.target.value.split('\n').map(x => x.trim()).filter(Boolean);
    write(+e.target.dataset.i, 'members', members);
    toast(`Cuadrilla actualizada: ${members.length} miembro(s) ✓`, 1600);
  }));
  $$('[data-delteam]').forEach(el => el.addEventListener('click', async () => {
    const i = +el.dataset.delteam;
    const l = deepClone(ATLAS_CONFIG.teams.list);
    if (!(await askConfirm(`¿Eliminar «${l[i].name}»?`, 'Eliminar'))) return;
    l.splice(i, 1);
    cfgSave('teams.list', l, 'Cuadrilla eliminada ✓');
  }));
  $('#cfg-add-team').addEventListener('click', () => {
    const l = deepClone(ATLAS_CONFIG.teams.list);
    l.push({ id: slugify('cuadrilla', 'team'), name: 'Nueva cuadrilla', icon: '🛖', members: [] });
    cfgSave('teams.list', l, 'Cuadrilla creada ✓');
  });
}

/* ══════════ YACIMIENTOS Y POZOS ══════════ */
function cfgYacimientos(body) {
  const ov = ATLAS_CONFIG.branchOverrides || {};
  body.innerHTML = `
    <p class="cfg-intro">Puedes renombrar los pozos para que hablen como tu aula, o desactivar
    los que aún no hayáis empezado. Los retos se generan solos: desactivar un pozo lo esconde
    del mapa, no borra el progreso.</p>
    <div class="cfg-list">
      ${DIG_SITES.kaldros.branches.map(id => {
        const b = BRANCHES[id];
        const o = ov[id] || {};
        const on = o.enabled !== false;
        return `<div class="cfg-card">
          <div class="cfg-row">
            <span class="cfg-big-icon">${b.icon}</span>
            <input type="text" class="cfg-br-name" data-id="${id}" value="${o.name || b.name}">
            <label class="cfg-switch">Activo <input type="checkbox" class="cfg-br-on" data-id="${id}"${on ? ' checked' : ''}></label>
          </div>
          <textarea class="cfg-br-desc" data-id="${id}" rows="2">${o.desc || b.desc}</textarea>
        </div>`;
      }).join('')}
    </div>`;

  const write = (id, key, val) => {
    const ov2 = deepClone(ATLAS_CONFIG.branchOverrides || {});
    ov2[id] = ov2[id] || {};
    ov2[id][key] = val;
    cfgSave('branchOverrides', ov2);
  };
  $$('.cfg-br-name').forEach(el => onInput(el, e => write(e.target.dataset.id, 'name', e.target.value)));
  $$('.cfg-br-desc').forEach(el => onInput(el, e => write(e.target.dataset.id, 'desc', e.target.value)));
  $$('.cfg-br-on').forEach(el => onInput(el, e => {
    const enabledCount = DIG_SITES.kaldros.branches.filter(id => {
      const o = (ATLAS_CONFIG.branchOverrides || {})[id] || {};
      return o.enabled !== false;
    }).length;
    if (!e.target.checked && enabledCount <= 1) {
      e.target.checked = true;
      toast('Debe quedar al menos un pozo activo: si no, no habría nada que excavar.');
      return;
    }
    write(e.target.dataset.id, 'enabled', e.target.checked);
  }));
}

/* ══════════ ALMACÉN ══════════ */
const SHOP_TYPES = [
  { id: 'gear',  label: 'Equipo (se lleva puesto)' },
  { id: 'camp',  label: 'Campamento (decora)' },
  { id: 'treat', label: 'Golosina (repetible)' }
];
function cfgAlmacen(body) {
  const list = ATLAS_CONFIG.shop;
  body.innerHTML = `
    <p class="cfg-intro">Todo lo del almacén es <strong>cosmético</strong>. Nada de lo que se compre
    puede dar ventaja en las excavaciones: es una regla del diseño, no un descuido.</p>
    <div class="cfg-list">
      ${list.map((it, i) => `
        <div class="cfg-card">
          <div class="cfg-row">
            <input type="text" class="cfg-s-icon" data-i="${i}" value="${it.icon}" maxlength="4">
            <input type="text" class="cfg-s-name" data-i="${i}" value="${it.name}">
            <button class="cfg-del" data-delshop="${i}" title="Eliminar">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Precio <input type="number" class="cfg-s-cost" data-i="${i}" value="${it.cost}" min="1" max="2000"></label>
            <select class="cfg-s-type" data-i="${i}">
              ${SHOP_TYPES.map(t => `<option value="${t.id}"${it.type === t.id ? ' selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-small" id="cfg-add-shop">➕ Añadir artículo</button>`;

  const write = (i, key, val) => {
    const l = deepClone(ATLAS_CONFIG.shop);
    l[i][key] = val;
    cfgSave('shop', l, false);
  };
  $$('.cfg-s-icon').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'icon', e.target.value || '📦')));
  $$('.cfg-s-name').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'name', e.target.value || 'Artículo')));
  $$('.cfg-s-cost').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'cost', Math.max(1, +e.target.value || 1))));
  $$('.cfg-s-type').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'type', e.target.value)));
  $$('[data-delshop]').forEach(el => el.addEventListener('click', async () => {
    const i = +el.dataset.delshop;
    const l = deepClone(ATLAS_CONFIG.shop);
    if (!(await askConfirm(`¿Quitar «${l[i].name}» del almacén? Quien ya lo tenga lo conserva.`, 'Quitar'))) return;
    l.splice(i, 1);
    cfgSave('shop', l, 'Artículo retirado ✓');
  }));
  $('#cfg-add-shop').addEventListener('click', () => {
    const l = deepClone(ATLAS_CONFIG.shop);
    l.push({ id: slugify('articulo', 'item'), name: 'Artículo nuevo', icon: '📦', cost: 100, type: 'gear' });
    cfgSave('shop', l, 'Artículo añadido ✓');
  });
}

/* ══════════ ECONOMÍA ══════════ */
const ECO_FIELDS = [
  { k: 'missionQuestions', label: 'Retos por Expedición', min: 3, max: 15 },
  { k: 'bazarQuestions',   label: 'Retos por Encargo del Bazar', min: 2, max: 10 },
  { k: 'missionCoinsMin',  label: 'Doblones por Expedición (mín.)', min: 0, max: 200 },
  { k: 'missionCoinsMax',  label: 'Doblones por Expedición (máx.)', min: 0, max: 200 },
  { k: 'bazarCoinsMin',    label: 'Doblones por Encargo (mín.)', min: 0, max: 100 },
  { k: 'bazarCoinsMax',    label: 'Doblones por Encargo (máx.)', min: 0, max: 100 },
  { k: 'bazarPerDay',      label: 'Encargos con premio al día', min: 1, max: 20 },
  { k: 'firstLoginBonus',  label: 'Primer desembarco del día', min: 0, max: 100 },
  { k: 'weeklyStampBonus', label: 'Sello semanal de bitácora', min: 0, max: 300 },
  { k: 'restoreCoins',     label: 'Restaurar un hallazgo', min: 0, max: 50 },
  { k: 'restoresPerDay',   label: 'Restauraciones premiadas al día', min: 1, max: 20 },
  { k: 'hintCost',         label: 'Coste de la pista extra de Kira', min: 0, max: 100 },
  { k: 'fatigueThreshold', label: 'Misión desde la que baja el PE', min: 2, max: 30 },
  { k: 'startingCoins',    label: 'Bolsa inicial de un explorador nuevo', min: 0, max: 500 }
];
function cfgEconomia(body) {
  const e = ATLAS_CONFIG.economy;
  body.innerHTML = `
    <p class="cfg-intro">Ajusta el ritmo de la economía. Si subes mucho las recompensas,
    el almacén se queda corto enseguida y desaparece el deseo; el PRD apunta a que
    gastar cueste algo más de lo que se ingresa.</p>
    <div class="cfg-grid">
      ${ECO_FIELDS.map(f => field(f.label,
        `<input type="number" class="cfg-eco" data-k="${f.k}" value="${e[f.k]}" min="${f.min}" max="${f.max}">`)).join('')}
    </div>
    <p id="cfg-eco-warn" class="cfg-warn${cfgNotice ? '' : ' hidden'}">${cfgNotice}</p>`;

  const warn = (msg) => { cfgNotice = msg; };
  $$('.cfg-eco').forEach(el => onInput(el, ev => {
    const f = ECO_FIELDS.find(x => x.k === ev.target.dataset.k);
    const val = Math.min(f.max, Math.max(f.min, +ev.target.value || f.min));
    ev.target.value = val;
    const eco = deepClone(ATLAS_CONFIG.economy);
    eco[f.k] = val;
    /* Un mínimo por encima del máximo daría recompensas negativas */
    if (eco.missionCoinsMin > eco.missionCoinsMax) { eco.missionCoinsMax = eco.missionCoinsMin; warn('⚠️ El máximo por Expedición se ha subido a ' + eco.missionCoinsMax + ' para no quedar por debajo del mínimo.'); }
    else if (eco.bazarCoinsMin > eco.bazarCoinsMax) { eco.bazarCoinsMax = eco.bazarCoinsMin; warn('⚠️ El máximo por Encargo se ha subido a ' + eco.bazarCoinsMax + ' para no quedar por debajo del mínimo.'); }
    else warn('');
    cfgSave('economy', eco);
  }));
}

/* ══════════ ACCESO Y NUBE ══════════ */
function cfgAcceso(body) {
  const a = ATLAS_CONFIG.appwrite;
  const estado = !cloudConfigured() ? 'Modo local: cada tablet guarda su propio diario.'
    : (cloudEnabled() ? (cloudUser() ? 'Conectado. Sesión iniciada.' : 'Conectado. Sin sesión.')
                      : 'Configurado, pero el SDK de Appwrite no ha cargado.');
  body.innerHTML = `
    <p class="cfg-intro">Estado: <strong>${estado}</strong></p>
    ${field('PIN del panel', `<input type="text" id="cfg-pin" value="${ATLAS_CONFIG.teacherPin}" maxlength="8" inputmode="numeric">`,
      'Barrera de aula, no seguridad real: el código se ejecuta en el navegador.')}
    <h4 class="cfg-h4">Appwrite</h4>
    ${field('Endpoint', `<input type="text" id="cfg-aw-ep" value="${a.endpoint}" placeholder="https://cloud.appwrite.io/v1">`)}
    ${field('Project ID', `<input type="text" id="cfg-aw-pid" value="${a.projectId}">`)}
    ${field('Database ID', `<input type="text" id="cfg-aw-did" value="${a.databaseId}">`)}
    ${field('Collection ID', `<input type="text" id="cfg-aw-cid" value="${a.collectionId}">`)}
    <p class="cfg-warn">Tras cambiar los datos de Appwrite hay que recargar la página para que surtan efecto.</p>`;

  onInput('#cfg-pin', e => cfgSave('teacherPin', e.target.value || '1234'));
  onInput('#cfg-aw-ep', e => cfgSave('appwrite.endpoint', e.target.value.trim()));
  onInput('#cfg-aw-pid', e => cfgSave('appwrite.projectId', e.target.value.trim()));
  onInput('#cfg-aw-did', e => cfgSave('appwrite.databaseId', e.target.value.trim()));
  onInput('#cfg-aw-cid', e => cfgSave('appwrite.collectionId', e.target.value.trim()));
}

/* ══════════ COPIA DE SEGURIDAD ══════════ */
function cfgCopia(body) {
  body.innerHTML = `
    <p class="cfg-intro">Los ajustes viven en <strong>esta tablet</strong>. Para llevarlos a las
    demás, copia el código de abajo y pégalo allí.</p>
    ${field('Tus ajustes', `<textarea id="cfg-export" rows="7" readonly>${JSON.stringify(ATLAS_OVERLAY, null, 2)}</textarea>`)}
    <button class="btn btn-secondary btn-small" id="cfg-copy">📋 Copiar</button>
    <h4 class="cfg-h4">Pegar ajustes de otra tablet</h4>
    <textarea id="cfg-import" rows="5" placeholder="Pega aquí el código copiado"></textarea>
    <button class="btn btn-secondary btn-small" id="cfg-do-import">📥 Aplicar</button>
    <p id="cfg-import-err" class="cfg-warn hidden"></p>
    <h4 class="cfg-h4">Volver a empezar</h4>
    <button class="btn btn-quit" id="cfg-reset">♻️ Restaurar todos los valores de fábrica</button>
    <p class="cfg-hint">Esto solo borra tus ajustes. El progreso de los alumnos no se toca.</p>`;

  $('#cfg-copy').addEventListener('click', async () => {
    const text = $('#cfg-export').value;
    try {
      await navigator.clipboard.writeText(text);
      toast('Ajustes copiados ✓');
    } catch (e) {
      /* sin permiso de portapapeles: seleccionar para copiar a mano */
      $('#cfg-export').select();
      toast('Selecciona y copia con el teclado.');
    }
  });
  $('#cfg-do-import').addEventListener('click', () => {
    const err = $('#cfg-import-err');
    const raw = $('#cfg-import').value.trim();
    if (!raw) { err.textContent = 'Pega primero el código.'; err.classList.remove('hidden'); return; }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { err.textContent = 'Ese código no es válido. Cópialo entero, desde la primera llave hasta la última.'; err.classList.remove('hidden'); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      err.textContent = 'Ese código no parece unos ajustes de Expedición Atlas.';
      err.classList.remove('hidden'); return;
    }
    applyOverlay(parsed);
    saveTeacherConfig();
    err.classList.add('hidden');
    renderTeacherConfig();
    toast('Ajustes aplicados ✓');
  });
  $('#cfg-reset').addEventListener('click', async () => {
    if (!(await askConfirm('¿Restaurar todos los valores de fábrica? Se perderán tus ajustes. El progreso de los alumnos NO se toca.', 'Restaurar'))) return;
    resetTeacherConfig();
    renderTeacherConfig();
    toast('Valores de fábrica restaurados ✓');
  });
}
