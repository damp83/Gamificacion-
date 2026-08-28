/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — cloud.js
   Cuentas y guardado en Appwrite. Un documento por alumno
   (id = id de usuario) con todo el user_state serializado.
   Si Appwrite no está configurado o el SDK no carga, todas
   las funciones degradan a modo local sin romper nada.
   ═══════════════════════════════════════════════════════════ */

const CLOUD = { enabled: false, account: null, db: null, user: null, saveTimer: 0, lastError: null };

function cloudConfigured() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(c.endpoint && c.projectId && c.databaseId && c.collectionId);
}
function cloudEnabled() { return CLOUD.enabled; }
function cloudUser() { return CLOUD.user; }

function cloudInit() {
  if (!cloudConfigured()) return false;
  if (typeof Appwrite === 'undefined') {
    console.warn('Appwrite configurado pero el SDK no cargó: la app sigue en modo local.');
    return false;
  }
  const client = new Appwrite.Client()
    .setEndpoint(ATLAS_CONFIG.appwrite.endpoint)
    .setProject(ATLAS_CONFIG.appwrite.projectId);
  CLOUD.account = new Appwrite.Account(client);
  CLOUD.db = new Appwrite.Databases(client);
  CLOUD.enabled = true;
  return true;
}

/* usuario del niño → email interno válido para Appwrite */
function cloudEmail(username) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@' + ATLAS_CONFIG.usernameDomain;
}

/* crear sesión con compatibilidad entre versiones del SDK */
function createSession(email, pass) {
  if (typeof CLOUD.account.createEmailPasswordSession === 'function') {
    return CLOUD.account.createEmailPasswordSession(email, pass);
  }
  return CLOUD.account.createEmailSession(email, pass); /* SDK < 14 */
}

/* ¿hay sesión guardada de otro día? → devuelve el estado remoto o null */
async function cloudResume() {
  if (!CLOUD.enabled) return null;
  try { CLOUD.user = await CLOUD.account.get(); }
  catch (e) { CLOUD.user = null; return null; }
  return cloudLoadState();
}

async function cloudLogin(username, pass) {
  try { await CLOUD.account.deleteSession('current'); } catch (e) { /* no había sesión */ }
  await createSession(cloudEmail(username), pass);
  CLOUD.user = await CLOUD.account.get();
  return cloudLoadState();
}

async function cloudRegister(name, username, pass) {
  await CLOUD.account.create(Appwrite.ID.unique(), cloudEmail(username), pass, name);
  await createSession(cloudEmail(username), pass);
  CLOUD.user = await CLOUD.account.get();
  return null; /* cuenta nueva: sin estado remoto todavía */
}

/* ── Alta de cuentas de alumno desde el panel ──
   account.create() es el alta pública: crea el usuario SIN abrir sesión, así
   que el docente puede dar de alta a toda la clase sin perder la suya. El
   diario en sí lo crea cada alumno al entrar por primera vez. */
async function cloudCreateStudent(name, username, password) {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube' };
  try {
    await CLOUD.account.create(Appwrite.ID.unique(), cloudEmail(username), password, name);
    return { ok: true };
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/already exists/i.test(msg))       return { ok: false, reason: 'existe' };
    if (/Rate limit/i.test(msg))           return { ok: false, reason: 'ritmo' };
    if (/at least 8|password/i.test(msg))  return { ok: false, reason: 'contrasena' };
    if (/Invalid.*email/i.test(msg))       return { ok: false, reason: 'usuario' };
    return { ok: false, reason: 'error', detail: msg };
  }
}

async function cloudLoadState() {
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.collectionId, CLOUD.user.$id);
    return JSON.parse(doc.state);
  } catch (e) { return null; } /* primer inicio: aún no hay documento */
}

async function cloudPush() {
  if (!CLOUD.enabled || !CLOUD.user || !S) return false;
  const c = ATLAS_CONFIG.appwrite;
  /* Se envía el diario completo (para que el niño lo recupere en otro equipo)
     y, aparte, un resumen de menos de 1 KB. La vista de clase lee SOLO el
     resumen: así un centro de 300 diarios baja ~300 KB en vez de ~7 MB. */
  const data = { state: JSON.stringify(S), name: S.profile.explorer_name };
  try {
    const sum = buildSummary();
    if (sum) data.summary = JSON.stringify(sum);
  } catch (e) { /* si el resumen falla, el diario se guarda igual */ }
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.collectionId, CLOUD.user.$id, data);
    CLOUD.lastError = null;
    return true;
  } catch (e) {
    try {
      const uid = CLOUD.user.$id;
      await CLOUD.db.createDocument(c.databaseId, c.collectionId, uid, data, [
        Appwrite.Permission.read(Appwrite.Role.user(uid)),
        Appwrite.Permission.update(Appwrite.Role.user(uid)),
        Appwrite.Permission.delete(Appwrite.Role.user(uid))
      ]);
      CLOUD.lastError = null;
      return true;
    } catch (e2) {
      CLOUD.lastError = e2; /* sin red: el estado sigue en localStorage */
      console.warn('No se pudo guardar en la nube (se reintentará):', e2.message);
      return false;
    }
  }
}

/* ══════════ CONFIGURACIÓN COMPARTIDA DEL EQUIPO DOCENTE ══════════
   Un colegio no configura veinte tablets a mano. El docente publica sus
   ajustes en un único documento y el resto los recoge al abrir.
   Permisos: lectura para todos los usuarios (los alumnos necesitan la
   configuración para jugar), escritura solo para el equipo `docentes`.
   Si no hay colección configurada, todo esto no existe y cada tablet sigue
   con sus propios ajustes. */
function sharedConfigOn() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(CLOUD.enabled && c.configCollectionId);
}

async function cloudFetchConfig() {
  if (!sharedConfigOn()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.configCollectionId, c.configDocId || 'clase');
    let overlay = {};
    try { overlay = JSON.parse(doc.overlay || '{}'); } catch (e) { return { ok: false, reason: 'ilegible' }; }
    return { ok: true, paquete: { overlay, updated_at: Number(doc.updated_at) || 0, by: doc.by || '' } };
  } catch (e) {
    const msg = (e && e.message) || '';
    /* Todavía no ha publicado nadie: no es un error, es el primer día */
    if (/could not be found|not found/i.test(msg)) return { ok: false, reason: 'sin-publicar' };
    if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
    return { ok: false, reason: 'error', detail: msg };
  }
}

async function cloudPublishConfig(nombreDocente) {
  if (!sharedConfigOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  const id = c.configDocId || 'clase';
  const data = {
    overlay: JSON.stringify(configParaCompartir()),
    updated_at: String(Date.now()),
    by: nombreDocente || ATLAS_CONFIG.teacherName || ''
  };
  const permisos = () => [
    /* Los alumnos LEEN la configuración —sin ella no hay nada que jugar—
       pero solo el equipo docente puede cambiarla. */
    Appwrite.Permission.read(Appwrite.Role.users()),
    Appwrite.Permission.update(Appwrite.Role.team(ATLAS_CONFIG.teacherTeam || 'docentes')),
    Appwrite.Permission.delete(Appwrite.Role.team(ATLAS_CONFIG.teacherTeam || 'docentes'))
  ];
  /* Publicar deja esta tablet al día consigo misma: si no, al abrir de nuevo
     se avisaría de un conflicto con lo que acaba de publicar ella. */
  const anotar = () => {
    ATLAS_CONFIG_META.sharedAt = Number(data.updated_at);
    ATLAS_CONFIG_META.touchedAt = Number(data.updated_at);
    ATLAS_CONFIG_META.by = data.by;
    saveConfigMeta();
    return { ok: true, updated_at: Number(data.updated_at) };
  };
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.configCollectionId, id, data);
    return anotar();
  } catch (e) {
    try {
      await CLOUD.db.createDocument(c.databaseId, c.configCollectionId, id, data, permisos());
      return anotar();
    } catch (e2) {
      const msg = (e2 && e2.message) || '';
      if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
      return { ok: false, reason: 'error', detail: msg };
    }
  }
}

/* Al arrancar: recoger lo del equipo si es más nuevo y esta tablet no se ha
   tocado desde entonces. Devuelve qué ha pasado para poder decirlo. */
let sharedConfigState = { estado: 'sin-nube' };

async function syncSharedConfig() {
  sharedConfigState = await calcularSync();
  return sharedConfigState;
}
async function calcularSync() {
  if (!sharedConfigOn()) return { estado: 'sin-nube' };
  const res = await cloudFetchConfig();
  if (!res.ok) return { estado: res.reason, detail: res.detail };

  const p = res.paquete;
  if (p.updated_at <= ATLAS_CONFIG_META.sharedAt) return { estado: 'al-dia', paquete: p };
  if (configEditadaEnLocal()) return { estado: 'conflicto', paquete: p };
  adoptSharedConfig(p);
  return { estado: 'adoptada', paquete: p };
}

/* ══════════ AULAS: VARIOS DOCENTES, CADA UNO CON SUS CLASES ══════════
   Un mismo proyecto de Appwrite sirve a todo un claustro. El modelo es:

     aulas/<id>     ← una clase. Su DUEÑO es la cuenta del docente.
     diarios/<id>   ← un diario de alumno, con el campo `aula` apuntando
                      a su clase y los mismos permisos que ella.

   El aislamiento entre docentes NO depende de que el cliente filtre bien:
   depende de los permisos por documento de Appwrite. El filtro por `owner`
   es una comodidad para no descargar de más, no la barrera. La barrera es
   que un documento de otro docente sencillamente no se puede leer. */

function aulasOn() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(CLOUD.enabled && c.aulasCollectionId && c.databaseId);
}

/* Permisos de todo lo que pertenece a una clase: solo su docente. */
function permisosDeAula(ownerId) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId))
  ];
}

function errorNube(e) {
  const msg = (e && e.message) || '';
  if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
  if (/could not be found|not found/i.test(msg)) return { ok: false, reason: 'no-existe', detail: msg };
  return { ok: false, reason: 'error', detail: msg };
}

/* ── Las clases de ESTE docente ── */
async function cloudListAulas() {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const res = await CLOUD.db.listDocuments(c.databaseId, c.aulasCollectionId, [
      Appwrite.Query.equal('owner', CLOUD.user.$id),
      Appwrite.Query.limit(100)
    ]);
    return {
      ok: true,
      aulas: res.documents.map(d => ({
        id: d.$id, name: d.name || 'Clase', teacher: d.teacher || '',
        updated_at: Number(d.updated_at) || 0
      }))
    };
  } catch (e) { return errorNube(e); }
}

async function cloudCreateAula(nombre) {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  const uid = CLOUD.user.$id;
  try {
    const doc = await CLOUD.db.createDocument(c.databaseId, c.aulasCollectionId, 'unique()', {
      owner: uid,
      name: String(nombre || 'Mi clase').trim() || 'Mi clase',
      teacher: ATLAS_CONFIG.teacherName || '',
      config: JSON.stringify(configParaCompartir()),
      updated_at: String(Date.now())
    }, permisosDeAula(uid));
    return { ok: true, aula: { id: doc.$id, name: doc.name, teacher: doc.teacher } };
  } catch (e) { return errorNube(e); }
}

/* Guarda los ajustes de la clase activa (no los diarios: van aparte) */
async function cloudSaveAulaConfig() {
  if (!aulasOn() || !aulaActiva()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  /* El nombre de la clase vive en su documento. Sincronizar desde un equipo
     donde no esté puesto NO puede rebautizarla: antes la dejaba en «Clase». */
  const data = {
    teacher: ATLAS_CONFIG.teacherName || '',
    config: JSON.stringify(configParaCompartir()),
    updated_at: String(Date.now())
  };
  const nombre = (ATLAS_CONFIG.className || '').trim() || (AULA.name || '').trim();
  if (nombre) data.name = nombre;

  try {
    await CLOUD.db.updateDocument(c.databaseId, c.aulasCollectionId, aulaActiva(), data);
    return { ok: true };
  } catch (e) { return errorNube(e); }
}

/* ── Diarios de una clase ── */
const AULA_PAGE = 100;

async function cloudPullAula(aulaId) {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    /* Los ajustes de la clase */
    const doc = await CLOUD.db.getDocument(c.databaseId, c.aulasCollectionId, aulaId);
    let ajustes = null;
    try { ajustes = JSON.parse(doc.config || '{}'); } catch (e) { ajustes = null; }

    /* Y todos sus diarios, paginando */
    const docs = [];
    let cursor = null;
    for (let p = 0; p < 20; p++) {
      const q = [Appwrite.Query.equal('aula', aulaId), Appwrite.Query.limit(AULA_PAGE)];
      if (cursor) q.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, q);
      docs.push(...res.documents);
      if (res.documents.length < AULA_PAGE) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
    return {
      ok: true,
      aula: { id: doc.$id, name: doc.name, teacher: doc.teacher },
      ajustes,
      diarios: docs
    };
  } catch (e) { return errorNube(e); }
}

/* Reparto estable de una cadena en 13 caracteres base36 (≈67 bits).
   Dos pasadas FNV-1a con constantes distintas: no es criptográfico —no le
   hace falta— y solo tiene que repartir bien y dar SIEMPRE lo mismo en
   cualquier equipo, que es de lo que depende que un alumno escriba en su
   documento y no en el de otro. */
function hash36(texto) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = String(texto);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36).padStart(7, '0') + h2.toString(36).padStart(7, '0')).slice(0, 13);
}

/* El id del documento se deriva de la clase y del alumno: así el mismo
   alumno desde dos equipos escribe en el MISMO documento en vez de crear
   duplicados que luego nadie sabe cuál es el bueno.

   Va con hash y no con el nombre recortado. Appwrite limita el id a 36
   caracteres, y los 20 del id del aula más el guion bajo solo dejaban 15
   para el nombre: «Ana María Rodríguez Pérez» y «Ana María Rodríguez Gómez»
   se recortaban las dos a «ana-maria-rodri» y el segundo diario pisaba al
   primero sin avisar. Con nombres compuestos, que en un aula española son
   lo normal, eso pasaba de verdad. El hash se calcula sobre el nombre
   ENTERO, así que dos nombres distintos dan documentos distintos por muy
   parecido que empiecen. */
const DOC_ID_MAX = 36;

function docIdDiario(aulaId, clave) {
  /* Sin tildes y en minúsculas: el mismo alumno escrito «José» en una tablet
     y «jose» en otra tiene que caer en el mismo documento. */
  const limpio = String(clave).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const h = hash36(limpio);
  /* Si algún día el id del aula fuera más largo de lo que cabe, se recorta
     el prefijo (que solo sirve para leerlo en la consola de Appwrite) y
     nunca el hash, que es lo que evita las colisiones. */
  const prefijo = String(aulaId || 'd').slice(0, DOC_ID_MAX - h.length - 1);
  return prefijo + '_' + h;
}

async function cloudPushDiario(clave, estado) {
  if (!aulasOn() || !aulaActiva() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const uid = CLOUD.user.$id;
  const id = docIdDiario(aulaActiva(), clave);
  const data = {
    aula: aulaActiva(),
    owner: uid,
    name: estado.profile.explorer_name,
    state: JSON.stringify(estado),
    updated_at: String(estado.updated_at || Date.now())
  };
  try { const s = buildSummaryOf(estado); if (s) data.summary = JSON.stringify(s); }
  catch (e) { /* sin resumen, el diario se guarda igual */ }

  try {
    await CLOUD.db.updateDocument(c.databaseId, c.collectionId, id, data);
    return { ok: true, id };
  } catch (e) {
    try {
      await CLOUD.db.createDocument(c.databaseId, c.collectionId, id, data, permisosDeAula(uid));
      return { ok: true, id, creado: true };
    } catch (e2) { return errorNube(e2); }
  }
}

/* ── Subida perezosa de diarios ──
   Durante un turno se guarda en cada respuesta. Enviar uno por respuesta
   sería castigar la red del centro; se agrupan y se envían al terminar. */
const AULA_COLA = new Set();
let aulaTimer = 0;

function aulaScheduleSave(clave) {
  if (!aulasOn() || !aulaActiva()) return;
  AULA_COLA.add(clave);
  clearTimeout(aulaTimer);
  aulaTimer = setTimeout(vaciarColaAula, 3000);
}

async function vaciarColaAula() {
  if (!aulasOn() || !aulaActiva() || !AULA_COLA.size) return { ok: true, enviados: 0 };
  const map = loadDiaries();
  const pendientes = [...AULA_COLA];
  AULA_COLA.clear();
  let enviados = 0, fallidos = 0;
  for (const clave of pendientes) {
    const estado = map[clave];
    if (!estado) continue;
    const r = await cloudPushDiario(clave, estado);
    if (r.ok) enviados++;
    else { fallidos++; AULA_COLA.add(clave); }   /* se reintenta en la próxima */
  }
  return { ok: !fallidos, enviados, fallidos };
}

/* ── Abrir una clase en este equipo ──
   Trae sus ajustes y sus diarios, fusionando con lo que hubiera aquí.

   Cambiar de clase VACÍA los diarios de este equipo, así que antes de
   borrar nada hay que dejarlos a salvo arriba. Antes no se hacía: si el
   docente cambiaba de clase sin red, o justo al acabar un turno —la cola de
   subida espera 3 s—, la sesión entera se perdía mientras el diálogo le
   aseguraba que estaba guardada. Ahora se sube todo primero y, si algo no
   sale, no se borra nada y se dice cuántos quedan. */
async function abrirAula(aulaId, nombre, opciones) {
  const cambiaDeClase = !!(aulaActiva() && aulaActiva() !== aulaId);

  if (cambiaDeClase) {
    clearTimeout(aulaTimer);          /* la cola pendiente entra en esta subida */
    const sync = await sincronizarAula();
    if (!sync.ok && !(opciones && opciones.descartarSinSubir)) {
      /* sincronizarAula() puede fallar sin llegar a intentarlo (sin nube):
         lo que se le dice al docente es cuántos diarios hay aquí en juego,
         no cuántas peticiones fallaron. */
      const enJuego = sync.fallidos || diariosPorSubir(0).length;
      return { ok: false, reason: 'sin-subir', pendientes: enJuego };
    }
  }

  const res = await cloudPullAula(aulaId);
  if (!res.ok) return res;

  /* Ya están arriba: ahora sí, los de la clase anterior no pueden quedarse */
  if (cambiaDeClase) cerrarAula();
  setAulaActiva(aulaId, res.aula.name || nombre || '');

  if (res.ajustes && typeof res.ajustes === 'object') {
    /* Los ajustes de la clase mandan, pero sin tocar lo que nunca viaja
       (contraseñas, PIN, datos de conexión de este equipo). */
    adoptSharedConfig({ overlay: res.ajustes, updated_at: Date.now(), by: res.aula.teacher || '' });
  }
  /* El nombre lo manda el documento de la clase, no lo que hubiera aquí */
  if (res.aula.name) setTeacherConfig('className', res.aula.name);
  const fus = fusionarDiarios(res.diarios || []);
  return { ok: true, aula: res.aula, ...fus };
}

/* Subir todo lo que este equipo tenga y la nube no: al recuperar la red */
async function sincronizarAula() {
  if (!aulasOn() || !aulaActiva()) return { ok: false, reason: 'sin-nube' };
  const pendientes = diariosPorSubir(0);
  let enviados = 0, fallidos = 0;
  for (const p of pendientes) {
    const r = await cloudPushDiario(p.clave, p.estado);
    if (r.ok) enviados++; else fallidos++;
  }
  const cfg = await cloudSaveAulaConfig();
  return { ok: !fallidos, enviados, fallidos, ajustes: cfg.ok };
}

/* guardado perezoso: saveState() lo invoca; agrupa ráfagas en un envío */
function cloudScheduleSave() {
  if (!CLOUD.enabled || !CLOUD.user) return;
  clearTimeout(CLOUD.saveTimer);
  CLOUD.saveTimer = setTimeout(cloudPush, 2500);
}

async function cloudLogout() {
  clearTimeout(CLOUD.saveTimer);
  try { await CLOUD.account.deleteSession('current'); } catch (e) { /* ya cerrada */ }
  CLOUD.user = null;
}
