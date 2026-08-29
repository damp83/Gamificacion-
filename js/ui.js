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
  /* Se decide en cada navegación, no una vez al arrancar: quien manda cambia a
     mitad de sesión —el docente entra a consultar un cuaderno y sale— y una
     pestaña que se quedara puesta enseñaría al niño lo que no es suyo. */
  $('#tab-dashboard').classList.toggle('hidden', !puedeVerCuadernoDocente());
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

/* ══════════ LECTURA EN VOZ ALTA (DUA) ══════════
   Que en 1.º y 2.º los enunciados vayan al grano fue una buena decisión, pero
   no resuelve lo de fondo: un niño de seis años que todavía descifra no puede
   hacer las matemáticas solo. Si tiene que descodificar «¿Cuántas quedan?»
   antes de restar, la prueba está midiendo su lectura, no su cálculo. Lo
   mismo vale a cualquier edad para quien tenga dislexia.

   Con el botón de escuchar, el reto se oye. No sustituye a leer —el texto
   sigue delante— y no da ninguna ventaja: la respuesta hay que pensarla igual.

   Usa la voz del propio navegador (Web Speech API), así que no manda nada a
   ningún servidor ni necesita conexión. Donde no exista, el botón no aparece
   en vez de aparecer y no hacer nada. */
const VOZ = { disponible: false, voz: null, leyendo: false };

function vozSoportada() {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

function vozInit() {
  if (!vozSoportada()) return false;
  VOZ.disponible = true;
  /* Las voces se cargan tarde en algunos navegadores: se elige la mejor cada
     vez que cambie la lista, no una sola vez al arrancar. */
  const elegir = () => {
    const todas = speechSynthesis.getVoices() || [];
    VOZ.voz = todas.find(v => /^es[-_]ES/i.test(v.lang)) ||
              todas.find(v => /^es/i.test(v.lang)) || null;
  };
  elegir();
  speechSynthesis.addEventListener('voiceschanged', elegir);
  return true;
}

/* Lo que se lee no es lo que se ve: los emoji tienen nombre y leerlos en alto
   («emoji cuadrado amarillo, emoji cuadrado amarillo…») convierte el reto en
   ruido. Se quitan, y las flechas y los puntos medios se vuelven pausas. */
function textoParaVoz(t) {
  return String(t || '')
    /* Las pausas PRIMERO: las flechas están dentro del rango que se limpia
       abajo, y al revés se quedaban en un espacio mudo. «2 → 4 → 6» leído sin
       pausas suena a un número de seis cifras. */
    .replace(/[·→]/g, ', ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function vozParar() {
  if (!VOZ.disponible) return;
  try { speechSynthesis.cancel(); } catch (e) { /* algunos navegadores se quejan */ }
  VOZ.leyendo = false;
}

/* Lee una lista de trozos con una pausa entre ellos: el enunciado primero y
   luego las opciones, que es el orden en que hay que oírlas. */
function vozLeer(trozos) {
  if (!VOZ.disponible) return false;
  vozParar();
  const lista = (Array.isArray(trozos) ? trozos : [trozos])
    .map(textoParaVoz).filter(Boolean);
  if (!lista.length) return false;
  VOZ.leyendo = true;
  lista.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-ES';
    if (VOZ.voz) u.voice = VOZ.voz;
    /* Más despacio de lo normal: es para quien aún no lee con soltura. */
    u.rate = 0.85;
    u.pitch = 1;
    if (i === lista.length - 1) u.onend = () => { VOZ.leyendo = false; };
    try { speechSynthesis.speak(u); } catch (e) { VOZ.leyendo = false; }
  });
  return true;
}

/* ¿Se le ofrece a este alumno? De fábrica, sí en 1.º y 2.º —donde la lectura
   todavía se está construyendo— y a quien lo active. El docente puede
   encenderlo para toda la clase desde el panel. */
function vozActiva() {
  if (!VOZ.disponible) return false;
  const pref = S && S.profile.accessibility ? S.profile.accessibility.read_aloud : undefined;
  if (pref !== undefined) return !!pref;
  if (ATLAS_CONFIG.readAloud === 'todos') return true;
  if (ATLAS_CONFIG.readAloud === 'nunca') return false;
  return S ? bandOf(S.profile.grade) === 1 : false;
}

function aplicarVoz() {
  const btn = $('#btn-voz');
  if (btn) btn.classList.toggle('hidden', !vozActiva());
  const cb = $('#pref-read-aloud');
  if (cb) cb.checked = vozActiva();
  const fila = $('#pref-read-aloud-fila');
  if (fila) fila.classList.toggle('hidden', !VOZ.disponible);
}

/* Lee el reto que hay en pantalla: enunciado y después las cuatro opciones,
   nombradas por su letra para poder decir «la C» en voz alta. */
function leerRetoActual() {
  if (!mission || !mission.current) return;
  const q = mission.current;
  vozLeer([q.question].concat(q.options.map((o, i) => `Opción ${'ABCD'[i]}. ${o}`)));
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
