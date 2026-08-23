/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — game.js
   Motor de misiones: bucle central (PRD §2.1), recompensas,
   anti-grinding (§2.7) y andamiaje graduado de Kira.
   ═══════════════════════════════════════════════════════════ */

const MISSION_QUESTIONS = 6;   /* Expedición principal */
const BAZAR_QUESTIONS = 4;     /* Encargo del Bazar (repaso) */
const FATIGUE_THRESHOLD = 6;   /* desde la 6ª misión diaria, PE al 50% */
const HINT_EXTRA_COST = 10;    /* pista extra tras la gratuita */

let mission = null; /* misión en curso */

/* La dificultad global sube con el rendimiento (PRD §4.3), pero un estrato
   recién abierto es contenido nuevo y de un nivel de Bloom más profundo:
   entrar en él al tope de dificultad expulsa del canal de flujo justo donde
   más andamiaje hace falta. Se amortigua la entrada las primeras sesiones y
   a partir de ahí manda el motor adaptativo. */
const ENTRY_TIER_CAP = [3, 4]; /* por nº de sesiones previas en el estrato */

function entryTier(branchId, stratumId) {
  const st = getStratum(branchId, stratumId);
  const cap = ENTRY_TIER_CAP[st.attempts];
  return cap === undefined ? S.adaptive.tier : Math.min(S.adaptive.tier, cap);
}

function startMission(branchId, stratumId, kind) {
  mission = {
    kind: kind || 'expedition',   /* 'expedition' | 'bazar' */
    branchId,
    stratumId,
    index: 0,
    firstTryCorrect: 0,
    restoredCount: 0,
    questions: [],
    current: null,
    firstAttemptDone: false,
    hintsShown: 0,
    questionStart: 0,
    missionStart: Date.now(),
    tier: 2,                      /* se fija justo debajo, con entryTier() */
    resolved: []                  /* true/false primer intento por pregunta */
  };
  const total = mission.kind === 'bazar' ? BAZAR_QUESTIONS : MISSION_QUESTIONS;
  const gen = BRANCHES[branchId].generators[stratumId];
  mission.tier = entryTier(branchId, stratumId);
  for (let i = 0; i < total; i++) mission.questions.push(gen(mission.tier));
  nextQuestion();
  return mission;
}

function nextQuestion() {
  if (mission.index >= mission.questions.length) return null;
  mission.current = mission.questions[mission.index];
  mission.firstAttemptDone = false;
  mission.hintsShown = 0;
  mission.questionStart = Date.now();
  return mission.current;
}

/* Devuelve un objeto resultado para que la UI pinte el feedback */
function answerQuestion(optionIndex) {
  const q = mission.current;
  const correct = optionIndex === q.answer;
  const responseMs = Date.now() - mission.questionStart;
  const wasFirstAttempt = !mission.firstAttemptDone;

  recordAttempt(mission.branchId, mission.stratumId);

  if (wasFirstAttempt) {
    mission.firstAttemptDone = true;
    mission.resolved.push(correct);
    recordFirstTry(correct, responseMs);
    if (correct) mission.firstTryCorrect++;
    else recordError(mission.branchId, mission.stratumId);
  }

  saveState();
  return { correct, wasFirstAttempt, explanation: q.explanation };
}

/* Restaurar hallazgo: reintentar una variante del reto fallado.
   Premia la metacognición con 5 🪙 (máx. 5/día, PRD §2.4). */
function restoreQuestion() {
  const gen = BRANCHES[mission.branchId].generators[mission.stratumId];
  /* misma dificultad que el reto fallado: restaurar es reintentar, no escalar */
  const variant = gen(mission.tier);
  mission.questions[mission.index] = variant;
  mission.current = variant;
  mission.questionStart = Date.now();
  mission.restoring = true;
  return variant;
}
function completeRestore(correct) {
  mission.restoring = false;
  if (correct) {
    mission.restoredCount++;
    S.metrics.self_corrections++;
    let coins = 0;
    if (S.daily.restores_today < 5) {
      S.daily.restores_today++;
      coins = 5;
      earnDoubloons(5);
    }
    saveState();
    return coins;
  }
  return 0;
}

/* Pista de Kira: la primera es gratis; las siguientes cuestan 10 🪙 (fricción deliberada) */
function requestHint() {
  const q = mission.current;
  if (mission.hintsShown >= 2) return { ok: false, reason: 'no-more' };
  if (mission.hintsShown === 1) {
    if (!spendDoubloons(HINT_EXTRA_COST)) return { ok: false, reason: 'no-coins' };
  }
  mission.hintsShown++;
  S.metrics.hints_used++;
  S.daily.hints_today++;
  saveState();
  return { ok: true, text: mission.hintsShown === 1 ? q.hint1 : q.hint2, cost: mission.hintsShown === 2 ? HINT_EXTRA_COST : 0 };
}

function advance() {
  mission.index++;
  if (mission.index >= mission.questions.length) return null;
  return nextQuestion();
}

/* ── Cierre de misión: recompensas con reglas anti-grinding ── */
function finishMission() {
  const total = mission.questions.length;
  const accuracy = mission.firstTryCorrect / total;
  const st = getStratum(mission.branchId, mission.stratumId);
  const meta = STRATA_META[mission.stratumId];
  const minutes = Math.max(1, Math.round((Date.now() - mission.missionStart) / 60000));

  /* PE por primer acierto, no por intento (PRD §2.7.3) */
  let pe = mission.firstTryCorrect * meta.peBase;
  const notes = [];

  /* "Este yacimiento ya está excavado": mastery ≥90% → 10% de PE (§2.7.1) */
  const alreadyMastered = st.mastery >= 0.9;
  if (alreadyMastered) {
    pe = Math.round(pe * 0.1);
    notes.push('Yacimiento ya excavado: 10% de PE. ¡El tesoro está en la frontera de aprendizaje!');
  }

  /* Fatiga de expedición: desde la 6ª misión diaria, PE al 50% (§2.7.2) */
  S.daily.missions_today++;
  const fatigued = S.daily.missions_today >= FATIGUE_THRESHOLD;
  if (fatigued && !alreadyMastered) {
    pe = Math.round(pe * 0.5);
    notes.push('Fatiga de expedición: PE al 50%. Bruno recomienda acampar.');
  }

  /* Doblones según fuente (§2.4) */
  let coins = 0;
  if (mission.kind === 'bazar') {
    if (S.daily.bazar_today < 4) {
      coins = 10 + Math.round(accuracy * 5); /* 10–15 🪙 */
      S.daily.bazar_today++;
    } else {
      notes.push('Ya hiciste 4 Encargos hoy: este no da Doblones.');
    }
    pe = Math.round(pe * 0.3); /* el Bazar da poco PE: es repaso */
  } else {
    coins = 20 + Math.round(accuracy * 20); /* 20–40 🪙 */
  }
  earnDoubloons(coins);
  const levelInfo = earnXp(pe);

  /* mastery solo se actualiza en expediciones (el Bazar refresca la arena) */
  const masteryBefore = st.mastery;
  updateMastery(mission.branchId, mission.stratumId, accuracy);
  const masteryAfter = getStratum(mission.branchId, mission.stratumId).mastery;
  const nowMastered = masteryBefore < 0.8 && masteryAfter >= 0.8;

  logSessionMission(minutes);
  saveState();

  const result = {
    kind: mission.kind,
    accuracy,
    firstTryCorrect: mission.firstTryCorrect,
    total,
    restored: mission.restoredCount,
    pe, coins, notes,
    leveledUp: levelInfo.leveledUp,
    newLevel: levelInfo.newLevel,
    nowMastered,
    masteryAfter,
    branchId: mission.branchId,
    stratumId: mission.stratumId,
    fatigued: S.daily.missions_today >= FATIGUE_THRESHOLD
  };
  mission = null;
  return result;
}

function abandonMission() { mission = null; }

/* ── Méritos de Campamento: puntos por comportamientos ──
   Los concede el docente (PIN en la UI). Solo Doblones, nunca PE:
   el rango debe seguir midiendo aprendizaje (PRD §2.2). */
function behaviorCountToday(behaviorId) {
  const today = todayStr();
  return S.behavior_log.filter(e => e.id === behaviorId && e.date === today).length;
}
function awardBehavior(behaviorId) {
  const b = ATLAS_CONFIG.behaviors.find(x => x.id === behaviorId);
  if (!b) return { ok: false, reason: 'no-behavior' };
  if (behaviorCountToday(behaviorId) >= b.perDay) return { ok: false, reason: 'cap', b };
  earnDoubloons(b.coins);
  S.behavior_log.push({ id: b.id, date: todayStr(), ts: Date.now() });
  if (S.behavior_log.length > 300) S.behavior_log.shift(); /* histórico acotado */
  trimesterBucket().merits++;
  saveState();
  return { ok: true, b };
}

/* ── Almacén ── */
function buyItem(itemId) {
  const item = SHOP_CATALOG.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'no-item' };
  if (item.type !== 'treat' && (S.inventory.gear_owned.includes(itemId) || S.inventory.camp_items.includes(itemId))) {
    return { ok: false, reason: 'owned' };
  }
  if (!spendDoubloons(item.cost)) return { ok: false, reason: 'no-coins' };
  if (item.type === 'gear') {
    S.inventory.gear_owned.push(itemId);
    S.inventory.gear_equipped.push(itemId);
  } else if (item.type === 'camp') {
    S.inventory.camp_items.push(itemId);
  } else if (item.type === 'treat') {
    S.inventory.treats_given++;
  }
  saveState();
  return { ok: true, item };
}
function toggleEquip(itemId) {
  const idx = S.inventory.gear_equipped.indexOf(itemId);
  if (idx >= 0) S.inventory.gear_equipped.splice(idx, 1);
  else if (S.inventory.gear_owned.includes(itemId)) S.inventory.gear_equipped.push(itemId);
  saveState();
}
