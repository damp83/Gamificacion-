/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — teacher.js
   Panel de Configuración del docente: edita en caliente el curso,
   las recompensas, el almacén, los yacimientos, la economía y las
   cuadrillas. Todo se guarda como una capa sobre js/config.js.
   ═══════════════════════════════════════════════════════════ */

const CFG_SECTIONS = [
  { id: 'curso',      icon: '📅', name: 'Curso y trimestres' },
  { id: 'premios',    icon: '🏅', name: 'Comportamientos, tareas y actividades' },
  { id: 'alumnado',   icon: '👥', name: 'Alumnado' },
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
    curso: cfgCurso, premios: cfgPremios, alumnado: cfgAlumnado, equipos: cfgEquipos,
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

/* ══════════ ALUMNADO ══════════ */

/* Contraseñas legibles para un niño de 8-10 años: una palabra del mundo del
   juego más cuatro cifras. Siempre pasa el mínimo de 8 que exige Appwrite. */
const PASS_WORDS = ['brujula', 'mapa', 'tesoro', 'templo', 'jungla', 'momia',
                    'cofre', 'antorcha', 'vasija', 'fosil', 'duna', 'sendero'];
function makePassword() {
  return pick(PASS_WORDS) + String(ri(1000, 9999));
}
/* Usuario a partir del nombre: sin tildes, sin espacios, en minúsculas */
function makeUsername(name, taken) {
  let base = String(name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'explorador';
  let u = base, n = 2;
  while ((taken || []).includes(u)) u = base + (n++);
  return u;
}
function rosterCopy() { return deepClone(ATLAS_CONFIG.roster || []); }

function cfgAlumnado(body) {
  const roster = ATLAS_CONFIG.roster || [];
  const conCuenta = roster.filter(r => r.account).length;
  const nube = cloudConfigured() && cloudEnabled();

  body.innerHTML = `
    <p class="cfg-intro">La lista de clase sirve para dos cosas: asignar cuadrillas
    marcando casillas —sin escribir nombres, que se prestaba a erratas— y
    ${nube ? 'crear las cuentas de todos de una vez.' :
      'tenerla preparada. <strong>Para crear cuentas hace falta configurar Appwrite</strong> en «Acceso y nube».'}</p>

    ${field('Nombre del docente', `<input type="text" id="cfg-teacher-name" value="${(ATLAS_CONFIG.teacherName || '').replace(/"/g, '&quot;')}" placeholder="Diego Moya">`,
      'Aparece en la portada y en la sala de mapas.')}
    ${field('Nombre de la clase', `<input type="text" id="cfg-class-name" value="${(ATLAS_CONFIG.className || '').replace(/"/g, '&quot;')}" placeholder="4.º B">`)}
    ${field('Curso de la clase', `<select id="cfg-default-grade">
      ${GRADES.map(g => `<option value="${g.n}"${ATLAS_CONFIG.defaultGrade === g.n ? ' selected' : ''}>${g.label} · ${g.age}</option>`).join('')}
    </select>`, 'Es el que se propone a quien crea su diario. Cada alumno puede tener el suyo.')}

    <h4 class="cfg-h4">Lista de clase <span class="cfg-tag">${roster.length} alumno(s)${nube ? ` · ${conCuenta} con cuenta` : ''}</span></h4>

    <div class="cfg-list" id="roster-list">
      ${roster.length ? roster.map((r, i) => `
        <div class="cfg-card cfg-student">
          <div class="cfg-row">
            <input type="text" class="ros-name" data-i="${i}" value="${(r.name || '').replace(/"/g, '&quot;')}" placeholder="Nombre">
            <button class="cfg-del" data-delros="${i}" title="Quitar de la lista">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Usuario <input type="text" class="ros-user" data-i="${i}" value="${(r.username || '').replace(/"/g, '&quot;')}"></label>
            <label>Contraseña <input type="text" class="ros-pass" data-i="${i}" value="${(r.password || '').replace(/"/g, '&quot;')}"></label>
          </div>
          <div class="cfg-row">
            <label>Curso <select class="ros-grade" data-i="${i}">
              ${GRADES.map(g => `<option value="${g.n}"${(r.grade || ATLAS_CONFIG.defaultGrade) === g.n ? ' selected' : ''}>${g.label} · ${g.age}</option>`).join('')}
            </select></label>
            <span class="cfg-tag${r.account ? ' cfg-tag-ok' : ''}">${r.account ? '✓ cuenta creada' : 'sin cuenta'}</span>
          </div>
        </div>`).join('')
        : '<p class="cfg-hint">Todavía no hay nadie en la lista.</p>'}
    </div>

    <div class="cfg-row cfg-row-actions">
      <button class="btn btn-secondary btn-small" id="ros-add">➕ Añadir alumno</button>
      ${roster.length ? `<button class="btn btn-quit" id="ros-clear">Vaciar la lista</button>` : ''}
    </div>

    <h4 class="cfg-h4">Añadir toda la clase de golpe</h4>
    <p class="cfg-hint">Un nombre por línea. El usuario y la contraseña se generan solos
    (podrás cambiarlos después).</p>
    <textarea id="ros-bulk" rows="4" placeholder="Vega Serrano&#10;Nilo Ferrer&#10;Mara Ibáñez"></textarea>
    <button class="btn btn-secondary btn-small" id="ros-bulk-go">📥 Añadir a la lista</button>
    <p id="ros-bulk-err" class="cfg-warn hidden"></p>

    ${nube ? `
      <h4 class="cfg-h4">Crear las cuentas</h4>
      <p class="cfg-hint">Se dan de alta en Appwrite las que aún no existan. Tu sesión no se
      toca. Si alguna falla, se dice cuál y por qué.</p>
      <button class="btn btn-primary btn-small" id="ros-create"${roster.length === conCuenta ? ' disabled' : ''}>
        🎒 Crear ${roster.length - conCuenta} cuenta(s)</button>
      <div id="ros-create-log" class="ros-log${rosterLog.length ? '' : ' hidden'}">${
        rosterLog.map(x => `<div>${x}</div>`).join('')}</div>` : ''}

    ${roster.length ? `
      <h4 class="cfg-h4">Hoja de credenciales</h4>
      <p class="cfg-hint">Para repartir en clase. Cada alumno solo necesita su línea.</p>
      <textarea id="ros-sheet" rows="6" readonly>${roster.map(r =>
        `${r.name}  →  usuario: ${r.username}   contraseña: ${r.password}`).join('\n')}</textarea>
      <button class="btn btn-secondary btn-small" id="ros-copy">📋 Copiar</button>` : ''}`;

  onInput('#cfg-teacher-name', e => cfgSave('teacherName', e.target.value.trim()));
  onInput('#cfg-class-name', e => cfgSave('className', e.target.value.trim()));
  onInput('#cfg-default-grade', e => cfgSave('defaultGrade', +e.target.value));

  const write = (i, key, val) => { const l = rosterCopy(); l[i][key] = val; cfgSave('roster', l, false); };
  $$('.ros-name').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'name', e.target.value)));
  $$('.ros-user').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'username', e.target.value.trim())));
  $$('.ros-pass').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'password', e.target.value)));
  $$('.ros-grade').forEach(el => onInput(el, e => write(+e.target.dataset.i, 'grade', +e.target.value)));

  $$('[data-delros]').forEach(el => el.addEventListener('click', async () => {
    const i = +el.dataset.delros;
    const l = rosterCopy();
    const quien = l[i].name || 'este alumno';
    if (!(await askConfirm(`¿Quitar a ${quien} de la lista? ${l[i].account
      ? 'Su cuenta y su diario NO se borran: seguirá pudiendo entrar.'
      : 'Aún no tiene cuenta.'}`, 'Quitar'))) return;
    l.splice(i, 1);
    cfgSave('roster', l, 'Quitado de la lista ✓');
  }));

  $('#ros-add').addEventListener('click', () => {
    const l = rosterCopy();
    const taken = l.map(r => r.username);
    l.push({ name: '', username: makeUsername('', taken), password: makePassword(), account: false, grade: ATLAS_CONFIG.defaultGrade });
    cfgSave('roster', l, 'Añadido: escribe su nombre ✓');
  });

  const clear = $('#ros-clear');
  if (clear) clear.addEventListener('click', async () => {
    if (!(await askConfirm('¿Vaciar la lista de clase? Las cuentas ya creadas y los diarios NO se borran.', 'Vaciar'))) return;
    cfgSave('roster', [], 'Lista vaciada ✓');
  });

  $('#ros-bulk-go').addEventListener('click', () => {
    const err = $('#ros-bulk-err');
    const raw = $('#ros-bulk').value.trim();
    if (!raw) { err.textContent = 'Escribe al menos un nombre.'; err.classList.remove('hidden'); return; }
    const l = rosterCopy();
    const taken = l.map(r => r.username);
    let added = 0, dup = [];
    for (const line of raw.split('\n')) {
      const name = line.trim();
      if (!name) continue;
      if (l.some(r => (r.name || '').trim().toLowerCase() === name.toLowerCase())) { dup.push(name); continue; }
      const username = makeUsername(name, taken);
      taken.push(username);
      l.push({ name, username, password: makePassword(), account: false, grade: ATLAS_CONFIG.defaultGrade });
      added++;
    }
    if (!added) {
      err.textContent = dup.length ? `Ya estaban en la lista: ${dup.join(', ')}.` : 'No se ha podido leer ningún nombre.';
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    cfgSave('roster', l, `${added} alumno(s) añadidos${dup.length ? `. Ya estaban: ${dup.join(', ')}` : ''} ✓`);
  });

  const createBtn = $('#ros-create');
  if (createBtn) createBtn.addEventListener('click', async () => {
    const log = $('#ros-create-log');
    log.classList.remove('hidden');
    createBtn.disabled = true;
    const l = rosterCopy();
    const lineas = [];
    rosterLog = [];
    let ok = 0, fallos = 0;

    for (let i = 0; i < l.length; i++) {
      const r = l[i];
      if (r.account) continue;
      if (!r.name || !r.username || !r.password) {
        lineas.push(`⚠️ ${r.name || '(sin nombre)'} — le falta nombre, usuario o contraseña`);
        fallos++; continue;
      }
      log.innerHTML = lineas.concat([`⏳ Creando ${r.name}…`]).map(x => `<div>${x}</div>`).join('');
      const res = await cloudCreateStudent(r.name, r.username, r.password);
      if (res.ok) { l[i].account = true; lineas.push(`✓ ${r.name} — cuenta creada`); ok++; }
      else if (res.reason === 'existe') { l[i].account = true; lineas.push(`✓ ${r.name} — ya existía, se marca como creada`); ok++; }
      else {
        const motivo = { ritmo: 'Appwrite pide esperar un poco: vuelve a intentarlo en un minuto',
                         contrasena: 'la contraseña necesita 8 caracteres o más',
                         usuario: 'el usuario tiene caracteres no válidos',
                         'sin-nube': 'no hay conexión con Appwrite' }[res.reason] || res.detail || 'error desconocido';
        lineas.push(`✘ ${r.name} — ${motivo}`);
        fallos++;
        if (res.reason === 'ritmo') break;   /* no seguir martilleando */
      }
    }
    lineas.push(`<span class="ros-log-sum">${ok} creada(s)${fallos ? `, ${fallos} con problema` : ''}.</span>`);
    rosterLog = lineas;          /* se conserva para el repintado */
    cfgSave('roster', l, false);
    renderTeacherConfig();
  });

  const copy = $('#ros-copy');
  if (copy) copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#ros-sheet').value); toast('Credenciales copiadas ✓'); }
    catch (e) { $('#ros-sheet').select(); toast('Selecciona y copia con el teclado.'); }
  });
}

/* ══════════ CUADRILLAS ══════════ */
function cfgEquipos(body) {
  const t = ATLAS_CONFIG.teams;
  const roster = ATLAS_CONFIG.roster || [];
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
          <label class="cfg-label">Miembros</label>
          ${roster.length ? `
            <div class="team-picker">
              ${roster.map(r => {
                const yo = (team.members || []).some(m => String(m).trim().toLowerCase() === (r.name || '').trim().toLowerCase());
                const otra = !yo && t.list.some(x => x.id !== team.id &&
                  (x.members || []).some(m => String(m).trim().toLowerCase() === (r.name || '').trim().toLowerCase()));
                return `<label class="team-pick${otra ? ' team-pick-taken' : ''}">
                  <input type="checkbox" class="cfg-t-pick" data-i="${i}" data-name="${(r.name || '').replace(/"/g, '&quot;')}"
                    ${yo ? 'checked' : ''}${otra ? ' disabled' : ''}>
                  ${r.name || '(sin nombre)'}${otra ? ' · ya en otra' : ''}</label>`;
              }).join('')}
            </div>
            <small class="cfg-hint">${(team.members || []).length} miembro(s). Marcados desde la lista de clase, así el nombre siempre coincide.</small>`
          : `<textarea class="cfg-t-members" data-i="${i}" rows="4"
              placeholder="Escribe aquí un nombre por línea…">${(team.members || []).join('\n')}</textarea>
            <small class="cfg-hint">${(team.members || []).length
              ? (team.members || []).length + ' miembro(s) asignado(s).'
              : 'Sin miembros todavía.'} El nombre debe coincidir con el que escribió el niño.
              <strong>Consejo:</strong> rellena la lista en «Alumnado» y podrás marcarlos con casillas.</small>`}
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
  /* casillas desde la lista de clase */
  $$('.cfg-t-pick').forEach(el => el.addEventListener('change', e => {
    const i = +e.target.dataset.i, name = e.target.dataset.name;
    const l = deepClone(ATLAS_CONFIG.teams.list);
    const members = (l[i].members || []).filter(m => String(m).trim().toLowerCase() !== name.trim().toLowerCase());
    if (e.target.checked) members.push(name);
    l[i].members = members;
    cfgSave('teams.list', l, false);
  }));
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

/* ══════════ YACIMIENTOS, POZOS Y RETOS ══════════
   Tres niveles de edición: yacimientos → pozos → banco de retos por estrato.
   Los pozos de fábrica generan retos infinitos por sí solos; los que crees tú
   sirven los retos que escribas. */

/* Resultado del último alta de cuentas: debe sobrevivir al repintado del
   panel, o el docente nunca vería qué pasó con cada alumno. */
let rosterLog = [];

let cfgOpenSite = null;    /* yacimiento desplegado */
let cfgEditBranch = null;  /* {siteId, branchId} cuyo banco se está editando */
let cfgEditStratum = STRATA_ORDER[0];

function writeSites(sites, msg) { cfgSave('sites', sites, msg); }
function sitesCopy() { return deepClone(ATLAS_CONFIG.sites || []); }

function cfgYacimientos(body) {
  if (cfgEditBranch) return cfgBancoRetos(body);

  const sites = ATLAS_CONFIG.sites || [];
  body.innerHTML = `
    <p class="cfg-intro">Puedes crear <strong>yacimientos</strong> nuevos (Lengua, Naturales,
    Sociales…), añadirles <strong>pozos</strong> y escribir tú los retos de cada estrato.
    Los tres pozos de fábrica generan retos infinitos solos: se pueden renombrar y ocultar,
    pero sus retos no se editan.</p>

    <div class="cfg-list">
      ${sites.map((site, si) => {
        const open = cfgOpenSite === site.id;
        return `<div class="cfg-card cfg-site${site.enabled === false ? ' cfg-off' : ''}">
          <div class="cfg-row">
            <input type="text" class="cfg-si-icon" data-si="${si}" value="${site.icon}" maxlength="4">
            <input type="text" class="cfg-si-name" data-si="${si}" value="${site.name}">
            <button class="cfg-del" data-delsite="${si}" title="Eliminar yacimiento">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Materia <input type="text" class="cfg-si-subject" data-si="${si}" value="${site.subject || ''}"></label>
            <label class="cfg-switch">Activo
              <input type="checkbox" class="cfg-si-on" data-si="${si}"${site.enabled !== false ? ' checked' : ''}></label>
          </div>
          <textarea class="cfg-si-desc" data-si="${si}" rows="2" placeholder="Ambientación del yacimiento">${site.desc || ''}</textarea>
          <button class="cfg-toggle" data-open="${site.id}">${open ? '▾' : '▸'} ${branchesOf(site).length} pozo(s)</button>
          ${open ? `<div class="cfg-sublist">
            ${branchesOf(site).map((b, bi) => {
              const total = STRATA_ORDER.reduce((n, sId) => n + (((b.bank || {})[sId]) || []).length, 0);
              const listos = STRATA_ORDER.filter(sId => stratumHasContent(b, sId)).length;
              return `<div class="cfg-branch">
                <div class="cfg-row">
                  <input type="text" class="cfg-b2-icon" data-si="${si}" data-bi="${bi}" value="${b.icon}" maxlength="4">
                  <input type="text" class="cfg-b2-name" data-si="${si}" data-bi="${bi}" value="${b.name}">
                  <button class="cfg-del" data-delbranch="${si}:${bi}" title="Eliminar pozo">🗑️</button>
                </div>
                <textarea class="cfg-b2-desc" data-si="${si}" data-bi="${bi}" rows="2">${b.desc || ''}</textarea>
                <div class="cfg-row cfg-grades-row">
                  <span class="cfg-label">Cursos:</span>
                  ${GRADES.map(g => `<label class="grade-chip${(!b.grades || b.grades.includes(g.n)) ? ' on' : ''}">
                    <input type="checkbox" class="cfg-b2-grade" data-si="${si}" data-bi="${bi}" data-g="${g.n}"
                      ${(!b.grades || b.grades.includes(g.n)) ? 'checked' : ''}>${g.label}</label>`).join('')}
                </div>
                <div class="cfg-row">
                  <label class="cfg-switch">Activo
                    <input type="checkbox" class="cfg-b2-on" data-si="${si}" data-bi="${bi}"${b.enabled !== false ? ' checked' : ''}></label>
                  ${b.source === 'builtin'
                    ? '<span class="cfg-tag">Retos automáticos · infinitos</span>'
                    : `<button class="btn btn-secondary btn-small" data-bank="${site.id}:${b.id}">✏️ Retos (${total})</button>
                       <span class="cfg-tag${listos ? '' : ' cfg-tag-warn'}">${listos}/4 estratos listos</span>`}
                </div>
              </div>`;
            }).join('') || '<p class="cfg-hint">Este yacimiento aún no tiene pozos.</p>'}
            <button class="btn btn-secondary btn-small" data-addbranch="${si}">➕ Nuevo pozo</button>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn-secondary btn-small" id="cfg-add-site">➕ Nuevo yacimiento</button>`;

  /* ── yacimientos ── */
  const wSite = (si, key, val) => { const l = sitesCopy(); l[si][key] = val; writeSites(l, false); };
  $$('.cfg-si-icon').forEach(el => onInput(el, e => wSite(+e.target.dataset.si, 'icon', e.target.value || '🏛️')));
  $$('.cfg-si-name').forEach(el => onInput(el, e => wSite(+e.target.dataset.si, 'name', e.target.value || 'Yacimiento')));
  $$('.cfg-si-subject').forEach(el => onInput(el, e => wSite(+e.target.dataset.si, 'subject', e.target.value)));
  $$('.cfg-si-desc').forEach(el => onInput(el, e => wSite(+e.target.dataset.si, 'desc', e.target.value)));
  $$('.cfg-si-on').forEach(el => onInput(el, e => {
    const si = +e.target.dataset.si;
    if (!e.target.checked && countPlayable(si) === countPlayableTotal()) {
      e.target.checked = true;
      toast('Debe quedar al menos un yacimiento jugable: si no, no habría nada que excavar.');
      return;
    }
    wSite(si, 'enabled', e.target.checked);
  }));
  $$('[data-delsite]').forEach(el => el.addEventListener('click', async () => {
    const si = +el.dataset.delsite;
    const l = sitesCopy();
    if (!(await askConfirm(`¿Eliminar «${l[si].name}» y todos sus pozos? El progreso ya logrado por los alumnos se conserva en su diario.`, 'Eliminar'))) return;
    l.splice(si, 1);
    if (!l.length) { toast('No puedes quedarte sin ningún yacimiento.'); return; }
    writeSites(l, 'Yacimiento eliminado ✓');
  }));
  $('#cfg-add-site').addEventListener('click', () => {
    const l = sitesCopy();
    const id = slugify('yacimiento', 'site');
    l.push({ id, name: 'Yacimiento nuevo', subject: 'Materia', icon: '🏛️', desc: '', enabled: true, branches: [] });
    cfgOpenSite = id;
    writeSites(l, 'Yacimiento creado: añádele un pozo ✓');
  });
  $$('.cfg-toggle').forEach(el => el.addEventListener('click', () => {
    cfgOpenSite = cfgOpenSite === el.dataset.open ? null : el.dataset.open;
    renderTeacherConfig();
  }));

  /* ── pozos ── */
  const wBranch = (si, bi, key, val) => { const l = sitesCopy(); l[si].branches[bi][key] = val; writeSites(l, false); };
  $$('.cfg-b2-icon').forEach(el => onInput(el, e => wBranch(+e.target.dataset.si, +e.target.dataset.bi, 'icon', e.target.value || '⛏️')));
  $$('.cfg-b2-name').forEach(el => onInput(el, e => wBranch(+e.target.dataset.si, +e.target.dataset.bi, 'name', e.target.value || 'Pozo')));
  $$('.cfg-b2-desc').forEach(el => onInput(el, e => wBranch(+e.target.dataset.si, +e.target.dataset.bi, 'desc', e.target.value)));
  $$('.cfg-b2-grade').forEach(el => el.addEventListener('change', e => {
    const si = +e.target.dataset.si, bi = +e.target.dataset.bi, g = +e.target.dataset.g;
    const l = sitesCopy();
    const b = l[si].branches[bi];
    let gr = b.grades ? b.grades.slice() : GRADES.map(x => x.n);
    gr = e.target.checked ? Array.from(new Set(gr.concat([g]))).sort((a, c) => a - c) : gr.filter(x => x !== g);
    if (!gr.length) {   /* un pozo sin ningún curso no lo vería nadie */
      e.target.checked = true;
      toast('El pozo debe servir al menos a un curso.');
      return;
    }
    b.grades = gr;
    writeSites(l, false);
  }));
  $$('.cfg-b2-on').forEach(el => onInput(el, e => {
    const si = +e.target.dataset.si, bi = +e.target.dataset.bi;
    if (!e.target.checked && countPlayableTotal() <= 1) {
      e.target.checked = true;
      toast('Debe quedar al menos un pozo jugable: si no, no habría nada que excavar.');
      return;
    }
    wBranch(si, bi, 'enabled', e.target.checked);
  }));
  $$('[data-delbranch]').forEach(el => el.addEventListener('click', async () => {
    const [si, bi] = el.dataset.delbranch.split(':').map(Number);
    const l = sitesCopy();
    const b = l[si].branches[bi];
    if (!(await askConfirm(`¿Eliminar el pozo «${b.name}»${b.source === 'builtin' ? '' : ' y sus retos'}? El progreso ya logrado se conserva.`, 'Eliminar'))) return;
    l[si].branches.splice(bi, 1);
    writeSites(l, 'Pozo eliminado ✓');
  }));
  $$('[data-addbranch]').forEach(el => el.addEventListener('click', () => {
    const si = +el.dataset.addbranch;
    const l = sitesCopy();
    l[si].branches.push({
      id: slugify('pozo', 'branch'), name: 'Pozo nuevo', icon: '⛏️', desc: '',
      enabled: true, source: 'bank', grades: GRADES.map(g => g.n),
      bank: { recordar: [], comprender: [], aplicar: [], analizar: [] }
    });
    writeSites(l, 'Pozo creado: ahora escríbele retos ✓');
  }));
  $$('[data-bank]').forEach(el => el.addEventListener('click', () => {
    const [siteId, branchId] = el.dataset.bank.split(':');
    cfgEditBranch = { siteId, branchId };
    cfgEditStratum = STRATA_ORDER[0];
    renderTeacherConfig();
  }));
}

/* Cuántos pozos jugables quedarían — para no dejar el mapa vacío */
function countPlayableTotal() {
  let n = 0;
  for (const site of (ATLAS_CONFIG.sites || [])) {
    if (site.enabled === false) continue;
    n += branchesOf(site).filter(b => b.enabled !== false && branchPlayable(b)).length;
  }
  return n;
}
function countPlayable(si) {
  const site = (ATLAS_CONFIG.sites || [])[si];
  if (!site || site.enabled === false) return 0;
  return branchesOf(site).filter(b => b.enabled !== false && branchPlayable(b)).length;
}

/* ══════════ BANCO DE RETOS DE UN POZO ══════════ */
function cfgBancoRetos(body) {
  const { siteId, branchId } = cfgEditBranch;
  const site = siteById(siteId);
  const branch = site && branchesOf(site).find(b => b.id === branchId);
  if (!branch) { cfgEditBranch = null; return cfgYacimientos(body); }

  const bank = (branch.bank || {})[cfgEditStratum] || [];
  const meta = STRATA_META[cfgEditStratum];

  body.innerHTML = `
    <button class="btn btn-back" id="cfg-bank-back">← Volver a los yacimientos</button>
    <h3 class="cfg-bank-title">${branch.icon} ${branch.name}</h3>
    <p class="cfg-intro">Escribe los retos de cada estrato. Los estratos van de menos a más
    profundos: <strong>Recordar</strong> es reconocer, <strong>Analizar</strong> es encontrar el
    error. Un estrato sin retos aparece al alumno como «todavía no preparado», nunca como
    bloqueado sin explicación.</p>

    <div class="cfg-strata-tabs">
      ${STRATA_ORDER.map(sId => {
        const n = ((branch.bank || {})[sId] || []).length;
        return `<button class="cfg-strat-tab${sId === cfgEditStratum ? ' active' : ''}" data-strat="${sId}">
          ${STRATA_META[sId].icon} ${STRATA_META[sId].label} <span class="cfg-count">${n}</span></button>`;
      }).join('')}
    </div>

    <p class="cfg-hint">${meta.icon} <strong>${meta.label}</strong> · «${meta.name}» —
    ${bank.length ? `${bank.length} reto(s). Con 6 o más, el alumno no repetirá dentro de una misión.` : 'Sin retos todavía.'}</p>

    <div class="cfg-list" id="cfg-bank-list">
      ${bank.map((q, qi) => `
        <div class="cfg-card cfg-q">
          <div class="cfg-row cfg-q-head">
            <span class="cfg-q-num">${qi + 1}</span>
            <button class="cfg-del" data-delq="${qi}" title="Eliminar reto">🗑️</button>
          </div>
          <textarea class="cfg-q-text" data-qi="${qi}" rows="2" placeholder="Pregunta">${q.question || ''}</textarea>
          ${[0, 1, 2, 3].map(oi => `
            <div class="cfg-row cfg-opt-row">
              <input type="radio" name="ans-${qi}" class="cfg-q-ans" data-qi="${qi}" data-oi="${oi}"
                ${q.answer === oi ? 'checked' : ''} title="Marcar como correcta">
              <input type="text" class="cfg-q-opt" data-qi="${qi}" data-oi="${oi}"
                value="${(q.options && q.options[oi] || '').replace(/"/g, '&quot;')}" placeholder="Respuesta ${oi + 1}">
            </div>`).join('')}
          <textarea class="cfg-q-exp" data-qi="${qi}" rows="2" placeholder="Explicación tras responder (la lee quien falla)">${q.explanation || ''}</textarea>
          <input type="text" class="cfg-q-h1" data-qi="${qi}" value="${(q.hint1 || '').replace(/"/g, '&quot;')}" placeholder="1ª pista de Kira (gratis)">
          <input type="text" class="cfg-q-h2" data-qi="${qi}" value="${(q.hint2 || '').replace(/"/g, '&quot;')}" placeholder="2ª pista de Kira (cuesta Doblones)">
        </div>`).join('')}
    </div>

    <button class="btn btn-secondary btn-small" id="cfg-add-q">➕ Añadir reto</button>

    <h4 class="cfg-h4">Añadir muchos de golpe</h4>
    <p class="cfg-hint">Un reto por línea, separando con <code>|</code>:<br>
      <code>pregunta | correcta | otra | otra | otra | explicación</code><br>
      La primera respuesta es la correcta; al alumno se le barajan.</p>
    <textarea id="cfg-bulk" rows="4" placeholder="¿Cuál es el plural de «lápiz»? | lápices | lápizes | lápiz | lápizs | Las palabras acabadas en -z hacen el plural en -ces."></textarea>
    <button class="btn btn-secondary btn-small" id="cfg-bulk-go">📥 Añadir al estrato</button>
    <p id="cfg-bulk-err" class="cfg-warn hidden"></p>`;

  $('#cfg-bank-back').addEventListener('click', () => { cfgEditBranch = null; renderTeacherConfig(); });
  $$('.cfg-strat-tab').forEach(el => el.addEventListener('click', () => {
    cfgEditStratum = el.dataset.strat;
    renderTeacherConfig();
  }));

  /* Escribe en el banco del estrato abierto */
  const writeBank = (mutate, msg) => {
    const l = sitesCopy();
    const st = l.find(x => x.id === siteId);
    const br = st.branches.find(x => x.id === branchId);
    br.bank = br.bank || {};
    br.bank[cfgEditStratum] = deepClone(br.bank[cfgEditStratum] || []);
    mutate(br.bank[cfgEditStratum]);
    writeSites(l, msg === undefined ? false : msg);
  };

  $$('.cfg-q-text').forEach(el => onInput(el, e => writeBank(b => { b[+e.target.dataset.qi].question = e.target.value; })));
  $$('.cfg-q-exp').forEach(el => onInput(el, e => writeBank(b => { b[+e.target.dataset.qi].explanation = e.target.value; })));
  $$('.cfg-q-h1').forEach(el => onInput(el, e => writeBank(b => { b[+e.target.dataset.qi].hint1 = e.target.value; })));
  $$('.cfg-q-h2').forEach(el => onInput(el, e => writeBank(b => { b[+e.target.dataset.qi].hint2 = e.target.value; })));
  $$('.cfg-q-opt').forEach(el => onInput(el, e => writeBank(b => {
    const q = b[+e.target.dataset.qi];
    q.options = q.options || ['', '', '', ''];
    q.options[+e.target.dataset.oi] = e.target.value;
  })));
  $$('.cfg-q-ans').forEach(el => el.addEventListener('change', e => writeBank(b => {
    b[+e.target.dataset.qi].answer = +e.target.dataset.oi;
  }, 'Respuesta correcta marcada ✓')));
  $$('[data-delq]').forEach(el => el.addEventListener('click', async () => {
    const qi = +el.dataset.delq;
    if (!(await askConfirm('¿Eliminar este reto?', 'Eliminar'))) return;
    writeBank(b => b.splice(qi, 1), 'Reto eliminado ✓');
  }));
  $('#cfg-add-q').addEventListener('click', () => {
    writeBank(b => b.push({ question: '', options: ['', '', '', ''], answer: 0, hint1: '', hint2: '', explanation: '' }),
      'Reto añadido: complétalo ✓');
  });

  /* Alta masiva */
  $('#cfg-bulk-go').addEventListener('click', () => {
    const err = $('#cfg-bulk-err');
    const raw = $('#cfg-bulk').value.trim();
    if (!raw) { err.textContent = 'Escribe al menos una línea.'; err.classList.remove('hidden'); return; }
    const nuevos = [];
    const malas = [];
    raw.split('\n').forEach((line, i) => {
      const t = line.trim();
      if (!t) return;
      const parts = t.split('|').map(x => x.trim());
      if (parts.length < 5) { malas.push(i + 1); return; }
      nuevos.push({
        question: parts[0],
        options: [parts[1], parts[2], parts[3], parts[4]],
        answer: 0,
        hint1: '', hint2: '',
        explanation: parts[5] || ''
      });
    });
    if (!nuevos.length) {
      err.textContent = 'Ninguna línea tenía el formato esperado: pregunta y cuatro respuestas separadas por «|».';
      err.classList.remove('hidden');
      return;
    }
    writeBank(b => nuevos.forEach(q => b.push(q)),
      `${nuevos.length} reto(s) añadidos${malas.length ? `. Líneas ignoradas por formato: ${malas.join(', ')}` : ''} ✓`);
  });
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
