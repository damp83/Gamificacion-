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
/* Los documentos que esta lectura ha tenido que descartar, con el porqué.
   Antes se saltaban en silencio y el niño desaparecía de la pantalla sin que
   nadie supiera que existía: no salía en la vista de clase, no salía en la
   lista de quien no ha entrado —porque entrar, entró— y su trabajo seguía
   arriba, ilegible. El panel de salud los nombra. */
let docsDescartados = [];
function descartadosDeLaNube() { return docsDescartados.slice(); }

function parseClassDocs(docs) {
  const out = [];
  docsDescartados = [];
  const fuera = (d, motivo) => docsDescartados.push({
    id: d.$id, name: textoSeguro(d.name, 64) || '', motivo
  });
  for (const d of docs) {
    if (d.summary) {
      let sum = null;
      try { sum = JSON.parse(d.summary); } catch (e) { sum = null; }
      if (sum && sum.v) {
        out.push({ id: d.$id, name: textoSeguro(d.name || sum.name, 64) || 'Explorador', summary: sum });
        continue;
      }
    }
    if (!d.state) { fuera(d, 'vacio'); continue; }            /* nada legible */
    let st = null;
    try { st = JSON.parse(d.state); }
    catch (e) { fuera(d, 'ilegible'); continue; }             /* diario ilegible */
    if (!st || !st.profile) { fuera(d, 'sin-perfil'); continue; }
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
    adaptado: !!base.adaptado,
    selfCorrections: base.selfCorrections,
    merits: base.merits,
    teamContribution: base.teamContribution,
    fundDonated: base.fundDonated,
    fragments: base.fragments,
    stuck: base.stuck, conceptos: base.conceptos || [],
    evalu: base.evalu || { camaras: 0, superadas: 0, intentos: 0, passRate: null, divergencia: null },
    signals,
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
/* [camaras, superadas, intentos, passRate, divergencia] tal y como lo escribe
   el cliente del alumno: se sanea igual que el resto del resumen. */
function leerEvalu(v) {
  const a = Array.isArray(v) ? v : [];
  const intentos = numSeguro(a[2]);
  const passRate = numONulo(a[3]);
  return { camaras: numSeguro(a[0]), superadas: numSeguro(a[1]), intentos,
           /* Los intentos que salieron bien empezaron a viajar después que el
              resto. En un resumen antiguo se deducen de la tasa, que es lo
              mismo con un número entero pequeño. */
           superados: a[5] !== undefined ? numSeguro(a[5])
             : (passRate === null ? 0 : Math.round(passRate * intentos)),
           passRate, divergencia: numONulo(a[4]) };
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
    adaptado: !!sum.adaptado,
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
        ? { id: textoSeguro(c[0], 40), errors: numSeguro(c[1]), attempts: numSeguro(c[2]),
            /* El estrato donde se rompe llegó después que el resto y lo escribe
               el cliente del alumno: solo se acepta si es uno de los cuatro. */
            estrato: STRATA_ORDER.includes(c[3]) ? c[3] : '' }
        : null)
      .filter(c => c && c.id && c.attempts > 0 && c.errors <= c.attempts),
    evalu: leerEvalu(sum.evalu),
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
        /* Por dominio y fecha, no por la etiqueta: ver buildSummaryOf(). */
        else if (st.last_practiced && daysBetween(today, st.last_practiced) > 7) {
          stuck.push(`${def ? def.name : bId} · ${STRATA_META[sId].label}${
            st.ever_mastered ? ' · se le está olvidando' : ''}`);
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

  /* Igual que en el resumen: manda la ventana reciente si el diario la trae. */
  const tasaReciente = typeof tasaRecienteDe === 'function' ? tasaRecienteDe(s) : null;

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
    errorRate: tasaReciente !== null ? tasaReciente : (at ? e / at : null),
    lowQuality: rt.length >= 8 && rt.filter(t => t < 2000).length / rt.length > 0.6,
    adaptado: typeof adaptacionDe === 'function' ? adaptacionDe(s).activa : false,
    selfCorrections: (s.metrics && s.metrics.self_corrections) || 0,
    merits: ((s.behavior_log || []).length),
    teamContribution: Math.round((s.progression.team_contribution) || 0),
    fundDonated: s.progression.fund_donated || 0,
    fragments: s.progression.atlas_fragments_recovered || 0,
    stuck,
    conceptos: typeof conceptosFlojosDe === 'function'
      ? conceptosFlojosDe(s, 6).map(c => ({ id: c.id, errors: c.errors, attempts: c.attempts,
                                            estrato: c.estrato || '' }))
      : [],
    evalu: typeof metricasEvaluacion === 'function'
      ? metricasEvaluacion(s)
      : { camaras: 0, superadas: 0, intentos: 0, passRate: null, divergencia: null },
    lastSeen: s.session_meta && s.session_meta.last_login
      ? s.session_meta.last_login.slice(0, 10)
      : (log.length ? log[log.length - 1].date : (s.daily && s.daily.date) || null)
  };
}

function summarizeStudent(entry, today) {
  const base = entry.summary
    ? baseDesdeResumen(entry.summary)
    : baseDesdeDiario(entry.state, today);
  const ficha = fichaAlumno(entry, base);
  /* El informe para la familia necesita el diario ENTERO, no el resumen: sin
     él no se puede decir qué domina y qué está trabajando, solo cifras. En
     clase dirigida los diarios están en este equipo y sí se puede; leyendo de
     la nube llega solo el resumen y el botón no debe ofrecerse. */
  ficha.tieneDiario = !!entry.state;
  ficha.clave = entry.key || null;
  return ficha;
}

/* ── Quién es quién entre la lista de clase y los diarios ──
   Esto se comparaba por nombre en minúsculas, y con dos «Mara Ibáñez» en
   cursos distintos —el caso que ya obligó a cambiar la clave de los diarios—
   la segunda desaparecía de la pantalla: ni salía como alumna ni salía en
   «quién falta». Nadie se enteraba de que le faltaba.

   Se empareja en dos pasadas. Primero por lo que no se repite: la clave del
   diario (que lleva el usuario dentro) y el id de la cuenta. Después, solo
   para lo que quede suelto, por el nombre —un diario antiguo se guardaba
   así— y solo cuando ese nombre es único a los dos lados. Si hay duda no se
   empareja ninguno: adivinar es escribir en la ficha de quien no es. */
function normNombre(t) { return String(t == null ? '' : t).trim().toLowerCase(); }

function emparejarConLaLista(students, roster) {
  const deFicha = new Map();      /* ficha de alumno → índice en la lista */
  const usados = new Set();       /* índices de la lista ya emparejados */
  const fuertes = new Map();
  roster.forEach((r, i) => {
    const u = normNombre(r.username);
    if (u) fuertes.set('u:' + u, i);
    if (r.authId) fuertes.set(String(r.authId), i);
  });

  const pendientes = [];
  for (const s of students) {
    let idx = -1;
    for (const sena of [s.clave, s.id]) {
      const k = sena == null ? '' : String(sena);
      if (k && fuertes.has(k)) { idx = fuertes.get(k); break; }
    }
    if (idx >= 0 && !usados.has(idx)) { usados.add(idx); deFicha.set(s, idx); }
    else pendientes.push(s);
  }

  const cuentaLista = {};
  for (const r of roster) { const k = normNombre(r.name); if (k) cuentaLista[k] = (cuentaLista[k] || 0) + 1; }
  const cuentaFichas = {};
  for (const s of pendientes) { const k = normNombre(s.name); if (k) cuentaFichas[k] = (cuentaFichas[k] || 0) + 1; }
  for (const s of pendientes) {
    const k = normNombre(s.name);
    if (!k || cuentaLista[k] !== 1 || cuentaFichas[k] !== 1) continue;
    const idx = roster.findIndex((r, i) => !usados.has(i) && normNombre(r.name) === k);
    if (idx >= 0) { usados.add(idx); deFicha.set(s, idx); }
  }
  return { deFicha, usados };
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
    fundTotal: students.reduce((a, s) => a + (s.fundDonated || 0), 0),

    /* ── Evaluación (PRD §6) ──
       El Guardian Pass Rate es cuánto se supera la prueba sumativa. La
       divergencia es la que avisa de verdad: mide cuánto prometía la barra de
       dominio por encima de lo que luego confirmó la prueba. Si es alta, el
       árbol está inflado y el dominio formativo está mintiendo. */
    guardianIntentos: students.reduce((a, s) => a + s.evalu.intentos, 0),
    guardianCamaras: students.reduce((a, s) => a + s.evalu.camaras, 0),
    guardianSuperadas: students.reduce((a, s) => a + s.evalu.superadas, 0),
    /* El Guardian Pass Rate del PRD §6: intentos que salieron bien sobre
       intentos hechos. Estaba calculado como cámaras superadas sobre cámaras
       intentadas, que es otra medida con el mismo nombre; esa sigue estando,
       arriba, con su propio nombre. */
    guardianPassRate: (() => {
      const i = students.reduce((a, s) => a + s.evalu.intentos, 0);
      if (!i) return null;
      return students.reduce((a, s) => a + s.evalu.superados, 0) / i;
    })(),
    divergencia: (() => {
      const con = students.filter(s => s.evalu.divergencia !== null);
      return con.length ? con.reduce((a, s) => a + s.evalu.divergencia, 0) / con.length : null;
    })()
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
      if (!porConcepto.has(c.id)) {
        porConcepto.set(c.id, { id: c.id, alumnos: [], errors: 0, attempts: 0, porEstrato: {} });
      }
      const e = porConcepto.get(c.id);
      e.alumnos.push(s.name);
      e.errors += c.errors;
      e.attempts += c.attempts;
      /* A cuántos alumnos se les rompe en cada nivel. No son fallos sumados:
         es en qué nivel se atasca cada uno, que es lo que decide si la clase
         de mañana va de procedimiento o de razonar sobre él. */
      if (c.estrato) e.porEstrato[c.estrato] = (e.porEstrato[c.estrato] || 0) + 1;
    }
  }
  const info = typeof conceptoInfo === 'function' ? conceptoInfo : (id => ({ area: '—', label: id }));
  const repasar = [...porConcepto.values()].map(e => {
    /* El nivel en el que se atasca más gente. Empate: gana el más básico, que
       es por donde hay que empezar a repasar. */
    let estrato = '', cuantos = 0;
    for (const sId of STRATA_ORDER) {
      const n = e.porEstrato[sId] || 0;
      if (n > cuantos) { cuantos = n; estrato = sId; }
    }
    return {
      ...e,
      label: info(e.id).label,
      area: info(e.id).area,
      estrato, estratoAlumnos: cuantos,
      tasa: e.attempts ? e.errors / e.attempts : 0
    };
  }).sort((a, b) => b.alumnos.length - a.alumnos.length || b.tasa - a.tasa);

  /* ── Cuadrillas ──
     La pertenencia a una cuadrilla se guarda por NOMBRE, aquí y en el resto de
     la app (los roles, el mérito de grupo). Con dos alumnos que se llaman
     igual, ese nombre casaba con los dos y cada cuadrilla se apuntaba a ambos:
     dos equipos de «2 miembros» con la aportación de los dos, cuando cada uno
     tiene una.

     No se adivina. Un nombre que llevan dos alumnos no se asigna a ninguna
     cuadrilla y se dice cuál es: mientras las cuadrillas se guarden por
     nombre, ahí no hay forma de saber a quién se refería el docente. */
  const porNombreFicha = new Map();
  for (const s of students) {
    const k = normNombre(s.name);
    if (!k) continue;
    porNombreFicha.set(k, (porNombreFicha.get(k) || 0) + 1);
  }
  const ambiguos = [];
  const teams = ((ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.list) || []).map(t => {
    const lower = (t.members || []).map(normNombre);
    const mine = [];
    for (const s of students) {
      const k = normNombre(s.name);
      if (!lower.includes(k)) continue;
      if (porNombreFicha.get(k) > 1) {
        if (!ambiguos.includes(s.name)) ambiguos.push(s.name);
        continue;
      }
      mine.push(s);
    }
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
  const roster = ATLAS_CONFIG.roster || [];
  const { deFicha, usados } = emparejarConLaLista(students, roster);
  const enRoster = new Map(roster.map(r => [normNombre(r.name), r]));
  const missing = [];
  const vistos = new Set();

  /* Quien está en la lista y todavía no tiene diario. Se decide por índice,
     no por nombre: con dos alumnos que se llaman igual, que uno haya empezado
     no puede tapar al otro. */
  roster.forEach((r, i) => {
    if (usados.has(i)) return;
    missing.push({ name: r.name, team: 'lista de clase', origen: 'lista',
                   enLista: true, account: !!r.account });
    vistos.add(normNombre(r.name));
  });
  /* Y los nombres de una cuadrilla que no están en la lista: eso suele ser
     una errata al escribirlo, y por eso sí merece un aviso. */
  for (const t of ((ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.list) || [])) {
    for (const m of (t.members || [])) {
      const k = normNombre(m);
      if (!k || vistos.has(k) || enRoster.has(k) || porNombreFicha.has(k)) continue;
      vistos.add(k);
      missing.push({ name: m, team: t.name, origen: 'equipo', enLista: false, account: false });
    }
  }

  /* Para poder decir «1 de 3»: cuántos de la LISTA han empezado ya. No vale
     contar diarios, porque puede haber diarios de quien no está en la lista
     (el docente probando, o un nombre escrito de otra forma). */
  const deLaLista = deFicha.size;
  /* Tener diario y haber empezado dejaron de ser lo mismo el día que el panel
     crea el diario al dar de alta la cuenta. Contar documentos diría «2 de 2
     han empezado» de dos niños que no han abierto la app nunca. */
  const sinEstrenar = students.filter(s => !s.lastSeen).length;
  return {
    students, kpis, teams, repasar, missing, generatedAt: day,
    enLista: roster.length,
    deLaLista,
    empezados: students.filter(s => s.lastSeen && deFicha.has(s)).length,
    sinEstrenar,
    fueraDeLista: students.length - deLaLista,
    /* Nombres que llevan dos alumnos: mientras las cuadrillas se guarden por
       nombre, a estos no se les puede asignar equipo sin adivinar. */
    ambiguos
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

/* ══════════════════════════════════════════════════════════════════════════
   SALUD DE LA CLASE

   El fallo más caro de esta plataforma no es un cálculo mal hecho: es que una
   tablet lleve una semana sin sincronizar y nadie se entere hasta que el
   trabajo ya no está. Todo lo que se pierde en silencio se pierde por lo
   mismo —el aviso llega cuando ya no hay nada que hacer— y estaba repartido
   por seis pantallas distintas: la barra de guardado, el estado de los
   ajustes, el diálogo de la IA, la fecha de la copia.

   Esto lo reúne en una lista ordenada por lo que cuesta cada cosa. Es una
   función PURA: recibe lo ya medido y devuelve los hallazgos, para poder
   probar cada aviso sin red, sin reloj y sin tablet.

   Dos reglas de redacción, porque un panel de avisos que no se puede atender
   se aprende a ignorar en dos semanas:
     · Cada hallazgo dice qué se pierde, no qué ha fallado.
     · Cada hallazgo dice qué hacer, aunque sea «no se puede, y por esto». */

const SALUD_DIAS_CALLADA = 7;      /* sin dar señales, para una tablet propia */
const SALUD_DIAS_COPIA = 30;       /* sin copia de seguridad */
const SALUD_SITIO_GRAVE = 0.8;     /* del cupo estimado del navegador */
const SALUD_SITIO_AVISO = 0.6;
const SALUD_AJUSTES_AVISO = 0.8;   /* del tope del campo de la clase */

function diasDesde(marca, hoy) {
  if (!marca) return null;
  return Math.floor((hoy - Number(marca)) / 86400000);
}

/* «hace 3 días», «hoy», «hace 2 meses»: la fecha exacta no ayuda a decidir. */
function haceCuanto(marca, hoy) {
  const d = diasDesde(marca, hoy);
  if (d === null) return 'nunca';
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 60) return `hace ${d} días`;
  return `hace ${Math.floor(d / 30)} meses`;
}

function nombresDe(lista, tope) {
  const n = lista.slice(0, tope || 6).map(x => x.nombre || x.name || x.clave || x.id);
  return lista.length > n.length ? n.join(', ') + ` y ${lista.length - n.length} más` : n.join(', ');
}

function analizarSalud(d) {
  const hoy = Number(d.hoy) || Date.now();
  const out = [];
  const add = (nivel, id, titulo, detalle, accion, quienes) =>
    out.push({ id, nivel, titulo, detalle, accion, quienes: quienes || [] });

  /* ── 1. Este equipo no puede guardar ──
     Va la primera porque mientras dure, nada de lo demás importa: cada
     respuesta que el docente marca hoy desaparece al cerrar la pestaña. */
  if (d.guardadoRoto) {
    add('grave', 'guardado-roto', 'Este equipo no puede guardar',
      'Lo que se juegue o se apunte ahora desaparece al cerrar la pestaña. Pasa con el '
      + 'almacenamiento lleno, en ventana privada, o con el navegador puesto en borrar datos al salir.',
      'Descarga una copia de seguridad AHORA, antes de tocar nada más, y abre la app en una ventana normal.');
  }

  /* ── 2. Diarios que no se pueden leer ── */
  const ilegibles = d.ilegiblesAqui || [];
  if (ilegibles.length) {
    add('grave', 'ilegibles-aqui',
      `${ilegibles.length} ${ilegibles.length === 1 ? 'diario ilegible' : 'diarios ilegibles'} en este equipo`,
      'Están guardados pero no se pueden abrir, así que ese alumno no sale en la vista de clase '
      + 'y su progreso no cuenta en ninguna parte: ' + ilegibles.join(', ') + '.',
      'Si tienes una copia de seguridad anterior, restaúrala: es lo único que los recupera.',
      ilegibles);
  }
  const rotosArriba = (d.descartados || []).filter(x => x.motivo !== 'vacio');
  if (rotosArriba.length) {
    add('grave', 'ilegibles-nube',
      `${rotosArriba.length} ${rotosArriba.length === 1 ? 'diario ilegible' : 'diarios ilegibles'} en la nube`,
      'La clase los tiene guardados pero no se pueden leer, así que esos alumnos no aparecen en la '
      + 'vista de clase aunque hayan estado jugando: ' + nombresDe(rotosArriba) + '.',
      'Si ese alumno todavía tiene su diario en su tablet, que entre con la app: al guardar lo escribe entero otra vez.',
      rotosArriba.map(x => x.name || x.id));
  }
  const vacios = (d.descartados || []).filter(x => x.motivo === 'vacio');
  if (vacios.length) {
    add('aviso', 'vacios-nube', `${vacios.length} ${vacios.length === 1 ? 'diario vacío' : 'diarios vacíos'} en la nube`,
      'Existe el documento pero no tiene nada dentro: ' + nombresDe(vacios) + '. Suele ser una cuenta '
      + 'creada que todavía no ha jugado, y entonces no es un problema.',
      'Si ese alumno sí ha jugado, su trabajo está solo en su tablet: que entre con red.',
      vacios.map(x => x.name || x.id));
  }

  /* ── 3. Trabajo que no ha salido de este equipo ── */
  const sinSubir = d.sinSubir || [];
  if (sinSubir.length && d.claseAbierta) {
    const dias = diasDesde(sinSubir[0].cambiado, hoy);
    const viejo = dias !== null && dias >= 1;
    add(viejo ? 'grave' : 'aviso', 'sin-subir',
      `${sinSubir.length} ${sinSubir.length === 1 ? 'diario sin subir' : 'diarios sin subir'} a la clase`,
      `Están guardados aquí y su último cambio no consta arriba. El más antiguo es de ${
        haceCuanto(sinSubir[0].cambiado, hoy)}: ${nombresDe(sinSubir)}.`
      + (viejo ? ' Si esta tablet se formatea o se limpia, ese trabajo no está en ningún otro sitio.' : ''),
      'Con red y la clase abierta se reintenta solo. Si lleva días sin bajar, descarga una copia de seguridad.',
      sinSubir.map(x => x.nombre));
  }

  /* ── 4. Tablets que llevan días calladas ──
     Solo tiene sentido con alumnado que entra con su cuenta: en clase
     dirigida los diarios están aquí y lo de arriba ya lo cubre. */
  const calladas = (d.calladas || []).filter(x => {
    const dd = diasDesde(x.visto, hoy);
    return dd === null || dd >= SALUD_DIAS_CALLADA;
  });
  if (calladas.length) {
    add('aviso', 'calladas',
      `${calladas.length} ${calladas.length === 1 ? 'tablet lleva' : 'tablets llevan'} más de ${SALUD_DIAS_CALLADA} días sin sincronizar`,
      'El último diario suyo que ha llegado a la clase es de ' + haceCuanto(calladas[0].visto, hoy)
      + `: ${nombresDe(calladas)}. Si han jugado desde entonces, ese trabajo está solo en su tablet.`,
      'Que abran la app con wifi un momento: al entrar sube lo que tengan. Si no vuelven a conectar, se pierde.',
      calladas.map(x => x.nombre));
  }

  /* ── 5. Nada de esto está en la nube ── */
  if (!d.claseAbierta) {
    const dias = diasDesde(d.backupAt, hoy);
    add(dias === null || dias >= SALUD_DIAS_COPIA ? 'grave' : 'aviso', 'sin-nube',
      'El curso entero vive en este equipo',
      'No hay clase abierta en la nube, así que los diarios, los méritos y los ajustes están solo aquí. '
      + 'Un perfil de navegador que se limpia al cerrar sesión —lo normal en un equipo de centro— se lo lleva todo. '
      + `Última copia de seguridad: ${haceCuanto(d.backupAt, hoy)}.`,
      'Abre una clase en «Mis clases», o descarga una copia cada viernes.');
  } else {
    const dias = diasDesde(d.backupAt, hoy);
    if (dias === null || dias >= SALUD_DIAS_COPIA) {
      add('aviso', 'sin-copia', `Sin copia de seguridad desde ${haceCuanto(d.backupAt, hoy)}`,
        'La nube guarda los diarios y los ajustes, pero no las contraseñas del alumnado en claro: esas '
        + 'solo están en tu equipo y en la copia. Appwrite guarda un resumen, no la contraseña, así que '
        + 'si se pierden no hay de dónde sacarlas.',
        'Configuración → Copia de seguridad → Descargar. Es un fichero y tarda un segundo.');
    }
  }

  /* ── 6. Ajustes sin subir ── */
  if (d.ajustes && d.ajustes.estado === 'pendiente') {
    add('aviso', 'ajustes-pendientes', 'Los ajustes de la clase no han subido',
      'Los retos que has aprobado, los comportamientos y el almacén están guardados aquí pero no en la clase, '
      + 'así que las tablets del alumnado siguen con los de antes'
      + (d.ajustes.detalle ? ` (${d.ajustes.detalle})` : '') + '.',
      'Se reintenta solo con red. Si no se quita, comprueba la conexión en «Acceso y nube».');
  }

  /* ── 7. La IA está parada ── */
  if (d.falloIA) {
    const textos = {
      saldo: 'La cuenta de la API se quedó sin saldo',
      clave: 'La clave de la API no vale o ha caducado',
      workspace: 'A la clave le falta su espacio de trabajo'
    };
    const acciones = {
      saldo: 'Recarga en console.anthropic.com → Billing. Hasta entonces, los retos hay que escribirlos a mano.',
      clave: 'Crea una nueva en console.anthropic.com → API keys y pégala en «Retos con IA».',
      workspace: 'Pega el ID del espacio en «Retos con IA», debajo de la clave.'
    };
    add('grave', 'ia-parada', textos[d.falloIA.motivo] || 'La generación de retos está parada',
      `Pasó ${haceCuanto(d.falloIA.at, hoy)} y no se arregla solo: hasta que se toque, «Generar retos» va a `
      + 'fallar igual. Se avisa aquí para que no te enteres el día que la necesites, con la clase delante.',
      acciones[d.falloIA.motivo] || 'Revisa la clave en «Retos con IA».');
  }

  /* ── 8. Se está llenando el equipo ── */
  const sitio = d.sitio;
  if (sitio && sitio.parte >= SALUD_SITIO_AVISO) {
    const pct = Math.round(sitio.parte * 100);
    add(sitio.parte >= SALUD_SITIO_GRAVE ? 'grave' : 'aviso', 'sitio',
      `Este equipo va por el ${pct} % de su espacio`,
      'Es una estimación: el navegador no dice cuánto cupo da, y se calcula sobre los 5 MB de costumbre. '
      + 'Cuando se llena, guardar deja de funcionar sin avisar antes.',
      'Descarga una copia y luego cierra las clases que ya no uses: eso vacía sus diarios de este equipo.');
  }

  /* ── 9. Los ajustes no van a caber ── */
  if (d.tamanoAjustes && d.configMax && d.tamanoAjustes >= d.configMax * SALUD_AJUSTES_AVISO) {
    const pct = Math.round((d.tamanoAjustes / d.configMax) * 100);
    add(d.tamanoAjustes >= d.configMax ? 'grave' : 'aviso', 'ajustes-grandes',
      `Los ajustes ocupan el ${pct} % de lo que admite la clase`,
      `Lo que más pesa son los ${d.retosEnAjustes || 0} retos escritos a mano que todavía viajan dentro. `
      + 'Cuando pase del tope, los ajustes dejan de subir y las tablets se quedan con los de antes.',
      'Los retos nuevos ya van en su propia tabla. Los viejos se pueden borrar de «Yacimientos y pozos» una vez pasados.');
  }

  /* ── 10. Contraseñas que solo están aquí ── */
  if (d.hayContrasenas && !d.rosterAt) {
    add('aviso', 'contrasenas-solo-aqui', 'Las contraseñas del alumnado no están guardadas fuera de este equipo',
      'Están en la lista de clase de esta tablet y en ningún otro sitio. Si cambias de equipo, o si este se '
      + 'limpia, hay que volver a repartir contraseñas nuevas a toda la clase.',
      'Abre una clase en «Mis clases»: la lista se guarda en un documento que solo lee tu cuenta. O descarga una copia.');
  }

  /* ── 11. Cuentas sin identificador ── */
  const sinId = d.cuentasSinId || [];
  if (sinId.length) {
    add('aviso', 'cuentas-sin-id',
      `${sinId.length} ${sinId.length === 1 ? 'cuenta creada sin' : 'cuentas creadas sin'} su identificador`,
      'Se dieron de alta antes de que se guardara el id, y sin él sus diarios no se pueden vincular a esta clase: '
      + `${nombresDe(sinId)}. Existen y funcionan, pero la vista de clase no sabe que son tuyos.`,
      'Alumnado → 🔎 Buscar el diario: los empareja por el nombre y rellena lo que falta.',
      sinId.map(x => x.nombre || x.name));
  }

  /* ── 12. Quien no ha entrado nunca ──
     Lo último y como aviso suave: no se pierde nada, pero en octubre conviene
     saber quién lleva dos meses sin abrir la app. */
  const sinEntrar = d.sinEntrar || [];
  if (sinEntrar.length) {
    add('aviso', 'sin-entrar', `${sinEntrar.length} de la lista no ${sinEntrar.length === 1 ? 'ha' : 'han'} entrado nunca`,
      'No tienen diario ni aquí ni en la clase: ' + nombresDe(sinEntrar) + '.',
      'Comprueba que tienen su línea de la hoja de credenciales y que el usuario está bien escrito.',
      sinEntrar.map(x => x.nombre || x.name));
  }

  const orden = { grave: 0, aviso: 1 };
  return out.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

/* Un solo número para la cabecera: lo peor que hay. */
function veredictoDeSalud(hallazgos) {
  const graves = hallazgos.filter(h => h.nivel === 'grave').length;
  const avisos = hallazgos.length - graves;
  if (graves) return { nivel: 'grave', graves, avisos };
  if (avisos) return { nivel: 'aviso', graves: 0, avisos };
  return { nivel: 'bien', graves: 0, avisos: 0 };
}
