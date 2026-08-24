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
