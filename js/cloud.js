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
