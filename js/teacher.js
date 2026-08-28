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
  { id: 'guardian',   icon: '🗿', name: 'Cámara del Guardián' },
  { id: 'fondo',      icon: '🌍', name: 'Fondo de la Sociedad' },
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
    guardian: cfgGuardian, fondo: cfgFondo, acceso: cfgAcceso, copia: cfgCopia
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
    ${field('Nombre del curso', `<input type="text" id="cfg-course-label" value="${esc(c.label)}">`)}
    <div class="cfg-list">
      ${c.trimesters.map((t, i) => `
        <div class="cfg-card">
          <input type="text" class="cfg-tri-name" data-i="${i}" value="${esc(t.name)}">
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
            <input type="text" class="cfg-b-icon" data-i="${i}" value="${esc(b.icon)}" maxlength="4" title="Icono">
            <input type="text" class="cfg-b-name" data-i="${i}" value="${esc(b.name)}" placeholder="Nombre">
          </div>
          <div class="cfg-row">
            <label>Doblones <input type="number" class="cfg-b-coins" data-i="${i}" value="${b.coins}" min="1" max="200"></label>
            <label>Tope/día <input type="number" class="cfg-b-cap" data-i="${i}" value="${b.perDay}" min="1" max="20"></label>
            <select class="cfg-b-cat" data-i="${i}">
              ${CATEGORIES.map(c => `<option value="${c.id}"${(b.category || 'comportamiento') === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
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
   juego más cuatro cifras. Siempre pasa el mínimo de 8 que exige Appwrite.
   Sin tildes ni eñes a propósito: hay que teclearlas en una tablet.

   El repertorio es corto (24 × 9000) porque tiene que poder escribirlo un niño
   de ocho años. Lo que impide adivinarla probando no es su tamaño, es el
   límite de intentos de Appwrite; igual que el PIN, esto es una barrera de
   aula y no seguridad de verdad. */
const PASS_WORDS = ['brujula', 'mapa', 'tesoro', 'templo', 'jungla', 'momia',
                    'cofre', 'antorcha', 'vasija', 'fosil', 'duna', 'sendero',
                    'linterna', 'cuerda', 'ruina', 'oasis', 'camello', 'papiro',
                    'estatua', 'columna', 'caverna', 'reliquia', 'arena', 'piedra'];

/* Entero al azar del generador criptográfico del navegador.
   Aquí `Math.random()` no vale, y no por el tamaño del repertorio: el docente
   genera la clase ENTERA de una tacada, y de unas pocas salidas consecutivas
   de ese generador se puede reconstruir su estado interno y predecir las
   siguientes. La hoja de credenciales se reparte en clase, así que un alumno
   con la suya y la de dos compañeros tendría justo eso: salidas consecutivas.
   `ri()` se queda como está para los retos, donde no importa. */
function azarSeguro(n) {
  const fuente = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
  if (!fuente) return Math.floor(Math.random() * n);   /* navegador viejo: peor esto que nada */
  /* Se descarta el último tramo incompleto de 2^32 para que no salgan unos
     números más veces que otros. */
  const limite = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  let v;
  do { fuente.getRandomValues(buf); v = buf[0]; } while (v >= limite);
  return v % n;
}

function makePassword() {
  return PASS_WORDS[azarSeguro(PASS_WORDS.length)] + String(1000 + azarSeguro(9000));
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

    ${field('Cómo se usa en clase', `<select id="cfg-session-mode">
      <option value="docente"${ATLAS_CONFIG.sessionMode === 'docente' ? ' selected' : ''}>Dirigida por el docente: yo pregunto, ellos responden</option>
      <option value="alumno"${ATLAS_CONFIG.sessionMode === 'alumno' ? ' selected' : ''}>Cada alumno en su dispositivo, con su cuenta</option>
      <option value="ambos"${ATLAS_CONFIG.sessionMode === 'ambos' ? ' selected' : ''}>Las dos cosas (en clase dirigida, en casa por su cuenta)</option>
    </select>`, 'En clase dirigida, la portada no ofrece la puerta del alumnado y los diarios se guardan en este equipo.')}

    ${field('Nombre del docente', `<input type="text" id="cfg-teacher-name" value="${esc(ATLAS_CONFIG.teacherName || '')}" placeholder="Diego Moya">`,
      'Aparece en la portada y en la sala de mapas.')}
    ${field('Nombre de la clase', `<input type="text" id="cfg-class-name" value="${esc(ATLAS_CONFIG.className || '')}" placeholder="4.º B">`)}
    ${field('Curso de la clase', `<select id="cfg-default-grade">
      ${GRADES.map(g => `<option value="${g.n}"${ATLAS_CONFIG.defaultGrade === g.n ? ' selected' : ''}>${g.label} · ${g.age}</option>`).join('')}
    </select>`, 'Es el que se propone a quien crea su diario. Cada alumno puede tener el suyo.')}

    <h4 class="cfg-h4">Lista de clase <span class="cfg-tag">${roster.length} alumno(s)${nube ? ` · ${conCuenta} con cuenta` : ''}</span></h4>

    <div class="cfg-list" id="roster-list">
      ${roster.length ? roster.map((r, i) => `
        <div class="cfg-card cfg-student">
          <div class="cfg-row">
            <input type="text" class="ros-name" data-i="${i}" value="${esc(r.name || '')}" placeholder="Nombre">
            <button class="cfg-del" data-delros="${i}" title="Quitar de la lista">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Usuario <input type="text" class="ros-user" data-i="${i}" value="${esc(r.username || '')}"></label>
            <label>Contraseña <input type="text" class="ros-pass" data-i="${i}" value="${esc(r.password || '')}"></label>
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
        `${esc(r.name)}  →  usuario: ${esc(r.username)}   contraseña: ${esc(r.password)}`).join('\n')}</textarea>
      <button class="btn btn-secondary btn-small" id="ros-copy">📋 Copiar</button>` : ''}`;

  onInput('#cfg-session-mode', e => cfgSave('sessionMode', e.target.value,
    e.target.value === 'docente' ? 'Clase dirigida por el docente ✓' : 'Modo de sesión guardado ✓'));
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
        lineas.push(`⚠️ ${esc(r.name || '(sin nombre)')} — le falta nombre, usuario o contraseña`);
        fallos++; continue;
      }
      log.innerHTML = lineas.concat([`⏳ Creando ${esc(r.name)}…`]).map(x => `<div>${x}</div>`).join('');
      const res = await cloudCreateStudent(r.name, r.username, r.password);
      if (res.ok) { l[i].account = true; lineas.push(`✓ ${esc(r.name)} — cuenta creada`); ok++; }
      else if (res.reason === 'existe') { l[i].account = true; lineas.push(`✓ ${esc(r.name)} — ya existía, se marca como creada`); ok++; }
      else {
        const motivo = { ritmo: 'Appwrite pide esperar un poco: vuelve a intentarlo en un minuto',
                         contrasena: 'la contraseña necesita 8 caracteres o más',
                         usuario: 'el usuario tiene caracteres no válidos',
                         'sin-nube': 'no hay conexión con Appwrite' }[res.reason] || res.detail || 'error desconocido';
        lineas.push(`✘ ${esc(r.name)} — ${esc(motivo)}`);
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
    ${field('Nombre de la meta común', `<input type="text" id="cfg-team-goal" value="${esc(t.goalLabel)}">`)}
    ${field('Meta en Doblones', `<input type="number" id="cfg-team-target" value="${t.goalTarget}" min="100" step="100">`)}
    ${field('Aportación por Doblón ganado', `<input type="number" id="cfg-team-rate" value="${Math.round((t.contributionRate || 0) * 100)}" min="0" max="100">`,
      'En %. No se descuenta de la bolsa del niño: cooperar no cuesta nada.')}
    ${field('Mostrar comparación entre cuadrillas', `<input type="checkbox" id="cfg-team-cmp"${t.showComparison ? ' checked' : ''}>`,
      'Actívalo solo si tu grupo lleva bien la comparación.')}

    <div class="cfg-list">
      ${t.list.map((team, i) => `
        <div class="cfg-card">
          <div class="cfg-row">
            <input type="text" class="cfg-t-icon" data-i="${i}" value="${esc(team.icon)}" maxlength="4">
            <input type="text" class="cfg-t-name" data-i="${i}" value="${esc(team.name)}">
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
                  <input type="checkbox" class="cfg-t-pick" data-i="${i}" data-name="${esc(r.name || '')}"
                    ${yo ? 'checked' : ''}${otra ? ' disabled' : ''}>
                  ${esc(r.name || '(sin nombre)')}${otra ? ' · ya en otra' : ''}</label>`;
              }).join('')}
            </div>
            <small class="cfg-hint">${(team.members || []).length} miembro(s). Marcados desde la lista de clase, así el nombre siempre coincide.</small>`
          : `<textarea class="cfg-t-members" data-i="${i}" rows="4"
              placeholder="Escribe aquí un nombre por línea…">${esc((team.members || []).join('\n'))}</textarea>
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
    Los pozos de fábrica —cinco de Matemáticas y tres de Lengua— generan retos infinitos
    solos y se ajustan al curso de cada alumno: se pueden renombrar, limitar a ciertos
    cursos y ocultar, pero sus retos no se editan.</p>

    <div class="cfg-list">
      ${sites.map((site, si) => {
        const open = cfgOpenSite === site.id;
        return `<div class="cfg-card cfg-site${site.enabled === false ? ' cfg-off' : ''}">
          <div class="cfg-row">
            <input type="text" class="cfg-si-icon" data-si="${si}" value="${esc(site.icon)}" maxlength="4">
            <input type="text" class="cfg-si-name" data-si="${si}" value="${esc(site.name)}">
            <button class="cfg-del" data-delsite="${si}" title="Eliminar yacimiento">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Materia <input type="text" class="cfg-si-subject" data-si="${si}" value="${esc(site.subject || '')}"></label>
            <label class="cfg-switch">Activo
              <input type="checkbox" class="cfg-si-on" data-si="${si}"${site.enabled !== false ? ' checked' : ''}></label>
          </div>
          <textarea class="cfg-si-desc" data-si="${si}" rows="2" placeholder="Ambientación del yacimiento">${esc(site.desc || '')}</textarea>
          <button class="cfg-toggle" data-open="${site.id}">${open ? '▾' : '▸'} ${branchesOf(site).length} pozo(s)</button>
          ${open ? `<div class="cfg-sublist">
            ${branchesOf(site).map((b, bi) => {
              const total = STRATA_ORDER.reduce((n, sId) => n + (((b.bank || {})[sId]) || []).length, 0);
              const listos = STRATA_ORDER.filter(sId => stratumHasContent(b, sId)).length;
              return `<div class="cfg-branch">
                <div class="cfg-row">
                  <input type="text" class="cfg-b2-icon" data-si="${si}" data-bi="${bi}" value="${esc(b.icon)}" maxlength="4">
                  <input type="text" class="cfg-b2-name" data-si="${si}" data-bi="${bi}" value="${esc(b.name)}">
                  <button class="cfg-del" data-delbranch="${si}:${bi}" title="Eliminar pozo">🗑️</button>
                </div>
                <textarea class="cfg-b2-desc" data-si="${si}" data-bi="${bi}" rows="2">${esc(b.desc || '')}</textarea>
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
    <h3 class="cfg-bank-title">${esc(branch.icon)} ${esc(branch.name)}</h3>
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
          <textarea class="cfg-q-text" data-qi="${qi}" rows="2" placeholder="Pregunta">${esc(q.question || '')}</textarea>
          ${[0, 1, 2, 3].map(oi => `
            <div class="cfg-row cfg-opt-row">
              <input type="radio" name="ans-${qi}" class="cfg-q-ans" data-qi="${qi}" data-oi="${oi}"
                ${q.answer === oi ? 'checked' : ''} title="Marcar como correcta">
              <input type="text" class="cfg-q-opt" data-qi="${qi}" data-oi="${oi}"
                value="${esc(q.options && q.options[oi] || '')}" placeholder="Respuesta ${oi + 1}">
            </div>`).join('')}
          <textarea class="cfg-q-exp" data-qi="${qi}" rows="2" placeholder="Explicación tras responder (la lee quien falla)">${esc(q.explanation || '')}</textarea>
          <input type="text" class="cfg-q-h1" data-qi="${qi}" value="${esc(q.hint1 || '')}" placeholder="1ª pista de Kira (gratis)">
          <input type="text" class="cfg-q-h2" data-qi="${qi}" value="${esc(q.hint2 || '')}" placeholder="2ª pista de Kira (cuesta Doblones)">
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
            <input type="text" class="cfg-s-icon" data-i="${i}" value="${esc(it.icon)}" maxlength="4">
            <input type="text" class="cfg-s-name" data-i="${i}" value="${esc(it.name)}">
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
  { k: 'fatigueMinutes',   label: 'Minutos de excavación antes de bajar el PE', min: 5, max: 120 },
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

/* ══════════ CÁMARA DEL GUARDIÁN ══════════ */
const GUARD_FIELDS = [
  { k: 'questions',    label: 'Retos encadenados', min: 4, max: 20, hint: 'El PRD recomienda entre 8 y 12.' },
  { k: 'coins',        label: 'Doblones al superarla', min: 0, max: 500 },
  { k: 'peBonus',      label: 'Puntos de Expedición al superarla', min: 0, max: 500 },
  { k: 'tierBoost',    label: 'Dificultad extra', min: 0, max: 3, hint: 'Puntos de dificultad por encima de lo habitual.' }
];

function cfgGuardian(body) {
  const g = ATLAS_CONFIG.guardian || {};
  body.innerHTML = `
    <p class="cfg-intro">La cámara es la <strong>evaluación sumativa</strong> de un pozo: se abre
    cuando sus cuatro estratos están dominados y pregunta de todos a la vez. <strong>Fallar no
    cuesta nada</strong> —ni PE, ni Doblones, ni dominio—; lo único que pide el Guardián es un
    Encargo del Bazar sobre el estrato donde se falló antes de volver a intentarlo.</p>
    ${field('Cámaras activas', `<input type="checkbox" id="cfg-g-on"${g.enabled ? ' checked' : ''}>`)}
    <div class="cfg-grid">
      ${GUARD_FIELDS.map(f => field(f.label,
        `<input type="number" class="cfg-guard" data-k="${f.k}" value="${g[f.k]}" min="${f.min}" max="${f.max}">`,
        f.hint)).join('')}
    </div>
    ${field('Aciertos necesarios (%)',
      `<input type="number" id="cfg-g-pass" value="${Math.round((g.passAccuracy || 0.8) * 100)}" min="50" max="100">`,
      'Aciertos a la primera. Por debajo de 60 % la cámara deja de medir nada; por encima de 90 % se vuelve inalcanzable para la mayoría.')}
    <p id="cfg-g-warn" class="cfg-warn${cfgNotice ? '' : ' hidden'}">${cfgNotice}</p>`;

  onInput('#cfg-g-on', e => cfgSave('guardian.enabled', e.target.checked,
    e.target.checked ? 'Cámaras activadas ✓' : 'Cámaras desactivadas ✓'));
  $$('.cfg-guard').forEach(el => onInput(el, e => {
    const f = GUARD_FIELDS.find(x => x.k === e.target.dataset.k);
    const val = Math.min(f.max, Math.max(f.min, +e.target.value || f.min));
    e.target.value = val;
    cfgSave('guardian.' + f.k, val, false);
  }));
  onInput('#cfg-g-pass', e => {
    const val = Math.min(100, Math.max(50, +e.target.value || 80));
    e.target.value = val;
    cfgNotice = val > 90
      ? '⚠️ Con más del 90 % la cámara se vuelve casi inalcanzable: se convierte en un muro, no en una meta.'
      : (val < 60 ? '⚠️ Por debajo del 60 % se aprueba casi por azar y la cámara deja de significar nada.' : '');
    cfgSave('guardian.passAccuracy', val / 100);
  });
}

/* ══════════ FONDO DE LA SOCIEDAD ══════════ */
function cfgFondo(body) {
  const f = ATLAS_CONFIG.fund || {};
  const ms = f.milestones || [];
  body.innerHTML = `
    <p class="cfg-intro">El almacén se agota en tres o cuatro semanas y a partir de ahí los
    Doblones dejan de significar nada. El Fondo es un <strong>sumidero sin fondo y
    cooperativo</strong>: lo donado no vuelve, no da ninguna ventaja y los hitos son de
    <em>toda</em> la clase. Nunca se muestra quién ha donado más.</p>
    ${field('Fondo activo', `<input type="checkbox" id="cfg-fund-on"${f.enabled ? ' checked' : ''}>`)}
    ${field('Nombre', `<input type="text" id="cfg-fund-name" value="${esc(f.name || '')}">`)}
    ${field('Frase de presentación', `<textarea id="cfg-fund-blurb" rows="2">${esc(f.blurb || '')}</textarea>`)}
    ${field('Doblones reunidos por la clase',
      `<input type="number" id="cfg-fund-total" value="${Number(f.classTotal) || 0}" min="0" max="999999">`,
      'La suma real aparece en la vista general de la clase. Anótala aquí y todos la verán, incluso sin conexión.')}
    ${field('Cantidades para donar', `<input type="text" id="cfg-fund-steps" value="${(f.steps || []).join(', ')}">`,
      'Separadas por comas. Son los botones que ve el alumnado.')}

    <h4 class="cfg-h4">Hitos</h4>
    <div class="cfg-list">
      ${ms.map((m, i) => `
        <div class="cfg-card">
          <div class="cfg-row">
            <input type="text" class="cfg-f-icon" data-i="${i}" value="${esc(m.icon)}" maxlength="4">
            <input type="text" class="cfg-f-name" data-i="${i}" value="${esc(m.name)}">
            <button class="cfg-del" data-delfund="${i}" title="Eliminar">🗑️</button>
          </div>
          <div class="cfg-row">
            <label>Se abre con <input type="number" class="cfg-f-at" data-i="${i}" value="${m.at}" min="1" max="999999"> 🪙</label>
          </div>
          <textarea class="cfg-f-desc" data-i="${i}" rows="2" placeholder="Qué consigue la Sociedad">${esc(m.desc || '')}</textarea>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-small" id="cfg-add-fund">➕ Añadir hito</button>

    <h4 class="cfg-h4">Después del último hito</h4>
    <p class="cfg-intro">Para que el Fondo no se agote nunca, tras el último hito se abre
    uno nuevo cada tantos Doblones.</p>
    ${field('Cada cuántos Doblones', `<input type="number" id="cfg-fund-step" value="${f.endlessStep || 0}" min="0" max="99999">`,
      'A 0 el Fondo termina en el último hito.')}
    ${field('Nombre de esos hitos', `<input type="text" id="cfg-fund-endless" value="${esc(f.endlessLabel || '')}">`)}`;

  const guarda = (k, v, msg) => cfgSave('fund.' + k, v, msg === undefined ? false : msg);
  onInput('#cfg-fund-on',    e => cfgSave('fund.enabled', e.target.checked, e.target.checked ? 'Fondo activado ✓' : 'Fondo desactivado ✓'));
  onInput('#cfg-fund-name',  e => guarda('name', e.target.value || 'Fondo de la Sociedad Geográfica'));
  onInput('#cfg-fund-blurb', e => guarda('blurb', e.target.value));
  onInput('#cfg-fund-total', e => guarda('classTotal', Math.max(0, +e.target.value || 0)));
  onInput('#cfg-fund-step',  e => guarda('endlessStep', Math.max(0, +e.target.value || 0)));
  onInput('#cfg-fund-endless', e => guarda('endlessLabel', e.target.value || 'Otra ruina rescatada'));
  onInput('#cfg-fund-steps', e => {
    /* Se aceptan comas, espacios o ambos; lo que no sea un número se descarta */
    const nums = e.target.value.split(/[^0-9]+/).map(n => +n).filter(n => n > 0).slice(0, 6);
    guarda('steps', nums.length ? nums : [5, 10, 25, 50]);
  });

  const escribe = (i, key, val) => {
    const l = deepClone(ATLAS_CONFIG.fund.milestones || []);
    l[i][key] = val;
    cfgSave('fund.milestones', l, false);
  };
  $$('.cfg-f-icon').forEach(el => onInput(el, e => escribe(+e.target.dataset.i, 'icon', e.target.value || '🏺')));
  $$('.cfg-f-name').forEach(el => onInput(el, e => escribe(+e.target.dataset.i, 'name', e.target.value || 'Hito')));
  $$('.cfg-f-desc').forEach(el => onInput(el, e => escribe(+e.target.dataset.i, 'desc', e.target.value)));
  $$('.cfg-f-at').forEach(el => onInput(el, e => {
    /* Los hitos se muestran en orden: si se desordenan, la barra retrocedería */
    const l = deepClone(ATLAS_CONFIG.fund.milestones || []);
    l[+e.target.dataset.i].at = Math.max(1, +e.target.value || 1);
    l.sort((a, b) => a.at - b.at);
    cfgSave('fund.milestones', l, false);
  }));
  $$('[data-delfund]').forEach(el => el.addEventListener('click', async () => {
    const l = deepClone(ATLAS_CONFIG.fund.milestones || []);
    const i = +el.dataset.delfund;
    if (!(await askConfirm(`¿Quitar el hito «${l[i].name}»? Lo donado no se pierde.`, 'Quitar'))) return;
    l.splice(i, 1);
    cfgSave('fund.milestones', l, 'Hito retirado ✓');
  }));
  $('#cfg-add-fund').addEventListener('click', () => {
    const l = deepClone(ATLAS_CONFIG.fund.milestones || []);
    const ultimo = l.length ? l[l.length - 1].at : 0;
    l.push({ at: ultimo + 1000, icon: '🏺', name: 'Hito nuevo', desc: '' });
    cfgSave('fund.milestones', l, 'Hito añadido ✓');
  });
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
    ${field('Collection ID (diarios)', `<input type="text" id="cfg-aw-cid" value="${a.collectionId}">`)}
    ${field('Collection ID (aulas)', `<input type="text" id="cfg-aw-aid" value="${esc(a.aulasCollectionId || '')}">`,
      'Solo si quieres que varios docentes usen la plataforma con sus clases por separado. Cada clase pertenece a la cuenta de su docente y las demás no pueden leerla.')}
    ${field('Collection ID (configuración compartida)', `<input type="text" id="cfg-aw-ccid" value="${esc(a.configCollectionId || '')}">`,
      'Opcional. Sirve para no configurar veinte tablets a mano. Con la colección de aulas puesta no hace falta: los ajustes de cada clase viajan en su documento.')}
    <p class="cfg-warn">Tras cambiar los datos de Appwrite hay que recargar la página para que surtan efecto.</p>

    <h4 class="cfg-h4">¿Está bien puesto?</h4>
    <p class="cfg-hint">Prueba cada colección y dice cuál falla y por qué. El fallo más común es
    un <strong>ID equivocado</strong>: en Appwrite el ID de una colección no tiene por qué ser su
    nombre. Solo lee: no crea ni cambia nada.</p>
    <button class="btn btn-secondary btn-small" id="cfg-aw-check">🔌 Comprobar la conexión</button>
    <div id="cfg-aw-diag" class="ros-log hidden"></div>`;

  onInput('#cfg-pin', e => cfgSave('teacherPin', e.target.value || '1234'));
  onInput('#cfg-aw-ep', e => cfgSave('appwrite.endpoint', e.target.value.trim()));
  onInput('#cfg-aw-pid', e => cfgSave('appwrite.projectId', e.target.value.trim()));
  onInput('#cfg-aw-did', e => cfgSave('appwrite.databaseId', e.target.value.trim()));
  onInput('#cfg-aw-cid', e => cfgSave('appwrite.collectionId', e.target.value.trim()));
  onInput('#cfg-aw-aid', e => cfgSave('appwrite.aulasCollectionId', e.target.value.trim()));
  onInput('#cfg-aw-ccid', e => cfgSave('appwrite.configCollectionId', e.target.value.trim()));

  $('#cfg-aw-check').addEventListener('click', async () => {
    const caja = $('#cfg-aw-diag');
    const boton = $('#cfg-aw-check');
    boton.disabled = true;
    caja.classList.remove('hidden');
    caja.innerHTML = '<div>Comprobando…</div>';
    let pasos;
    try { pasos = await cloudDiagnostico(); }
    catch (e) { pasos = [{ que: 'Comprobación', ok: false, texto: (e && e.message) || 'Ha fallado.' }]; }
    boton.disabled = false;
    caja.innerHTML = pasos.map(s =>
      `<div>${s.ok ? '✓' : '✘'} <strong>${esc(s.que)}</strong> — ${esc(s.texto)}</div>`).join('');
  });
}

/* ══════════ COPIA DE SEGURIDAD ══════════ */
/* Estado de la configuración compartida, en lenguaje de docente */
function textoConfigEquipo() {
  const e = sharedConfigState || { estado: 'sin-nube' };
  const cuando = t => t ? new Date(t).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const quien = (e.paquete && e.paquete.by) || ATLAS_CONFIG_META.by;
  switch (e.estado) {
    case 'adoptada':
      return { tono: 'ok', texto: `Se han recogido los ajustes publicados${quien ? ' por ' + quien : ''} el ${cuando(e.paquete.updated_at)}.` };
    case 'al-dia':
      return { tono: 'ok', texto: `Esta tablet ya tiene los últimos ajustes del equipo (${cuando(ATLAS_CONFIG_META.sharedAt)}).` };
    case 'conflicto':
      return { tono: 'aviso', texto: `Hay ajustes del equipo más nuevos (${cuando(e.paquete.updated_at)}${quien ? ', de ' + quien : ''}), pero aquí también se ha cambiado algo después. No se ha tocado nada: elige tú.` };
    case 'sin-publicar':
      return { tono: 'nota', texto: 'Todavía no ha publicado nadie. Publica tú los primeros.' };
    case 'sin-permiso':
      return { tono: 'aviso', texto: 'Tu cuenta no puede leer la configuración de clase. Hace falta estar en el equipo de docentes de Appwrite.' };
    case 'ilegible':
      return { tono: 'aviso', texto: 'Lo publicado no se entiende. Publica de nuevo desde una tablet con los ajustes buenos.' };
    case 'sin-nube':
      return { tono: 'nota', texto: 'No hay colección de configuración compartida: cada tablet lleva sus propios ajustes.' };
    default:
      return { tono: 'aviso', texto: 'No se ha podido consultar la configuración de clase' + (e.detail ? ': ' + e.detail : '.') };
  }
}

/* Aviso de copia pendiente: solo aparece si de verdad hay algo que perder */
function avisoCopia() {
  const p = typeof copiaPendiente === 'function' ? copiaPendiente() : null;
  if (!p) {
    const d = typeof diasSinCopia === 'function' ? diasSinCopia() : null;
    return d === null ? '' :
      `<p class="cfg-equipo cfg-equipo-ok">Última copia: ${d === 0 ? 'hoy' : 'hace ' + d + ' día(s)'}.</p>`;
  }
  return `<p class="cfg-equipo cfg-equipo-aviso">⚠️ ${p.motivo === 'nunca'
    ? `Nunca has hecho una copia y ya hay <strong>${p.diarios === 1 ? 'un diario' : p.diarios + ' diarios'}</strong> guardado${p.diarios === 1 ? '' : 's'} solo aquí.`
    : `Hace <strong>${p.dias} días</strong> de la última copia, y hay ${p.diarios === 1 ? 'un diario' : p.diarios + ' diarios'} guardado${p.diarios === 1 ? '' : 's'} solo aquí.`}</p>`;
}

function cfgCopia(body) {
  const est = textoConfigEquipo();
  const nDiarios = (typeof allDiaries === 'function' ? allDiaries() : []).length;
  const hayEquipo = typeof sharedConfigOn === 'function' && sharedConfigOn();
  body.innerHTML = `
    <h4 class="cfg-h4">🏫 Ajustes de todo el equipo docente</h4>
    <p class="cfg-intro">Un colegio no configura veinte tablets a mano. Publica tus ajustes
    y las demás los recogen solas al abrir. Los alumnos solo los leen; publicar lo hace
    quien esté en el equipo de docentes.</p>
    <p class="cfg-hint">No se publican nunca: las <strong>contraseñas del alumnado</strong>,
    el <strong>PIN del panel</strong> ni los <strong>datos de Appwrite</strong>. Como el
    documento lo pueden leer todos los alumnos, esas tres cosas se quedan en cada tablet.</p>
    <p class="cfg-equipo cfg-equipo-${est.tono}">${esc(est.texto)}</p>
    ${hayEquipo ? `<div class="cfg-equipo-botones">
      <button class="btn btn-secondary btn-small" id="cfg-pub">📤 Publicar mis ajustes para la clase</button>
      <button class="btn btn-secondary btn-small" id="cfg-pull">📥 Traer los del equipo</button>
    </div>
    <p class="cfg-hint">«Traer los del equipo» sustituye los ajustes de esta tablet por los publicados.
    El progreso de los alumnos no se toca nunca.</p>` : ''}
    <p id="cfg-pub-msg" class="cfg-warn${cfgNotice ? '' : ' hidden'}">${cfgNotice}</p>

    <h4 class="cfg-h4">💾 Copia de seguridad de la clase</h4>
    <p class="cfg-intro">Los diarios de tu clase viven <strong>en este equipo</strong>. Si el centro
    borra el perfil al cerrar sesión, o alguien limpia los datos de navegación, se pierden y no hay
    de dónde recuperarlos. La copia se lleva <strong>los diarios y los ajustes</strong>: guárdala en
    tu unidad de siempre de vez en cuando.</p>
    ${avisoCopia()}
    <p class="cfg-hint">La copia contiene <strong>${nDiarios === 1 ? 'un diario' : nDiarios + ' diarios'}</strong>${
      nDiarios ? ` de ${esc(ATLAS_CONFIG.className || 'tu clase')}` : ''}. A diferencia de lo que
      se publica para el equipo, esta se lleva <strong>todo</strong>: los nombres del alumnado y
      sus contraseñas, el PIN de este panel y los datos de conexión de Appwrite. Guárdala donde
      guardarías el cuaderno de notas, y no la mandes por correo sin pensarlo.</p>
    <div class="cfg-equipo-botones">
      <button class="btn btn-primary btn-small" id="cfg-bk-save">💾 Descargar copia</button>
      <button class="btn btn-secondary btn-small" id="cfg-bk-load">📂 Restaurar desde un archivo</button>
      <input type="file" id="cfg-bk-file" accept=".json,application/json" class="hidden">
    </div>
    <p id="cfg-bk-msg" class="cfg-warn hidden"></p>
    <p class="cfg-hint">Restaurar <strong>fusiona los diarios</strong>: de cada alumno se queda la
    versión más reciente, así que recuperar una copia del viernes no borra lo que se hizo el lunes.
    Los <strong>ajustes</strong> de la copia solo se aplican si es más nueva que el último cambio
    hecho aquí; si no, se quedan los de este equipo y se avisa.</p>

    <details class="cfg-detalle">
      <summary>Si la descarga no funciona (algunos visores la bloquean)</summary>
      <p class="cfg-hint">Pulsa para ver el texto de la copia, cópialo y pégalo en un archivo
      <code>.json</code>. Sirve igual para restaurar.</p>
      <button class="btn btn-secondary btn-small" id="cfg-bk-text">📋 Ver y copiar el texto</button>
      <textarea id="cfg-export" rows="6" readonly placeholder="Aquí saldrá el texto de la copia"></textarea>
      <h4 class="cfg-h4">Pegar una copia</h4>
      <textarea id="cfg-import" rows="5" placeholder="Pega aquí el texto de una copia"></textarea>
      <button class="btn btn-secondary btn-small" id="cfg-do-import">📥 Restaurar lo pegado</button>
      <p id="cfg-import-err" class="cfg-warn hidden"></p>
    </details>
    <h4 class="cfg-h4">Volver a empezar</h4>
    <button class="btn btn-quit" id="cfg-reset">♻️ Restaurar todos los valores de fábrica</button>
    <p class="cfg-hint">Esto solo borra tus ajustes. El progreso de los alumnos no se toca.</p>`;

  const pub = $('#cfg-pub');
  if (pub) pub.addEventListener('click', async () => {
    pub.disabled = true;
    const res = await cloudPublishConfig(ATLAS_CONFIG.teacherName);
    pub.disabled = false;
    if (res.ok) {
      sharedConfigState = { estado: 'al-dia' };
      cfgNotice = '';
      renderTeacherConfig();
      toast('Publicado ✓ Las demás tablets lo recogerán al abrir.');
      return;
    }
    cfgNotice = res.reason === 'sin-permiso'
      ? '⚠️ Tu cuenta no puede publicar. En Appwrite, añádete al equipo «docentes» y dale permiso de escritura a la colección de configuración.'
      : res.reason === 'sin-sesion'
        ? '⚠️ Hay que entrar con una cuenta para publicar.'
        : '⚠️ No se ha podido publicar' + (res.detail ? ': ' + res.detail : '.');
    renderTeacherConfig();
  });

  const pull = $('#cfg-pull');
  if (pull) pull.addEventListener('click', async () => {
    const res = await cloudFetchConfig();
    if (!res.ok) {
      cfgNotice = res.reason === 'sin-publicar'
        ? 'Todavía no hay nada publicado por el equipo.'
        : '⚠️ No se ha podido consultar' + (res.detail ? ': ' + res.detail : '.');
      renderTeacherConfig();
      return;
    }
    if (!(await askConfirm('¿Sustituir los ajustes de esta tablet por los publicados por el equipo? El progreso de los alumnos no se toca.', 'Traer'))) return;
    adoptSharedConfig(res.paquete);
    sharedConfigState = { estado: 'adoptada', paquete: res.paquete };
    cfgNotice = '';
    renderTeacherConfig();
    toast('Ajustes del equipo aplicados ✓');
  });

  /* ── Descargar la copia ── */
  $('#cfg-bk-save').addEventListener('click', async () => {
    const boton = $('#cfg-bk-save');
    boton.disabled = true;
    const paquete = exportBackup();
    const r = await guardarArchivo(backupFileName(paquete), JSON.stringify(paquete), 'application/json');
    boton.disabled = false;

    if (r.ok) {
      marcarCopiaHecha();
      renderTeacherConfig();
      const n = backupResumen(paquete).diarios;
      toast(`Copia guardada ✓ ${n === 1 ? 'un diario' : n + ' diarios'}`);
      return;
    }
    /* Cada motivo pide una salida distinta, y ninguna es un código de error */
    cfgBackupMsg({
      cancelado: 'Has cancelado el guardado. La copia no se ha hecho.',
      espera: '⚠️ Hay otra descarga en marcha. Espera un momento y vuelve a intentarlo.',
      'demasiado-grande': '⚠️ La copia es demasiado grande para descargarla aquí. Usa «Ver y copiar el texto», ahí abajo.',
      'no-disponible': '⚠️ Este visor no permite descargar archivos. Usa «Ver y copiar el texto», ahí abajo.'
    }[r.motivo] || '⚠️ No se ha podido guardar la copia.');
  });

  /* ── Restaurar desde archivo ── */
  const file = $('#cfg-bk-file');
  $('#cfg-bk-load').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => { aplicarCopia(lector.result); file.value = ''; };
    lector.onerror = () => { cfgBackupMsg('⚠️ No se ha podido leer ese archivo.'); file.value = ''; };
    lector.readAsText(f);
  });

  /* ── Ver el texto (reserva cuando la descarga está bloqueada) ── */
  $('#cfg-bk-text').addEventListener('click', async () => {
    const texto = JSON.stringify(exportBackup());
    const area = $('#cfg-export');
    area.value = texto;
    try {
      await navigator.clipboard.writeText(texto);
      marcarCopiaHecha();
      toast('Copia en el portapapeles ✓ Pégala en un archivo .json');
    } catch (e) {
      area.select();
      toast('Selecciona el texto y cópialo con el teclado.');
    }
  });

  $('#cfg-do-import').addEventListener('click', () => aplicarCopia($('#cfg-import').value, '#cfg-import-err'));
  $('#cfg-reset').addEventListener('click', async () => {
    if (!(await askConfirm('¿Restaurar todos los valores de fábrica? Se perderán tus ajustes. El progreso de los alumnos NO se toca.', 'Restaurar'))) return;
    resetTeacherConfig();
    renderTeacherConfig();
    toast('Valores de fábrica restaurados ✓');
  });
}

/* ── Aplicar una copia, venga de un archivo o pegada a mano ──
   El aviso sale junto al campo que se ha usado: si alguien pega texto dentro
   del bloque plegable y el error aparece arriba del todo, no lo ve. */
function cfgBackupMsg(texto, destino) {
  const el = $(destino || '#cfg-bk-msg') || $('#cfg-bk-msg');
  if (!el) { toast(texto); return; }
  el.innerHTML = texto;
  el.classList.remove('hidden');
}

async function aplicarCopia(raw, destino) {
  const texto = String(raw || '').trim();
  if (!texto) { cfgBackupMsg('Elige un archivo o pega antes el texto de la copia.', destino); return; }

  let paquete;
  try { paquete = JSON.parse(texto); }
  catch (e) { cfgBackupMsg('⚠️ Ese archivo no se entiende. ¿Es la copia entera, desde la primera llave hasta la última?', destino); return; }

  /* Compatibilidad: las copias antiguas eran solo los ajustes, sin marca */
  if (!esBackupValido(paquete)) {
    if (paquete && typeof paquete === 'object' && !Array.isArray(paquete)) {
      if (!(await askConfirm('Eso parece una copia antigua, solo con los ajustes (sin diarios). ¿Aplicar los ajustes?', 'Aplicar'))) return;
      applyOverlay(migrateOverlay(paquete));
      saveTeacherConfig();
      renderTeacherConfig();
      toast('Ajustes aplicados ✓');
      return;
    }
    cfgBackupMsg('⚠️ Eso no es una copia de Expedición Atlas.', destino);
    return;
  }

  const r = backupResumen(paquete);
  const ok = await askConfirm(
    `Copia del ${r.fecha}${r.clase ? ' · ' + r.clase : ''}${r.docente ? ' · ' + r.docente : ''}.\n` +
    `Contiene ${r.diarios} diario(s)${r.ajustes ? ' y los ajustes' : ''}.\n\n` +
    'Los diarios se fusionan: de cada alumno se queda la versión más reciente y no se borra a nadie. ' +
    'Los ajustes solo entran si la copia es más nueva que el último cambio hecho en este equipo.',
    'Restaurar');
  if (!ok) return;

  const res = importBackup(paquete);
  if (!res.ok) { cfgBackupMsg('⚠️ No se ha podido restaurar esa copia.', destino); return; }
  renderTeacherConfig();
  const queAjustes = { aplicados: ' · ajustes de la copia aplicados',
                       conservados: ' · se conservan los ajustes de este equipo, más nuevos que la copia',
                       'sin-ajustes': '' }[res.ajustes] || '';
  toast(`Restaurado ✓ ${res.nuevos} nuevo(s), ${res.actualizados} actualizado(s), ` +
        `${res.conservados} ya estaban más al día${queAjustes}`, 5000);
}
