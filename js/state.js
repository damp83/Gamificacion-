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
function migrateState(s) {
  if (!s || typeof s !== 'object') return s;
  if (!s.course || !Array.isArray(s.course.trimesters) || s.course.trimesters.length !== 3) {
    s.course = defaultCourse();
  }
  if (!Array.isArray(s.behavior_log)) s.behavior_log = [];
  if (typeof s.progression.team_contribution !== 'number') s.progression.team_contribution = 0;
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
      created_at: todayStr(),
      accessibility: { reduced_motion: false }
    },
    progression: {
      xp_total: 0,
      doubloons_balance: ATLAS_CONFIG.economy.startingCoins,
      atlas_fragments_recovered: 0,
      team_contribution: 0   /* lo aportado a la meta común de la cuadrilla */
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

let S = null; /* estado vivo */

function saveState() {
  if (!S) return;
  S.updated_at = Date.now(); /* para resolver «¿qué copia es más nueva?» entre dispositivos */
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* almacenamiento no disponible */ }
  if (typeof cloudScheduleSave === 'function') cloudScheduleSave();
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) S = migrateState(JSON.parse(raw));
  } catch (e) { S = null; }
  return S;
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

  /* marcar día activo en la bitácora */
  if (!S.logbook.active_days_this_week.includes(today)) {
    S.logbook.active_days_this_week.push(today);
  }

  saveState();
  return events;
}

/* ── Economía ── */
function earnDoubloons(n) {
  S.progression.doubloons_balance += n;
  S.daily.doubloons_earned_today += n;
  trimesterBucket().doubloons += n;
  /* Una fracción se anota como aportación a la meta común de la cuadrilla.
     NO se descuenta de la bolsa del niño: cooperar no cuesta nada (PRD §0.2). */
  const t = ATLAS_CONFIG.teams;
  if (t && t.enabled && myTeam()) {
    S.progression.team_contribution += n * (t.contributionRate || 0);
  }
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
function teamGoalShare() {
  const team = myTeam();
  if (!team) return 0;
  const n = Math.max(1, (team.members || []).length);
  return Math.round((ATLAS_CONFIG.teams.goalTarget || 0) / n);
}
function spendDoubloons(n) {
  if (S.progression.doubloons_balance < n) return false;
  S.progression.doubloons_balance -= n;
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
function playableBranchIds() {
  const out = [];
  for (const site of sitesEnabled()) for (const b of branchesEnabledOf(site)) out.push(b.id);
  return out;
}
/* Mastery = precisión media de las últimas MASTERY_WINDOW sesiones del estrato.
   Se exige un mínimo de 2 sesiones para que una sola tanda afortunada no
   desbloquee el estrato siguiente. Una media móvil (y no exponencial) hace
   que la barra se mueva en cada sesión —PRD §2.6— y que un error temprano
   deje de penalizar indefinidamente: lo que cuenta es el rendimiento reciente. */
const MASTERY_WINDOW = 4;
const MASTERY_MIN_SESSIONS = 2;

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

  /* desbloqueo por prerrequisito cognitivo (mastery ≥80%), PRD §3.1.
     Si el estrato siguiente aún no tiene retos escritos, se abre el primero
     que sí los tenga: un pozo a medio llenar no debe cortar el camino. */
  const def = branchDef(branchId);
  const idx = STRATA_ORDER.indexOf(stratumId);
  if (st.mastery >= 0.8) {
    for (let i = idx + 1; i < STRATA_ORDER.length; i++) {
      if (!stratumHasContent(def, STRATA_ORDER[i])) continue;
      const next = getStratum(branchId, STRATA_ORDER[i]);
      if (next.status === 'locked') next.status = 'available';
      break;
    }
  }
  saveState();
}
/* Erosión suave (sand_cover): días sin practicar → necesita repaso */
function sandCover(st) {
  if (!st.last_practiced) return 0;
  const days = Math.floor((new Date(todayStr()) - new Date(st.last_practiced)) / 86400000);
  return Math.min(1, days * 0.06);
}
/* Estrato dominado con más arena → candidato a Encargo del Bazar */
function bestBazarTarget() {
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
function recordAttempt(branchId, stratumId) {
  const key = `${branchId}.${stratumId}`;
  if (!S.metrics.errors_by_skill[key]) S.metrics.errors_by_skill[key] = { errors: 0, attempts: 0 };
  S.metrics.errors_by_skill[key].attempts++;
  S.metrics.questions_answered++;
}
function logSessionMission(minutes) {
  const today = todayStr();
  let entry = S.metrics.sessions_log.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, missions: 0, minutes: 0 };
    S.metrics.sessions_log.push(entry);
    if (S.metrics.sessions_log.length > 30) S.metrics.sessions_log.shift();
  }
  entry.missions++;
  entry.minutes += minutes;
}
