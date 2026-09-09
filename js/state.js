/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — state.js
   Estado del jugador (esquema user_state del PRD §5, adaptado
   al MVP), persistencia en localStorage y reglas de economía.
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'atlas_user_state_v1';

/* Curva de progresión del PRD §2.6: PE_total(n) = 100 × n^1.55 */
function xpForLevel(n) { return Math.round(100 * Math.pow(n, 1.55)); }
function levelFromXp(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}
function rankForLevel(level) {
  return RANKS.find(r => level >= r.min && level <= r.max) || RANKS[RANKS.length - 1];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
/* Semana ISO (año-semana) para la bitácora semanal */
function isoWeekId(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function defaultStrata() {
  const strata = {};
  STRATA_ORDER.forEach((s, i) => {
    strata[s] = {
      status: i === 0 ? 'available' : 'locked',
      mastery: 0,
      attempts: 0,
      recent_sessions: [],
      ever_mastered: false,
      last_practiced: null
    };
  });
  return strata;
}

/* Un cubo de estadísticas por trimestre: lo que el curso va acumulando */
function defaultCourse() {
  return { trimesters: [0, 1, 2].map(() => ({ pe: 0, doubloons: 0, strata: 0, stamps: 0, merits: 0 })) };
}

/* ¿A qué trimestre pertenece una fecha? Antes del curso → 1º; verano → 3º;
   los descansos entre trimestres cuentan para el trimestre que empieza. */
function trimesterIndexFor(dateStr) {
  const ts = ATLAS_CONFIG.course.trimesters;
  for (let i = 0; i < ts.length; i++) if (dateStr <= ts[i].end) return i;
  return ts.length - 1;
}
function currentTrimesterIndex() { return trimesterIndexFor(todayStr()); }
function trimesterBucket() { return S.course.trimesters[currentTrimesterIndex()]; }

/* Estados guardados por versiones anteriores: completar lo que les falte */
/* Los bloques de primer nivel de un diario. Se enumeran aquí porque hay que
   poder rellenar el que falte sin repetir la lista en cada comprobación. */
const BLOQUES_DIARIO = ['profile', 'progression', 'daily', 'metrics', 'inventory',
                        'logbook', 'adaptive', 'dig_sites', 'course'];

function migrateState(s) {
  if (!s || typeof s !== 'object') return s;

  /* ── Un diario puede llegar a medias ──
     De una copia hecha con otra versión, de un fichero que alguien tocó a
     mano, de una escritura que se cortó. Antes se daba por hecho que estaban
     todos los bloques, y la primera línea que tocara uno que faltase lanzaba
     —«Cannot read properties of undefined»—. Lo peor no era el fallo: era
     DÓNDE saltaba. La restauración decía «1 diario restaurado ✓» y quien
     reventaba después era el niño al abrir el suyo, mientras la vista de
     clase lo descartaba en silencio y parecía que no existía.

     Se rellena lo que falte desde el estado de fábrica. Un diario incompleto
     vale infinitamente más que ninguno: se conserva lo que traiga y el resto
     empieza de cero, que es lo que el niño vería de todas formas. */
  const base = defaultState((s.profile && s.profile.explorer_name) || 'Explorador');
  for (const bloque of BLOQUES_DIARIO) {
    const suyo = s[bloque];
    if (!suyo || typeof suyo !== 'object' || Array.isArray(suyo)) { s[bloque] = base[bloque]; continue; }
    for (const k in base[bloque]) if (suyo[k] === undefined) suyo[k] = base[bloque][k];
  }
  if (!Array.isArray(s.creations)) s.creations = [];

  /* Los diarios anteriores al diagnóstico por concepto no traen el mapa; se
     crea vacío y se va llenando desde la siguiente respuesta. No se intenta
     reconstruirlo del histórico: no hay de dónde, porque antes no se guardaba
     qué concepto trabajaba cada reto. */
  if (!s.metrics.errors_by_concept) s.metrics.errors_by_concept = {};
  if (!s.course || !Array.isArray(s.course.trimesters) || s.course.trimesters.length !== 3) {
    s.course = defaultCourse();
  }
  if (!Array.isArray(s.behavior_log)) s.behavior_log = [];
  if (typeof s.progression.team_contribution !== 'number') s.progression.team_contribution = 0;
  if (typeof s.progression.fund_donated !== 'number') s.progression.fund_donated = 0;
  /* diarios de antes de que existieran los cursos: se les asigna el que
     tenía la plataforma entonces, para no cambiarles el contenido de golpe */
  if (!s.profile.grade) s.profile.grade = DEFAULT_GRADE;
  if (!s.profile.accessibility) s.profile.accessibility = {};
  if (!Array.isArray(s.creations)) s.creations = [];
  if (!s.updated_at) s.updated_at = Date.now();
  for (const siteId in s.dig_sites) {
    for (const bId in s.dig_sites[siteId]) {
      const strata = s.dig_sites[siteId][bId].strata;
      for (const k in strata) {
        const st = strata[k];
        if (!Array.isArray(st.recent_sessions)) st.recent_sessions = [];
        if (typeof st.ever_mastered !== 'boolean') st.ever_mastered = st.mastery >= 0.8;
      }
    }
  }
  s.schema_version = 2;
  return s;
}

function defaultState(name) {
  const digSites = {};
  for (const site of sitesAll()) {
    digSites[site.id] = {};
    for (const b of branchesOf(site)) digSites[site.id][b.id] = { strata: defaultStrata() };
  }
  return {
    schema_version: 2,
    updated_at: Date.now(),
    profile: {
      explorer_name: name,
      grade: DEFAULT_GRADE,      /* 1.º a 6.º: decide qué contenido ve */
      created_at: todayStr(),
      /* large_text se deja sin definir a propósito: mientras nadie lo toque,
         manda el curso (grande en 1.º y 2.º). Fijarlo aquí en false anulaba
         esa regla y los pequeños veían la letra normal. */
      accessibility: { reduced_motion: false }
    },
    /* ── Taller de Cartografía (Bloom 5-6) ──
       Los retos que el niño escribe para sus compañeros. Viven en su diario
       hasta que el docente los aprueba; solo entonces entran en el banco que
       juega la clase. Esa revisión no es burocracia: es lo que impide que un
       texto escrito por un niño llegue a los demás sin que nadie lo haya
       leído. */
    creations: [],
    progression: {
      xp_total: 0,
      doubloons_balance: ATLAS_CONFIG.economy.startingCoins,
      atlas_fragments_recovered: 0,
      team_contribution: 0,  /* lo aportado a la meta común de la cuadrilla */
      fund_donated: 0        /* lo donado al Fondo de la Sociedad */
    },
    logbook: {
      week_id: isoWeekId(new Date()),
      active_days_this_week: [],
      current_weeks: 0,        /* racha de semanas consecutivas */
      stamps_lifetime: 0,      /* sellos: nunca se borran */
      history: [],             /* [{week_id, stamped, protected}] */
      free_rope_used_this_week: false,
      rescue_ropes: 0          /* cuerdas extra compradas (máx. 2) */
    },
    dig_sites: digSites,
    course: defaultCourse(),
    behavior_log: [],   /* [{id, date, ts}] méritos concedidos por el docente */
    adaptive: {
      tier: 2,                 /* dificultad 1–5 */
      last10: [],              /* aciertos/fallos del primer intento */
      response_times: []       /* últimos tiempos de respuesta (ms) */
    },
    inventory: {
      gear_owned: [],
      gear_equipped: [],
      camp_items: [],
      treats_given: 0
    },
    metrics: {
      first_try_total: 0,
      first_try_correct: 0,
      errors_by_skill: {},     /* "branch.stratum" → {errors, attempts} */
      /* Y el mismo dato por CONCEPTO —«resta llevando», «B y V»—, que es lo
         único con lo que un docente puede preparar la clase de mañana.
         errors_by_skill se queda porque alimenta la tasa global de error y
         porque los diarios que ya existen la tienen; este es el que se mira
         para enseñar. */
      errors_by_concept: {},   /* concepto → {errors, attempts} */
      self_corrections: 0,     /* hallazgos restaurados */
      hints_used: 0,
      questions_answered: 0,
      sessions_log: []         /* [{date, missions, minutes}] últimos 30 días */
    },
    daily: {
      date: todayStr(),
      first_login_bonus_given: false,
      missions_today: 0,
      bazar_today: 0,
      restores_today: 0,
      hints_today: 0,
      doubloons_earned_today: 0
    }
  };
}

/* ── Resumen precalculado ──
   La vista de clase necesitaba descargar el diario entero de cada alumno
   (23 KB) para pintar una ficha de doce cifras: 9,2 MB para 400 alumnos. Este
   resumen viaja en su propio campo (<1 KB) y es lo único que esa vista lee. */
function buildSummaryOf(S) {
  if (!S) return null;
  const level = levelFromXp(S.progression.xp_total || 0);
  let total = 0, mastered = 0, masterySum = 0;
  const stuck = [];
  for (const siteId in (S.dig_sites || {})) {
    for (const bId in S.dig_sites[siteId]) {
      const def = typeof branchDef === 'function' ? branchDef(bId) : null;
      const strata = S.dig_sites[siteId][bId].strata || {};
      for (const sId of STRATA_ORDER) {
        const st = strata[sId];
        if (!st) continue;
        if (def && typeof stratumHasContent === 'function' && !stratumHasContent(def, sId)) continue;
        total++; masterySum += st.mastery || 0;
        if ((st.mastery || 0) >= 0.8) mastered++;
        else if (st.status === 'in_progress' && st.last_practiced &&
                 Math.floor((new Date(todayStr()) - new Date(st.last_practiced)) / 86400000) > 7) {
          stuck.push(`${def ? def.name : bId} · ${STRATA_META[sId].label}`);
        }
      }
    }
  }
  const log = (S.metrics && S.metrics.sessions_log) || [];
  const dias = d => log.filter(e => {
    const n = Math.floor((new Date(todayStr()) - new Date(e.date)) / 86400000);
    return n >= d.from && n < d.to;
  });
  const last7 = dias({ from: 0, to: 7 }), prev7 = dias({ from: 7, to: 14 });
  const errs = (S.metrics && S.metrics.errors_by_skill) || {};
  let e = 0, at = 0;
  for (const k in errs) { e += errs[k].errors || 0; at += errs[k].attempts || 0; }
  const arr = (S.adaptive && S.adaptive.last10) || [];
  const rt = (S.adaptive && S.adaptive.response_times) || [];

  return {
    v: 1,
    name: S.profile.explorer_name,
    grade: S.profile.grade || DEFAULT_GRADE,
    level, xp: S.progression.xp_total || 0,
    doubloons: S.progression.doubloons_balance || 0,
    mastered, totalStrata: total,
    avgMastery: total ? +(masterySum / total).toFixed(3) : 0,
    minutes7: last7.reduce((a, x) => a + (x.minutes || 0), 0),
    sessions7: last7.length, sessionsPrev: prev7.length,
    activeDays: ((S.logbook && S.logbook.active_days_this_week) || []).length,
    stamps: (S.logbook && S.logbook.stamps_lifetime) || 0,
    accuracy: arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3) : null,
    errorRate: at ? +(e / at).toFixed(3) : null,
    lowQuality: rt.length >= 8 && rt.filter(t => t < 2000).length / rt.length > 0.6,
    /* Los conceptos flojos viajan como ternas [id, fallos, intentos]: el
       resumen entero tiene que seguir por debajo de 1 KB, porque la vista de
       clase lo lee para TODOS los alumnos del centro de una vez. Seis
       conceptos son de sobra para decidir qué se repasa mañana. */
    conceptos: conceptosFlojosDe(S, 6).map(c => [c.id, c.errors, c.attempts]),
    /* Evaluación: cinco números que permiten calcular por clase el Guardian
       Pass Rate y la divergencia formativo/sumativo del PRD §6. */
    evalu: (() => { const m = metricasEvaluacion(S);
      return [m.camaras, m.superadas, m.intentos,
              m.passRate === null ? null : +m.passRate.toFixed(3),
              m.divergencia === null ? null : +m.divergencia.toFixed(3)]; })(),
    selfCorrections: (S.metrics && S.metrics.self_corrections) || 0,
    merits: (S.behavior_log || []).length,
    teamContribution: Math.round(S.progression.team_contribution || 0),
    fundDonated: S.progression.fund_donated || 0,
    fragments: S.progression.atlas_fragments_recovered || 0,
    stuck: stuck.slice(0, 4),
    /* «Última expedición» es hoy porque este resumen lo escribe el propio
       diario al guardarse, y guardar significa que el niño está jugando. La
       excepción es el diario que crea el panel al dar de alta la cuenta: ese
       no lo ha estrenado nadie y se queda sin fecha del día, para no decirle
       al docente que ha entrado hoy alguien que no ha entrado nunca. */
    lastSeen: (S.daily && S.daily.date) ? todayStr() : null,
    updated_at: Date.now()
  };
}

/* El resumen del diario que está vivo ahora mismo */
function buildSummary() { return buildSummaryOf(S); }

let S = null; /* estado vivo */

/* ══════════ DIARIOS DE TODA LA CLASE EN UN DISPOSITIVO ══════════
   En clase dirigida el alumnado no toca la app: pregunta el docente desde su
   equipo. Ese equipo tiene entonces que guardar el diario de CADA alumno, no
   uno solo. Se guardan todos juntos bajo una clave aparte; `STORAGE_KEY`
   sigue siendo el diario propio del dispositivo (modo alumno de siempre).

   `diarioActivo` dice a quién se está atendiendo ahora mismo:
   · null  → el diario propio del dispositivo (comportamiento de siempre)
   · «ana» → el diario de esa alumna dentro del archivo de la clase */
const DIARIES_KEY = 'atlas_diarios_v1';
let diarioActivo = null;

/* La clave es el nombre normalizado: así casa con la lista de clase aunque
   se escriba con mayúsculas o espacios de más. */
/* ── Quién es quién ──
   La clave de un diario era el nombre, y eso da por hecho que en una clase no
   se repite ninguno. En un colegio con varios cursos sí se repite: dos niñas
   llamadas igual, una en 2.º y otra en 4.º, compartían diario, cuadrilla y
   rol, y lo que hacía una se lo encontraba la otra. Un nombre además se
   corrige —una tilde, un apellido que faltaba— y al corregirlo el diario se
   quedaba huérfano bajo la clave vieja.

   Lo que no se repite ni cambia es el USUARIO con el que entra, que la lista
   de clase genera distinto para cada uno. Así que la clave es su usuario
   cuando se sabe cuál es, y el nombre cuando no —un niño que escribió su
   nombre en una tablet compartida y no está en ninguna lista.

   Admite el nombre suelto o la ficha entera de la lista. Con la ficha acierta
   siempre; con el nombre suelto no puede decidir entre dos que se llaman
   igual, y entonces deja la clave antigua a propósito: es la de quien ya la
   tuviera, y nadie pierde su diario por una ambigüedad. */
function diaryKey(quien) {
  if (quien && typeof quien === 'object') {
    const u = String(quien.username || '').trim().toLowerCase();
    if (u) return 'u:' + u;
    return String(quien.name || '').trim().toLowerCase();
  }
  const nombre = String(quien || '').trim().toLowerCase();
  if (!nombre) return '';
  const iguales = (ATLAS_CONFIG.roster || []).filter(
    r => String(r.name || '').trim().toLowerCase() === nombre);
  return (iguales.length === 1 && iguales[0].username)
    ? 'u:' + String(iguales[0].username).trim().toLowerCase()
    : nombre;
}

/* La clave con la que este alumno tiene diario AHORA MISMO. Cambiar de clave
   no puede hacer desaparecer un diario: si el de su usuario todavía no existe
   pero el de su nombre sí, manda el que existe. Pasa con quien entró antes de
   estar en la lista, y con quien se borró de la lista y volvió. */
function diaryKeyExistente(quien) {
  const map = loadDiaries();
  const k = diaryKey(quien);
  if (map[k]) return k;
  const nombre = String((quien && typeof quien === 'object' ? quien.name : quien) || '')
    .trim().toLowerCase();
  return (nombre && map[nombre]) ? nombre : k;
}

/* ── Mudanza de las claves viejas ──
   Los diarios guardados antes de esto están bajo el nombre. Se mudan a la
   clave del usuario UNA vez, y solo cuando el destino está libre: si ya hay
   algo ahí, se deja todo como está antes que pisar el diario de nadie. */
function migrarClavesDeDiarios() {
  const map = loadDiaries();
  let tocado = false;
  for (const r of (ATLAS_CONFIG.roster || [])) {
    const u = String(r.username || '').trim().toLowerCase();
    const nombre = String(r.name || '').trim().toLowerCase();
    if (!u || !nombre) continue;
    if (map[nombre] && !map['u:' + u]) {
      map['u:' + u] = map[nombre];
      delete map[nombre];
      if (typeof recordarDocId === 'function' && typeof docIdConocido === 'function') {
        const id = docIdConocido(nombre);
        if (id) recordarDocId('u:' + u, id);
      }
      tocado = true;
    }
  }
  if (tocado) saveDiaries(map);
  return tocado;
}

function loadDiaries() {
  try {
    const raw = localStorage.getItem(DIARIES_KEY);
    const o = raw ? JSON.parse(raw) : null;
    return (o && typeof o.diaries === 'object') ? o.diaries : {};
  } catch (e) { return {}; }
}
function saveDiaries(map) {
  try {
    localStorage.setItem(DIARIES_KEY, JSON.stringify({ v: 1, diaries: map }));
    guardadoVaBien();
  }
  catch (e) { guardadoHaFallado(e); }
}

/* ── Cuando el equipo no puede guardar ──
   El `catch` estaba vacío, y eso convertía el fallo más caro en el más
   callado: en clase dirigida —los veintidós diarios en una sola tablet, sin
   nube— cada respuesta que el docente marca parece guardarse, la pantalla
   pasa al siguiente reto, y al cerrar no queda nada. Pasa con el
   almacenamiento lleno y con el modo privado de Safari.

   No se puede arreglar desde aquí, pero sí se puede DECIR, que es lo único
   que separa perder una sesión de perder un trimestre. */
let fallaElGuardado = false;
function guardadoHaFallado(e) {
  if (fallaElGuardado) return;          /* una vez, no en cada respuesta */
  fallaElGuardado = true;
  console.warn('No se puede guardar en este equipo:', (e && e.message) || e);
  /* El aviso no puede tumbar el guardado: se llama desde dentro de saveState,
     y si pintar la barra fallara —una pantalla a medio montar, un arranque a
     medias— el fallo taparía justo lo que venía a contar. */
  try { if (typeof avisarDeGuardadoRoto === 'function') avisarDeGuardadoRoto(); }
  catch (e2) { /* sin barra, pero el diario sigue intentando guardarse */ }
}
function guardadoVaBien() {
  if (!fallaElGuardado) return;
  fallaElGuardado = false;
  try { if (typeof quitarAvisoDeGuardado === 'function') quitarAvisoDeGuardado(); }
  catch (e) { /* la barra se irá al repintar */ }
}
function elGuardadoFalla() { return fallaElGuardado; }
/* Todos los diarios guardados aquí, ya migrados, listos para la vista de clase.

   Un diario que no se puede leer se salta —no se pierden los otros veintiuno
   por uno roto—, pero NO se calla: restarlo de la cuenta sin decir nada es lo
   que hacía que un niño desapareciera de la pantalla y nadie supiera por qué.
   Se apuntan sus claves para que la vista de clase las nombre. */
let diariosIlegibles = [];
function allDiaries() {
  const map = loadDiaries();
  const out = [];
  diariosIlegibles = [];
  for (const k in map) {
    try {
      const st = migrateState(map[k]);
      if (st && st.profile) out.push({ id: 'local:' + k, key: k, name: st.profile.explorer_name, state: st });
      else diariosIlegibles.push(k);
    } catch (e) { diariosIlegibles.push(k); }
  }
  return out;
}
function ilegiblesDeEsteEquipo() { return diariosIlegibles.slice(); }
function diaryExists(quien) { return !!loadDiaries()[diaryKeyExistente(quien)]; }

/* Abre (o crea) el diario de un alumno y lo deja como estado vivo.
   Acepta el nombre suelto o la ficha de la lista; con la ficha distingue a dos
   que se llamen igual, que con el nombre es imposible. */
function openDiary(quien, grade) {
  const nombre = (quien && typeof quien === 'object') ? (quien.name || '') : quien;
  const k = diaryKeyExistente(quien);
  if (!k) return null;
  const map = loadDiaries();
  if (map[k]) {
    S = migrateState(map[k]);
    /* el nombre visible manda el de la lista: si el docente lo corrige, se corrige */
    S.profile.explorer_name = nombre;
  } else {
    S = defaultState(nombre);
    if (grade) S.profile.grade = grade;
    else if (quien && typeof quien === 'object' && quien.grade) S.profile.grade = quien.grade;
  }
  diarioActivo = k;
  saveState();
  return S;
}
/* Reabre por la clave exacta, sin volver a deducirla del nombre. Lo usa quien
   ha tenido que pasearse por varios diarios y necesita dejar abierto el que
   estaba: deducir la clave otra vez podría dar otra si en medio cambió la
   lista. Devuelve null si esa clave ya no tiene diario, y entonces quien
   llama decide, que aquí no hay nada sensato que inventar. */
function openDiaryKey(clave) {
  const k = String(clave || '');
  if (!k) return null;
  const map = loadDiaries();
  if (!map[k]) return null;
  S = migrateState(map[k]);
  diarioActivo = k;
  return S;
}

/* ══════════ CONSULTA: VER EL DIARIO DE UN ALUMNO SIN TOCARLO ══════════
   El docente necesita ver lo que ve el niño —para sentarse cinco minutos con
   él, o para preparar una reunión con su familia—. La maquinaria ya estaba:
   openDiary() carga su diario y todas las pantallas pintan desde ahí.

   Lo que había que resolver es que MIRAR no cambie nada, y ahí hay dos
   trampas que no se ven a simple vista:

   · openDiary() termina en saveState(), así que abrir el cuaderno de un niño
     marcaba su diario como modificado y disparaba una subida a la nube que no
     corresponde a nada.
   · Si además se llamara a rolloverIfNeeded(), como hace el turno de clase
     dirigida, le regalaría los 15 doblones del «primer desembarco del día» a
     alguien que ni ha tocado la tablet.

   La garantía de fondo es esta bandera: mientras esté puesta, saveState() no
   escribe. Aunque algo intente guardar por un camino que no se previó, no
   llega al disco. Las acciones que gastan del bolsillo del niño se bloquean
   además una a una, para que la pantalla no finja que funciona. */
let LECTURA = false;
function enModoLectura() { return LECTURA; }

function abrirDiarioLectura(nombre) {
  const k = diaryKey(nombre);
  if (!k) return null;
  /* loadDiaries() devuelve un JSON.parse recién hecho, así que lo que se toca
     aquí no es el objeto guardado. Aun así, no se guarda. */
  const map = loadDiaries();
  if (!map[k]) return null;
  return abrirEstadoEnLectura(map[k], nombre);
}

/* El mismo modo consulta, pero sobre un diario que NO está en este equipo:
   el que se acaba de traer de la nube. Con el alumnado entrando desde su
   propio dispositivo, este es el único camino que hay. */
function abrirEstadoEnLectura(estado, nombre) {
  const k = diaryKey(nombre);
  if (!k || !estado) return null;
  S = migrateState(estado);
  S.profile.explorer_name = nombre;
  /* Se deja apuntando a su clave aunque no exista aquí: si algún día alguien
     lograra guardar con la bandera puesta, escribiría en el archivo de clase
     bajo el nombre de ese niño y no encima del diario propio del equipo. */
  diarioActivo = k;
  LECTURA = true;
  return S;
}

function cerrarLectura() {
  LECTURA = false;
  return closeDiary();
}

/* Vuelve al diario propio del dispositivo (modo alumno) */
function closeDiary() {
  diarioActivo = null;
  S = null;
  return loadState();
}

/* ══════════ CLASE ACTIVA EN ESTE DISPOSITIVO ══════════
   Con varios docentes, un mismo equipo puede usarse para clases distintas
   (el portátil que se pasa de mano en mano en el seminario). Se recuerda
   cuál está abierta para no mezclar diarios de dos clases. */
const AULA_KEY = 'atlas_aula_activa_v1';
let AULA = { id: '', name: '', pulledAt: 0 };

function loadAula() {
  try {
    const raw = localStorage.getItem(AULA_KEY);
    if (raw) AULA = { id: '', name: '', pulledAt: 0, ...JSON.parse(raw) };
  } catch (e) { /* se queda la vacía */ }
  return AULA;
}
function saveAula() {
  try { localStorage.setItem(AULA_KEY, JSON.stringify(AULA)); } catch (e) { /* sin sitio */ }
}
function aulaActiva() { return AULA.id || ''; }
function setAulaActiva(id, nombre) {
  AULA = { id: id || '', name: nombre || '', pulledAt: AULA.pulledAt || 0 };
  saveAula();
}
/* Cambiar de clase vacía los diarios locales: son de la clase anterior y
   mezclarlos con los de la nueva sería el peor error posible. */
function cerrarAula() {
  saveDiaries({});
  saveDocIds({});
  AULA = { id: '', name: '', pulledAt: 0 };
  saveAula();
}

/* ── De qué documento vino cada diario ──
   Un diario puede vivir en dos sitios distintos de la misma colección: el que
   crea el equipo del docente en clase dirigida, cuyo id se deriva del nombre,
   y el de un alumno con cuenta propia, cuyo id es el de su cuenta. Sin
   recordar de dónde vino cada uno, devolverlo lo escribía en el id derivado y
   creaba un SEGUNDO documento: el docente le compraba algo a un niño y el niño
   no lo veía nunca, porque su app seguía leyendo el suyo. */
const DOCIDS_KEY = 'atlas_docids_v1';
function loadDocIds() {
  try { return JSON.parse(localStorage.getItem(DOCIDS_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}
function saveDocIds(map) {
  try { localStorage.setItem(DOCIDS_KEY, JSON.stringify(map)); } catch (e) { /* sin almacenamiento */ }
}
function recordarDocId(clave, docId) {
  if (!clave || !docId) return;
  const map = loadDocIds();
  if (map[clave] === docId) return;
  map[clave] = docId;
  saveDocIds(map);
}
function docIdConocido(clave) { return loadDocIds()[clave] || ''; }

/* ══════════ LOS RETOS ESCRITOS, EN CACHÉ ══════════

   La verdad de un reto está en Appwrite, en la tabla `retos`. Aquí solo hay
   una copia para dos cosas que la nube no puede dar:

     · Que un niño juegue SIN CONEXIÓN. El motor lee los retos de memoria, en
       mitad de una misión, y no puede esperar a una petición.
     · Que el panel del docente enseñe la cola al abrirlo, sin pantalla en
       blanco mientras carga.

   Vive en su PROPIA clave de localStorage, no en el overlay de ajustes. Es
   deliberado: si estuvieran en el overlay volverían a viajar dentro del
   campo `config` del aula, que son 200.000 caracteres, y un reto ocupa unos
   718. El techo estaba en 278 retos para toda la clase. */
const RETOS_KEY = 'atlas_retos_v1';

function loadRetosCache() {
  try {
    const c = JSON.parse(localStorage.getItem(RETOS_KEY) || 'null');
    return (c && Array.isArray(c.retos)) ? c : { aula: '', retos: [], at: 0 };
  } catch (e) { return { aula: '', retos: [], at: 0 }; }
}
function saveRetosCache(aula, retos) {
  try { localStorage.setItem(RETOS_KEY, JSON.stringify({ aula: aula || '', retos, at: Date.now() })); }
  catch (e) { /* almacenamiento lleno: se seguirá leyendo de la nube */ }
}
function retosEnCache() { return loadRetosCache().retos; }

/* ── Tocar UNA fila de la caché ──
   Cada acción sobre un reto —aprobar, descartar, corregir una palabra— se
   bajaba la tabla entera detrás. Con diez retos en la cola, aprobarlos uno a
   uno eran diez escrituras y diez descargas completas; y con trescientos en
   el banco, aprobar uno se bajaba los trescientos.

   El dato ya se tiene: si acabo de poner `estado: banco` en una fila y
   Appwrite ha dicho que sí, no hace falta preguntárselo otra vez. */
function actualizarRetoEnCache(docId, campos) {
  const c = loadRetosCache();
  let tocado = false;
  const retos = c.retos.map(r => {
    if (r.$id !== docId) return r;
    tocado = true;
    return Object.assign({}, r, campos);
  });
  if (!tocado) return false;
  saveRetosCache(c.aula, retos);
  if (typeof applyOverlay === 'function') applyOverlay(ATLAS_OVERLAY);  /* recoloca en los pozos */
  return true;
}
function quitarRetoDeCache(docId) {
  const c = loadRetosCache();
  const retos = c.retos.filter(r => r.$id !== docId);
  if (retos.length === c.retos.length) return false;
  saveRetosCache(c.aula, retos);
  if (typeof applyOverlay === 'function') applyOverlay(ATLAS_OVERLAY);
  return true;
}
function añadirRetosACache(docs) {
  const c = loadRetosCache();
  const nuevos = (docs || []).filter(d => d && d.$id && !c.retos.some(r => r.$id === d.$id));
  if (!nuevos.length) return 0;
  saveRetosCache(c.aula, c.retos.concat(nuevos));
  if (typeof applyOverlay === 'function') applyOverlay(ATLAS_OVERLAY);
  return nuevos.length;
}
function retosDeLaCola() { return retosEnCache().filter(r => r.estado === 'cola'); }
function retosDelBanco() { return retosEnCache().filter(r => r.estado === 'banco'); }

/* Mete los retos aprobados en el banco del pozo que les toca, para que el
   motor los sirva igual que a los que escribió el docente a mano.

   Se llama después de CADA recálculo de la configuración, porque recalcular
   la deja como estaba en el overlay y estos no están ahí. */
function mezclarRetosEnSitios() {
  const aprobados = retosDelBanco();
  if (!aprobados.length || !ATLAS_CONFIG || !Array.isArray(ATLAS_CONFIG.sites)) return;

  /* Índice por pozo y estrato, para no recorrer la lista una vez por pozo. */
  const porDestino = {};
  for (const r of aprobados) {
    const k = r.siteId + '/' + r.branchId + '/' + r.estrato;
    (porDestino[k] = porDestino[k] || []).push(retoParaElBanco(r));
  }

  for (const site of ATLAS_CONFIG.sites) {
    for (const b of (site.branches || [])) {
      for (const estrato of Object.keys(porDestino)) {
        const [sid, bid, est] = estrato.split('/');
        if (sid !== site.id || bid !== b.id) continue;
        b.bank = b.bank || {};
        /* Los del docente van DELANTE: si escribió uno a mano para ese
           estrato, es el que quiere que salga primero. */
        b.bank[est] = (b.bank[est] || []).concat(porDestino[estrato]);
      }
    }
  }
}

/* Del documento de Appwrite a la forma que espera el motor. El motor no sabe
   nada de filas ni de estados: lee `question`, `options`, `answer`… */
function retoParaElBanco(r) {
  return {
    question: r.question,
    options: Array.isArray(r.options) ? r.options.slice() : [],
    answer: Number(r.answer) || 0,
    hint1: r.hint1 || '',
    hint2: r.hint2 || '',
    explanation: r.explanation || '',
    skill: r.skill || '',
    origen: r.origen || 'ia',
    /* Se conserva para poder borrarlo desde el panel sin buscarlo. */
    docId: r.$id || r.docId || ''
  };
}

/* ── Fusión al traer de la nube ──
   La misma regla que la copia de seguridad: gana el más reciente. Un docente
   puede haber trabajado en el portátil sin red y traer luego lo del aula. */
function fusionarDiarios(entrantes) {
  const actuales = loadDiaries();
  let nuevos = 0, actualizados = 0, conservados = 0;
  for (const d of entrantes) {
    let estado = null;
    try { estado = JSON.parse(d.state); } catch (e) { continue; }
    if (!estado || !estado.profile) continue;
    const k = diaryKey(estado.profile.explorer_name);
    if (!k) continue;
    /* De dónde vino, para devolverlo al mismo sitio */
    if (d.$id) recordarDocId(k, d.$id);
    const hay = actuales[k];
    if (!hay) { actuales[k] = estado; nuevos++; }
    else if ((estado.updated_at || 0) > (hay.updated_at || 0)) { actuales[k] = estado; actualizados++; }
    else conservados++;
  }
  saveDiaries(actuales);
  return { nuevos, actualizados, conservados, total: Object.keys(actuales).length };
}

/* Diarios que este equipo tiene más nuevos que la nube: los que hay que subir */
function diariosPorSubir(desde) {
  const map = loadDiaries();
  const out = [];
  for (const k in map) {
    if (!desde || (map[k].updated_at || 0) > desde) out.push({ clave: k, estado: map[k] });
  }
  return out;
}

/* ══════════ COPIA DE SEGURIDAD COMPLETA ══════════
   En clase dirigida el curso entero de la clase vive en el localStorage de
   este equipo. Si el centro borra el perfil al cerrar sesión, o alguien
   limpia los datos de navegación, se pierde todo y no hay de dónde tirar.
   Esta copia se lleva lo único que importa: los diarios y los ajustes. */
const BACKUP_MARCA = 'expedicion-atlas-copia';
const BACKUP_VERSION = 1;

/* ── Qué lleva la copia de seguridad ──
   Lleva las contraseñas del alumnado A PROPÓSITO: son las de la hoja de
   credenciales y, si se pierden, no hay forma de recuperarlas —Appwrite
   guarda un resumen, no la contraseña—. Pero eso convierte el fichero en algo
   que no se deja en cualquier sitio, y el panel lo dice al descargarla.

   La clave de la API sí queda fuera (va en NO_SE_COMPARTE): esa se puede
   volver a pegar en un minuto y su fuga cuesta dinero. */
function exportBackup() {
  let propio = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) propio = JSON.parse(raw);
  } catch (e) { /* sin diario propio, o ilegible */ }
  /* La clave de la API se queda fuera. Las contraseñas del alumnado sí van
     —restaurar una copia tiene que devolver la clase entera, y esa es la
     gracia—, pero una clave con saldo es otra cosa: la copia se lleva en un
     pincho y se manda por correo, y ahí una clave viva no puede ir. */
  const ajustes = deepClone(ATLAS_OVERLAY);
  delete ajustes.iaClave;
  return {
    atlas: BACKUP_MARCA,
    v: BACKUP_VERSION,
    fecha: new Date().toISOString(),
    docente: ATLAS_CONFIG.teacherName || '',
    clase: ATLAS_CONFIG.className || '',
    ajustes,
    diarios: loadDiaries(),
    diarioPropio: propio
  };
}

/* Nombre de archivo que se entiende dentro de seis meses en una carpeta
   con veinte copias: clase y fecha, sin espacios ni acentos. */
function backupFileName(paquete) {
  const limpio = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const clase = limpio(paquete.clase) || 'clase';
  return `expedicion-atlas-${clase}-${(paquete.fecha || '').slice(0, 10)}.json`;
}

function backupResumen(paquete) {
  const n = Object.keys(paquete.diarios || {}).length;
  return {
    diarios: n,
    fecha: (paquete.fecha || '').slice(0, 10),
    clase: paquete.clase || '',
    docente: paquete.docente || '',
    ajustes: !!(paquete.ajustes && Object.keys(paquete.ajustes).length)
  };
}

function esBackupValido(o) {
  return !!(o && typeof o === 'object' && o.atlas === BACKUP_MARCA && typeof o.diarios === 'object');
}

/* Restaurar FUSIONA, no sustituye: de cada alumno se queda la versión más
   reciente. Restaurar una copia del viernes un lunes no puede borrar lo que
   se hizo el lunes por la mañana; ese es el desastre clásico. */
function importBackup(paquete) {
  if (!esBackupValido(paquete)) return { ok: false, reason: 'no-es-copia' };

  const actuales = loadDiaries();
  const entrantes = paquete.diarios || {};
  let nuevos = 0, actualizados = 0, conservados = 0;

  for (const k in entrantes) {
    const viene = entrantes[k];
    if (!viene || !viene.profile) continue;
    const hay = actuales[k];
    if (!hay) { actuales[k] = viene; nuevos++; }
    else if ((viene.updated_at || 0) > (hay.updated_at || 0)) { actuales[k] = viene; actualizados++; }
    else conservados++;
  }
  saveDiaries(actuales);

  /* Los ajustes siguen la MISMA regla que los diarios: gana el más reciente.
     Antes se sustituían siempre, aunque el panel prometiera que restaurar
     fusiona, así que recuperar la copia del viernes un lunes deshacía en
     silencio todo lo del lunes: un pozo nuevo, la lista de clase, las
     cuadrillas. La promesa valía solo para los diarios. */
  let ajustes = 'sin-ajustes';
  if (paquete.ajustes && typeof paquete.ajustes === 'object') {
    const fechaCopia = Date.parse(paquete.fecha || '') || 0;
    const tocadoAqui = ATLAS_CONFIG_META.touchedAt || 0;
    if (fechaCopia >= tocadoAqui) {
      applyOverlay(migrateOverlay(deepClone(paquete.ajustes)));
      saveTeacherConfig();
      /* Los ajustes de aquí son ahora los de esa copia, no los de este
         momento: si luego se restaura una copia más vieja, no debe entrar. */
      ATLAS_CONFIG_META.touchedAt = fechaCopia;
      saveConfigMeta();
      ajustes = 'aplicados';
    } else {
      ajustes = 'conservados';
    }
  }
  if (paquete.diarioPropio && paquete.diarioPropio.profile) {
    let propio = null;
    try { propio = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { propio = null; }
    if (!propio || (paquete.diarioPropio.updated_at || 0) > (propio.updated_at || 0)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(paquete.diarioPropio)); } catch (e) { /* sin sitio */ }
    }
  }
  marcarCopiaHecha();
  return { ok: true, nuevos, actualizados, conservados, ajustes, total: Object.keys(actuales).length };
}

/* ── Aviso de copia pendiente ──
   Un docente no se acuerda de hacer copias, y con razón: no es su trabajo.
   Se anota cuándo se hizo la última para poder avisarle. */
function marcarCopiaHecha() {
  ATLAS_CONFIG_META.backupAt = Date.now();
  saveConfigMeta();
}
function diasSinCopia() {
  const t = ATLAS_CONFIG_META.backupAt || 0;
  if (!t) return null;                       /* nunca se ha hecho una */
  return Math.floor((Date.now() - t) / 86400000);
}
/* ¿Hay trabajo que se podría perder? Solo molesta si de verdad hay algo */
function copiaPendiente(diasAviso) {
  const cuantos = Object.keys(loadDiaries()).length;
  if (!cuantos) return null;
  const dias = diasSinCopia();
  if (dias === null) return { motivo: 'nunca', diarios: cuantos };
  if (dias >= (diasAviso === undefined ? 7 : diasAviso)) return { motivo: 'vieja', dias, diarios: cuantos };
  return null;
}

function saveState() {
  if (!S) return;
  /* En consulta no se escribe NADA: ni en este equipo ni en la nube. Es la
     última barrera, la que aguanta aunque alguien añada mañana una pantalla
     que guarde sin acordarse de comprobar el modo. */
  if (LECTURA) return;
  S.updated_at = Date.now(); /* para resolver «¿qué copia es más nueva?» entre dispositivos */
  if (diarioActivo) {
    const map = loadDiaries();
    map[diarioActivo] = S;
    saveDiaries(map);
    /* Si hay una clase abierta en la nube, este diario va a SU documento
       —no al del docente—, con los permisos de la clase. Sin clase abierta
       se queda aquí, como siempre. */
    if (typeof aulaScheduleSave === 'function') aulaScheduleSave(diarioActivo);
    return;
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); guardadoVaBien(); }
  catch (e) { guardadoHaFallado(e); }
  if (typeof cloudScheduleSave === 'function') cloudScheduleSave();
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) S = migrateState(JSON.parse(raw));
  } catch (e) { S = null; }
  return S;
}
/* ── Un diario que todavía no ha estrenado nadie ──
   Lo usa la vista de clase para distinguir «tiene diario» de «ha jugado». El
   panel ya NO crea diarios —Appwrite no deja repartir permisos que uno no
   tiene, así que el diario lo crea el niño al entrar y el panel lo vincula
   después—, pero un diario sin estrenar sigue apareciendo: restaurado de una
   copia, o creado y abandonado.

   Se le quita la fecha del día. `defaultState` la pone a hoy porque da por
   hecho que quien crea el diario es quien va a jugar, y aquí no: dejarla
   haría que la vista de clase dijera «última expedición: hoy» de un niño que
   no ha entrado nunca. Sin fecha, el primer arranque de verdad la pone —y
   cobra su primer desembarco, que es lo correcto. */
function diarioSinEstrenar(name, grade) {
  const st = defaultState(name);
  if (grade) st.profile.grade = grade;
  st.daily.date = '';
  st.updated_at = 0;   /* lo de la nube nunca gana a lo que el niño juegue */
  return st;
}

function createState(name) {
  S = defaultState(name);
  saveState();
  return S;
}

/* ── Rollover diario y semanal: se llama al arrancar la sesión ── */
function rolloverIfNeeded() {
  const today = todayStr();
  const events = { newDay: false, firstLoginBonus: 0, weekStamped: false, weekLost: false, weekProtected: false };

  /* cambio de semana en la bitácora */
  const nowWeek = isoWeekId(new Date());
  if (S.logbook.week_id !== nowWeek) {
    const met = S.logbook.active_days_this_week.length >= 3;
    if (met) {
      S.logbook.stamps_lifetime++;
      S.logbook.current_weeks++;
      trimesterBucket().stamps++;
      S.logbook.history.push({ week_id: S.logbook.week_id, stamped: true, protected: false });
      events.weekStamped = true;
    } else if (S.logbook.active_days_this_week.length > 0 || S.logbook.current_weeks > 0) {
      /* cuerda de rescate: 1 gratis por semana, luego las compradas */
      let saved = false;
      if (!S.logbook.free_rope_used_this_week) { saved = true; }
      else if (S.logbook.rescue_ropes > 0) { S.logbook.rescue_ropes--; saved = true; }
      if (saved) {
        S.logbook.history.push({ week_id: S.logbook.week_id, stamped: false, protected: true });
        events.weekProtected = true; /* la racha no se rompe, pero no hay sello */
      } else {
        S.logbook.history.push({ week_id: S.logbook.week_id, stamped: false, protected: false });
        S.logbook.current_weeks = 0; /* la racha consecutiva se corta; los sellos JAMÁS se borran */
        events.weekLost = true;
      }
    }
    S.logbook.week_id = nowWeek;
    S.logbook.active_days_this_week = [];
    S.logbook.free_rope_used_this_week = false;
  }

  /* cambio de día */
  if (S.daily.date !== today) {
    S.daily = {
      date: today,
      first_login_bonus_given: false,
      missions_today: 0,
      bazar_today: 0,
      restores_today: 0,
      hints_today: 0,
      doubloons_earned_today: 0
    };
    events.newDay = true;
  }

  /* primer desembarco del día: +15 🪙 (PRD §2.4) */
  if (!S.daily.first_login_bonus_given) {
    S.daily.first_login_bonus_given = true;
    const bonus = ATLAS_CONFIG.economy.firstLoginBonus;
    earnDoubloons(bonus);
    events.firstLoginBonus = bonus;
  }

  saveState();
  return events;
}

/* ══════════ TALLER DE CARTOGRAFÍA (Bloom 5-6) ══════════
   El árbol de excavación llega hasta Analizar. Crear es el escalón que
   faltaba, y el PRD lo señala como «el predictor más fuerte de retención a
   largo plazo»: quien tiene que inventar un reto y sus tres distractores se
   obliga a entender por qué las respuestas malas son tentadoras, que es un
   nivel de comprensión distinto al de responder.

   Reglas, y ninguna es adorno:
   · Tope diario, porque si no se convierte en una fábrica de acertijos malos.
   · Los Doblones se ganan al ENVIAR (el esfuerzo es real aunque se devuelva)
     y los PE solo si el docente lo aprueba, que es cuando consta que el reto
     está bien pensado. Los PE siguen midiendo solo aprendizaje demostrado.
   · Devolver un reto no quita nada. Nunca se pierde lo ya ganado (PRD §0.2). */
const TALLER_MAX_DIA = 3;
const TALLER_OPCIONES = 4;

function tallerConfig() { return ATLAS_CONFIG.taller || {}; }
function tallerActivo() { return tallerConfig().enabled !== false; }

function creacionesHoy() {
  const hoy = todayStr();
  return (S.creations || []).filter(c => String(c.createdAt || '').slice(0, 10) === hoy).length;
}

/* Valida lo que ha escrito el niño y lo guarda como pendiente. Devuelve el
   motivo cuando no vale, para poder decírselo con palabras suyas. */
function crearReto(datos) {
  if (LECTURA) return { ok: false, reason: 'lectura' };
  if (!tallerActivo()) return { ok: false, reason: 'cerrado' };
  if (creacionesHoy() >= (tallerConfig().perDay || TALLER_MAX_DIA)) {
    return { ok: false, reason: 'tope' };
  }
  const pregunta = String((datos && datos.question) || '').trim();
  const opciones = ((datos && datos.options) || []).map(o => String(o || '').trim());
  const answer = Number(datos && datos.answer);

  if (pregunta.length < 8) return { ok: false, reason: 'pregunta-corta' };
  if (opciones.length !== TALLER_OPCIONES || opciones.some(o => !o)) {
    return { ok: false, reason: 'faltan-opciones' };
  }
  if (new Set(opciones.map(o => o.toLowerCase())).size !== TALLER_OPCIONES) {
    return { ok: false, reason: 'opciones-repetidas' };
  }
  if (!(answer >= 0 && answer < TALLER_OPCIONES)) return { ok: false, reason: 'sin-correcta' };

  const reto = {
    id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
    question: pregunta.slice(0, 300),
    options: opciones.map(o => o.slice(0, 80)),
    answer,
    explanation: String((datos && datos.explanation) || '').trim().slice(0, 300),
    autor: S.profile.explorer_name,
    createdAt: new Date().toISOString(),
    status: 'pendiente',
    nota: ''
  };
  S.creations.push(reto);
  const monedas = tallerConfig().coinsSend === undefined ? 15 : tallerConfig().coinsSend;
  earnDoubloons(monedas);
  saveState();
  return { ok: true, reto, coins: monedas };
}

/* Lo que el docente tiene por revisar, de todos los diarios de este equipo. */
function creacionesPendientes() {
  const out = [];
  const mete = (estado, clave) => {
    for (const c of (estado.creations || [])) {
      if (c.status === 'pendiente') out.push({ ...c, clave });
    }
  };
  const map = loadDiaries();
  for (const k in map) {
    try { mete(migrateState(map[k]), k); } catch (e) { /* diario ilegible */ }
  }
  if (S && !diarioActivo) mete(S, null);
  return out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

/* Resuelve una revisión. `aprobado` false devuelve el reto con una nota; no
   se borra ni se penaliza, porque volver a intentarlo es parte del taller. */
function resolverCreacion(clave, id, aprobado, nota) {
  const aplicar = estado => {
    const c = (estado.creations || []).find(x => x.id === id);
    if (!c || c.status !== 'pendiente') return null;
    c.status = aprobado ? 'aprobado' : 'devuelto';
    c.nota = String(nota || '').slice(0, 200);
    if (aprobado) {
      const pe = tallerConfig().peApproved === undefined ? 30 : tallerConfig().peApproved;
      const monedas = tallerConfig().coinsApproved === undefined ? 25 : tallerConfig().coinsApproved;
      estado.progression.xp_total += pe;
      estado.progression.doubloons_balance += monedas;
    }
    estado.updated_at = Date.now();
    return c;
  };

  if (clave) {
    const map = loadDiaries();
    if (!map[clave]) return { ok: false, reason: 'sin-diario' };
    const estado = migrateState(map[clave]);
    const c = aplicar(estado);
    if (!c) return { ok: false, reason: 'no-encontrado' };
    map[clave] = estado;
    saveDiaries(map);
    if (typeof aulaScheduleSave === 'function') aulaScheduleSave(clave);
    return { ok: true, reto: c };
  }
  const c = S && aplicar(S);
  if (!c) return { ok: false, reason: 'no-encontrado' };
  saveState();
  return { ok: true, reto: c };
}

/* ── Economía ── */
/* ── Números que entran en la economía ──
   El panel sanea bien lo que se teclea, pero no es la única puerta: restaurar
   una copia, adoptar los ajustes de una clase creada con otra versión o
   importar el fichero de un compañero traen lo que traigan. Y lo que sale de
   ahí no es un número raro que se note, es una bolsa en NaN que se guarda en
   el diario, se sincroniza, y de la que ya no se sale ni ganando ni gastando.

   Así que el saneado va DONDE SE USA. Un ajuste corrupto puede hacer que un
   mérito valga menos de lo que el docente quería; lo que no puede es romper
   la bolsa de un niño. */
function enteroSano(v, porDefecto, min, max) {
  /* null y '' se cuelan como 0 por una rareza de Number(), y en un ajuste eso
     no significa «cero», significa «no está puesto». Un tope de cero apagaría
     el mérito en silencio. */
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max === undefined ? Infinity : max, Math.max(min === undefined ? -Infinity : min, n));
}
function fraccionSana(v, porDefecto) {
  const n = Number(v);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(1, Math.max(0, n));
}

function earnDoubloons(n) {
  /* Ganar nunca puede restar: un mérito con las monedas en negativo sería un
     castigo disfrazado de premio, que es justo lo que el PRD no quiere. */
  const suma = enteroSano(n, 0, 0, 100000);
  if (!suma) return;
  S.progression.doubloons_balance = enteroSano(S.progression.doubloons_balance, 0, 0) + suma;
  S.daily.doubloons_earned_today = enteroSano(S.daily.doubloons_earned_today, 0, 0) + suma;
  const bolsa = trimesterBucket();
  bolsa.doubloons = enteroSano(bolsa.doubloons, 0, 0) + suma;
  /* Una fracción se anota como aportación a la meta común de la cuadrilla.
     NO se descuenta de la bolsa del niño: cooperar no cuesta nada (PRD §0.2). */
  const t = ATLAS_CONFIG.teams;
  if (t && t.enabled && myTeam()) {
    S.progression.team_contribution =
      Math.max(0, Number(S.progression.team_contribution) || 0) + suma * fraccionSana(t.contributionRate, 0);
  }
}

/* ── Fondo de la Sociedad ──
   Donar sale de la bolsa del niño (es un sumidero de verdad), pero jamás toca
   los PE ni el progreso: no se puede «comprar» aprendizaje ni perderlo. */
function donateToFund(amount) {
  if (LECTURA) return { ok: false, reason: 'lectura' };
  const n = enteroSano(Math.floor(Number(amount)), 0, 0, 1000000);
  if (n <= 0) return { ok: false, reason: 'cantidad' };
  if (!spendDoubloons(n)) return { ok: false, reason: 'sin-fondos' };
  S.progression.fund_donated = enteroSano(S.progression.fund_donated, 0, 0) + n;
  saveState();
  return { ok: true, donated: n, total: S.progression.fund_donated };
}
/* Hito alcanzado para un total dado; después del último, tramos infinitos */
function fundMilestoneFor(total) {
  const f = ATLAS_CONFIG.fund || {};
  const ms = f.milestones || [];
  let alcanzados = ms.filter(m => total >= m.at);
  const ultimo = ms.length ? ms[ms.length - 1] : null;
  if (ultimo && total >= ultimo.at && f.endlessStep) {
    const extra = Math.floor((total - ultimo.at) / f.endlessStep);
    for (let i = 1; i <= extra; i++) {
      alcanzados = alcanzados.concat([{
        at: ultimo.at + f.endlessStep * i, icon: '🏺',
        name: f.endlessLabel || 'Otra ruina rescatada',
        desc: 'La Sociedad sigue trabajando gracias a la clase.'
      }]);
    }
  }
  const siguiente = ms.find(m => total < m.at) ||
    (ultimo && f.endlessStep
      ? { at: ultimo.at + f.endlessStep * (Math.floor(Math.max(0, total - ultimo.at) / f.endlessStep) + 1),
          icon: '🏺', name: f.endlessLabel || 'Otra ruina rescatada', desc: '' }
      : null);
  return { alcanzados, siguiente };
}

/* ── Cuadrillas de Excavación ──
   La pertenencia la define el docente por nombre de explorador. */
function myTeam() {
  const t = ATLAS_CONFIG.teams;
  if (!t || !t.enabled || !S) return null;
  const me = (S.profile.explorer_name || '').trim().toLowerCase();
  return t.list.find(team =>
    (team.members || []).some(m => String(m).trim().toLowerCase() === me)) || null;
}
/* La cuadrilla de un nombre cualquiera, no solo la del diario abierto. La usa
   la lista de clase para agrupar. Misma regla de comparación que myTeam():
   sin espacios de más y sin distinguir mayúsculas, porque el docente escribe
   «Ana» en un sitio y «ana» en otro. */
function cuadrillaDe(nombre) {
  const t = ATLAS_CONFIG.teams;
  if (!t || !t.enabled || !Array.isArray(t.list)) return null;
  const quien = nombreDeAlumno(nombre);
  if (!quien) return null;
  return t.list.find(team =>
    (team.members || []).some(m => String(m).trim().toLowerCase() === quien)) || null;
}

/* ── El rol de alguien dentro de su cuadrilla ──
   Se guarda en la propia cuadrilla, con la misma clave en minúsculas que la
   pertenencia: un rol solo significa algo dentro de un equipo, así que si el
   niño se va de la cuadrilla el rol se va con él y no queda colgando en la
   lista de clase. */
function rolDe(nombre, cuadrilla) {
  const cu = cuadrilla || cuadrillaDe(nombre);
  if (!cu) return null;
  return rolPorId((cu.roles || {})[nombreDeAlumno(nombre)]);
}

/* El nombre de un alumno, venga como cadena o como su ficha de la lista, ya en
   la forma con la que se guardan las cuadrillas y los roles. Existe porque
   media app pasa la ficha entera y la otra media solo el nombre: sin esto,
   `cuadrillaDe(ficha)` devolvía null en silencio y el niño perdía su rol. */
function nombreDeAlumno(quien) {
  const t = (quien && typeof quien === 'object') ? (quien.name || '') : quien;
  return String(t || '').trim().toLowerCase();
}

/* Quién lleva un rol en TODA la clase, no dentro de una cuadrilla. Lo usan el
   tope del Intendente y el aviso del panel; devuelve los nombres tal y como
   están escritos en la cuadrilla, que es lo que el docente reconoce. */
function quienLleva(id) {
  const fuera = [];
  for (const t of ((ATLAS_CONFIG.teams || {}).list || [])) {
    const roles = t.roles || {};
    for (const m of (t.members || [])) {
      if (roles[String(m).trim().toLowerCase()] === id) fuera.push(m);
    }
  }
  return fuera;
}

/* ¿Queda sitio para darle este rol a alguien más? Sin tope, siempre. */
function cabeOtroConRol(id, nombre) {
  const tope = topeDeRol(id);
  if (!tope) return true;
  const clave = String(nombre || '').trim().toLowerCase();
  return quienLleva(id).filter(m => String(m).trim().toLowerCase() !== clave).length < tope;
}

/* Rota los roles dentro de cada cuadrilla: el de cada miembro pasa al
   siguiente de la lista, y el del último vuelve al primero. Como el reparto
   solo se mueve DENTRO del equipo, ningún tope se puede romper rotando: los
   mismos roles siguen puestos, en otras manos. */
function rotarRoles(lista) {
  return (lista || []).map(t => {
    const gente = (t.members || []).filter(Boolean);
    if (gente.length < 2) return t;
    const viejos = t.roles || {};
    const nuevos = {};
    gente.forEach((m, i) => {
      const anterior = gente[(i - 1 + gente.length) % gente.length];
      const r = viejos[String(anterior).trim().toLowerCase()];
      if (r) nuevos[String(m).trim().toLowerCase()] = r;
    });
    return Object.assign({}, t, { roles: nuevos });
  });
}

function teamGoalShare() {
  const team = myTeam();
  if (!team) return 0;
  const n = Math.max(1, (team.members || []).length);
  return Math.round((ATLAS_CONFIG.teams.goalTarget || 0) / n);
}
function spendDoubloons(n) {
  /* Con un precio no numérico la comparación era siempre falsa, así que se
     «pagaba» y la bolsa quedaba en NaN. Un precio que no se entiende no se
     cobra: mejor un artículo gratis que una bolsa rota. */
  const precio = enteroSano(n, 0, 0, 1000000);
  const bolsa = enteroSano(S.progression.doubloons_balance, 0, 0);
  if (bolsa < precio) return false;
  S.progression.doubloons_balance = bolsa - precio;
  return true;
}
function earnXp(n) {
  const before = levelFromXp(S.progression.xp_total);
  S.progression.xp_total += n;
  trimesterBucket().pe += n;
  const after = levelFromXp(S.progression.xp_total);
  return { leveledUp: after > before, newLevel: after };
}

/* ── Mastery y desbloqueo de estratos ── */
/* Un pozo creado por el docente después de que el niño empezara no tiene
   hueco en su diario: se le crea al vuelo la primera vez que se toca. */
function ensureBranchState(branchId) {
  const site = siteOfBranch(branchId);
  if (!site) return null;
  if (!S.dig_sites[site.id]) S.dig_sites[site.id] = {};
  if (!S.dig_sites[site.id][branchId]) S.dig_sites[site.id][branchId] = { strata: defaultStrata() };
  return S.dig_sites[site.id][branchId];
}
function branchState(branchId) { return ensureBranchState(branchId); }
function getStratum(branchId, stratumId) {
  const bs = ensureBranchState(branchId);
  if (!bs) return null;
  if (!bs.strata[stratumId]) bs.strata = { ...defaultStrata(), ...bs.strata };
  return bs.strata[stratumId];
}

/* Todos los pozos jugables ahora mismo, de todos los yacimientos activos */
function playableBranchIds(grade) {
  const out = [];
  for (const site of sitesEnabled()) for (const b of branchesEnabledOf(site, grade)) out.push(b.id);
  return out;
}
/* Mastery = precisión media de las últimas MASTERY_WINDOW sesiones del estrato.
   Se exige un mínimo de 2 sesiones para que una sola tanda afortunada no
   desbloquee el estrato siguiente. Una media móvil (y no exponencial) hace
   que la barra se mueva en cada sesión —PRD §2.6— y que un error temprano
   deje de penalizar indefinidamente: lo que cuenta es el rendimiento reciente. */
const MASTERY_WINDOW = 4;
const MASTERY_MIN_SESSIONS = 2;
/* Sesiones seguidas por encima del 0,8 que hacen falta para abrir el estrato
   siguiente. Con una sola, la puerta la abría el azar de cinco retos. */
const ALTAS_PARA_ABRIR = 2;

function updateMastery(branchId, stratumId, sessionAccuracy) {
  const st = getStratum(branchId, stratumId);
  st.attempts++;
  if (!Array.isArray(st.recent_sessions)) st.recent_sessions = [];
  st.recent_sessions.push(sessionAccuracy);
  if (st.recent_sessions.length > MASTERY_WINDOW) st.recent_sessions.shift();

  /* Ponderación lineal: la sesión más reciente pesa más. Quien empieza
     torpe y mejora llega antes, en coherencia con «el error no penaliza». */
  let num = 0, den = 0;
  st.recent_sessions.forEach((acc, i) => { num += acc * (i + 1); den += (i + 1); });
  const mean = num / den;

  /* con una sola sesión la barra avanza pero se muestra a medio camino:
     progreso visible sin dar por dominado lo que aún no se ha confirmado */
  st.mastery = st.recent_sessions.length < MASTERY_MIN_SESSIONS
    ? Math.min(0.75, mean)
    : mean;
  st.last_practiced = todayStr();
  if (st.mastery >= 0.8) st.status = 'mastered';
  else if (st.status !== 'mastered') st.status = 'in_progress';
  if (st.mastery >= 0.8 && !st.ever_mastered) {
    st.ever_mastered = true;
    trimesterBucket().strata++;
  }

  /* ── Confirmar antes de abrir ──
     El desbloqueo es por prerrequisito cognitivo (mastery ≥80 %, PRD §3.1),
     y se abría en el INSTANTE en que la media cruzaba el 0,8. Una sesión son
     cinco retos: un niño con 70 % de competencia real saca cinco de cinco una
     de cada seis veces, y esa casualidad decidía para siempre.

     Medido: machacando el mismo estrato, 59 de cada 100 niños de competencia
     70 % abrían el siguiente, y 43 de ellos terminaban con su propia barra
     diciendo que NO dominan. La app se contradecía a sí misma.

     Así que el 0,8 hay que enseñarlo DOS VECES SEGUIDAS. No es un listón más
     alto —sigue siendo 0,8— ni cierra nada de lo ya abierto: es pedir que la
     medida se repita antes de tomar una decisión permanente, que es lo que
     distingue una demostración de dominio de una racha con suerte. A quien de
     verdad domina no le cuesta nada: de 100 niños con 85 % de acierto, abrían
     99 y siguen abriendo 98. */
  st.altas = st.mastery >= 0.8 ? (Number(st.altas) || 0) + 1 : 0;

  const def = branchDef(branchId);
  const idx = STRATA_ORDER.indexOf(stratumId);
  /* Si el estrato siguiente aún no tiene retos escritos, se abre el primero
     que sí los tenga: un pozo a medio llenar no debe cortar el camino. */
  if (st.altas >= ALTAS_PARA_ABRIR) {
    for (let i = idx + 1; i < STRATA_ORDER.length; i++) {
      if (!stratumHasContent(def, STRATA_ORDER[i])) continue;
      const next = getStratum(branchId, STRATA_ORDER[i]);
      if (next.status === 'locked') next.status = 'available';
      break;
    }
  }
  saveState();
}
/* ── Cámara del Guardián ──
   Estado por pozo. Se crea al vuelo: un pozo nuevo del docente no tiene
   hueco en un diario ya empezado. */
function guardianState(branchId) {
  const bs = ensureBranchState(branchId);
  if (!bs) return null;
  if (!bs.guardian) {
    bs.guardian = { cleared: false, attempts: 0, needsBazar: false, weakStratum: null,
                    clearedAt: null, history: [] };
  }
  /* Las cámaras de diarios anteriores al registro no traen histórico */
  if (!Array.isArray(bs.guardian.history)) bs.guardian.history = [];
  return bs.guardian;
}

/* Estratos que entran en la prueba: los que existen de verdad en el pozo */
/* ── El registro de la evaluación ──
   La Cámara del Guardián es la prueba sumativa, y hasta ahora no dejaba
   rastro: se sabía si estaba superada y poco más. Eso no se puede llevar a un
   boletín ni a una reunión con una familia, y hacía imposibles dos de las
   métricas que pide el PRD §6 —el Guardian Pass Rate y comparar el dominio
   formativo con el sumativo—, que son las que avisan de un árbol inflado.

   Se guardan los últimos intentos con fecha, resultado y el dominio que el
   alumno TENÍA en ese momento: sin eso, la comparación entre lo formativo y
   lo sumativo se hace contra el dominio de hoy, que ya no es el que había. */
const GUARDIAN_HISTORIAL = 10;

function registrarIntentoGuardian(branchId, datos) {
  const est = guardianState(branchId);
  est.history.push({
    date: todayStr(),
    accuracy: +(datos.accuracy || 0).toFixed(3),
    passed: !!datos.passed,
    /* dominio medio de los estratos que entraban en la prueba, en ese momento */
    masteryThen: +(datos.masteryThen || 0).toFixed(3),
    weakStratum: datos.weakStratum || null,
    conceptos: (datos.conceptos || []).slice(0, 5)
  });
  if (est.history.length > GUARDIAN_HISTORIAL) est.history.shift();
  return est.history[est.history.length - 1];
}

/* Todo lo que un docente necesita para hablar de la evaluación de un alumno:
   qué cámaras ha intentado, cuántas veces, cuándo y con qué resultado. */
function historialEvaluacion(estado) {
  const S0 = estado || S;
  const out = [];
  for (const siteId in (S0.dig_sites || {})) {
    for (const bId in S0.dig_sites[siteId]) {
      const g = S0.dig_sites[siteId][bId].guardian;
      if (!g || !Array.isArray(g.history) || !g.history.length) continue;
      const def = typeof branchDef === 'function' ? branchDef(bId) : null;
      out.push({
        branchId: bId,
        name: def ? def.name : bId,
        cleared: !!g.cleared,
        clearedAt: g.clearedAt || null,
        attempts: g.history.length,
        intentos: g.history.slice()
      });
    }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
}

/* Guardian Pass Rate y divergencia formativo/sumativo (PRD §6).
   La divergencia es lo interesante: si el dominio formativo iba muy por
   delante de lo que luego rinde la prueba, el árbol está inflado y la barra
   de dominio está mintiendo. */
function metricasEvaluacion(estado) {
  const hist = historialEvaluacion(estado);
  let intentos = 0, superados = 0, sumaDiv = 0, conDiv = 0;
  for (const c of hist) {
    for (const i of c.intentos) {
      intentos++;
      if (i.passed) superados++;
      if (typeof i.masteryThen === 'number' && i.masteryThen > 0) {
        sumaDiv += i.masteryThen - i.accuracy; conDiv++;
      }
    }
  }
  return {
    camaras: hist.length,
    superadas: hist.filter(c => c.cleared).length,
    intentos,
    passRate: intentos ? superados / intentos : null,
    /* > 0 significa que la barra de dominio prometía más de lo que la prueba
       confirmó. Por debajo de 0.15 es ruido normal. */
    divergencia: conDiv ? sumaDiv / conDiv : null
  };
}

function guardianStrata(branchId) {
  const def = branchDef(branchId);
  if (!def) return [];
  return STRATA_ORDER.filter(sId => stratumHasContent(def, sId));
}

/* La cámara se abre solo con el pozo entero dominado. Es lo que la hace
   sumativa: no se puede entrar a probar suerte a mitad de camino. */
function guardianStatus(branchId) {
  const g = ATLAS_CONFIG.guardian || {};
  const st = guardianState(branchId);
  const strata = guardianStrata(branchId);
  if (!g.enabled || !strata.length) return { estado: 'oculta' };
  if (st.cleared) return { estado: 'superada', fecha: st.clearedAt, intentos: st.attempts };

  const faltan = strata.filter(sId => getStratum(branchId, sId).mastery < 0.8);
  if (faltan.length) return { estado: 'cerrada', faltan, strata };
  if (st.needsBazar) return { estado: 'repaso', weak: st.weakStratum, strata, intentos: st.attempts };
  return { estado: 'abierta', strata, intentos: st.attempts };
}

/* Fragmento recuperado: el único sitio donde crece atlas_fragments_recovered */
function recoverFragment(branchId) {
  const st = guardianState(branchId);
  if (st.cleared) return false;
  st.cleared = true;
  st.clearedAt = todayStr();
  st.needsBazar = false;
  st.weakStratum = null;
  S.progression.atlas_fragments_recovered++;
  saveState();
  return true;
}

/* Fragmentos recuperados, para la bitácora y el mapa */
function fragmentsRecovered() {
  return S.progression.atlas_fragments_recovered || 0;
}
function guardiansPending() {
  return playableBranchIds().filter(id => guardianStatus(id).estado === 'abierta');
}

/* Erosión suave (sand_cover): días sin practicar → necesita repaso */
function sandCover(st) {
  if (!st.last_practiced) return 0;
  const days = Math.floor((new Date(todayStr()) - new Date(st.last_practiced)) / 86400000);
  return Math.min(1, days * 0.06);
}
/* Estrato dominado con más arena → candidato a Encargo del Bazar */
function bestBazarTarget() {
  /* Si una cámara quedó pendiente de repaso, el Encargo apunta justo al
     estrato donde se torció: el repaso deja de ser genérico y pasa a ser
     la remediación de lo que acaba de fallar. */
  for (const branchId of playableBranchIds()) {
    const g = guardianState(branchId);
    if (g && g.needsBazar && g.weakStratum) {
      const st = getStratum(branchId, g.weakStratum);
      return { branchId, stratumId: g.weakStratum, cover: sandCover(st), paraGuardian: true };
    }
  }
  let best = null;
  for (const branchId of playableBranchIds()) {
    for (const sId of STRATA_ORDER) {
      const st = getStratum(branchId, sId);
      if (st.status === 'mastered' || (st.status === 'in_progress' && st.mastery >= 0.5)) {
        const cover = sandCover(st);
        if (!best || cover > best.cover) best = { branchId, stratumId: sId, cover };
      }
    }
  }
  return best;
}

/* % del mapa dibujado = estratos dominados / estratos totales */
function mapRevealPct() {
  let total = 0, mastered = 0;
  for (const branchId of playableBranchIds()) {
    const def = branchDef(branchId);
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(def, sId)) continue;  /* lo que no existe no cuenta */
      total++;
      if (getStratum(branchId, sId).mastery >= 0.8) mastered++;
    }
  }
  return total ? mastered / total : 0;
}

/* ── Motor adaptativo (PRD §4.3) ── */
function recordFirstTry(correct, responseMs) {
  S.adaptive.last10.push(correct ? 1 : 0);
  if (S.adaptive.last10.length > 10) S.adaptive.last10.shift();
  S.adaptive.response_times.push(responseMs);
  if (S.adaptive.response_times.length > 20) S.adaptive.response_times.shift();
  S.metrics.first_try_total++;
  if (correct) S.metrics.first_try_correct++;

  const acc = rollingAccuracy();
  if (S.adaptive.last10.length >= 6) {
    if (acc > 0.85 && S.adaptive.tier < 5) S.adaptive.tier++;
    else if (acc < 0.60 && S.adaptive.tier > 1) S.adaptive.tier--;
  }
  saveState();
}
function rollingAccuracy() {
  const arr = S.adaptive.last10;
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function flowZoneStatus() {
  const acc = rollingAccuracy();
  if (acc === null) return 'sin datos';
  if (acc > 0.85) return 'aburrimiento (subiendo reto)';
  if (acc < 0.60) return 'ansiedad (bajando reto)';
  return 'en el canal de flujo';
}
/* Auditoría silenciosa: respuestas sistemáticas <2 s (PRD §2.7.4) */
function lowQualityFlag() {
  const rt = S.adaptive.response_times;
  if (rt.length < 8) return false;
  const fast = rt.filter(t => t < 2000).length;
  return fast / rt.length > 0.6;
}

/* ── Métricas de aprendizaje ── */
function recordError(branchId, stratumId) {
  const key = `${branchId}.${stratumId}`;
  if (!S.metrics.errors_by_skill[key]) S.metrics.errors_by_skill[key] = { errors: 0, attempts: 0 };
  S.metrics.errors_by_skill[key].errors++;
}
/* Un intento por concepto. Solo se llama en el PRIMER intento de cada reto:
   el segundo llega con la explicación de Kira delante y mediría otra cosa. */
function recordConcepto(skill, acierto) {
  if (!skill) return;
  if (!S.metrics.errors_by_concept) S.metrics.errors_by_concept = {};
  const m = S.metrics.errors_by_concept;
  if (!m[skill]) m[skill] = { errors: 0, attempts: 0 };
  m[skill].attempts++;
  if (!acierto) m[skill].errors++;
}

/* ── Cuándo un concepto se declara flojo ──
   Dos condiciones, y las dos hacen falta:

   · Al menos DOS fallos. Un error suelto no es un patrón, y con el mínimo de
     tres intentos un único fallo daría 33 % y mandaría al docente a repasar
     algo que a lo mejor fue un despiste.
   · Y más de uno de cada tres intentos fallado.

   El umbral estaba en 0,34 y era un error de bulto: «falla una de cada tres»
   da 0,333 exacto y se quedaba JUSTO por debajo. Es el patrón más común de un
   concepto que se atraganta, así que el diagnóstico casi no disparaba: medido
   sobre ocho turnos seguidos fallando un tercio de las respuestas, no marcaba
   ni un concepto. Con 0,30 entra, y el mínimo de dos fallos evita el ruido
   que la bajada podría traer. */
const CONCEPTO_MIN_INTENTOS = 3;
const CONCEPTO_MIN_FALLOS = 2;
const CONCEPTO_UMBRAL = 0.30;

function conceptosFlojosDe(estado, tope) {
  const m = (estado && estado.metrics && estado.metrics.errors_by_concept) || {};
  const out = [];
  for (const id in m) {
    const { errors = 0, attempts = 0 } = m[id] || {};
    if (attempts < CONCEPTO_MIN_INTENTOS || errors < CONCEPTO_MIN_FALLOS) continue;
    const tasa = errors / attempts;
    if (tasa <= CONCEPTO_UMBRAL) continue;
    out.push({ id, errors, attempts, tasa });
  }
  out.sort((a, b) => b.tasa - a.tasa || b.attempts - a.attempts);
  return tope ? out.slice(0, tope) : out;
}
function conceptosFlojos(tope) { return conceptosFlojosDe(S, tope); }

/* Y los que ya le salen. Hace falta para el informe a la familia: decir solo
   lo que falla da una foto injusta, y «domina Numeración · Analizar» no
   significa nada fuera del aula. «Ya le sale comparar números» sí. */
const CONCEPTO_DOMINADO = 0.15;

function conceptosDominadosDe(estado, tope) {
  const m = (estado && estado.metrics && estado.metrics.errors_by_concept) || {};
  const out = [];
  for (const id in m) {
    const { errors = 0, attempts = 0 } = m[id] || {};
    if (attempts < CONCEPTO_MIN_INTENTOS) continue;
    if (errors / attempts > CONCEPTO_DOMINADO) continue;
    out.push({ id, errors, attempts, tasa: errors / attempts });
  }
  out.sort((a, b) => a.tasa - b.tasa || b.attempts - a.attempts);
  return tope ? out.slice(0, tope) : out;
}

function recordAttempt(branchId, stratumId) {
  const key = `${branchId}.${stratumId}`;
  if (!S.metrics.errors_by_skill[key]) S.metrics.errors_by_skill[key] = { errors: 0, attempts: 0 };
  S.metrics.errors_by_skill[key].attempts++;
  S.metrics.questions_answered++;
}
/* Minutos de excavación acumulados hoy: es lo que de verdad cansa a un niño,
   y lo que el cuaderno docente ya venía midiendo. */
function minutesToday() {
  const e = (S.metrics.sessions_log || []).find(x => x.date === todayStr());
  return e ? (e.minutes || 0) : 0;
}
function isFatigued() {
  const eco = ATLAS_CONFIG.economy;
  if (eco.fatigueMinutes) return minutesToday() >= eco.fatigueMinutes;
  return S.daily.missions_today >= eco.fatigueThreshold;   /* respaldo */
}

/* Un día cuenta como activo cuando se ha excavado, no cuando se ha abierto la
   app. Estaba en rolloverIfNeeded(), que corre en cada arranque: abrir la
   plataforma tres días y cerrarla estampaba el sello semanal sin haber
   respondido a nada. El PRD §6 pide justo lo contrario —«la constancia debe
   comprar aprendizaje, no solo sellos»—, así que se marca aquí, que es donde
   se cierra una misión o una Cámara del Guardián de verdad. */
function marcarDiaActivo() {
  const today = todayStr();
  if (!S.logbook.active_days_this_week.includes(today)) {
    S.logbook.active_days_this_week.push(today);
  }
}

function logSessionMission(minutes) {
  const today = todayStr();
  marcarDiaActivo();
  let entry = S.metrics.sessions_log.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, missions: 0, minutes: 0 };
    S.metrics.sessions_log.push(entry);
    if (S.metrics.sessions_log.length > 30) S.metrics.sessions_log.shift();
  }
  entry.missions++;
  entry.minutes += minutes;
}
