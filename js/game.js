/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — game.js
   Motor de misiones: bucle central (PRD §2.1), recompensas,
   anti-grinding (§2.7) y andamiaje graduado de Kira.
   ═══════════════════════════════════════════════════════════ */

/* Toda la economía es editable por el docente desde el panel. */
function ECO() { return ATLAS_CONFIG.economy; }

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
  const def = branchDef(branchId);
  if (!def || !stratumHasContent(def, stratumId)) { mission = null; return null; }

  const total = mission.kind === 'bazar' ? ECO().bazarQuestions : ECO().missionQuestions;
  mission.tier = entryTier(branchId, stratumId);
  mission.usedIdx = [];   /* para no repetir retos del banco dentro de la misión */
  for (let i = 0; i < total; i++) {
    const q = makeQuestion(def, stratumId, mission.tier, mission.usedIdx, currentGrade());
    if (q) { q.stratumId = stratumId; mission.questions.push(q); }
  }
  if (!mission.questions.length) { mission = null; return null; }
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
    /* El concepto se anota acierte o falle: sin los aciertos no hay tasa, y
       sin tasa un concepto muy practicado parecería peor que uno que apenas
       se ha tocado. */
    recordConcepto(q.skill, correct);
    if (correct) mission.firstTryCorrect++;
    else {
      recordError(mission.branchId, q.stratumId || mission.stratumId);
      if (mission.errorsByStratum) {
        const sId = q.stratumId || mission.stratumId;
        mission.errorsByStratum[sId] = (mission.errorsByStratum[sId] || 0) + 1;
      }
    }
  }

  saveState();
  return { correct, wasFirstAttempt, explanation: q.explanation };
}

/* Restaurar hallazgo: reintentar una variante del reto fallado.
   Premia la metacognición con 5 🪙 (máx. 5/día, PRD §2.4). */
function restoreQuestion() {
  /* misma dificultad que el reto fallado: restaurar es reintentar, no escalar */
  const sId = mission.current.stratumId || mission.stratumId;
  const variant = makeQuestion(branchDef(mission.branchId), sId, mission.tier, mission.usedIdx, currentGrade())
    || mission.current;
  variant.stratumId = sId;
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
    if (S.daily.restores_today < ECO().restoresPerDay) {
      S.daily.restores_today++;
      coins = ECO().restoreCoins;
      earnDoubloons(coins);
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
    if (!spendDoubloons(ECO().hintCost)) return { ok: false, reason: 'no-coins' };
  }
  mission.hintsShown++;
  S.metrics.hints_used++;
  S.daily.hints_today++;
  saveState();
  return { ok: true, text: mission.hintsShown === 1 ? q.hint1 : q.hint2, cost: mission.hintsShown === 2 ? ECO().hintCost : 0 };
}

function advance() {
  mission.index++;
  if (mission.index >= mission.questions.length) return null;
  return nextQuestion();
}

/* ── Cierre de misión: recompensas con reglas anti-grinding ── */
function finishMission() {
  /* La cámara tiene su propio cierre: ni dominio, ni fatiga, ni castigo */
  if (mission.kind === 'guardian') return finishGuardian();

  /* En clase dirigida el docente puede cortar el turno cuando toque el timbre.
     Se puntúa sobre lo REALMENTE respondido: con el total previsto, terminar
     antes contaría como fallos las preguntas que nadie llegó a ver. */
  const total = mission.resolved.length || mission.questions.length;
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
  const fatigued = isFatigued();
  if (fatigued && !alreadyMastered) {
    pe = Math.round(pe * 0.5);
    notes.push('Fatiga de expedición: PE al 50%. Bruno recomienda acampar.');
  }

  /* Doblones según fuente (§2.4) */
  let coins = 0;
  if (mission.kind === 'bazar') {
    if (S.daily.bazar_today < ECO().bazarPerDay) {
      coins = ECO().bazarCoinsMin + Math.round(accuracy * (ECO().bazarCoinsMax - ECO().bazarCoinsMin));
      S.daily.bazar_today++;
    } else {
      notes.push(`Ya hiciste ${ECO().bazarPerDay} Encargos hoy: este no da Doblones.`);
    }
    pe = Math.round(pe * 0.3); /* el Bazar da poco PE: es repaso */
  } else {
    coins = ECO().missionCoinsMin + Math.round(accuracy * (ECO().missionCoinsMax - ECO().missionCoinsMin));
  }
  earnDoubloons(coins);
  const levelInfo = earnXp(pe);

  /* mastery solo se actualiza en expediciones (el Bazar refresca la arena) */
  const masteryBefore = st.mastery;
  updateMastery(mission.branchId, mission.stratumId, accuracy);
  const masteryAfter = getStratum(mission.branchId, mission.stratumId).mastery;
  const nowMastered = masteryBefore < 0.8 && masteryAfter >= 0.8;

  /* Si este Encargo era la remediación que pedía un Guardián, la cámara
     vuelve a estar abierta al terminarlo. */
  const reabreGuardian = mission.kind === 'bazar' &&
    bazarUnlocksGuardian(mission.branchId, mission.stratumId);

  logSessionMission(minutes);
  saveState();

  const result = {
    kind: mission.kind,
    reabreGuardian,
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
    fatigued: isFatigued()
  };
  mission = null;
  return result;
}

/* ══════════ CLASE DIRIGIDA ══════════
   El docente pregunta desde su equipo y el alumnado responde en voz alta.
   Por dentro es exactamente una expedición: mismo motor adaptativo, mismo
   dominio, mismas reglas anti-grinding. Lo único que cambia es quién toca
   la pantalla. */

/* ¿Qué le toca practicar a este alumno ahora? El estrato abierto con menos
   dominio; a igualdad, el que lleve más tiempo sin tocarse. Es la misma
   decisión que tomaría el docente mirando el cuaderno. */
function siguienteReto(grade) {
  let mejor = null;
  for (const branchId of playableBranchIds(grade)) {
    const def = branchDef(branchId);
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(def, sId)) continue;
      const st = getStratum(branchId, sId);
      if (st.status === 'locked') continue;
      const cand = { branchId, stratumId: sId, mastery: st.mastery || 0, arena: sandCover(st) };
      if (!mejor ||
          cand.mastery < mejor.mastery - 0.001 ||
          (Math.abs(cand.mastery - mejor.mastery) <= 0.001 && cand.arena > mejor.arena)) {
        mejor = cand;
      }
    }
  }
  return mejor;
}

/* Abre el turno de un alumno: carga su diario y arranca la ronda.
   `branchId`/`stratumId` son opcionales: si el docente no elige, decide el
   propio motor con siguienteReto(). */
function startClassTurn(nombre, grade, branchId, stratumId) {
  if (!openDiary(nombre, grade)) return { ok: false, reason: 'sin-nombre' };
  rolloverIfNeeded();          /* su racha y su bitácora, como si entrara él */

  let destino = (branchId && stratumId) ? { branchId, stratumId } : siguienteReto();
  if (!destino) return { ok: false, reason: 'sin-contenido' };

  if (!startMission(destino.branchId, destino.stratumId, 'clase')) {
    return { ok: false, reason: 'sin-retos' };
  }
  return { ok: true, branchId: destino.branchId, stratumId: destino.stratumId };
}

/* Cuántas veces se ha preguntado hoy a cada alumno: sirve para repartir los
   turnos sin dejarse a nadie, que es el problema real de un aula de 25. */
function turnosDeHoy() {
  const hoy = todayStr();
  const out = {};
  for (const d of allDiaries()) {
    const log = (d.state.metrics && d.state.metrics.sessions_log) || [];
    const deHoy = log.filter(e => e.date === hoy);
    out[d.key] = {
      rondas: deHoy.length,
      minutos: deHoy.reduce((a, e) => a + (e.minutes || 0), 0)
    };
  }
  return out;
}

/* A quién le toca: el que menos veces haya salido hoy; a igualdad, el que
   lleva más tiempo sin que le pregunten. */
function aQuienLeToca(lista) {
  const turnos = turnosDeHoy();
  let mejor = null;
  for (const alumno of lista) {
    const k = diaryKey(alumno.name);
    const t = turnos[k] || { rondas: 0, minutos: 0 };
    const cand = { alumno, rondas: t.rondas, minutos: t.minutos };
    if (!mejor || cand.rondas < mejor.rondas ||
        (cand.rondas === mejor.rondas && cand.minutos < mejor.minutos)) {
      mejor = cand;
    }
  }
  return mejor ? mejor.alumno : null;
}

/* ══════════ CÁMARA DEL GUARDIÁN ══════════
   Evaluación sumativa de un pozo entero. Encadena retos de sus cuatro
   estratos, un punto por encima de la dificultad habitual. No toca el
   dominio ni la fatiga: mide lo que ya está aprendido, no lo entrena.
   Fallar es gratis a propósito (PRD §0.2: nada se pierde nunca). */
function GUARD() { return ATLAS_CONFIG.guardian || {}; }

function startGuardian(branchId) {
  const g = GUARD();
  if (!g.enabled) return null;
  const est = guardianStatus(branchId);
  if (est.estado !== 'abierta') return null;

  const def = branchDef(branchId);
  const strata = est.strata;
  const total = Math.max(4, Math.min(20, g.questions || 10));
  const tier = Math.min(5, S.adaptive.tier + (g.tierBoost || 0));

  mission = {
    kind: 'guardian',
    branchId,
    stratumId: strata[strata.length - 1],   /* el más profundo, para los títulos */
    index: 0, firstTryCorrect: 0, restoredCount: 0,
    questions: [], current: null, firstAttemptDone: false, hintsShown: 0,
    questionStart: 0, missionStart: Date.now(), tier, usedIdx: [], resolved: [],
    strata, errorsByStratum: {}
  };

  /* Reparto por turnos: cada estrato aporta lo mismo y en orden de Bloom, así
     la prueba sube de exigencia igual que subió la excavación. */
  for (let i = 0; i < total; i++) {
    const sId = strata[i % strata.length];
    const q = makeQuestion(def, sId, tier, mission.usedIdx, currentGrade());
    if (q) { q.stratumId = sId; mission.questions.push(q); }
  }
  if (mission.questions.length < 4) { mission = null; return null; }
  /* de fácil a difícil, sin agrupar todo lo duro al final */
  mission.questions.sort((a, b) => STRATA_ORDER.indexOf(a.stratumId) - STRATA_ORDER.indexOf(b.stratumId));
  nextQuestion();
  return mission;
}

/* Dónde se torció: el estrato con más fallos a la primera */
function guardianWeakest(errores, strata) {
  let peor = null, n = -1;
  for (const sId of strata) {
    const e = errores[sId] || 0;
    if (e > n) { n = e; peor = sId; }
  }
  return n > 0 ? peor : null;
}

function finishGuardian() {
  const g = GUARD();
  const total = mission.questions.length;
  const accuracy = mission.firstTryCorrect / total;
  const minutes = Math.max(1, Math.round((Date.now() - mission.missionStart) / 60000));
  const branchId = mission.branchId;
  const est = guardianState(branchId);
  const strata = mission.strata;
  const weak = guardianWeakest(mission.errorsByStratum, strata);

  est.attempts++;
  const superada = accuracy >= (g.passAccuracy || 0.8);

  let pe = 0, coins = 0, fragment = false;
  if (superada) {
    fragment = recoverFragment(branchId);
    pe = Math.round((g.peBonus || 60) * accuracy);
    coins = g.coins || 100;
    earnDoubloons(coins);
    est.needsBazar = false;
    est.weakStratum = null;
  } else {
    /* No se pierde nada: ni PE, ni Doblones, ni dominio. Lo único que pasa
       es que el Guardián pide un repaso antes de volver a intentarlo, y ese
       repaso apunta al estrato exacto donde se falló. */
    est.needsBazar = true;
    est.weakStratum = weak || strata[0];
  }
  const levelInfo = earnXp(pe);

  logSessionMission(minutes);
  saveState();

  const resultado = {
    kind: 'guardian',
    branchId, strata,
    accuracy, firstTryCorrect: mission.firstTryCorrect, total,
    restored: mission.restoredCount,
    pe, coins, notes: [],
    superada, fragment,
    intentos: est.attempts,
    weakStratum: superada ? null : est.weakStratum,
    errorsByStratum: mission.errorsByStratum,
    umbral: g.passAccuracy || 0.8,
    leveledUp: levelInfo.leveledUp, newLevel: levelInfo.newLevel,
    fragmentsTotal: fragmentsRecovered()
  };
  mission = null;
  return resultado;
}

/* Un Encargo del Bazar levanta la espera de la cámara que lo pidió */
function bazarUnlocksGuardian(branchId, stratumId) {
  const est = guardianState(branchId);
  if (est && est.needsBazar && est.weakStratum === stratumId) {
    est.needsBazar = false;
    saveState();
    return true;
  }
  return false;
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
  const item = shopCatalog().find(i => i.id === itemId);
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
