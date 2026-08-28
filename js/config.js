/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — config.js
   VALORES DE PARTIDA. El docente los edita desde el Panel de
   Configuración dentro de la app; lo que cambie ahí se guarda
   como una capa encima de estos valores. Este fichero es la
   semilla y el botón de «restaurar todo».
   ═══════════════════════════════════════════════════════════ */

const ATLAS_DEFAULTS = {

  /* ── Appwrite: cuentas y guardado en la nube ──
     Proyecto «Expedición Atlas», región de Fráncfort, base de datos «atlas».
     Nada de esto es un secreto: viaja en el navegador de cada niño y se puede
     leer con ver el código fuente. Lo que protege los diarios NO son estos
     identificadores, son los permisos por documento de Appwrite y la lista de
     plataformas Web autorizadas del proyecto. */
  appwrite: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6a8d7329000303fbfb52',
    databaseId: '6a8d7636003c39f18455',
    /* La colección (en el console nuevo, «tabla») con un documento por
       diario de alumno. */
    collectionId: 'diarios',
    /* Colección aparte para la configuración compartida del equipo docente.
       Vacío = cada tablet con sus propios ajustes, como hasta ahora.
       Con aulasCollectionId puesto no hace falta: los ajustes de cada clase
       viajan dentro del documento de su aula. */
    configCollectionId: '',
    configDocId: 'clase',
    /* ── Aulas (varios docentes, cada uno con sus clases) ──
       Una colección con un documento por clase, cuyo dueño es la cuenta del
       docente. Vacío = una sola clase en este equipo, sin sincronizar. */
    aulasCollectionId: 'aulas'
  },

  /* Los alumnos entran con USUARIO, no con email (más fácil a los 8-10
     años). Internamente se convierte en usuario@<este dominio>. */
  usernameDomain: 'expedicion-atlas.app',

  /* PIN del panel del docente. CÁMBIALO desde el propio panel.
     Es una barrera de aula frente a dedos curiosos, no seguridad real:
     el código corre en el navegador. */
  teacherPin: '1234',

  /* ── Cómo se usa la plataforma en clase (PRD §2.1) ──
     'docente' → clase dirigida: pregunta el docente desde su equipo y el
                 alumnado responde en voz alta. Nadie más entra a la app.
     'alumno'  → cada niño en su dispositivo, con su cuenta.
     'ambos'   → las dos cosas (en clase dirigida, en casa por su cuenta). */
  sessionMode: 'docente',

  /* Quién dirige la expedición. Aparece en la portada y en la sala de mapas. */
  teacherName: '',
  className: '',
  /* Equipo de Appwrite con permiso para leer la clase y publicar la
     configuración compartida. Debe existir con este mismo id. */
  teacherTeam: 'docentes',

  /* ── Lista de clase ──
     La rellena el docente. Sirve para asignar cuadrillas marcando casillas
     (en vez de escribir nombres, que se prestaba a erratas) y para crear las
     cuentas de golpe. `account` marca las que ya existen en Appwrite. */
  roster: [],   /* [{ name, username, password, account, grade }] */

  /* ── Lectura en voz alta (DUA) ──
     'ciclo'  → se ofrece en 1.º y 2.º, donde la lectura aún se construye.
     'todos'  → a toda la clase; útil si hay dislexia en el grupo.
     'nunca'  → a nadie de fábrica.
     Cada alumno puede activarla o quitarla desde su Campamento, y su elección
     manda sobre esto. */
  readAloud: 'ciclo',

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

  /* ── Fondo de la Sociedad Geográfica (PRD §2.5) ──
     Sumidero cooperativo e infinito. Existe porque el almacén se agota en
     3-4 semanas y a partir de ahí los Doblones dejan de significar nada: el
     Fondo les devuelve destino durante todo el curso. Donar es voluntario y
     nunca da ventaja pedagógica; lo que devuelve son hitos para TODA la clase. */
  fund: {
    enabled: true,
    name: 'Fondo de la Sociedad Geográfica',
    blurb: 'La Sociedad restaura ruinas por todo el mundo. Cada Doblón que dones ayuda a salvar una.',
    /* Hitos: al llegar la clase entera, se desbloquea para todos */
    milestones: [
      { at: 500,   icon: '⛺', name: 'Campamento avanzado',      desc: 'La Sociedad monta un campamento en el Valle Fósil.' },
      { at: 1500,  icon: '🌉', name: 'Puente de cuerda',         desc: 'Se repara el puente que cruza el desfiladero.' },
      { at: 3000,  icon: '🏛️', name: 'Excavación del templo',    desc: 'Se abre un templo que llevaba siglos sepultado.' },
      { at: 6000,  icon: '🚢', name: 'Barco de la expedición',   desc: 'La Sociedad arma un barco para llegar a otro continente.' },
      { at: 10000, icon: '🗿', name: 'Ciudad perdida',           desc: '¡La clase entera descubre una ciudad perdida!' }
    ],
    /* Tras el último hito sigue creciendo: cada tramo es una ruina más */
    endlessStep: 5000,
    endlessLabel: 'Otra ruina rescatada',
    /* Total donado por TODA la clase. El docente lo anota desde la vista de
       clase (que sí ve la suma real). Guardarlo aquí es lo que permite que
       cada niño vea el avance común incluso sin conexión. */
    classTotal: 0,
    /* Cantidades que ofrece el botón de donar */
    steps: [5, 10, 25, 50]
  },

  /* ── Taller de Cartografía (PRD §7, fase v2) ──
     El escalón de Bloom que faltaba: crear. Los niños escriben retos para sus
     compañeros y el docente los aprueba antes de que entren en el banco de la
     clase. Esa revisión no es burocracia: es lo único que impide que un texto
     escrito por un niño llegue a los demás sin que nadie lo haya leído. */
  taller: {
    enabled: true,
    perDay: 3,          /* retos que puede enviar un alumno al día */
    coinsSend: 15,      /* al enviarlo: el esfuerzo es real aunque se devuelva */
    coinsApproved: 25,  /* y al aprobarlo */
    peApproved: 30      /* los PE solo al aprobar: siguen midiendo aprendizaje */
  },

  /* ── Cámara del Guardián (PRD §2.3, evaluación sumativa) ──
     Se abre cuando los cuatro estratos de un pozo están dominados. Mezcla
     retos de todos ellos: es la prueba de que lo aprendido aguanta junto y
     no solo estrato a estrato. Fallar no cuesta nada —ni PE, ni dominio, ni
     Doblones— porque una evaluación que castiga deja de medir y empieza a
     asustar. */
  guardian: {
    enabled: true,
    questions: 10,        /* el PRD pide entre 8 y 12 */
    passAccuracy: 0.8,    /* aciertos a la primera para llevarse el fragmento */
    coins: 100,
    peBonus: 60,
    tierBoost: 1          /* un punto de dificultad por encima de lo habitual */
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

/* Claves que nunca se copian de un objeto que viene de fuera. `JSON.parse`
   sí crea `__proto__` como propiedad propia, y asignarla no guarda un valor:
   cambia el prototipo del objeto. Un ajuste publicado por el equipo, o una
   copia de seguridad que alguien pase por correo, podría colar así un
   `teacherPin` que se lee desde ATLAS_CONFIG pero que `delete` no quita
   —porque no es una propiedad propia— y que acabaría republicado por el
   siguiente docente sin que nadie lo viera. */
const CLAVES_PROHIBIDAS = ['__proto__', 'constructor', 'prototype'];

/* Fusión profunda; los arrays se sustituyen enteros (una lista editada
   por el docente es la lista definitiva, no una mezcla con la de fábrica). */
function deepMerge(base, over) {
  if (Array.isArray(over)) return deepClone(over);
  if (over === null || typeof over !== 'object') return over === undefined ? base : over;
  const out = deepClone(base && typeof base === 'object' ? base : {});
  for (const k of Object.keys(over)) {
    if (CLAVES_PROHIBIDAS.includes(k)) continue;
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
}

/* ── Configuración compartida por el equipo docente ──
   Los ajustes viven en esta tablet, pero un colegio no configura veinte
   tablets a mano. El docente publica los suyos y el resto los recoge al
   abrir. Se guardan dos marcas de tiempo para no pisar el trabajo de nadie:
   · touchedAt — cuándo se tocó algo EN ESTA tablet
   · sharedAt  — de qué publicación vienen los ajustes que tiene puestos
   Si la clase publica algo más nuevo y esta tablet no se ha tocado desde
   entonces, se adopta solo. Si las dos han cambiado, no se toca nada y el
   panel lo avisa: decidir por el docente sería peor que preguntarle. */
const CONFIG_META_KEY = 'atlas_config_meta_v1';
let ATLAS_CONFIG_META = { touchedAt: 0, sharedAt: 0, by: '', backupAt: 0 };

function loadConfigMeta() {
  try {
    const raw = localStorage.getItem(CONFIG_META_KEY);
    if (raw) ATLAS_CONFIG_META = { touchedAt: 0, sharedAt: 0, by: '', backupAt: 0, ...JSON.parse(raw) };
  } catch (e) { /* se queda con los valores por defecto */ }
  return ATLAS_CONFIG_META;
}
function saveConfigMeta() {
  try { localStorage.setItem(CONFIG_META_KEY, JSON.stringify(ATLAS_CONFIG_META)); }
  catch (e) { /* almacenamiento no disponible */ }
}
/* ¿Se ha editado algo aquí después de recoger lo del equipo? */
function configEditadaEnLocal() {
  return ATLAS_CONFIG_META.touchedAt > ATLAS_CONFIG_META.sharedAt;
}
/* ── Qué se publica y qué no ──
   El documento compartido lo pueden LEER todos los alumnos (lo necesitan para
   jugar), así que no puede llevar secretos:
   · las contraseñas del alumnado quedarían a la vista de toda la clase;
   · el PIN del panel dejaría de ser siquiera una barrera de aula, porque
     cualquiera podría leerlo desde su propia tablet;
   · los datos de conexión de Appwrite son de cada instalación, y publicarlos
     dejaría sin nube a la tablet que los tuviera puestos a mano. */
const NO_SE_COMPARTE = ['appwrite', 'teacherPin'];

function configParaCompartir() {
  const o = deepClone(ATLAS_OVERLAY);
  for (const k of NO_SE_COMPARTE) delete o[k];
  if (Array.isArray(o.roster)) {
    o.roster = o.roster.map(r => { const c = { ...r }; delete c.password; return c; });
  }
  return o;
}

/* Adopta un paquete publicado por el equipo docente.
   Lo que no se comparte se conserva tal cual estaba en esta tablet: sus datos
   de conexión y su PIN son suyos. Y las contraseñas del alumnado tampoco se
   pierden, porque nunca salieron de aquí. */
function adoptSharedConfig(paquete) {
  if (!paquete || typeof paquete.overlay !== 'object') return false;
  const propio = deepClone(ATLAS_OVERLAY);
  const nuevo = migrateOverlay(deepClone(paquete.overlay));
  for (const k of NO_SE_COMPARTE) {
    if (propio[k] !== undefined) nuevo[k] = propio[k];
  }
  if (Array.isArray(nuevo.roster) && Array.isArray(propio.roster)) {
    const mias = new Map(propio.roster.map(r => [String(r.username || r.name).toLowerCase(), r.password]));
    nuevo.roster = nuevo.roster.map(r => {
      const pw = mias.get(String(r.username || r.name).toLowerCase());
      return pw ? { ...r, password: pw } : r;
    });
  }
  applyOverlay(nuevo);
  saveTeacherConfig();
  ATLAS_CONFIG_META.sharedAt = paquete.updated_at || Date.now();
  ATLAS_CONFIG_META.touchedAt = ATLAS_CONFIG_META.sharedAt;
  ATLAS_CONFIG_META.by = paquete.by || '';
  saveConfigMeta();
  return true;
}
/* Guarda un cambio del panel: se anota en la capa y se recalcula la config */
function setTeacherConfig(path, value) {
  const keys = path.split('.');
  if (keys.some(k => CLAVES_PROHIBIDAS.includes(k))) return;
  let node = ATLAS_OVERLAY;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
  applyOverlay(ATLAS_OVERLAY);
  saveTeacherConfig();
  ATLAS_CONFIG_META.touchedAt = Date.now();
  saveConfigMeta();
}
function resetTeacherConfig() {
  ATLAS_OVERLAY = {};
  applyOverlay({});
  saveTeacherConfig();
  ATLAS_CONFIG_META.touchedAt = Date.now();
  saveConfigMeta();
}
