/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — ui.js
   El chasis de la interfaz: lo que usan todas las pantallas y no es de
   ninguna en concreto. Escapado de texto, iconos, cambio de pantalla,
   diálogo propio, avisos, cabecera y guardado de archivos.

   Va antes que las pantallas al cargar porque es de quien tiran todas,
   aunque en la práctica dé igual: los scripts comparten ámbito y nada de
   esto se ejecuta hasta que arranca app.js.
   ═══════════════════════════════════════════════════════════ */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* Escapa texto escrito por una persona antes de meterlo en innerHTML.
   Lo usan también teacher.js y las plantillas de la vista de clase, y no es
   cosmético: el nombre de explorador y el resumen de cada diario los sube el
   cliente DEL ALUMNO, y la vista de clase los pinta en el navegador del
   docente, con su sesión abierta. Sin escapar, un nombre con una etiqueta
   dentro se ejecutaba ahí. Regla: todo hueco de una plantilla que venga de
   una persona pasa por aquí; los de textContent y toast() no, que ahí el
   navegador ya no interpreta marcado y se vería «&amp;» en pantalla. */
function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Iconos propios ──
   Devuelve un <svg> que apunta al símbolo del sprite de index.html. El icono
   hereda color y tamaño de donde se ponga, así que el mismo pico sirve en
   marrón sobre la tarjeta y en latón sobre la cabecera sin duplicar nada.
   Los emoji que sí sobreviven son los que elige el docente (yacimientos,
   méritos, tienda, cuadrillas): son su contenido, no el mobiliario. */
function ico(nombre, clase) {
  return `<svg class="ico${clase ? ' ' + clase : ''}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;
}

/* Icono de cada estrato de Bloom, dibujado y no emoji. */
const ICO_ESTRATO = { recordar: 'shard', comprender: 'vessel', aplicar: 'scales', analizar: 'lens' };

const SCREENS = ['map', 'branch', 'guardian', 'mission', 'result', 'camp', 'merits', 'team', 'logbook', 'dashboard', 'class', 'config', 'aula', 'aulas'];

function show(screenId) {
  SCREENS.forEach(s => $(`#screen-${s}`).classList.toggle('hidden', s !== screenId));
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.nav === screenId));
  /* En misión los tabs ya estaban bloqueados por código; mostrarlos era
     ofrecer una salida que no existía. Se esconden y queda el reto solo. */
  document.body.classList.toggle('en-mision', screenId === 'mission');
  if (screenId === 'map') renderMap();
  if (screenId === 'camp') renderCamp();
  if (screenId === 'merits') renderMerits();
  if (screenId === 'team') renderTeam();
  if (screenId === 'aula') { renderAula(); syncBackLabels(); }
  if (screenId === 'aulas') { renderAulas(); syncBackLabels(); }
  if (screenId === 'config') { renderTeacherConfig(); syncBackLabels(); }
  if (screenId === 'class') { renderClassView(); syncBackLabels(); }
  if (screenId === 'logbook') renderLogbook();
  if (screenId === 'dashboard') renderDashboard();
  window.scrollTo(0, 0);
}

/* ── Diálogos propios ──
   Los del navegador (prompt/confirm) quedan bloqueados dentro de un iframe
   con sandbox sin `allow-modals`: prompt() devuelve null y confirm() devuelve
   false, así que el panel no se abría y los borrados se cancelaban solos.
   Estos funcionan en cualquier contexto y se usan mejor con el dedo. */
let modalResolve = null;

function closeModal(value) {
  $('#modal').classList.add('hidden');
  document.removeEventListener('keydown', modalKeys);
  const r = modalResolve;
  modalResolve = null;
  if (r) r(value);
}
function modalKeys(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeModal(null); }
  else if (e.key === 'Enter' && !$('#modal-input').classList.contains('hidden')) {
    e.preventDefault();
    $('#modal-ok').click();
  }
}
function openModal({ text, withInput, okLabel, cancelLabel, tipoInput }) {
  return new Promise(resolve => {
    closeModal(null);           /* nunca dos diálogos a la vez */
    modalResolve = resolve;
    $('#modal-text').textContent = text;
    $('#modal-error').classList.add('hidden');
    const input = $('#modal-input');
    input.value = '';
    /* El mismo campo sirve para el PIN y para preguntar un texto. Estaba fijo
       en «password» con teclado numérico, que es lo que quiere el PIN pero
       deja escribir el nombre de una clase a ciegas y con un teclado de
       cifras en tablet. */
    const esPin = tipoInput === 'pin';
    input.type = esPin ? 'password' : 'text';
    input.inputMode = esPin ? 'numeric' : 'text';
    input.classList.toggle('hidden', !withInput);
    $('#modal-ok').textContent = okLabel || 'Aceptar';
    $('#modal-cancel').textContent = cancelLabel || 'Cancelar';
    $('#modal').classList.remove('hidden');
    document.addEventListener('keydown', modalKeys);
    if (withInput) setTimeout(() => input.focus(), 50);
    else setTimeout(() => $('#modal-ok').focus(), 50);
  });
}
/* Sustituye a confirm() */
function askConfirm(text, okLabel) {
  return openModal({ text, okLabel: okLabel || 'Sí, adelante' }).then(v => v === true);
}
/* Sustituye a prompt(): pide un texto y devuelve null si se cancela.
   El valor inicial se pone a mano porque openModal() limpia el campo. */
function askPrompt(text, inicial, okLabel) {
  const p = openModal({ text, withInput: true, okLabel: okLabel || 'Aceptar' });
  const input = $('#modal-input');
  if (input && inicial) { input.value = inicial; input.select(); }
  return p.then(v => (v === null || v === true) ? null : String(v).trim() || null);
}

/* Sustituye a prompt() para el PIN; reintenta hasta acertar o cancelar */
async function askPin(text) {
  while (true) {
    const v = await openModal({ text: text || 'PIN del docente', withInput: true, okLabel: 'Entrar', tipoInput: 'pin' });
    if (v === null) return false;                    /* cancelado */
    if (v === String(ATLAS_CONFIG.teacherPin)) return true;
    /* PIN erróneo: se vuelve a pedir, diciéndolo */
    text = 'PIN incorrecto. Inténtalo de nuevo.';
  }
}

/* ── Selector de curso ──
   Botones grandes con el curso y la edad: a los 6 años «4.º» solo no dice
   nada, y el docente que ayuda necesita ver la edad de un vistazo. */
function renderGradePicker(containerSel, hiddenSel, initial) {
  const cont = $(containerSel);
  if (!cont) return;
  let value = initial || (ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE);
  const paint = () => {
    cont.innerHTML = GRADES.map(g => `
      <button type="button" class="grade-btn${g.n === value ? ' active' : ''}" data-grade="${g.n}">
        <strong>${g.label}</strong><small>${g.age}</small></button>`).join('');
    cont.querySelectorAll('.grade-btn').forEach(b => b.addEventListener('click', () => {
      value = +b.dataset.grade;
      if (hiddenSel && $(hiddenSel)) $(hiddenSel).value = String(value);
      paint();
    }));
  };
  if (hiddenSel && $(hiddenSel)) $(hiddenSel).value = String(value);
  cont.dataset.grade = String(value);
  paint();
  return () => value;
}
let readGrade = () => ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE;
let readGradeReg = () => ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE;

/* Letra grande: obligatoria de fábrica en 1.º y 2.º, donde la lectura aún
   se está construyendo y un texto pequeño convierte el reto en un examen
   de vista. Se puede cambiar desde el campamento. */
function applyTextSize() {
  const band = S ? bandOf(S.profile.grade) : 2;
  const pref = S && S.profile.accessibility ? S.profile.accessibility.large_text : undefined;
  const grande = pref === undefined ? band === 1 : !!pref;
  document.body.classList.toggle('large-text', grande);
  const cb = $('#pref-large-text');
  if (cb) cb.checked = grande;
}

function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), ms || 2600);
}

/* ── HUD ── */
function renderHud() {
  if (!S) return;   /* modo docente: no hay diario de alumno que mostrar */
  const level = levelFromXp(S.progression.xp_total);
  const rank = rankForLevel(level);
  $('#hud-name').textContent = S.profile.explorer_name;
  $('#hud-rank').textContent = rank.name;
  $('#hud-doubloons').textContent = S.progression.doubloons_balance;
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  const pct = Math.min(100, Math.round(((S.progression.xp_total - cur) / (next - cur)) * 100));

  /* El nivel vive dentro de un anillo que se va cerrando con los PE. Se ve de
     lejos, que es lo que hace falta cuando la tablet está en la mesa. */
  const num = $('#hud-level-num');
  const subeNivel = num.textContent !== String(level);
  num.textContent = level;
  const aro = $('#hud-xp-fill');
  const vuelta = 2 * Math.PI * 16.5;
  aro.style.strokeDasharray = vuelta.toFixed(2);
  aro.style.strokeDashoffset = (vuelta * (1 - pct / 100)).toFixed(2);
  const stat = $('#hud-level-stat');
  stat.title = `Nivel ${level} · ${rank.name} · ${S.progression.xp_total} PE (${pct}% hasta el ${level + 1})`;
  /* Al subir de nivel el anillo da un destello: el premio se ve, no solo se suma. */
  if (subeNivel && num.dataset.visto) {
    stat.classList.remove('lvl-up'); void stat.offsetWidth; stat.classList.add('lvl-up');
  }
  num.dataset.visto = '1';
  $('#hud-avatar').textContent = avatarEmoji();
}
function avatarEmoji() {
  if (S.inventory.gear_equipped.includes('salacot')) return '🧑‍🌾';
  if (S.inventory.gear_equipped.includes('sombrero_ala_ancha')) return '🤠';
  return '🧒';
}

/* ── Guardar archivos según dónde se esté ejecutando ──
   En un servidor propio o abierta como archivo, descargar es un enlace y ya.
   Dentro del visor de un Artifact eso no hace nada: la descarga la media el
   propio visor. Se resuelve una vez al arrancar y se usa lo que haya. */
let DESCARGAS = null;
function prepararDescargas() {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('downloads')
        .then(d => { DESCARGAS = d; })
        .catch(() => { DESCARGAS = null; });
    }
  } catch (e) { DESCARGAS = null; }
}

/* Devuelve qué ha pasado para poder decírselo al docente en su idioma */
async function guardarArchivo(nombre, texto, tipo) {
  if (DESCARGAS) {
    try {
      await DESCARGAS.save({ filename: nombre, data: texto });
      return { ok: true };
    } catch (e) {
      const code = (e && e.code) || 'unavailable';
      if (code === 'declined') return { ok: false, motivo: 'cancelado' };
      if (code === 'too_large') return { ok: false, motivo: 'demasiado-grande' };
      if (code === 'rate_limited') return { ok: false, motivo: 'espera' };
      return { ok: false, motivo: 'no-disponible' };
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([texto], { type: tipo || 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'no-disponible' };
  }
}
