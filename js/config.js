/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — config.js
   VALORES DE PARTIDA. El docente los edita desde el Panel de
   Configuración dentro de la app; lo que cambie ahí se guarda
   como una capa encima de estos valores. Este fichero es la
   semilla y el botón de «restaurar todo».
   ═══════════════════════════════════════════════════════════ */

/* Versión de la app publicada. Sirve para una cosa concreta: un docente que ve
   un comportamiento viejo necesita saber si su navegador le está sirviendo una
   copia guardada. Sin este número, «ya está arreglado» y «a mí no me pasa» son
   indistinguibles. Va junto al nombre de la caché del service worker, y una
   prueba comprueba que no se separen. */
const ATLAS_VERSION = 'v89';

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
    aulasCollectionId: 'aulas',
    /* Función que escribe retos con IA. Viene puesta para que ningún docente
       tenga que teclearla: es la misma para todos, porque la función es una
       sola. Como el resto de identificadores de aquí, no es un secreto —
       quien protege la función es su «Execute access: Users», que exige
       sesión, y sobre todo que NO tenga clave de API propia: cada docente
       pone la suya en su panel y se queda en su navegador. Si algún día se
       pusiera una clave del centro en la variable de entorno de la función,
       este identificador dejaría de ser inocuo, porque también viaja a las
       tablets del alumnado y cualquier cuenta con sesión podría gastarla. */
    generadorFunctionId: '6a973fcf0031242dbd3e',
    /* ── Los retos escritos, uno por fila ──
       Estuvieron dentro del campo `config` del aula, con dos problemas: ese
       campo son 200.000 caracteres y un reto ocupa ~718, así que el techo
       estaba en unos 278 en total; y sobre todo, el documento del aula solo
       lo puede leer su docente, así que un reto aprobado NUNCA llegaba a la
       tablet de un niño. Aquí los lee cualquier cuenta con sesión y los
       escribe solo el equipo «docentes». */
    retosCollectionId: '6a9d78a900277f44b6e4'
  },

  /* Los alumnos entran con USUARIO, no con email (más fácil a los 8-10
     años). Internamente se convierte en usuario@<este dominio>. */
  usernameDomain: 'expedicion-atlas.app',

  /* ── Clave de la API para el generador de retos ──
     La pone cada docente en su panel y se queda en SU navegador: no viaja a
     las tablets del alumnado (va en NO_SE_COMPARTE) ni entra en la copia de
     seguridad, que se lleva en un pincho y se manda por correo. Se le pasa a
     la función de Appwrite en cada petición y allí no se guarda.

     Así cada docente paga lo suyo. Si se deja vacía, la función usa la clave
     del centro que tenga en su variable de entorno, si la hay. */
  iaClave: '',

  /* ── El espacio de trabajo de la clave ──
     Las claves que reparte ahora la consola de Anthropic van ligadas a la
     cuenta y no dicen por sí solas dónde actúan: sin esto la API contesta un
     400. Las de toda la vida no lo necesitan y este campo se queda vacío.
     No es un secreto —es un identificador— pero acompaña a la clave, así que
     viaja con ella: se queda en el equipo del docente. */
  iaWorkspace: '',

  /* ── Las notas del docente para las familias ──
     Clave del diario → lista de { fecha, texto }, la más reciente al final.
     Es lo único del informe que no escribe una máquina, y por eso es lo que
     más pesa cuando llega a una casa. Se guarda aquí y no en el diario del
     niño por dos razones: el diario viaja a su tablet, y una nota que el
     docente escribe PARA la familia no tiene por qué leerla el crío antes que
     ella. Nunca sale hacia el alumnado (va en NO_SE_COMPARTE) y sí viaja
     entre los equipos del docente, por su canal privado. */
  notasInforme: {},

  /* Al pegar la clase de golpe, guardar «Vega S.» en vez de «Vega Serrano».
     Lo decide el docente una vez y se recuerda. */
  nombresCortos: false,

  /* ── Criterios de evaluación ──
     El puente entre lo que mide la app y lo que pide el centro. Atlas no pone
     notas a propósito, y eso no cambia: lo que hace esto es reunir la
     evidencia por criterio para que el docente ponga la suya en Séneca, en
     Rayuela o donde sea, sin traducir veinticuatro informes a mano.

     Cada criterio es el que el docente tenga en su programación —su código y
     su texto, tal cual— y las casillas dicen qué conceptos de la app lo
     trabajan. Vive solo en el equipo del docente: al alumnado no le sirve de
     nada y no tiene por qué viajar. */
  criterios: [],

  /* PIN del panel del docente. Este es el que llevan TODAS las tablets: el que
     se cambia desde el panel vale solo para ese equipo, porque el PIN no viaja
     con los ajustes de la clase —los leen los alumnos—. Para cambiarlo en todo
     el despliegue hay que tocarlo aquí y volver a publicar.
     Es una barrera de aula frente a dedos curiosos, no seguridad real: el
     código corre en el navegador de cada niño y quien sepa mirarlo lo lee. */
  teacherPin: '2026',

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
  /* Solo se usa para textos de ayuda: los permisos por documento NO nombran
     al equipo. Appwrite identifica los equipos por su ID —algo como
     6a92c58d001142cf8ba2—, no por esta etiqueta, y darle la etiqueta hace
     que rechace la escritura entera. Quien da permiso al claustro es la
     pestaña Security de cada colección. */
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
  /* Recalcular la config borra los retos que se hubieran inyectado en los
     pozos, porque no están en el overlay. Se vuelven a poner aquí: es el
     único sitio por el que pasa todo recálculo. */
  aplicarRetosDeLaNube();
  return ATLAS_CONFIG;
}
/* Ajustes guardados por versiones anteriores: branchOverrides era un mapa
   suelto de {pozoId: {name, desc, enabled}}; ahora todo vive dentro de sites. */
function migrateOverlay(o) {
  if (!o || typeof o !== 'object') return {};
  /* El currículo se guardaba SOLO por materia: un mismo texto servía para
     1.º y para 6.º. El generador tenía orden de no salirse de él, pero del
     que no tocaba. Ahora va por materia y curso; lo que hubiera pegado antes
     se conserva como «vale para todos los cursos», que es exactamente lo que
     estaba haciendo sin decirlo. */
  if (o.curriculo && typeof o.curriculo === 'object') {
    for (const m of Object.keys(o.curriculo)) {
      if (typeof o.curriculo[m] === 'string') o.curriculo[m] = { todos: o.curriculo[m] };
    }
  }
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
  repararIdsRepetidos(o);
  return o;
}

/* ── Ids repetidos, que eran los mismos ids ──
   Crear una cuadrilla nueva le ponía siempre el id «cuadrilla»; un pozo
   nuevo, «pozo»; un yacimiento, «yacimiento». El id no es una etiqueta: es
   lo que decide de qué pozo es un reto y en qué cuadrilla está un niño, y la
   app resuelve un id devolviendo el PRIMERO que encuentra. Así que la segunda
   cuadrilla nueva era, para todos los efectos, la primera: los alumnos que se
   le marcaban aparecían en la otra, la lista de clase pintaba dos veces el
   mismo grupo, y dos pozos distintos compartían los retos y el progreso.

   Se reparan renombrando el segundo y siguientes. El primero conserva su id,
   y con él lo que ya se hubiera jugado: como los duplicados venían
   compartiéndolo todo, dejar al segundo con identidad propia y vacío es lo
   más cerca de la verdad que se puede llegar. */
let idsReparados = false;
function repararIdsRepetidos(o) {
  if (!o || typeof o !== 'object') return o;
  const unico = (id, tomados, respaldo) => {
    let base = String(id || '').trim() || respaldo;
    if (!tomados.has(base)) { tomados.add(base); return base; }
    idsReparados = true;
    for (let n = 2; n < 500; n++) {
      const cand = `${base}_${n}`;
      if (!tomados.has(cand)) { tomados.add(cand); return cand; }
    }
    const cand = `${base}_${Date.now().toString(36)}`;
    tomados.add(cand); return cand;
  };

  for (const [clave, respaldo] of [['behaviors', 'premio'], ['shop', 'item']]) {
    if (!Array.isArray(o[clave])) continue;
    const vistos = new Set();
    for (const x of o[clave]) if (x) x.id = unico(x.id, vistos, respaldo);
  }
  if (o.teams && Array.isArray(o.teams.list)) {
    const vistos = new Set();
    for (const t of o.teams.list) if (t) t.id = unico(t.id, vistos, 'team');
  }
  if (Array.isArray(o.sites)) {
    const sitios = new Set();
    /* Los pozos se buscan en TODOS los yacimientos, así que su id tiene que
       ser único en la configuración entera y no dentro de su yacimiento. */
    const pozos = new Set();
    for (const s of o.sites) {
      if (!s) continue;
      s.id = unico(s.id, sitios, 'site');
      for (const b of (s.branches || [])) if (b) b.id = unico(b.id, pozos, 'branch');
    }
  }
  return o;
}

function loadTeacherConfig() {
  try {
    const raw = localStorage.getItem(TEACHER_CONFIG_KEY);
    idsReparados = false;
    applyOverlay(migrateOverlay(raw ? JSON.parse(raw) : {}));
    /* Si había ids repetidos, la reparación tiene que quedar guardada Y
       subida: si no, este equipo los vería bien y el de al lado seguiría
       enseñando dos cuadrillas iguales hasta que alguien tocara un ajuste. */
    if (idsReparados) saveTeacherConfig();
  } catch (e) { applyOverlay({}); }
  return ATLAS_CONFIG;
}
/* Mientras se ADOPTAN ajustes que vienen de fuera —los de la clase al
   abrirla— no hay que volver a subirlos: sería devolver el eco. */
let subidaSilenciada = false;
function sinSubir(fn) {
  subidaSilenciada = true;
  try { return fn(); } finally { subidaSilenciada = false; }
}

/* Los retos que vienen de la nube NO están en el overlay —si lo estuvieran,
   volverían a viajar dentro del `config` del aula y volveríamos al techo de
   los 200.000—. Viven en su propia caché y se inyectan en los pozos DESPUÉS
   de cada recálculo, que es lo único que hace falta para que el motor los
   sirva igual que a los de fábrica. */
function aplicarRetosDeLaNube() {
  if (typeof mezclarRetosEnSitios === 'function') mezclarRetosEnSitios();
}

function saveTeacherConfig() {
  try { localStorage.setItem(TEACHER_CONFIG_KEY, JSON.stringify(ATLAS_OVERLAY)); }
  catch (e) { /* almacenamiento no disponible */ }

  /* ── Y arriba, a la clase ──
     Esto vive aquí, en el único sitio por el que pasan TODOS los cambios de
     ajustes, y no en cada botón del panel: así no hay que acordarse de
     llamarlo al añadir la próxima sección.

     Antes no subía nada. Los ajustes se mandaban a la nube al crear la clase
     y al cambiar de una clase a otra, y ya está: con una sola clase, eso
     significa que se subieron el primer día y nunca más. Un banco de retos
     aprobado durante un trimestre vivía entero en el localStorage de un
     iPad, que iOS borra si el sitio no se abre en unos días.

     `programarSubidaAjustes` está en cloud.js, que carga después: se
     comprueba que exista en vez de darlo por hecho. */
  if (subidaSilenciada) return;
  if (typeof programarSubidaAjustes === 'function') programarSubidaAjustes();
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
/* `rosterAt` es la marca de la última lista de clase que este equipo escribió
   o adoptó. Va aparte de `sharedAt` porque la lista ya no viaja con los
   ajustes: tiene su propio documento y su propio reloj. */
let ATLAS_CONFIG_META = { touchedAt: 0, sharedAt: 0, by: '', backupAt: 0, rosterAt: 0 };

function loadConfigMeta() {
  try {
    const raw = localStorage.getItem(CONFIG_META_KEY);
    if (raw) ATLAS_CONFIG_META = { touchedAt: 0, sharedAt: 0, by: '', backupAt: 0, rosterAt: 0, ...JSON.parse(raw) };
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
/* Lo que NUNCA sale de este equipo hacia las tablets del alumnado.
   `curriculo` y `iaCola` se añaden por dos motivos distintos: el currículo son
   decenas de miles de caracteres que a un niño no le sirven de nada y que
   viajarían a las veinticinco tablets en cada apertura de clase; la cola es un
   borrador del docente, y lo que está sin aprobar no se enseña.

   `notasInforme` son las líneas que el docente escribe para la familia de un
   niño concreto. Aunque no sean secretas, son sobre UN niño y las leerían sus
   veinticinco compañeros: van por el canal privado del docente, el mismo que
   las contraseñas, no por el documento de la clase.

   ── Y la LISTA DE CLASE, que es lo más serio de esta lista ──
   Viajaba dentro del documento del aula solo sin las contraseñas, y ese
   documento lo puede leer CUALQUIER cuenta con sesión: los datos de conexión
   están en el JavaScript que se sirve, así que a un alumno le bastaba con
   pedir el documento para tener el nombre, los apellidos, el curso y —lo
   importante— el USUARIO con el que entra cada uno de sus veinticuatro
   compañeros. La tablet del niño la borraba al recibirla, pero borrarla
   después de entregarla no es no entregarla.

   El usuario es la mitad de una credencial. Sumado a que estas contraseñas
   son de aula —una palabra y cuatro cifras, para que las teclee un niño de
   ocho años—, tener la lista de usuarios es tener por dónde empezar.

   La lista es del docente y solo la necesitan sus equipos, así que va por su
   canal privado, con las contraseñas dentro y todo. Las cuadrillas sí siguen
   viajando: un niño ve los nombres de su cuadrilla en su propia app, y eso es
   lo mismo que ve al girar la cabeza en clase. */
const NO_SE_COMPARTE = ['appwrite', 'teacherPin', 'curriculo', 'iaCola', 'iaClave',
                        'iaWorkspace', 'notasInforme', 'roster', 'criterios'];

/* Topes de las notas del docente. Viven aquí y no en state.js porque cloud.js
   los usa al mezclar las de dos equipos, y carga antes que state.js. */
const NOTAS_TOPE = 6;          /* cuántas se conservan por alumno */
const NOTA_LARGO = 1200;       /* lo que cabe leerse en un informe */

function configParaCompartir() {
  const o = deepClone(ATLAS_OVERLAY);
  for (const k of NO_SE_COMPARTE) delete o[k];
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
  /* La lista de clase de este equipo manda siempre —está en NO_SE_COMPARTE—,
     con una excepción a propósito: si aquí no hay ninguna y el documento es
     antiguo y todavía la lleva dentro, se adopta. Es lo que rescata la lista
     en un equipo que se estrena mientras queden documentos sin reescribir.
     Llegan sin contraseñas, y de eso se encarga el canal privado. */
  sinSubir(() => { applyOverlay(nuevo); saveTeacherConfig(); });
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
