/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — classview.js
   Vista general de la clase para el docente.

   Dos piezas separadas a propósito:
   · buildClassOverview() calcula el resumen a partir de una lista de
     diarios. Es una función pura: se puede probar con datos de mentira.
   · fetchClassDocs() los trae de Appwrite. Es lo único que depende de la
     red y de los permisos, y se mantiene lo más fina posible.
   ═══════════════════════════════════════════════════════════ */

const CLASS_PAGE = 100;   /* documentos por página al listar */

/* ── Lectura remota ──
   Requiere que la cuenta del docente pueda leer la colección entera
   (permiso de Read para su equipo en Appwrite). Sin eso devuelve el
   motivo exacto para poder explicarlo en pantalla. */
async function fetchClassDocs() {
  if (!cloudEnabled() || !cloudUser()) {
    return { ok: false, reason: 'sin-nube' };
  }
  const c = ATLAS_CONFIG.appwrite;
  const out = [];
  try {
    let cursor = null;
    for (let page = 0; page < 20; page++) {          /* tope de seguridad */
      const queries = [Appwrite.Query.limit(CLASS_PAGE)];
      if (cursor) queries.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, queries);
      out.push(...res.documents);
      if (res.documents.length < CLASS_PAGE) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/not authorized|missing scope|permission/i.test(msg)) {
      return { ok: false, reason: 'sin-permiso', detail: msg };
    }
    return { ok: false, reason: 'error', detail: msg };
  }
  return { ok: true, docs: out };
}

/* Convierte los documentos crudos en {name, state} legibles */
function parseClassDocs(docs) {
  const out = [];
  for (const d of docs) {
    let st = null;
    try { st = JSON.parse(d.state); } catch (e) { continue; }  /* diario ilegible: se ignora */
    if (!st || !st.profile) continue;
    out.push({ id: d.$id, name: d.name || st.profile.explorer_name || 'Explorador', state: st });
  }
  return out;
}

/* ── Cálculo del resumen (puro) ── */
function daysBetween(a, b) { return Math.floor((new Date(a) - new Date(b)) / 86400000); }

function summarizeStudent(entry, today) {
  const s = entry.state;
  const level = levelFromXp(s.progression.xp_total || 0);

  /* estratos: solo los que existen de verdad en la configuración actual */
  let total = 0, mastered = 0, masterySum = 0, stuck = [];
  for (const siteId in (s.dig_sites || {})) {
    for (const bId in s.dig_sites[siteId]) {
      const def = branchDef(bId);
      const strata = s.dig_sites[siteId][bId].strata || {};
      for (const sId of STRATA_ORDER) {
        const st = strata[sId];
        if (!st || (def && !stratumHasContent(def, sId))) continue;
        total++;
        masterySum += st.mastery || 0;
        if ((st.mastery || 0) >= 0.8) mastered++;
        else if (st.status === 'in_progress' && st.last_practiced &&
                 daysBetween(today, st.last_practiced) > 7) {
          stuck.push(`${def ? def.name : bId} · ${STRATA_META[sId].label}`);
        }
      }
    }
  }

  /* actividad reciente */
  const log = s.metrics && s.metrics.sessions_log || [];
  const last7 = log.filter(e => daysBetween(today, e.date) < 7);
  const prev7 = log.filter(e => { const d = daysBetween(today, e.date); return d >= 7 && d < 14; });
  const min7 = last7.reduce((a, e) => a + (e.minutes || 0), 0);
  const sessions7 = last7.length, sessionsPrev = prev7.length;

  /* precisión y zona de flujo */
  const arr = (s.adaptive && s.adaptive.last10) || [];
  const accuracy = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const inFlow = accuracy !== null && accuracy >= 0.7 && accuracy <= 0.85;

  /* tasa de error global */
  const errs = (s.metrics && s.metrics.errors_by_skill) || {};
  let e = 0, at = 0;
  for (const k in errs) { e += errs[k].errors || 0; at += errs[k].attempts || 0; }
  const errorRate = at ? e / at : null;

  /* respuestas sistemáticamente rapidísimas: sesión de baja calidad */
  const rt = (s.adaptive && s.adaptive.response_times) || [];
  const lowQuality = rt.length >= 8 && rt.filter(t => t < 2000).length / rt.length > 0.6;

  const lastSeen = s.session_meta && s.session_meta.last_login
    ? s.session_meta.last_login.slice(0, 10)
    : (log.length ? log[log.length - 1].date : (s.daily && s.daily.date) || null);

  /* ── Señales de rescate (PRD §6, KPI 4) ── */
  const signals = [];
  if (sessionsPrev > 0 && sessions7 < Math.ceil(sessionsPrev / 2)) signals.push('caída de sesiones');
  else if (sessionsPrev === 0 && sessions7 === 0 && log.length) signals.push('sin actividad reciente');
  if (errorRate !== null && errorRate > 0.4) signals.push('tasa de error alta');
  if (stuck.length) signals.push('estrato atascado >7 días');
  if (accuracy !== null && accuracy < 0.6) signals.push('fuera del canal de flujo');
  if (lowQuality) signals.push('respuestas <2 s');

  return {
    id: entry.id,
    name: entry.name,
    level,
    rank: rankForLevel(level).name,
    xp: s.progression.xp_total || 0,
    doubloons: s.progression.doubloons_balance || 0,
    mastered, totalStrata: total,
    avgMastery: total ? masterySum / total : 0,
    minutes7: min7, sessions7, sessionsPrev,
    activeDays: ((s.logbook && s.logbook.active_days_this_week) || []).length,
    stamps: (s.logbook && s.logbook.stamps_lifetime) || 0,
    accuracy, inFlow, errorRate, lowQuality,
    selfCorrections: (s.metrics && s.metrics.self_corrections) || 0,
    merits: ((s.behavior_log || []).length),
    teamContribution: Math.round((s.progression.team_contribution) || 0),
    stuck, signals,
    needsHelp: signals.length >= 3,   /* el umbral del PRD: tres señales a la vez */
    lastSeen
  };
}

function buildClassOverview(entries, today) {
  const day = today || todayStr();
  const students = entries.map(e => summarizeStudent(e, day));

  const n = students.length;
  const withAcc = students.filter(s => s.accuracy !== null);
  const totalMinutes = students.reduce((a, s) => a + s.minutes7, 0);
  const totalSessions = students.reduce((a, s) => a + s.sessions7, 0);
  const totalMastered = students.reduce((a, s) => a + s.mastered, 0);

  const kpis = {
    students: n,
    /* KPI 1 — atención de calidad: minutos de excavación por sesión */
    minutesPerSession: totalSessions ? totalMinutes / totalSessions : 0,
    /* KPI 2 — velocidad: estratos dominados por alumno */
    strataPerStudent: n ? totalMastered / n : 0,
    /* KPI 3 — zona de flujo */
    inFlowPct: withAcc.length ? withAcc.filter(s => s.inFlow).length / withAcc.length : null,
    /* KPI 4 — alerta de rescate */
    needHelp: students.filter(s => s.needsHelp).length,
    /* KPI 5 — pulso de clase */
    teamTotal: students.reduce((a, s) => a + s.teamContribution, 0),
    activeThisWeek: students.filter(s => s.activeDays > 0).length,
    merits: students.reduce((a, s) => a + s.merits, 0)
  };

  /* ── Cuadrillas: aquí SÍ se puede sumar el total real ── */
  const teams = ((ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.list) || []).map(t => {
    const lower = (t.members || []).map(m => String(m).trim().toLowerCase());
    const mine = students.filter(s => lower.includes(s.name.trim().toLowerCase()));
    return {
      id: t.id, name: t.name, icon: t.icon,
      members: mine.length,
      listed: (t.members || []).length,
      contribution: mine.reduce((a, s) => a + s.teamContribution, 0),
      mastered: mine.reduce((a, s) => a + s.mastered, 0)
    };
  });

  /* Alumnos que la configuración da por asignados pero no tienen diario */
  const known = new Set(students.map(s => s.name.trim().toLowerCase()));
  const missing = [];
  for (const t of ((ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.list) || [])) {
    for (const m of (t.members || [])) {
      if (!known.has(String(m).trim().toLowerCase())) missing.push({ name: m, team: t.name });
    }
  }

  return { students, kpis, teams, missing, generatedAt: day };
}

/* Orden por defecto: primero quien más ayuda necesita, no quien va ganando.
   El cuaderno del docente sirve para detectar, no para clasificar. */
function sortStudents(list, mode) {
  const l = list.slice();
  if (mode === 'alfabetico') return l.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (mode === 'progreso') return l.sort((a, b) => b.mastered - a.mastered || b.xp - a.xp);
  return l.sort((a, b) =>
    b.signals.length - a.signals.length ||
    a.mastered - b.mastered ||
    a.name.localeCompare(b.name, 'es'));
}
