/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — app.js
   Interfaz, navegación y arranque de la PWA.
   ═══════════════════════════════════════════════════════════ */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const SCREENS = ['map', 'branch', 'mission', 'result', 'camp', 'logbook', 'dashboard'];

function show(screenId) {
  SCREENS.forEach(s => $(`#screen-${s}`).classList.toggle('hidden', s !== screenId));
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.nav === screenId));
  if (screenId === 'map') renderMap();
  if (screenId === 'camp') renderCamp();
  if (screenId === 'logbook') renderLogbook();
  if (screenId === 'dashboard') renderDashboard();
  window.scrollTo(0, 0);
}

function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), ms || 2600);
}

/* ── HUD ── */
function renderHud() {
  const level = levelFromXp(S.progression.xp_total);
  const rank = rankForLevel(level);
  $('#hud-name').textContent = S.profile.explorer_name;
  $('#hud-rank').textContent = rank.name;
  $('#hud-level').textContent = `Nv. ${level}`;
  $('#hud-doubloons').textContent = S.progression.doubloons_balance;
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  const pct = Math.min(100, Math.round(((S.progression.xp_total - cur) / (next - cur)) * 100));
  $('#hud-xp-fill').style.width = pct + '%';
  $('#hud-avatar').textContent = avatarEmoji();
}
function avatarEmoji() {
  if (S.inventory.gear_equipped.includes('salacot')) return '🧑‍🌾';
  if (S.inventory.gear_equipped.includes('sombrero_ala_ancha')) return '🤠';
  return '🧒';
}

/* ── Mapa ── */
function renderMap() {
  renderHud();
  const pct = Math.round(mapRevealPct() * 100);
  $('#map-reveal-fill').style.width = pct + '%';
  $('#map-reveal-pct').textContent = `${pct}% del mundo dibujado`;

  $('#fatigue-banner').classList.toggle('hidden', S.daily.missions_today < FATIGUE_THRESHOLD);

  const siteList = $('#site-list');
  siteList.innerHTML = '';
  const site = DIG_SITES.kaldros;
  const header = document.createElement('div');
  header.className = 'site-header';
  header.innerHTML = `<span class="site-icon">${site.icon}</span>
    <div><h3>${site.name}</h3><p>${site.subject} · ${site.desc}</p></div>`;
  siteList.appendChild(header);

  for (const branchId of site.branches) {
    const b = BRANCHES[branchId];
    const strata = S.dig_sites.kaldros[branchId].strata;
    const mastered = STRATA_ORDER.filter(s => strata[s].mastery >= 0.8).length;
    const card = document.createElement('button');
    card.className = 'branch-card';
    card.innerHTML = `<span class="branch-icon">${b.icon}</span>
      <div class="branch-info">
        <strong>${b.name}</strong>
        <div class="branch-strata-dots">${STRATA_ORDER.map(s => {
          const st = strata[s];
          const cls = st.mastery >= 0.8 ? 'dot-mastered' : st.status === 'locked' ? 'dot-locked' : 'dot-open';
          return `<span class="dot ${cls}" title="${STRATA_META[s].label}"></span>`;
        }).join('')}</div>
        <small>${mastered}/${STRATA_ORDER.length} estratos dominados</small>
      </div><span class="branch-go">⛏️</span>`;
    card.addEventListener('click', () => openBranch(branchId));
    siteList.appendChild(card);
  }

  /* Encargo del Bazar: repaso espaciado con excusa narrativa */
  const bazar = $('#bazar-card');
  const target = bestBazarTarget();
  if (target && target.cover > 0.1 && S.daily.bazar_today < 4) {
    const b = BRANCHES[target.branchId];
    const meta = STRATA_META[target.stratumId];
    bazar.innerHTML = `<div class="bazar-inner">
      <span class="bazar-icon">🧺</span>
      <div><strong>Encargo del Bazar</strong>
      <p>«${meta.name}» de ${b.name} se está cubriendo de arena… Un repaso rápido lo redescubrirá. (+10–15 🪙)</p></div>
      <button class="btn btn-secondary" id="btn-bazar">Repasar</button></div>`;
    $('#btn-bazar').addEventListener('click', () => {
      startMission(target.branchId, target.stratumId, 'bazar');
      renderMissionScreen();
      show('mission');
    });
    bazar.classList.remove('hidden');
  } else {
    bazar.innerHTML = '';
    bazar.classList.add('hidden');
  }
}

/* ── Pozo / estratos ── */
let currentBranch = null;
function openBranch(branchId) {
  currentBranch = branchId;
  const b = BRANCHES[branchId];
  $('#branch-title').textContent = `${b.icon} ${b.name}`;
  $('#branch-desc').textContent = b.desc + ' Cuanto más profundo excaves, mayor es el tesoro.';
  const list = $('#strata-list');
  list.innerHTML = '';
  const strata = S.dig_sites.kaldros[branchId].strata;
  STRATA_ORDER.forEach((sId, i) => {
    const st = strata[sId];
    const meta = STRATA_META[sId];
    const cover = sandCover(st);
    const row = document.createElement('button');
    row.className = 'stratum-row' + (st.status === 'locked' ? ' locked' : '');
    row.disabled = st.status === 'locked';
    const masteryPct = Math.round(st.mastery * 100);
    row.innerHTML = `
      <span class="stratum-depth">Estrato ${i + 1}</span>
      <span class="stratum-icon">${st.status === 'locked' ? '🔒' : meta.icon}</span>
      <div class="stratum-info">
        <strong>${meta.label} · «${meta.name}»</strong>
        ${st.status === 'locked'
          ? `<small>Se abre al dominar (≥80%) el estrato de arriba</small>`
          : `<div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${masteryPct}%"></div></div>
             <small>Dominio: ${masteryPct}%${st.mastery >= 0.9 ? ' · ya excavado (PE al 10%)' : ''}${cover > 0.2 ? ' · 🏜️ cubierto de arena' : ''}</small>`}
      </div>
      <span class="stratum-go">${st.status === 'locked' ? '' : '⛏️'}</span>`;
    if (st.status !== 'locked') {
      row.addEventListener('click', () => {
        startMission(branchId, sId, 'expedition');
        renderMissionScreen();
        show('mission');
      });
    }
    list.appendChild(row);
  });
  show('branch');
}

/* ── Misión ── */
function renderMissionScreen() {
  const b = BRANCHES[mission.branchId];
  const meta = STRATA_META[mission.stratumId];
  $('#mission-title').textContent = mission.kind === 'bazar'
    ? `🧺 Encargo: ${meta.name}`
    : `${b.icon} ${b.name} · ${meta.icon} ${meta.label}`;
  renderQuestion();
}
function renderProgressDots() {
  const total = mission.questions.length;
  $('#mission-progress').innerHTML = Array.from({ length: total }, (_, i) => {
    let cls = 'qdot';
    if (i < mission.resolved.length) cls += mission.resolved[i] ? ' qdot-ok' : ' qdot-fail';
    else if (i === mission.index) cls += ' qdot-current';
    return `<span class="${cls}"></span>`;
  }).join('');
}
function renderQuestion() {
  renderProgressDots();
  $('#feedback-card').classList.add('hidden');
  $('#question-card').classList.remove('hidden');
  $('#kira-box').classList.add('hidden');
  const q = mission.current;
  $('#question-text').textContent = q.question;
  const optionsEl = $('#options');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt;
    btn.addEventListener('click', () => onAnswer(i, btn));
    optionsEl.appendChild(btn);
  });
  $('#btn-hint').disabled = false;
  $('#btn-hint').textContent = '🪲 Pista de Kira';
}

function onAnswer(index, btn) {
  $$('.option').forEach(o => o.disabled = true);
  const wasRestoring = mission.restoring;
  const res = answerQuestion(index);
  btn.classList.add(res.correct ? 'option-correct' : 'option-wrong');
  if (!res.correct) {
    const correctBtn = $$('.option')[mission.current.answer];
    if (correctBtn) correctBtn.classList.add('option-reveal');
  }
  renderHud();

  setTimeout(() => {
    if (wasRestoring) {
      const coins = completeRestore(res.correct);
      showFeedback(res, { restored: res.correct, restoreCoins: coins });
    } else {
      showFeedback(res, {});
    }
  }, 700);
}

function showFeedback(res, extra) {
  renderProgressDots(); /* el punto del reto recién resuelto ya refleja el resultado */
  $('#question-card').classList.add('hidden');
  const card = $('#feedback-card');
  card.classList.remove('hidden');
  const btnRestore = $('#btn-restore');
  btnRestore.classList.add('hidden');

  if (extra.restored) {
    $('#feedback-icon').textContent = '🔧✨';
    $('#feedback-title').textContent = '¡Hallazgo restaurado!';
    $('#feedback-explain').textContent = extra.restoreCoins
      ? `Corregiste tu propio error. +${extra.restoreCoins} 🪙 por restaurar el hallazgo.`
      : 'Corregiste tu propio error. (Ya usaste las 5 restauraciones con premio de hoy.)';
  } else if (res.correct) {
    $('#feedback-icon').textContent = pick(['💎', '🏺', '✨', '🗝️', '🪙']);
    $('#feedback-title').textContent = pick(['¡Hallazgo descubierto!', '¡Excavación perfecta!', '¡Kira aplaude con las antenas!', '¡Tobías ladra de alegría!']);
    $('#feedback-explain').textContent = res.explanation;
  } else {
    $('#feedback-icon').textContent = pick(['🪤', '🕸️', '🪨']);
    $('#feedback-title').textContent = pick([
      '¡Trampa! Bruno ya había caído en esa misma…',
      '¡Zas! Una reja… y Bruno dentro, contando chistes.',
      'La losa se hundió. Tobías te mira con cara de "yo también me equivoco".'
    ]);
    $('#feedback-explain').textContent = res.explanation;
    /* ofrecer restauración del hallazgo (metacognición) */
    if (!mission.restoring) {
      btnRestore.classList.remove('hidden');
      btnRestore.textContent = S.daily.restores_today < 5
        ? '🔧 Restaurar hallazgo (+5 🪙)'
        : '🔧 Restaurar hallazgo (sin premio hoy)';
    }
  }
  $('#btn-next').textContent = mission.index >= mission.questions.length - 1 ? 'Terminar excavación 🏁' : 'Continuar →';
}

$('#btn-restore') && null; /* listeners se registran en init */

function onNext() {
  const next = advance();
  if (next) renderQuestion();
  else {
    const result = finishMission();
    renderResult(result);
    show('result');
  }
}

function onRestore() {
  restoreQuestion();
  $('#feedback-card').classList.add('hidden');
  $('#question-card').classList.remove('hidden');
  renderQuestion();
  toast('Kira: «Mismo tesoro, nuevo intento. ¡Tú puedes!» 🪲');
}

function onHint() {
  const h = requestHint();
  if (!h.ok) {
    toast(h.reason === 'no-coins' ? 'No tienes Doblones para otra pista (10 🪙).' : 'Kira ya no tiene más pistas: ¡confía en tu pala!');
    return;
  }
  $('#kira-box').classList.remove('hidden');
  $('#kira-text').textContent = h.text + (h.cost ? ` (−${h.cost} 🪙)` : '');
  if (mission.hintsShown >= 2) { $('#btn-hint').disabled = true; }
  else { $('#btn-hint').textContent = `🪲 Otra pista (${HINT_EXTRA_COST} 🪙)`; }
  renderHud();
}

/* ── Resultado ── */
function renderResult(r) {
  const meta = STRATA_META[r.stratumId];
  const good = r.accuracy >= 0.7;
  $('#result-emoji').textContent = r.nowMastered ? '🏆' : good ? '💎' : '🧭';
  $('#result-title').textContent = r.nowMastered
    ? `¡Estrato «${meta.name}» dominado!`
    : r.kind === 'bazar' ? 'Encargo completado' : 'Excavación terminada';

  const rewards = $('#result-rewards');
  rewards.innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span><strong>${r.firstTryCorrect}/${r.total}</strong></div>
    <div class="reward-row"><span>⭐ Puntos de Expedición</span><strong>+${r.pe}</strong></div>
    <div class="reward-row"><span>🪙 Doblones</span><strong>+${r.coins}</strong></div>
    ${r.restored ? `<div class="reward-row"><span>🔧 Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
    ${r.notes.map(n => `<div class="reward-note">${n}</div>`).join('')}
    ${r.leveledUp ? `<div class="reward-levelup">🎉 ¡Has subido al nivel ${r.newLevel}! Ahora eres ${rankForLevel(r.newLevel).name}.</div>` : ''}
    ${r.nowMastered ? `<div class="reward-levelup">🗺️ ¡El mapa del Atlas se dibuja un poco más!</div>` : ''}`;

  const dialog = $('#result-dialog');
  let brunoSays;
  if (r.nowMastered) brunoSays = '«¡Extraordinario! Ni yo lo habría hecho mejor… bueno, yo me habría caído en tres trampas. El estrato de abajo ya está desbloqueado.»';
  else if (good) brunoSays = '«¡Buen trabajo, aprendiz! Cada acierto dibuja el mundo. Yo una vez confundí un mapa con una servilleta.»';
  else if (r.restored > 0) brunoSays = '«¿Sabes qué distingue a un gran explorador? Que vuelve a mirar donde se equivocó. ¡Y tú lo has hecho!»';
  else brunoSays = '«Tranquilo, en esa trampa caí yo dos veces… el mismo día. Mañana esa cámara seguirá ahí esperándote.»';
  dialog.innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong><p>${brunoSays}</p></div>`;
  renderHud();
}

/* ── Campamento y almacén ── */
function renderCamp() {
  renderHud();
  $('#camp-avatar').textContent = avatarEmoji();
  const equipped = $('#camp-gear-equipped');
  equipped.innerHTML = S.inventory.gear_equipped.length
    ? S.inventory.gear_equipped.map(id => {
        const item = SHOP_CATALOG.find(i => i.id === id);
        return `<span class="gear-chip" title="${item.name}">${item.icon}</span>`;
      }).join('')
    : '<small>Aún sin equipo. ¡Visita el almacén!</small>';

  const scene = $('#camp-scene');
  const campIcons = S.inventory.camp_items.map(id => SHOP_CATALOG.find(i => i.id === id).icon);
  scene.innerHTML = `<div class="camp-scene-row">⛺ ${campIcons.join(' ')} ${S.inventory.treats_given > 0 ? '🐕' + '🦴'.repeat(Math.min(3, S.inventory.treats_given)) : '🐕'}</div>
    <small>${S.inventory.treats_given > 0 ? 'Tobías está feliz con sus golosinas.' : 'Tobías husmea buscando golosinas…'}</small>`;

  const list = $('#shop-list');
  list.innerHTML = '';
  for (const item of SHOP_CATALOG) {
    const owned = item.type !== 'treat' && (S.inventory.gear_owned.includes(item.id) || S.inventory.camp_items.includes(item.id));
    const equippedNow = S.inventory.gear_equipped.includes(item.id);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `<span class="shop-icon">${item.icon}</span>
      <div class="shop-info"><strong>${item.name}</strong><small>${item.cost} 🪙</small></div>`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-small';
    if (owned && item.type === 'gear') {
      btn.textContent = equippedNow ? 'Quitar' : 'Ponérselo';
      btn.addEventListener('click', () => { toggleEquip(item.id); renderCamp(); });
    } else if (owned) {
      btn.textContent = 'En el campamento';
      btn.disabled = true;
    } else {
      btn.textContent = 'Comprar';
      btn.disabled = S.progression.doubloons_balance < item.cost;
      btn.addEventListener('click', () => {
        const res = buyItem(item.id);
        if (res.ok) {
          toast(item.type === 'treat' ? '¡Tobías da volteretas de alegría! 🐕' : `¡${item.name} conseguido! ${item.icon}`);
          renderCamp();
        } else {
          toast('No tienes Doblones suficientes.');
        }
      });
    }
    row.appendChild(btn);
    list.appendChild(row);
  }
}

/* ── Bitácora ── */
function renderLogbook() {
  renderHud();
  const lb = S.logbook;
  $('#logbook-summary').innerHTML = `
    <div class="logbook-stat"><strong>${lb.stamps_lifetime}</strong><span>sellos ganados</span></div>
    <div class="logbook-stat"><strong>${lb.current_weeks}</strong><span>semanas seguidas</span></div>
    <div class="logbook-stat"><strong>${lb.active_days_this_week.length}/3</strong><span>días esta semana</span></div>
    <div class="logbook-stat"><strong>${(lb.free_rope_used_this_week ? 0 : 1) + lb.rescue_ropes}</strong><span>cuerdas de rescate</span></div>`;

  const stamps = $('#logbook-stamps');
  const history = lb.history.slice(-12);
  stamps.innerHTML = '<div class="stamps-route">' +
    history.map(h => `<span class="stamp ${h.stamped ? 'stamp-earned' : h.protected ? 'stamp-protected' : 'stamp-missed'}"
      title="${h.week_id}">${h.stamped ? '📍' : h.protected ? '🪢' : '·'}</span>`).join('<span class="route-line"></span>') +
    (history.length ? '<span class="route-line"></span>' : '') +
    `<span class="stamp stamp-current" title="Semana actual">${lb.active_days_this_week.length >= 3 ? '📍' : '⏳'}</span>` +
    '</div>';
}

/* ── Dashboard docente ── */
function renderDashboard() {
  renderHud();
  const acc = rollingAccuracy();
  const last7 = S.metrics.sessions_log.filter(e =>
    (new Date(todayStr()) - new Date(e.date)) / 86400000 < 7);
  const minutes7 = last7.reduce((a, e) => a + e.minutes, 0);
  const selfCorrRate = S.metrics.first_try_total
    ? S.metrics.self_corrections / Math.max(1, S.metrics.first_try_total - S.metrics.first_try_correct)
    : 0;

  const kpis = [
    { label: 'Tiempo de excavación (7 días)', value: `${minutes7} min`, note: 'Time-on-Task real, sin menús' },
    { label: 'Precisión móvil (últimas 10)', value: acc === null ? '—' : Math.round(acc * 100) + '%', note: flowZoneStatus() },
    { label: 'Dificultad adaptativa', value: `Nivel ${S.adaptive.tier}/5`, note: 'objetivo: 70–85% de acierto' },
    { label: 'Autocorrección', value: Math.round(selfCorrRate * 100) + '%', note: `${S.metrics.self_corrections} hallazgos restaurados` },
    { label: 'Días activos (semana)', value: S.logbook.active_days_this_week.length, note: `${S.logbook.stamps_lifetime} sellos en total` }
  ];
  $('#dashboard-kpis').innerHTML = kpis.map(k =>
    `<div class="kpi-card"><span class="kpi-value">${k.value}</span><span class="kpi-label">${k.label}</span><small>${k.note}</small></div>`).join('');

  /* mastery por estrato */
  let html = '';
  for (const branchId of DIG_SITES.kaldros.branches) {
    const b = BRANCHES[branchId];
    html += `<div class="dash-branch"><strong>${b.icon} ${b.name}</strong><div class="dash-strata">`;
    for (const sId of STRATA_ORDER) {
      const st = getStratum(branchId, sId);
      const key = `${branchId}.${sId}`;
      const err = S.metrics.errors_by_skill[key];
      const errRate = err && err.attempts ? Math.round((err.errors / err.attempts) * 100) : null;
      html += `<div class="dash-stratum">
        <span class="dash-stratum-label">${STRATA_META[sId].label}</span>
        <div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${Math.round(st.mastery * 100)}%"></div></div>
        <span class="dash-stratum-num">${Math.round(st.mastery * 100)}%${errRate !== null ? ` · err ${errRate}%` : ''}${st.status === 'locked' ? ' 🔒' : ''}</span>
      </div>`;
    }
    html += '</div></div>';
  }
  $('#dashboard-mastery').innerHTML = html;

  /* señales */
  const signals = [];
  if (lowQualityFlag()) signals.push('⚠️ Muchas respuestas en <2 s: posible sesión de baja calidad (responder al azar). Revisar en persona, sin penalizar.');
  if (acc !== null && acc < 0.6) signals.push('⚠️ Precisión por debajo del canal de flujo: el motor ya bajó la dificultad; considerar repaso guiado.');
  if (S.daily.missions_today >= FATIGUE_THRESHOLD) signals.push('ℹ️ Fatiga de expedición activa hoy: las misiones extra dan 50% de PE.');
  const decayed = [];
  for (const branchId of DIG_SITES.kaldros.branches) {
    for (const sId of STRATA_ORDER) {
      const st = getStratum(branchId, sId);
      if (st.status === 'mastered' && sandCover(st) > 0.3) decayed.push(`${BRANCHES[branchId].name} · ${STRATA_META[sId].label}`);
    }
  }
  if (decayed.length) signals.push(`🏜️ Estratos cubriéndose de arena (repaso recomendado): ${decayed.join(', ')}.`);
  if (!signals.length) signals.push('✅ Sin alertas: el alumno trabaja en su zona de flujo.');
  $('#dashboard-signals').innerHTML = signals.map(s => `<div class="signal-row">${s}</div>`).join('');
}

/* ── Arranque ── */
function boot() {
  loadState();
  if (!S) {
    $('#screen-onboarding').classList.remove('hidden');
    $('#app').classList.add('hidden');
    $('#onboarding-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#input-explorer-name').value.trim() || 'Exploradora';
      createState(name);
      startApp();
    });
  } else {
    startApp();
  }

  /* listeners globales */
  $$('[data-nav]').forEach(el => el.addEventListener('click', () => {
    if (mission && el.dataset.nav !== 'map') return; /* no salir a mitad de misión por tabs */
    if (mission) { abandonMission(); }
    show(el.dataset.nav);
  }));
  $('#btn-next').addEventListener('click', onNext);
  $('#btn-restore').addEventListener('click', onRestore);
  $('#btn-hint').addEventListener('click', onHint);
  $('#btn-quit').addEventListener('click', () => {
    abandonMission();
    toast('Bruno: «¡Retirada táctica! El tesoro seguirá ahí mañana.»');
    show('map');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function startApp() {
  $('#screen-onboarding').classList.add('hidden');
  $('#app').classList.remove('hidden');
  const events = rolloverIfNeeded();
  renderHud();
  show('map');
  if (events.firstLoginBonus) {
    const banner = $('#daily-banner');
    banner.innerHTML = `⚓ <strong>Primer desembarco del día:</strong> +${events.firstLoginBonus} 🪙 ¡Bienvenido de vuelta, ${S.profile.explorer_name}!`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 6000);
  }
  if (events.weekStamped) toast('📍 ¡Sello semanal estampado en tu bitácora! +50 🪙', 4000);
  if (events.weekStamped) { earnDoubloons(50); saveState(); renderHud(); }
  if (events.weekProtected) toast('🪢 Una cuerda de rescate protegió tu racha esta semana.', 4000);
}

document.addEventListener('DOMContentLoaded', boot);
