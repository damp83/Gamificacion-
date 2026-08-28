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

  /* Se piden solo los campos que la vista usa. El diario entero pesa ~20 KB
     por alumno; el resumen, menos de 1 KB. En un centro con 300 diarios eso
     es la diferencia entre 6 MB y 300 KB por cada apertura de la vista. */
  const CAMPOS = ['$id', 'name', 'summary'];

  async function listar(conSelect) {
    const out = [];
    let cursor = null;
    for (let page = 0; page < 20; page++) {          /* tope de seguridad */
      const queries = [Appwrite.Query.limit(CLASS_PAGE)];
      if (conSelect && Appwrite.Query.select) queries.push(Appwrite.Query.select(CAMPOS));
      if (cursor) queries.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, queries);
      out.push(...res.documents);
      if (res.documents.length < CLASS_PAGE) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
    return out;
  }

  let docs;
  try {
    docs = await listar(true);
    /* Colección antigua sin el atributo «summary»: se vuelve a pedir entero.
       Cuesta más red, pero la vista sigue funcionando el primer día. */
    if (docs.length && !docs.some(d => d.summary)) docs = await listar(false);
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/select|attribute|unknown/i.test(msg)) {
      try { docs = await listar(false); }
      catch (e2) { return errorLectura(e2); }
    } else {
      return errorLectura(e);
    }
  }
  return { ok: true, docs };
}

function errorLectura(e) {
  const msg = (e && e.message) || '';
  if (/not authorized|missing scope|permission/i.test(msg)) {
    return { ok: false, reason: 'sin-permiso', detail: msg };
  }
  return { ok: false, reason: 'error', detail: msg };
}

/* Convierte los documentos crudos en entradas legibles.
   Cada entrada trae {summary} (camino rápido) o {state} (diarios guardados
   antes de que existiera el resumen, o lectura de respaldo). */
function parseClassDocs(docs) {
  const out = [];
  for (const d of docs) {
    if (d.summary) {
      let sum = null;
      try { sum = JSON.parse(d.summary); } catch (e) { sum = null; }
      if (sum && sum.v) {
        out.push({ id: d.$id, name: textoSeguro(d.name || sum.name, 64) || 'Explorador', summary: sum });
        continue;
      }
    }
    if (!d.state) continue;                                  /* nada legible */
    let st = null;
    try { st = JSON.parse(d.state); } catch (e) { continue; } /* diario ilegible */
    if (!st || !st.profile) continue;
    out.push({ id: d.$id, name: textoSeguro(d.name || st.profile.explorer_name, 64) || 'Explorador', state: st });
  }
  return out;
}

/* ── Cálculo del resumen (puro) ── */
function daysBetween(a, b) { return Math.floor((new Date(a) - new Date(b)) / 86400000); }

/* Campos crudos → ficha de alumno. Es el único sitio donde se deciden las
   señales de rescate, así que el resumen precalculado y el diario completo
   dan exactamente el mismo resultado. */
function fichaAlumno(entry, base) {
  const signals = [];
  if (base.sessionsPrev > 0 && base.sessions7 < Math.ceil(base.sessionsPrev / 2)) signals.push('caída de sesiones');
  else if (base.sessionsPrev === 0 && base.sessions7 === 0 && base.hasLog) signals.push('sin actividad reciente');
  if (base.errorRate !== null && base.errorRate > 0.4) signals.push('tasa de error alta');
  if (base.stuck.length) signals.push('estrato atascado >7 días');
  if (base.accuracy !== null && base.accuracy < 0.6) signals.push('fuera del canal de flujo');
  if (base.lowQuality) signals.push('respuestas <2 s');

  const level = base.level;
  return {
    id: entry.id,
    name: entry.name,
    level,
    rank: rankForLevel(level).name,
    xp: base.xp,
    doubloons: base.doubloons,
    mastered: base.mastered, totalStrata: base.totalStrata,
    avgMastery: base.avgMastery,
    minutes7: base.minutes7, sessions7: base.sessions7, sessionsPrev: base.sessionsPrev,
    activeDays: base.activeDays,
    stamps: base.stamps,
    accuracy: base.accuracy,
    inFlow: base.accuracy !== null && base.accuracy >= 0.7 && base.accuracy <= 0.85,
    errorRate: base.errorRate, lowQuality: base.lowQuality,
    selfCorrections: base.selfCorrections,
    merits: base.merits,
    teamContribution: base.teamContribution,
    fundDonated: base.fundDonated,
    fragments: base.fragments,
    stuck: base.stuck, conceptos: base.conceptos || [], signals,
    needsHelp: signals.length >= 3,   /* el umbral del PRD: tres señales a la vez */
    lastSeen: base.lastSeen
  };
}

/* Camino rápido: el resumen ya viene calculado por el propio alumno.

   Y ahí está lo importante: lo escribe SU cliente, no el docente ni el
   servidor, así que por aquí entra lo que quiera quien sepa abrir la consola.
   Todo se convierte a su tipo antes de usarlo —los números a número y los
   textos recortados— para que la vista de clase no dependa de que el diario
   de nadie venga bien formado. El escapado al pintar es la segunda barrera,
   no la única. */
function numSeguro(v, porDefecto) {
  const n = Number(v);
  return Number.isFinite(n) ? n : (porDefecto || 0);
}
function textoSeguro(v, tope) {
  return (v == null ? '' : String(v)).slice(0, tope || 120);
}
function numONulo(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function baseDesdeResumen(sum) {
  return {
    level: sum.level !== undefined ? numSeguro(sum.level, 1) : levelFromXp(numSeguro(sum.xp)),
    xp: numSeguro(sum.xp),
    doubloons: numSeguro(sum.doubloons),
    mastered: numSeguro(sum.mastered),
    totalStrata: numSeguro(sum.totalStrata),
    avgMastery: numSeguro(sum.avgMastery),
    minutes7: numSeguro(sum.minutes7),
    sessions7: numSeguro(sum.sessions7),
    sessionsPrev: numSeguro(sum.sessionsPrev),
    hasLog: numSeguro(sum.sessions7) + numSeguro(sum.sessionsPrev) > 0 || !!sum.lastSeen,
    activeDays: numSeguro(sum.activeDays),
    stamps: numSeguro(sum.stamps),
    /* Precisión y tasa de error son las dos únicas que distinguen «cero» de
       «no se sabe»: un valor ilegible convertido a 0 pintaría 0 % y le
       levantaría al alumno una alerta de rescate que no le corresponde. */
    accuracy: numONulo(sum.accuracy),
    errorRate: numONulo(sum.errorRate),
    lowQuality: !!sum.lowQuality,
    selfCorrections: numSeguro(sum.selfCorrections),
    merits: numSeguro(sum.merits),
    teamContribution: numSeguro(sum.teamContribution),
    fundDonated: numSeguro(sum.fundDonated),
    fragments: numSeguro(sum.fragments),
    /* Una lista de estratos atascados larguísima llenaría la pantalla del
       docente con la ficha de un solo alumno. */
    stuck: (Array.isArray(sum.stuck) ? sum.stuck : []).slice(0, 12).map(x => textoSeguro(x, 80)),
    /* Ternas [id, fallos, intentos] escritas por el cliente del alumno: se
       sanean como todo lo que viene de ahí, y se descarta lo que no cuadre
       en vez de dejar que envenene el agregado de la clase. */
    conceptos: (Array.isArray(sum.conceptos) ? sum.conceptos : []).slice(0, 12)
      .map(c => Array.isArray(c)
        ? { id: textoSeguro(c[0], 40), errors: numSeguro(c[1]), attempts: numSeguro(c[2]) }
        : null)
      .filter(c => c && c.id && c.attempts > 0 && c.errors <= c.attempts),
    lastSeen: sum.lastSeen ? textoSeguro(sum.lastSeen, 10) : null
  };
}

/* Camino de respaldo: diario entero, para documentos anteriores al resumen */
function baseDesdeDiario(s, today) {
  /* estratos: solo los que existen de verdad en la configuración actual */
  let total = 0, mastered = 0, masterySum = 0;
  const stuck = [];
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

  /* precisión, tasa de error y calidad de las respuestas */
  const arr = (s.adaptive && s.adaptive.last10) || [];
  const errs = (s.metrics && s.metrics.errors_by_skill) || {};
  let e = 0, at = 0;
  for (const k in errs) { e += errs[k].errors || 0; at += errs[k].attempts || 0; }
  const rt = (s.adaptive && s.adaptive.response_times) || [];

  return {
    level: levelFromXp(s.progression.xp_total || 0),
    xp: s.progression.xp_total || 0,
    doubloons: s.progression.doubloons_balance || 0,
    mastered, totalStrata: total,
    avgMastery: total ? masterySum / total : 0,
    minutes7: last7.reduce((a, x) => a + (x.minutes || 0), 0),
    sessions7: last7.length, sessionsPrev: prev7.length,
    hasLog: log.length > 0,
    activeDays: ((s.logbook && s.logbook.active_days_this_week) || []).length,
    stamps: (s.logbook && s.logbook.stamps_lifetime) || 0,
    accuracy: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null,
    errorRate: at ? e / at : null,
    lowQuality: rt.length >= 8 && rt.filter(t => t < 2000).length / rt.length > 0.6,
    selfCorrections: (s.metrics && s.metrics.self_corrections) || 0,
    merits: ((s.behavior_log || []).length),
    teamContribution: Math.round((s.progression.team_contribution) || 0),
    fundDonated: s.progression.fund_donated || 0,
    fragments: s.progression.atlas_fragments_recovered || 0,
    stuck,
    conceptos: typeof conceptosFlojosDe === 'function'
      ? conceptosFlojosDe(s, 6).map(c => ({ id: c.id, errors: c.errors, attempts: c.attempts }))
      : [],
    lastSeen: s.session_meta && s.session_meta.last_login
      ? s.session_meta.last_login.slice(0, 10)
      : (log.length ? log[log.length - 1].date : (s.daily && s.daily.date) || null)
  };
}

function summarizeStudent(entry, today) {
  const base = entry.summary
    ? baseDesdeResumen(entry.summary)
    : baseDesdeDiario(entry.state, today);
  return fichaAlumno(entry, base);
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
    merits: students.reduce((a, s) => a + s.merits, 0),
    /* Fondo de la Sociedad: el total real de la clase. El docente lo anota
       en la configuración para que los alumnos lo vean también sin conexión. */
    fundTotal: students.reduce((a, s) => a + (s.fundDonated || 0), 0)
  };

  /* ── Lo que conviene repasar mañana ──
     Este es el agregado que convierte el panel en una herramienta de enseñar.
     No «Vega va floja en Numeración · Aplicar», que no se puede llevar a
     ninguna parte, sino «nueve niños fallan la resta llevando», que es una
     frase con la que se prepara una clase.

     Se ordena por CUÁNTOS alumnos lo fallan y no por la tasa de error, porque
     lo que decide si algo merece ir a la pizarra es a cuánta gente le sirve.
     Un concepto con 100 % de error en un solo niño es una conversación con
     ese niño, no una clase. */
  const porConcepto = new Map();
  for (const s of students) {
    for (const c of (s.conceptos || [])) {
      if (!porConcepto.has(c.id)) porConcepto.set(c.id, { id: c.id, alumnos: [], errors: 0, attempts: 0 });
      const e = porConcepto.get(c.id);
      e.alumnos.push(s.name);
      e.errors += c.errors;
      e.attempts += c.attempts;
    }
  }
  const info = typeof conceptoInfo === 'function' ? conceptoInfo : (id => ({ area: '—', label: id }));
  const repasar = [...porConcepto.values()].map(e => ({
    ...e,
    label: info(e.id).label,
    area: info(e.id).area,
    tasa: e.attempts ? e.errors / e.attempts : 0
  })).sort((a, b) => b.alumnos.length - a.alumnos.length || b.tasa - a.tasa);

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

  /* Quién falta: de la lista de clase y de las cuadrillas, quien no tiene
     diario todavía. Sin duplicar a nadie que aparezca en ambos sitios.
     Estos NO son un aviso al pie: son alumnos de la clase que aún no han
     empezado, y el docente los añadió esperando verlos aquí. */
  const known = new Set(students.map(s => s.name.trim().toLowerCase()));
  const roster = ATLAS_CONFIG.roster || [];
  const enRoster = new Map(roster.map(r => [String(r.name).trim().toLowerCase(), r]));
  const missing = [];
  const seen = new Set();
  const anota = (name, where, origen) => {
    const k = String(name).trim().toLowerCase();
    if (!k || known.has(k) || seen.has(k)) return;
    seen.add(k);
    const ficha = enRoster.get(k);
    missing.push({
      name, team: where, origen,
      /* Un nombre que sale de una cuadrilla pero no está en la lista de
         clase suele ser una errata al escribirlo: eso sí es un aviso. */
      enLista: !!ficha,
      account: !!(ficha && ficha.account)
    });
  };
  for (const t of ((ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.list) || [])) {
    for (const m of (t.members || [])) anota(m, t.name, 'equipo');
  }
  for (const r of roster) anota(r.name, 'lista de clase', 'lista');

  /* Para poder decir «1 de 3»: cuántos de la LISTA han empezado ya. No vale
     contar diarios, porque puede haber diarios de quien no está en la lista
     (el docente probando, o un nombre escrito de otra forma). */
  const deLaLista = students.filter(s => enRoster.has(s.name.trim().toLowerCase())).length;
  return {
    students, kpis, teams, repasar, missing, generatedAt: day,
    enLista: roster.length,
    deLaLista,
    fueraDeLista: students.length - deLaLista
  };
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
