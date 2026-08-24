/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — config.js
   VALORES DE PARTIDA. El docente los edita desde el Panel de
   Configuración dentro de la app; lo que cambie ahí se guarda
   como una capa encima de estos valores. Este fichero es la
   semilla y el botón de «restaurar todo».
   ═══════════════════════════════════════════════════════════ */

const ATLAS_DEFAULTS = {

  /* ── Appwrite: cuentas y guardado en la nube ── */
  appwrite: {
    endpoint: '',
    projectId: '',
    databaseId: '',
    collectionId: ''
  },

  /* Los alumnos entran con USUARIO, no con email (más fácil a los 8-10
     años). Internamente se convierte en usuario@<este dominio>. */
  usernameDomain: 'expedicion-atlas.app',

  /* PIN del panel del docente. CÁMBIALO desde el propio panel.
     Es una barrera de aula frente a dedos curiosos, no seguridad real:
     el código corre en el navegador. */
  teacherPin: '1234',

  /* Quién dirige la expedición. Aparece en la portada y en la sala de mapas. */
  teacherName: '',
  className: '',

  /* ── Lista de clase ──
     La rellena el docente. Sirve para asignar cuadrillas marcando casillas
     (en vez de escribir nombres, que se prestaba a erratas) y para crear las
     cuentas de golpe. `account` marca las que ya existen en Appwrite. */
  roster: [],   /* [{ name, username, password, account, grade }] */

  /* Curso por defecto de la clase (1 a 6). Se usa al crear diarios nuevos
     y como referencia cuando el docente mira el panel sin alumno. */
  defaultGrade: 4,

  /* ── El curso: tres trimestres ── */
  course: {
    label: 'Curso 2026-2027',
    trimesters: [
      { name: '1er trimestre', start: '2026-09-07', end: '2026-12-22' },
      { name: '2º trimestre',  start: '2027-01-07', end: '2027-03-26' },
      { name: '3er trimestre', start: '2027-04-05', end: '2027-06-22' }
    ]
  },

  /* ── Recompensas que concede el docente ──
     Un solo mecanismo con tres categorías: comportamiento, tarea y
     actividad. Todas dan Doblones, nunca PE: el rango debe seguir
     midiendo solo aprendizaje demostrado (PRD §2.2). Y solo suman:
     retirar puntos rompería el «nada se pierde nunca» (PRD §0.2). */
  behaviors: [
    { id: 'ayudar',     icon: '🤝', name: 'Ayudar a un compañero',                coins: 10, perDay: 3, category: 'comportamiento' },
    { id: 'material',   icon: '🧹', name: 'Cuidar el material y el campamento',   coins: 5,  perDay: 2, category: 'comportamiento' },
    { id: 'atencion',   icon: '🤫', name: 'Trabajo concentrado en la excavación', coins: 5,  perDay: 2, category: 'comportamiento' },
    { id: 'participar', icon: '🙋', name: 'Participar en la asamblea',            coins: 5,  perDay: 3, category: 'comportamiento' },
    { id: 'deberes',    icon: '📚', name: 'Tareas y bitácora al día',             coins: 10, perDay: 1, category: 'tarea' },
    { id: 'lectura',    icon: '📖', name: 'Lectura diaria',                       coins: 10, perDay: 1, category: 'tarea' },
    { id: 'proyecto',   icon: '🔬', name: 'Proyecto de investigación',            coins: 25, perDay: 1, category: 'actividad' },
    { id: 'especial',   icon: '🌟', name: 'Mérito especial del Prof. Ocaña',      coins: 20, perDay: 1, category: 'comportamiento' }
  ],

  /* ── Cuadrillas de Excavación (equipos) ──
     Cooperativas por diseño: suman a una meta común de clase.
     `members` guarda nombres de explorador tal y como los escribe el niño. */
  teams: {
    enabled: true,
    goalLabel: 'La Gran Excavación de Clase',
    goalTarget: 2000,     /* Doblones que aporta la clase entre todas las cuadrillas */
    contributionRate: 0.1, /* fracción de cada Doblón ganado que va a la meta común */
    /* Comparar cuadrillas entre sí. APAGADO por defecto: el PRD prohíbe
       rankings entre niños y canaliza la competición hacia los NPC (§0.2). */
    showComparison: false,
    list: [
      { id: 'cuervos',  name: 'Cuadrilla del Cóndor',  icon: '🦅', members: [] },
      { id: 'jaguares', name: 'Cuadrilla del Jaguar',  icon: '🐆', members: [] },
      { id: 'tortugas', name: 'Cuadrilla de la Tortuga', icon: '🐢', members: [] }
    ]
  },

  /* ── Yacimientos y pozos ──
     Estructura completa y editable: el docente puede crear yacimientos y
     pozos nuevos y escribir los retos de cada estrato. La semilla la aporta
     defaultSites() en content.js. */
  sites: defaultSites(),

  /* ── Economía de las expediciones ── */
  economy: {
    missionQuestions: 6,      /* retos por Expedición */
    bazarQuestions: 4,        /* retos por Encargo del Bazar */
    missionCoinsMin: 20,      /* Doblones por Expedición: mínimo y máximo */
    missionCoinsMax: 40,
    bazarCoinsMin: 10,
    bazarCoinsMax: 15,
    bazarPerDay: 4,           /* tope de Encargos con premio al día */
    firstLoginBonus: 15,      /* primer desembarco del día */
    weeklyStampBonus: 50,     /* sello semanal de bitácora */
    restoreCoins: 5,          /* restaurar un hallazgo (autocorrección) */
    restoresPerDay: 5,
    hintCost: 10,             /* pista extra de Kira */
    /* La fatiga se mide en MINUTOS de excavación, no en número de misiones.
       Contar misiones era mal indicador: su duración depende de cuántos retos
       ponga el docente, así que el mismo umbral significaba cosas distintas en
       cada aula. Con 25 min, una sesión completa de las que recomienda el PRD
       (10-20) nunca se penaliza, pero atracarse dos horas seguidas sí. */
    fatigueMinutes: 25,       /* minutos de excavación diarios antes de bajar el PE */
    fatigueThreshold: 10,     /* respaldo por nº de misiones, por si no hay minutos */
    startingCoins: 25         /* bolsa inicial de la Sociedad */
  },

  /* ── Almacén: todo cosmético, nunca ventaja pedagógica ── */
  shop: [
    { id: 'sombrero_ala_ancha', name: 'Sombrero de ala ancha', icon: '👒', cost: 80,  type: 'gear' },
    { id: 'salacot',            name: 'Salacot de explorador', icon: '⛑️', cost: 120, type: 'gear' },
    { id: 'chaqueta_kaldros',   name: 'Chaqueta de Kaldros',   icon: '🧥', cost: 150, type: 'gear' },
    { id: 'mochila_lona',       name: 'Mochila de lona',       icon: '🎒', cost: 100, type: 'gear' },
    { id: 'botas_barro',        name: 'Botas todoterreno',     icon: '🥾', cost: 90,  type: 'gear' },
    { id: 'linterna_laton',     name: 'Linterna de latón',     icon: '🔦', cost: 60,  type: 'gear' },
    { id: 'cantimplora',        name: 'Cantimplora grabada',   icon: '🫙', cost: 50,  type: 'gear' },
    { id: 'catalejo',           name: 'Catalejo dorado',       icon: '🔭', cost: 200, type: 'gear' },
    { id: 'hoguera_grande',     name: 'Hoguera grande',        icon: '🔥', cost: 150, type: 'camp' },
    { id: 'tienda_rayas',       name: 'Tienda a rayas',        icon: '⛺', cost: 200, type: 'camp' },
    { id: 'jeep_oxidado',       name: 'Jeep de la expedición', icon: '🚙', cost: 400, type: 'camp' },
    { id: 'tendedero_mapas',    name: 'Tendedero de mapas',    icon: '🗺️', cost: 120, type: 'camp' },
    { id: 'golosina_tobias',    name: 'Golosina para Tobías',  icon: '🦴', cost: 30,  type: 'treat' }
  ]
};

/* ── Capa de ajustes del docente ──
   ATLAS_CONFIG es lo que lee toda la app: los valores por defecto con
   encima lo que el docente haya cambiado desde el panel. */
const TEACHER_CONFIG_KEY = 'atlas_teacher_config_v1';

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

/* Fusión profunda; los arrays se sustituyen enteros (una lista editada
   por el docente es la lista definitiva, no una mezcla con la de fábrica). */
function deepMerge(base, over) {
  if (Array.isArray(over)) return deepClone(over);
  if (over === null || typeof over !== 'object') return over === undefined ? base : over;
  const out = deepClone(base && typeof base === 'object' ? base : {});
  for (const k of Object.keys(over)) {
    out[k] = deepMerge(out[k], over[k]);
  }
  return out;
}

let ATLAS_OVERLAY = {};
let ATLAS_CONFIG = deepClone(ATLAS_DEFAULTS);

function applyOverlay(overlay) {
  ATLAS_OVERLAY = overlay && typeof overlay === 'object' ? overlay : {};
  ATLAS_CONFIG = deepMerge(ATLAS_DEFAULTS, ATLAS_OVERLAY);
  return ATLAS_CONFIG;
}
/* Ajustes guardados por versiones anteriores: branchOverrides era un mapa
   suelto de {pozoId: {name, desc, enabled}}; ahora todo vive dentro de sites. */
function migrateOverlay(o) {
  if (!o || typeof o !== 'object') return {};
  if (o.branchOverrides && typeof o.branchOverrides === 'object') {
    const sites = o.sites ? deepClone(o.sites) : defaultSites();
    for (const site of sites) {
      for (const b of (site.branches || [])) {
        const ov = o.branchOverrides[b.id];
        if (!ov) continue;
        if (ov.name) b.name = ov.name;
        if (ov.desc) b.desc = ov.desc;
        if (typeof ov.enabled === 'boolean') b.enabled = ov.enabled;
      }
    }
    o.sites = sites;
    delete o.branchOverrides;
  }
  return o;
}

function loadTeacherConfig() {
  try {
    const raw = localStorage.getItem(TEACHER_CONFIG_KEY);
    applyOverlay(migrateOverlay(raw ? JSON.parse(raw) : {}));
  } catch (e) { applyOverlay({}); }
  return ATLAS_CONFIG;
}
function saveTeacherConfig() {
  try { localStorage.setItem(TEACHER_CONFIG_KEY, JSON.stringify(ATLAS_OVERLAY)); }
  catch (e) { /* almacenamiento no disponible */ }
  if (typeof cloudPushConfig === 'function') cloudPushConfig();
}
/* Guarda un cambio del panel: se anota en la capa y se recalcula la config */
function setTeacherConfig(path, value) {
  const keys = path.split('.');
  let node = ATLAS_OVERLAY;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
  applyOverlay(ATLAS_OVERLAY);
  saveTeacherConfig();
}
function resetTeacherConfig() {
  ATLAS_OVERLAY = {};
  applyOverlay({});
  saveTeacherConfig();
}
