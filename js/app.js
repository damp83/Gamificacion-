/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — app.js
   Interfaz, navegación y arranque de la PWA.
   ═══════════════════════════════════════════════════════════ */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const SCREENS = ['map', 'branch', 'guardian', 'mission', 'result', 'camp', 'merits', 'team', 'logbook', 'dashboard', 'class', 'config'];

function show(screenId) {
  SCREENS.forEach(s => $(`#screen-${s}`).classList.toggle('hidden', s !== screenId));
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.nav === screenId));
  /* En misión los tabs ya estaban bloqueados por código; mostrarlos era
     ofrecer una salida que no existía. Se esconden y queda el reto solo. */
  document.body.classList.toggle('en-mision', screenId === 'mission');
  if (screenId === 'map') renderMap();
  if (screenId === 'camp') renderCamp();
  if (screenId === 'merits') renderMerits();
  if (screenId === 'team') renderTeam();
  if (screenId === 'config') { renderTeacherConfig(); syncBackLabels(); }
  if (screenId === 'class') { renderClassView(); syncBackLabels(); }
  if (screenId === 'logbook') renderLogbook();
  if (screenId === 'dashboard') renderDashboard();
  window.scrollTo(0, 0);
}

/* ── Diálogos propios ──
   Los del navegador (prompt/confirm) quedan bloqueados dentro de un iframe
   con sandbox sin `allow-modals`: prompt() devuelve null y confirm() devuelve
   false, así que el panel no se abría y los borrados se cancelaban solos.
   Estos funcionan en cualquier contexto y se usan mejor con el dedo. */
let modalResolve = null;

function closeModal(value) {
  $('#modal').classList.add('hidden');
  document.removeEventListener('keydown', modalKeys);
  const r = modalResolve;
  modalResolve = null;
  if (r) r(value);
}
function modalKeys(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeModal(null); }
  else if (e.key === 'Enter' && !$('#modal-input').classList.contains('hidden')) {
    e.preventDefault();
    $('#modal-ok').click();
  }
}
function openModal({ text, withInput, okLabel, cancelLabel }) {
  return new Promise(resolve => {
    closeModal(null);           /* nunca dos diálogos a la vez */
    modalResolve = resolve;
    $('#modal-text').textContent = text;
    $('#modal-error').classList.add('hidden');
    const input = $('#modal-input');
    input.value = '';
    input.classList.toggle('hidden', !withInput);
    $('#modal-ok').textContent = okLabel || 'Aceptar';
    $('#modal-cancel').textContent = cancelLabel || 'Cancelar';
    $('#modal').classList.remove('hidden');
    document.addEventListener('keydown', modalKeys);
    if (withInput) setTimeout(() => input.focus(), 50);
    else setTimeout(() => $('#modal-ok').focus(), 50);
  });
}
/* Sustituye a confirm() */
function askConfirm(text, okLabel) {
  return openModal({ text, okLabel: okLabel || 'Sí, adelante' }).then(v => v === true);
}
/* Sustituye a prompt() para el PIN; reintenta hasta acertar o cancelar */
async function askPin(text) {
  while (true) {
    const v = await openModal({ text: text || 'PIN del docente', withInput: true, okLabel: 'Entrar' });
    if (v === null) return false;                    /* cancelado */
    if (v === String(ATLAS_CONFIG.teacherPin)) return true;
    /* PIN erróneo: se vuelve a pedir, diciéndolo */
    text = 'PIN incorrecto. Inténtalo de nuevo.';
  }
}

/* ── Selector de curso ──
   Botones grandes con el curso y la edad: a los 6 años «4.º» solo no dice
   nada, y el docente que ayuda necesita ver la edad de un vistazo. */
function renderGradePicker(containerSel, hiddenSel, initial) {
  const cont = $(containerSel);
  if (!cont) return;
  let value = initial || (ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE);
  const paint = () => {
    cont.innerHTML = GRADES.map(g => `
      <button type="button" class="grade-btn${g.n === value ? ' active' : ''}" data-grade="${g.n}">
        <strong>${g.label}</strong><small>${g.age}</small></button>`).join('');
    cont.querySelectorAll('.grade-btn').forEach(b => b.addEventListener('click', () => {
      value = +b.dataset.grade;
      if (hiddenSel && $(hiddenSel)) $(hiddenSel).value = String(value);
      paint();
    }));
  };
  if (hiddenSel && $(hiddenSel)) $(hiddenSel).value = String(value);
  cont.dataset.grade = String(value);
  paint();
  return () => value;
}
let readGrade = () => ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE;
let readGradeReg = () => ATLAS_CONFIG.defaultGrade || DEFAULT_GRADE;

/* Letra grande: obligatoria de fábrica en 1.º y 2.º, donde la lectura aún
   se está construyendo y un texto pequeño convierte el reto en un examen
   de vista. Se puede cambiar desde el campamento. */
function applyTextSize() {
  const band = S ? bandOf(S.profile.grade) : 2;
  const pref = S && S.profile.accessibility ? S.profile.accessibility.large_text : undefined;
  const grande = pref === undefined ? band === 1 : !!pref;
  document.body.classList.toggle('large-text', grande);
  const cb = $('#pref-large-text');
  if (cb) cb.checked = grande;
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
  if (!S) return;   /* modo docente: no hay diario de alumno que mostrar */
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
  const gi = gradeInfo(S.profile.grade);
  const frags = fragmentsRecovered();
  $('#map-reveal-pct').textContent = `${pct}% del mundo dibujado · ${gi.label} (${gi.age})` +
    (frags ? ` · 🧩 ${frags} fragmento${frags === 1 ? '' : 's'} del Atlas` : '');

  $('#fatigue-banner').classList.toggle('hidden', !isFatigued());

  const siteList = $('#site-list');
  siteList.innerHTML = '';

  const sites = sitesEnabled().filter(site => branchesEnabledOf(site).length);
  if (!sites.length) {
    siteList.innerHTML = `<div class="dialog bruno"><span class="dialog-avatar">🧔🏻‍♂️</span>
      <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
      <p>«Todavía no hay ningún yacimiento abierto… ¡habré perdido los mapas otra vez!
      En cuanto el docente prepare uno, aparecerá aquí.»</p></div></div>`;
    return;
  }

  for (const site of sites) {
    const header = document.createElement('div');
    header.className = 'site-header';
    header.innerHTML = `<span class="site-icon">${site.icon}</span>
      <div><h3>${site.name}</h3><p>${site.subject}${site.desc ? ' · ' + site.desc : ''}</p></div>`;
    siteList.appendChild(header);

    /* Los pozos van en su propia rejilla, no sueltos en la columna: así en
       pantalla ancha se reparten en dos por fila en vez de dejar medio
       lienzo vacío al lado. */
    const grid = document.createElement('div');
    grid.className = 'site-branches';
    siteList.appendChild(grid);

    for (const b of branchesEnabledOf(site)) {
      const strata = branchState(b.id).strata;
      const withContent = STRATA_ORDER.filter(sId => stratumHasContent(b, sId));
      const mastered = withContent.filter(sId => strata[sId].mastery >= 0.8).length;
      const card = document.createElement('button');
      card.className = 'branch-card';
      card.innerHTML = `<span class="branch-icon">${b.icon}</span>
        <div class="branch-info">
          <strong>${b.name}</strong>
          <div class="branch-strata-dots">${withContent.map(sId => {
            const st = strata[sId];
            const cls = st.mastery >= 0.8 ? 'dot-mastered' : st.status === 'locked' ? 'dot-locked' : 'dot-open';
            return `<span class="dot ${cls}" title="${STRATA_META[sId].label}"></span>`;
          }).join('')}</div>
          <small>${mastered}/${withContent.length} estratos dominados</small>
        </div><span class="branch-go">⛏️</span>`;
      card.addEventListener('click', () => openBranch(b.id));
      grid.appendChild(card);
    }
  }

  /* Encargo del Bazar: repaso espaciado con excusa narrativa */
  const bazar = $('#bazar-card');
  const target = bestBazarTarget();
  /* Si el Encargo es la remediación que pide un Guardián, se ofrece aunque el
     estrato esté recién practicado: es justo entonces cuando hace falta. */
  if (target && (target.paraGuardian || target.cover > 0.1) && S.daily.bazar_today < ECO().bazarPerDay) {
    const b = branchDef(target.branchId);
    const meta = STRATA_META[target.stratumId];
    bazar.innerHTML = `<div class="bazar-inner">
      <span class="bazar-icon">${target.paraGuardian ? '🗿' : '🧺'}</span>
      <div><strong>${target.paraGuardian ? 'Repaso para el Guardián' : 'Encargo del Bazar'}</strong>
      <p>${target.paraGuardian
        ? `El Guardián de ${b.name} pide que repases «${meta.name}» antes de dejarte volver a entrar.`
        : `«${meta.name}» de ${b.name} se está cubriendo de arena… Un repaso rápido lo redescubrirá. (+10–15 🪙)`}</p></div>
      <button class="btn btn-secondary" id="btn-bazar">Repasar</button></div>`;
    $('#btn-bazar').addEventListener('click', () => {
      if (!startMission(target.branchId, target.stratumId, 'bazar')) { toast('Ese encargo ya no está disponible.'); return; }
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
  const b = branchDef(branchId);
  if (!b) { show('map'); return; }
  $('#branch-title').textContent = `${b.icon} ${b.name}`;
  $('#branch-desc').textContent = (b.desc || '') + ' Cuanto más profundo excaves, mayor es el tesoro.';
  const list = $('#strata-list');
  list.innerHTML = '';
  const strata = branchState(branchId).strata;

  STRATA_ORDER.forEach((sId, i) => {
    const meta = STRATA_META[sId];
    const hasContent = stratumHasContent(b, sId);
    const st = strata[sId];
    const cover = sandCover(st);
    const locked = st.status === 'locked';
    const row = document.createElement('button');
    row.className = 'stratum-row' + (locked || !hasContent ? ' locked' : '');
    row.disabled = locked || !hasContent;
    const masteryPct = Math.round(st.mastery * 100);

    let detail;
    if (!hasContent) {
      /* pozo del docente a medio llenar: se dice, no se finge que está bloqueado */
      detail = '<small>Este estrato todavía no tiene retos preparados</small>';
    } else if (locked) {
      detail = '<small>Se abre al dominar (≥80%) el estrato de arriba</small>';
    } else {
      detail = `<div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${masteryPct}%"></div></div>
        <small>Dominio: ${masteryPct}%${st.mastery >= 0.9 ? ' · ya excavado (PE al 10%)' : ''}${cover > 0.2 ? ' · 🏜️ cubierto de arena' : ''}</small>`;
    }

    row.innerHTML = `
      <span class="stratum-depth">Estrato ${i + 1}</span>
      <span class="stratum-icon">${!hasContent ? '📭' : locked ? '🔒' : meta.icon}</span>
      <div class="stratum-info"><strong>${meta.label} · «${meta.name}»</strong>${detail}</div>
      <span class="stratum-go">${locked || !hasContent ? '' : '⛏️'}</span>`;

    if (!row.disabled) {
      row.addEventListener('click', () => {
        if (!startMission(branchId, sId, 'expedition')) {
          toast('Ese estrato aún no tiene retos preparados.');
          return;
        }
        renderMissionScreen();
        show('mission');
      });
    }
    list.appendChild(row);
  });

  renderBranchGuardian(branchId);
  show('branch');
}

/* ── La Cámara del Guardián, al fondo del pozo ── */
function renderBranchGuardian(branchId) {
  const cont = $('#branch-guardian');
  const est = guardianStatus(branchId);
  if (est.estado === 'oculta') { cont.innerHTML = ''; return; }

  const nombres = (est.strata || []).map(sId => STRATA_META[sId].label).join(' · ');
  if (est.estado === 'superada') {
    cont.innerHTML = `<div class="guardian-card guardian-done">
      <span class="guardian-card-icon">🗿</span>
      <div><strong>Cámara del Guardián · superada</strong>
      <small>Recuperaste el fragmento del Atlas de este pozo${est.fecha ? ' el ' + est.fecha.split('-').reverse().slice(0,2).join('/') : ''}.</small></div>
      <span class="guardian-card-go">🧩</span></div>`;
    return;
  }
  if (est.estado === 'cerrada') {
    const faltan = est.faltan.map(sId => STRATA_META[sId].label).join(', ');
    cont.innerHTML = `<div class="guardian-card guardian-locked">
      <span class="guardian-card-icon">🔒</span>
      <div><strong>Cámara del Guardián</strong>
      <small>Se abre con todo el pozo dominado. Te falta: ${faltan}.</small></div></div>`;
    return;
  }
  if (est.estado === 'repaso') {
    const w = STRATA_META[est.weak] ? STRATA_META[est.weak].label : '';
    cont.innerHTML = `<div class="guardian-card guardian-wait">
      <span class="guardian-card-icon">🧺</span>
      <div><strong>El Guardián te espera</strong>
      <small>Pide un Encargo del Bazar sobre <strong>${w}</strong> antes de volver a intentarlo.
      Lo tienes en el mapa.</small></div></div>`;
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'guardian-card guardian-open';
  btn.innerHTML = `<span class="guardian-card-icon">🗿</span>
    <div><strong>Cámara del Guardián</strong>
    <small>${est.intentos ? 'Vuelve a intentarlo. ' : ''}Todo el pozo dominado: ${nombres}</small></div>
    <span class="guardian-card-go">→</span>`;
  btn.addEventListener('click', () => openGuardianHall(branchId));
  cont.innerHTML = '';
  cont.appendChild(btn);
}

/* ── Antesala: se ve lo que va a preguntar antes de entrar ── */
let guardianBranch = null;
function openGuardianHall(branchId) {
  guardianBranch = branchId;
  const b = branchDef(branchId);
  const est = guardianStatus(branchId);
  const g = ATLAS_CONFIG.guardian || {};
  if (est.estado !== 'abierta') { openBranch(branchId); return; }

  /* el rostro del Guardián ya está justo encima: repetir el emoji en el título
     solo hacía la línea más larga */
  $('#guardian-title').textContent = `Cámara del Guardián · ${b.name}`;
  $('#guardian-dialog').innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
    <p>«${est.intentos
      ? 'El Guardián ya te vio una vez. No te preocupes: a mí me echó cuatro veces seguidas, y a la quinta me dejó pasar por pena.'
      : 'Ahí está. Lleva mil años esperando a alguien que se sepa el pozo entero. No pregunta nada nuevo: pregunta todo a la vez.'}»</p></div>`;

  /* Se enseña de qué va a preguntar: una evaluación no debería sorprender */
  $('#guardian-strata').innerHTML = est.strata.map(sId => {
    const meta = STRATA_META[sId];
    const st = getStratum(branchId, sId);
    return `<div class="guardian-stratum">
      <span class="guardian-stratum-icon">${meta.icon}</span>
      <div><strong>${meta.label}</strong><small>«${meta.name}» · lo llevas al ${Math.round(st.mastery * 100)}%</small></div>
    </div>`;
  }).join('');

  const total = Math.max(4, Math.min(20, g.questions || 10));
  const acts = $('#guardian-actions');
  acts.innerHTML = `<p class="guardian-meta">${total} retos encadenados ·
    hacen falta ${Math.round((g.passAccuracy || 0.8) * 100)}% de aciertos a la primera ·
    premio: 🧩 un fragmento del Atlas y ${g.coins || 100} 🪙</p>`;
  const entrar = document.createElement('button');
  entrar.className = 'btn btn-primary';
  entrar.id = 'guardian-enter';
  entrar.textContent = 'Entrar en la cámara 🗿';
  entrar.addEventListener('click', () => {
    if (!startGuardian(branchId)) { toast('La cámara no está abierta ahora mismo.'); openBranch(branchId); return; }
    renderMissionScreen();
    show('mission');
  });
  acts.appendChild(entrar);
  show('guardian');
}

/* ── Misión ── */
function renderMissionScreen() {
  const b = branchDef(mission.branchId);
  const meta = STRATA_META[mission.stratumId];
  $('#mission-title').textContent =
      mission.kind === 'bazar'    ? `🧺 Encargo: ${meta.name}`
    : mission.kind === 'guardian' ? `🗿 Cámara del Guardián · ${b.name}`
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
    /* La letra la pinta el CSS desde aquí: así se puede nombrar la opción en
       voz alta («la C») y todos los textos arrancan en la misma columna. */
    btn.dataset.letra = 'ABCD'[i];
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
      'La losa se hundió. Tobías te mira con cara de «yo también me equivoco».'
    ]);
    $('#feedback-explain').textContent = res.explanation;
    /* ofrecer restauración del hallazgo (metacognición) */
    if (!mission.restoring) {
      btnRestore.classList.remove('hidden');
      btnRestore.textContent = S.daily.restores_today < ECO().restoresPerDay
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
  else { $('#btn-hint').textContent = `🪲 Otra pista (${ECO().hintCost} 🪙)`; }
  renderHud();
}

/* ── Resultado ── */
function renderResult(r) {
  if (r.kind === 'guardian') return renderGuardianResult(r);
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
    ${r.nowMastered ? `<div class="reward-levelup">🗺️ ¡El mapa del Atlas se dibuja un poco más!</div>` : ''}
    ${r.reabreGuardian ? `<div class="reward-levelup">🗿 La Cámara del Guardián vuelve a estar abierta.</div>` : ''}`;

  const dialog = $('#result-dialog');
  let brunoSays;
  if (r.nowMastered) brunoSays = '«¡Extraordinario! Ni yo lo habría hecho mejor… bueno, yo me habría caído en tres trampas. El estrato de abajo ya está desbloqueado.»';
  else if (good) brunoSays = '«¡Buen trabajo, aprendiz! Cada acierto dibuja el mundo. Yo una vez confundí un mapa con una servilleta.»';
  else if (r.reabreGuardian) brunoSays = '«¡Repaso hecho! El Guardián ya no tiene excusa: su cámara vuelve a estar abierta para ti.»';
  else if (r.restored > 0) brunoSays = '«¿Sabes qué distingue a un gran explorador? Que vuelve a mirar donde se equivocó. ¡Y tú lo has hecho!»';
  else brunoSays = '«Tranquilo, en esa trampa caí yo dos veces… el mismo día. Mañana esa cámara seguirá ahí esperándote.»';
  dialog.innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong><p>${brunoSays}</p></div>`;
  renderHud();
}

/* ── Resultado de la Cámara del Guardián ──
   Ganar da un fragmento del Atlas; perder no quita nada. Lo que sí hace el
   Guardián en las dos es decir DÓNDE se falló: una evaluación que no explica
   el error no sirve de nada a un niño de nueve años. */
function renderGuardianResult(r) {
  const b = branchDef(r.branchId);
  $('#result-emoji').textContent = r.superada ? '🧩' : '🗿';
  $('#result-title').textContent = r.superada
    ? '¡Fragmento del Atlas recuperado!'
    : 'El Guardián no te deja pasar… todavía';

  /* Reparto de fallos por estrato: el mapa del error, no solo la nota */
  const desglose = (r.strata || []).map(sId => {
    const meta = STRATA_META[sId];
    const err = r.errorsByStratum[sId] || 0;
    return `<div class="reward-row"><span>${meta.icon} ${meta.label}</span>
      <strong>${err ? err + (err === 1 ? ' fallo' : ' fallos') : 'sin fallos'}</strong></div>`;
  }).join('');

  $('#result-rewards').innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span>
      <strong>${r.firstTryCorrect}/${r.total} (${Math.round(r.accuracy * 100)}%)</strong></div>
    <div class="reward-row"><span>Hacía falta</span><strong>${Math.round(r.umbral * 100)}%</strong></div>
    ${desglose}
    ${r.pe ? `<div class="reward-row"><span>⭐ Puntos de Expedición</span><strong>+${r.pe}</strong></div>` : ''}
    ${r.coins ? `<div class="reward-row"><span>🪙 Doblones</span><strong>+${r.coins}</strong></div>` : ''}
    ${r.restored ? `<div class="reward-row"><span>🔧 Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
    ${r.leveledUp ? `<div class="reward-levelup">🎉 ¡Has subido al nivel ${r.newLevel}! Ahora eres ${rankForLevel(r.newLevel).name}.</div>` : ''}
    ${r.fragment ? `<div class="reward-levelup">🧩 Llevas ${r.fragmentsTotal} fragmento(s) del Atlas de Ossian.</div>` : ''}
    ${!r.superada ? `<div class="reward-note">No has perdido nada: ni PE, ni Doblones, ni dominio.
      El Guardián quiere que repases <strong>${STRATA_META[r.weakStratum] ? STRATA_META[r.weakStratum].label : ''}</strong>
      en un Encargo del Bazar y vuelvas.</div>` : ''}`;

  const bruno = r.superada
    ? `«¡LO HAS HECHO! Mil años esperando y llega ${S.profile.explorer_name} y lo resuelve antes de merendar.
       Yo tardé tres expediciones… y en la primera me quedé encerrado dentro.»`
    : `«¡Uf! El Guardián ha dicho que no. A mí me dijo que no tantas veces que me aprendí su cara de memoria.
       Mira dónde has fallado, hazte un Encargo del Bazar y vuelve. Sigue estando todo tuyo: no has perdido ni un Doblón.»`;
  $('#result-dialog').innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong><p>${bruno}</p></div>`;
  renderHud();
}

/* ── Campamento y almacén ── */
function renderCamp() {
  renderHud();
  applyTextSize();
  $('#camp-avatar').textContent = avatarEmoji();
  const equipped = $('#camp-gear-equipped');
  equipped.innerHTML = S.inventory.gear_equipped.length
    ? S.inventory.gear_equipped.map(id => {
        const item = shopCatalog().find(i => i.id === id);
        return `<span class="gear-chip" title="${item.name}">${item.icon}</span>`;
      }).join('')
    : '<small>Aún sin equipo. ¡Visita el almacén!</small>';

  const scene = $('#camp-scene');
  const campIcons = S.inventory.camp_items.map(id => (shopCatalog().find(i => i.id === id) || { icon: '📦' }).icon);
  scene.innerHTML = `<div class="camp-scene-row">⛺ ${campIcons.join(' ')} ${S.inventory.treats_given > 0 ? '🐕' + '🦴'.repeat(Math.min(3, S.inventory.treats_given)) : '🐕'}</div>
    <small>${S.inventory.treats_given > 0 ? 'Tobías está feliz con sus golosinas.' : 'Tobías husmea buscando golosinas…'}</small>`;

  renderFund();

  const list = $('#shop-list');
  list.innerHTML = '';
  for (const item of shopCatalog()) {
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

/* ── Fondo de la Sociedad Geográfica ──
   El almacén se agota en tres o cuatro semanas; a partir de ahí los Doblones
   dejan de significar nada. El Fondo es un sumidero sin fondo y cooperativo:
   lo donado no vuelve, no da ninguna ventaja y los hitos son de la clase
   entera, no de quien más done (por eso no se muestra quién ha donado qué). */
function fundTotal() {
  const f = ATLAS_CONFIG.fund || {};
  const mio = (S.progression.fund_donated) || 0;
  /* El total de clase lo anota el docente y puede ir por detrás de la
     realidad; si lo mío ya lo supera, mando yo. Así el niño siempre ve
     moverse la barra cuando dona, con o sin conexión. */
  return Math.max(Number(f.classTotal) || 0, mio);
}

function renderFund() {
  const f = ATLAS_CONFIG.fund || {};
  const block = $('#fund-block');
  if (!block) return;
  block.classList.toggle('hidden', !f.enabled);
  if (!f.enabled) return;

  $('#fund-title').textContent = '🌍 ' + (f.name || 'Fondo de la Sociedad Geográfica');
  $('#fund-blurb').textContent = f.blurb || '';

  const total = fundTotal();
  const { alcanzados, siguiente } = fundMilestoneFor(total);
  const desde = alcanzados.length ? alcanzados[alcanzados.length - 1].at : 0;
  const hasta = siguiente ? siguiente.at : desde;
  const pct = hasta > desde ? Math.min(100, Math.round((total - desde) / (hasta - desde) * 100)) : 100;

  $('#fund-progress').innerHTML = `
    <div class="fund-bar"><div class="fund-bar-fill" style="width:${pct}%"></div></div>
    <div class="fund-bar-legend">
      <strong>${total} 🪙</strong> reunidos entre toda la clase
      ${siguiente ? `<span>· faltan <strong>${Math.max(0, hasta - total)}</strong> para ${siguiente.icon} ${siguiente.name}</span>` : ''}
    </div>`;

  const hitos = (f.milestones || []).concat(
    alcanzados.filter(m => !(f.milestones || []).some(x => x.at === m.at)));
  $('#fund-milestones').innerHTML = hitos.map(m => {
    const hecho = total >= m.at;
    return `<div class="fund-milestone ${hecho ? 'fund-done' : ''}">
      <span class="fund-icon">${hecho ? m.icon : '🔒'}</span>
      <div><strong>${m.name}</strong><small>${hecho ? m.desc : `Se abre con ${m.at} 🪙 de la clase`}</small></div>
    </div>`;
  }).join('');

  const cont = $('#fund-buttons');
  cont.innerHTML = '';
  for (const n of (f.steps || [5, 10, 25, 50])) {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btn-small';
    b.textContent = `${n} 🪙`;
    b.disabled = S.progression.doubloons_balance < n;
    b.addEventListener('click', () => {
      const res = donateToFund(n);
      if (!res.ok) { toast('No tienes Doblones suficientes.'); return; }
      const antes = fundMilestoneFor(total).alcanzados.length;
      const ahora = fundMilestoneFor(fundTotal()).alcanzados.length;
      toast(ahora > antes
        ? '¡Hito conseguido! La Sociedad se pone manos a la obra 🎉'
        : `¡Gracias! ${n} 🪙 para el Fondo.`);
      renderCamp();
    });
    cont.appendChild(b);
  }

  const mio = S.progression.fund_donated || 0;
  $('#fund-mine').textContent = mio
    ? `Tú has aportado ${mio} 🪙 al Fondo. Donar no da ninguna ventaja: es por las ruinas.`
    : 'Donar es voluntario y no da ninguna ventaja en las excavaciones.';
}

/* ── Bitácora ── */
function renderLogbook() {
  renderHud();
  const lb = S.logbook;
  $('#logbook-summary').innerHTML = `
    <div class="logbook-stat"><strong>${lb.stamps_lifetime}</strong><span>sellos ganados</span></div>
    <div class="logbook-stat"><strong>${lb.current_weeks}</strong><span>semanas seguidas</span></div>
    <div class="logbook-stat"><strong>${lb.active_days_this_week.length}/3</strong><span>días esta semana</span></div>
    <div class="logbook-stat"><strong>${(lb.free_rope_used_this_week ? 0 : 1) + lb.rescue_ropes}</strong><span>cuerdas de rescate</span></div>
    <div class="logbook-stat"><strong>${fragmentsRecovered()}</strong><span>fragmentos del Atlas</span></div>`;

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
  renderCourse();
  $('#dashboard-kpis').innerHTML = kpis.map(k =>
    `<div class="kpi-card"><span class="kpi-value">${k.value}</span><span class="kpi-label">${k.label}</span><small>${k.note}</small></div>`).join('');

  /* mastery por estrato */
  let html = '';
  for (const branchId of playableBranchIds()) {
    const b = branchDef(branchId);
    html += `<div class="dash-branch"><h4>${b.icon} ${b.name}</h4><div class="dash-strata">`;
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(b, sId)) continue;
      const st = getStratum(branchId, sId);
      const key = `${branchId}.${sId}`;
      const err = S.metrics.errors_by_skill[key];
      const errRate = err && err.attempts ? Math.round((err.errors / err.attempts) * 100) : null;
      /* El candado iba al final de la cifra y se leía como parte del dato;
         ahora acompaña a la etiqueta, que es de lo que informa. */
      html += `<div class="dash-row">
        <span class="dash-row-label">${STRATA_META[sId].label}${st.status === 'locked' ? ' 🔒' : ''}</span>
        <div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${Math.round(st.mastery * 100)}%"></div></div>
        <span class="dash-row-num">${Math.round(st.mastery * 100)}%${errRate !== null ? ` · err ${errRate}%` : ''}</span>
      </div>`;
    }
    html += '</div></div>';
  }
  $('#dashboard-mastery').innerHTML = html;

  /* señales */
  const signals = [];
  if (lowQualityFlag()) signals.push('⚠️ Muchas respuestas en <2 s: posible sesión de baja calidad (responder al azar). Revisar en persona, sin penalizar.');
  if (acc !== null && acc < 0.6) signals.push('⚠️ Precisión por debajo del canal de flujo: el motor ya bajó la dificultad; considerar repaso guiado.');
  if (isFatigued()) signals.push('ℹ️ Fatiga de expedición activa hoy: las misiones extra dan 50% de PE.');
  const decayed = [];
  for (const branchId of playableBranchIds()) {
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(branchDef(branchId), sId)) continue;
      const st = getStratum(branchId, sId);
      if (st.status === 'mastered' && sandCover(st) > 0.3) decayed.push(`${branchDef(branchId).name} · ${STRATA_META[sId].label}`);
    }
  }
  if (decayed.length) signals.push(`🏜️ Estratos cubriéndose de arena (repaso recomendado): ${decayed.join(', ')}.`);
  if (!signals.length) signals.push('✅ Sin alertas: el alumno trabaja en su zona de flujo.');
  $('#dashboard-signals').innerHTML = signals.map(s => `<div class="signal-row">${s}</div>`).join('');
}

/* ── Cuadrilla de Excavación ── */
function renderTeam() {
  renderHud();
  const t = ATLAS_CONFIG.teams;
  const body = $('#team-body');

  if (!t || !t.enabled) {
    body.innerHTML = '<p class="empty-note">Las cuadrillas están desactivadas en esta clase.</p>';
    return;
  }
  const team = myTeam();
  if (!team) {
    body.innerHTML = `<div class="dialog bruno"><span class="dialog-avatar">🧔🏻‍♂️</span>
      <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
      <p>«Todavía no te he asignado cuadrilla, ${S.profile.explorer_name}. ¡Paciencia!
      En cuanto lo haga, aparecerá aquí tu equipo.»</p></div></div>`;
    return;
  }

  const share = teamGoalShare();
  const mine = Math.round(S.progression.team_contribution);
  const pct = share ? Math.min(100, Math.round((mine / share) * 100)) : 0;

  body.innerHTML = `
    <div class="team-banner">
      <span class="team-icon">${team.icon}</span>
      <div><h3>${team.name}</h3>
        <p>${(team.members || []).length} exploradores</p></div>
    </div>

    <div class="team-goal">
      <strong>${t.goalLabel}</strong>
      <p class="team-goal-note">Toda la clase excava hacia la misma meta. Cada Doblón que ganas
      aporta un poco, y <em>no se descuenta de tu bolsa</em>: cooperar no cuesta nada.</p>
      <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
      <div class="team-goal-nums"><span>Tu aportación: <strong>${mine} 🪙</strong></span>
        <span>Tu parte de la meta: <strong>${share} 🪙</strong></span></div>
    </div>

    <h3>Tus compañeros de cuadrilla</h3>
    <div class="team-members">
      ${(team.members || []).map(m => {
        const me = m.trim().toLowerCase() === (S.profile.explorer_name || '').trim().toLowerCase();
        return `<span class="team-member${me ? ' team-me' : ''}">${me ? '🧭 ' : '🧒 '}${m}${me ? ' (tú)' : ''}</span>`;
      }).join('')}
    </div>

    ${t.showComparison ? `<h3>Las demás cuadrillas</h3>
      <div class="team-others">${t.list.filter(x => x.id !== team.id).map(x =>
        `<div class="team-other"><span>${x.icon}</span> ${x.name}
         <small>${(x.members || []).length} exploradores</small></div>`).join('')}</div>` : ''}`;
}

/* ── Méritos de Campamento ── */
function meritStats() {
  const byId = {};
  let coins = 0;
  for (const e of S.behavior_log) {
    const b = ATLAS_CONFIG.behaviors.find(x => x.id === e.id);
    if (!b) continue; /* mérito retirado del catálogo por el docente */
    byId[e.id] = (byId[e.id] || 0) + 1;
    coins += b.coins;
  }
  return { total: S.behavior_log.length, coins, byId };
}

function renderMerits() {
  renderHud();
  const st = meritStats();
  const tri = S.course.trimesters[currentTrimesterIndex()];
  $('#merits-summary').innerHTML = `
    <div class="logbook-stat"><strong>${st.total}</strong><span>méritos ganados</span></div>
    <div class="logbook-stat"><strong>${st.coins}</strong><span>🪙 por comportamiento</span></div>
    <div class="logbook-stat"><strong>${tri.merits}</strong><span>este trimestre</span></div>`;

  /* lo conseguido hoy, con el tope a la vista */
  const today = todayStr();
  $('#merits-today').innerHTML = ATLAS_CONFIG.behaviors.map(b => {
    const n = S.behavior_log.filter(e => e.id === b.id && e.date === today).length;
    return `<div class="merit-row${n ? ' merit-earned' : ''}">
      <span class="merit-icon">${b.icon}</span>
      <div class="merit-info"><strong>${b.name}</strong><small>${b.coins} 🪙 · hasta ${b.perDay} al día</small></div>
      <span class="merit-count">${n ? '⭐'.repeat(Math.min(n, 5)) : '—'}</span>
    </div>`;
  }).join('');

  /* diario: agrupado por día, del más reciente al más antiguo */
  const days = {};
  for (const e of S.behavior_log) (days[e.date] = days[e.date] || []).push(e);
  const orderedDays = Object.keys(days).sort().reverse().slice(0, 7);
  $('#merits-history').innerHTML = orderedDays.length
    ? orderedDays.map(d => {
        const icons = days[d].map(e => {
          const b = ATLAS_CONFIG.behaviors.find(x => x.id === e.id);
          return b ? `<span title="${b.name}">${b.icon}</span>` : '';
        }).join('');
        return `<div class="history-day"><span class="history-date">${formatDay(d)}</span>
          <span class="history-icons">${icons}</span></div>`;
      }).join('')
    : '<p class="empty-note">Aún no hay méritos. ¡El Prof. Ocaña está observando! 🧔🏻‍♂️</p>';
}

function formatDay(d) {
  const today = todayStr();
  if (d === today) return 'Hoy';
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === yest) return 'Ayer';
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

/* Panel del docente: PIN de aula, no seguridad real (el código es visible) */
let teacherUnlocked = false;
function renderAwardList() {
  $('#award-list').innerHTML = '';
  for (const b of ATLAS_CONFIG.behaviors) {
    const used = behaviorCountToday(b.id);
    const full = used >= b.perDay;
    const btn = document.createElement('button');
    btn.className = 'award-btn' + (full ? ' award-full' : '');
    btn.disabled = full;
    btn.innerHTML = `<span class="award-icon">${b.icon}</span>
      <span class="award-name">${b.name}</span>
      <span class="award-meta">+${b.coins} 🪙 · ${used}/${b.perDay}</span>`;
    btn.addEventListener('click', () => {
      const res = awardBehavior(b.id);
      if (res.ok) {
        toast(`${b.icon} ¡${b.name}! +${b.coins} 🪙`);
        renderMerits();
        renderAwardList();
        showTeacherPanel();
      } else if (res.reason === 'cap') {
        toast('Ya se alcanzó el tope de hoy para ese mérito.');
      }
    });
    $('#award-list').appendChild(btn);
  }
}
function showTeacherPanel() {
  $('#teacher-locked').classList.add('hidden');
  $('#teacher-award').classList.remove('hidden');
  $('#btn-teacher-panel').classList.add('hidden');
}

/* ── Vista general de la clase ── */
let classData = null;
let classSort = 'atencion';

function classStatus(html) { $('#class-status').innerHTML = html; }

async function renderClassView() {
  renderHud();
  if (classData) return paintClassView();

  $('#class-body').classList.add('hidden');
  classStatus('<p class="class-loading">Reuniendo los diarios de la expedición…</p>');

  /* Sin nube no hay forma de leer los diarios de los demás: se dice y se
     muestra al menos el de esta tablet, etiquetado como lo que es. */
  if (!cloudEnabled() || !cloudUser()) {
    classData = buildClassOverview(S ? [{ id: 'local', name: S.profile.explorer_name, state: S }] : []);
    classData.localOnly = true;
    return paintClassView();
  }

  const res = await fetchClassDocs();
  if (!res.ok) {
    classData = null;
    return classStatus(classErrorHtml(res));
  }
  classData = buildClassOverview(parseClassDocs(res.docs));
  paintClassView();
}

function classErrorHtml(res) {
  if (res.reason === 'sin-permiso') {
    return `<div class="class-error">
      <h3>Falta permiso para leer la clase</h3>
      <p>Tu cuenta puede leer su propio diario, pero no los de los demás. Es lo correcto
      por defecto: así ningún alumno ve el progreso de otro.</p>
      <p>Para que tú sí puedas, en la consola de Appwrite:</p>
      <ol>
        <li>Crea un <strong>equipo</strong> (por ejemplo <code>docentes</code>) y añádete a él.</li>
        <li>En la colección de diarios → <strong>Permissions</strong>, da <strong>Read</strong> al rol de ese equipo.</li>
        <li>Cierra sesión y vuelve a entrar.</li>
      </ol>
      <p class="cfg-hint">Los alumnos siguen sin poder leerse entre ellos: el permiso es solo para el equipo docente.</p>
    </div>`;
  }
  return `<div class="class-error">
    <h3>No se han podido reunir los diarios</h3>
    <p>${res.reason === 'sin-nube' ? 'No hay sesión en la nube ahora mismo.' : 'Ha fallado la consulta.'}</p>
    ${res.detail ? `<p class="cfg-hint">${res.detail}</p>` : ''}
    <button class="btn btn-secondary btn-small" onclick="classData=null;renderClassView()">Reintentar</button>
  </div>`;
}

function paintClassView() {
  const d = classData;
  $('#class-body').classList.remove('hidden');

  const clase = (ATLAS_CONFIG.className || '').trim();
  const enLista = (ATLAS_CONFIG.roster || []).length;
  classStatus(d.localOnly
    ? `<div class="class-note">📱 <strong>Solo esta tablet.</strong> Sin cuentas en la nube no se pueden
       reunir los diarios de los demás, así que abajo aparece únicamente quien está usando este
       dispositivo. Configura Appwrite para ver la clase entera.</div>`
    : `<p class="class-meta">${clase ? clase + ' · ' : ''}${d.students.length} explorador(es)${
        enLista ? ` de ${enLista} en la lista` : ''} · datos al ${d.generatedAt}</p>`);

  if (!d.students.length) {
    $('#class-students').innerHTML = '<p class="empty-note">Todavía no hay ningún diario de expedición.</p>';
    $('#class-kpis').innerHTML = '';
    $('#class-teams').innerHTML = '';
    $('#class-alerts').innerHTML = '';
    $('#class-missing').innerHTML = '';
    return;
  }

  const k = d.kpis;
  $('#class-kpis').innerHTML = [
    { v: k.students, l: 'Exploradores', n: `${k.activeThisWeek} activos esta semana` },
    { v: k.minutesPerSession.toFixed(1) + ' min', l: 'Excavación por sesión', n: 'atención de calidad' },
    { v: k.strataPerStudent.toFixed(1), l: 'Estratos por alumno', n: 'velocidad de excavación' },
    { v: k.inFlowPct === null ? '—' : Math.round(k.inFlowPct * 100) + '%', l: 'En zona de flujo', n: 'objetivo: 70–85% de acierto' },
    { v: k.needHelp, l: 'Necesitan rescate', n: '3 o más señales a la vez' }
  ].map(x => `<div class="kpi-card"><span class="kpi-value">${x.v}</span>
      <span class="kpi-label">${x.l}</span><small>${x.n}</small></div>`).join('');

  const urgentes = d.students.filter(s => s.needsHelp);
  $('#class-alerts').innerHTML = urgentes.length
    ? `<div class="class-alert"><strong>🛟 Alerta de rescate:</strong>
        ${urgentes.map(s => s.name).join(', ')} — ${urgentes.length === 1 ? 'acumula' : 'acumulan'}
        tres o más señales. Míralo en persona antes de tocar nada del juego.</div>`
    : '';

  $('#class-students').innerHTML = sortStudents(d.students, classSort).map(s => `
    <div class="student-card${s.needsHelp ? ' student-alert' : ''}">
      <div class="student-head">
        <strong>${s.name}</strong>
        <span class="student-rank">Nv. ${s.level} · ${s.rank}</span>
      </div>
      <div class="student-bars">
        <div class="student-bar-row">
          <span>Dominio medio</span>
          <div class="mastery-bar"><div class="mastery-fill${s.avgMastery >= 0.8 ? ' gold' : ''}" style="width:${Math.round(s.avgMastery * 100)}%"></div></div>
          <span class="student-num">${Math.round(s.avgMastery * 100)}%</span>
        </div>
      </div>
      <div class="student-stats">
        <span title="Estratos dominados de los disponibles">⛏️ ${s.mastered}/${s.totalStrata} estratos</span>
        <span title="Minutos de excavación en 7 días">⏱️ ${s.minutes7} min/7d</span>
        <span title="Días activos de los 3 que exige el sello">📅 ${s.activeDays}/3 días</span>
        <span title="Precisión en las últimas 10 respuestas">🎯 ${s.accuracy === null ? '—' : Math.round(s.accuracy * 100) + '%'}</span>
        <span title="Hallazgos restaurados (autocorrección)">🔧 ${s.selfCorrections}</span>
        <span title="Méritos concedidos">🏅 ${s.merits}</span>
        <span title="Cámaras del Guardián superadas">🧩 ${s.fragments} fragmentos</span>
      </div>
      ${s.signals.length ? `<div class="student-signals">${s.signals.map(x => `<span class="signal-chip">${x}</span>`).join('')}</div>` : ''}
      ${s.stuck.length ? `<small class="student-stuck">Atascado en: ${s.stuck.join(' · ')}</small>` : ''}
      <small class="student-seen">Última expedición: ${s.lastSeen || '—'}</small>
    </div>`).join('');

  const cmp = ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.enabled;
  $('#class-teams').innerHTML = !cmp
    ? '<p class="empty-note">Las cuadrillas están desactivadas.</p>'
    : d.teams.map(t => {
        const meta = ATLAS_CONFIG.teams.goalTarget || 1;
        const pct = Math.min(100, Math.round((t.contribution / meta) * 100));
        return `<div class="class-team">
          <div class="class-team-head"><span>${t.icon} <strong>${t.name}</strong></span>
            <span class="student-num">${t.contribution} / ${meta} 🪙</span></div>
          <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
          <small>${t.members} con diario${t.listed !== t.members ? ` de ${t.listed} asignados` : ''} · ${t.mastered} estratos entre todos</small>
        </div>`;
      }).join('');

  $('#class-missing').innerHTML = d.missing.length
    ? `<div class="class-warn">⚠️ Asignados a una cuadrilla pero sin diario:
        ${d.missing.map(m => `<strong>${m.name}</strong> (${m.team})`).join(', ')}.
        O aún no se han registrado, o el nombre no coincide con el que escribieron.</div>`
    : '';

  paintClassFund(d);
}

/* El total real del Fondo solo se puede sumar aquí, leyendo todos los diarios.
   Los alumnos no ven esta pantalla, así que hace falta anotarlo en la
   configuración para que la barra del campamento diga la verdad. */
function paintClassFund(d) {
  const cont = $('#class-fund');
  if (!cont) return;
  const f = ATLAS_CONFIG.fund || {};
  if (!f.enabled) { cont.innerHTML = ''; return; }

  const real = d.kpis.fundTotal || 0;
  const anotado = Number(f.classTotal) || 0;
  const { siguiente } = fundMilestoneFor(real);
  cont.innerHTML = `
    <h3>🌍 ${f.name || 'Fondo de la Sociedad'}</h3>
    <p class="class-meta">Donado de verdad entre todos: <strong>${real} 🪙</strong> ·
      anotado en la configuración: <strong>${anotado} 🪙</strong>
      ${siguiente ? `· siguiente hito: ${siguiente.icon} ${siguiente.name} (${siguiente.at} 🪙)` : ''}</p>
    ${real !== anotado
      ? `<button class="btn btn-secondary btn-small" id="class-fund-sync">📌 Anotar ${real} 🪙 para que lo vea la clase</button>`
      : '<p class="cfg-hint">La clase ya ve el total correcto.</p>'}`;

  const btn = $('#class-fund-sync');
  if (btn) btn.addEventListener('click', () => {
    setTeacherConfig('fund.classTotal', real);
    toast('Anotado ✓ La clase ya ve ' + real + ' 🪙 en el Fondo.');
    paintClassFund(d);
  });
}

/* ── El curso por trimestres (cuaderno docente) ── */
function renderCourse() {
  const now = currentTrimesterIndex();
  const rows = ATLAS_CONFIG.course.trimesters.map((t, i) => {
    const c = S.course.trimesters[i];
    const state = i === now ? 'en curso' : (i < now ? 'cerrado' : 'por venir');
    return `<div class="tri-card${i === now ? ' tri-current' : ''}">
      <div class="tri-head"><strong>${t.name}</strong><span class="tri-state">${state}</span></div>
      <div class="tri-dates">${t.start.split('-').reverse().slice(0,2).join('/')} – ${t.end.split('-').reverse().slice(0,2).join('/')}</div>
      <div class="tri-stats">
        <span><strong>${c.strata}</strong> estratos</span>
        <span><strong>${c.pe}</strong> PE</span>
        <span><strong>${c.stamps}</strong> sellos</span>
        <span><strong>${c.merits}</strong> méritos</span>
      </div>
    </div>`;
  }).join('');
  $('#dashboard-course').innerHTML =
    `<p class="course-label">${ATLAS_CONFIG.course.label}</p><div class="tri-grid">${rows}</div>`;
}

/* ── Acceso con Appwrite ── */
function authError(msg) {
  const el = $('#auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function friendlyAuthError(e) {
  const m = (e && e.message) || '';
  if (/Invalid credentials|Invalid `?password/i.test(m)) return 'Usuario o contraseña incorrectos. Inténtalo otra vez.';
  if (/already exists/i.test(m)) return 'Ese usuario ya existe. Prueba con otro o entra con tu contraseña.';
  if (/at least 8/i.test(m)) return 'La contraseña necesita 8 letras o números como mínimo.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con la Sociedad Geográfica. Revisa la red.';
  return 'No se ha podido entrar: ' + (m || 'error desconocido');
}

function showAuth() {
  readGradeReg = renderGradePicker('#grade-picker-reg', null) || readGradeReg;
  $('#screen-home').classList.add('hidden');
  $('#screen-teacher').classList.add('hidden');
  $('#screen-auth').classList.remove('hidden');
  $('#screen-onboarding').classList.add('hidden');
  $('#app').classList.add('hidden');
}

/* Estado remoto vs. local: gana el más reciente (updated_at) */
function adoptState(remote) {
  const local = loadState();
  if (remote && local) {
    S = (remote.updated_at || 0) >= (local.updated_at || 0) ? migrateState(remote) : local;
  } else if (remote) {
    S = migrateState(remote);
  } /* si no hay remoto, S ya es el local (o null) */
  return S;
}

/* ── Portada ──
   Primera pantalla de todos: cuenta la historia y separa los dos caminos.
   El docente entra sin necesidad de la sesión de ningún alumno. */
let teacherOnly = false;

function showHome() {
  teacherOnly = false;
  document.body.classList.remove('teacher-mode');
  ['#screen-auth', '#screen-onboarding', '#screen-teacher'].forEach(x => $(x).classList.add('hidden'));
  $('#app').classList.add('hidden');
  $('#screen-home').classList.remove('hidden');
  renderHomeSites();
  renderTeacherSignature();
  window.scrollTo(0, 0);
}

/* Quién dirige esta expedición: solo se muestra si el docente lo ha puesto */
function renderTeacherSignature() {
  const el = $('#home-teacher-line');
  const nombre = (ATLAS_CONFIG.teacherName || '').trim();
  const clase = (ATLAS_CONFIG.className || '').trim();
  if (!nombre && !clase) { el.classList.add('hidden'); return; }
  const partes = [];
  if (clase) partes.push(`Clase de <strong>${clase}</strong>`);
  if (nombre) partes.push(`Expedición dirigida por <strong>${nombre}</strong>`);
  el.innerHTML = '🧭 ' + partes.join(' · ');
  el.classList.remove('hidden');
}

/* Los yacimientos de la portada salen de la configuración real: si el docente
   crea uno de Lengua, aparece aquí sin tocar nada. */
function renderHomeSites() {
  const sites = sitesEnabled().filter(site => branchesEnabledOf(site).length);
  $('#home-sites').innerHTML = sites.length
    ? sites.map(site => `<div class="home-site">
        <span class="home-site-icon">${site.icon}</span>
        <div><strong>${site.name}</strong>
          <small>${site.subject}${site.desc ? ' · ' + site.desc : ''}</small>
          <div class="home-site-wells">${branchesEnabledOf(site)
            .map(b => `<span class="home-well">${b.icon} ${b.name}</span>`).join('')}</div>
        </div>
      </div>`).join('')
    : '<p class="empty-note">El profesor aún está preparando los yacimientos.</p>';
}

/* Entrada del alumno: al acceso con cuentas, o al onboarding si es modo local */
function startStudentPath() {
  $('#screen-home').classList.add('hidden');
  if (cloudConfigured() && cloudEnabled()) {
    if (cloudUser() && S) return startApp();
    return showAuth();
  }
  if (S) return startApp();
  showOnboarding();
}

/* Entrada del docente: sin diario de alumno, sin HUD y sin pestañas */
/* El saludo se recalcula cada vez que se muestra: si no, al volver del panel
   seguiría con el texto de antes de poner el nombre. */
function showTeacherPortal() {
  const nombre = (ATLAS_CONFIG.teacherName || '').trim();
  const clase = (ATLAS_CONFIG.className || '').trim();
  $('#teacher-greeting').textContent = nombre
    ? `Bienvenido, ${nombre}. Desde aquí ves cómo va ${clase || 'la clase'} y preparas la expedición.`
    : 'Desde aquí ves cómo va la clase y preparas la expedición. Puedes poner tu nombre en Configuración → Alumnado.';
  $('#screen-home').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#screen-teacher').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function enterTeacherMode() {
  teacherOnly = true;
  document.body.classList.add('teacher-mode');
  showTeacherPortal();
}
function teacherScreen(which) {
  $('#screen-teacher').classList.add('hidden');
  $('#app').classList.remove('hidden');
  show(which);
}

/* En modo docente no existe el cuaderno de ningún alumno: los botones de
   volver deben decir a dónde llevan de verdad. */
function syncBackLabels() {
  const label = teacherOnly ? '← Volver a la sala de mapas' : '← Volver al cuaderno';
  $$('#screen-class .btn-back, #screen-config .btn-back').forEach(b => { b.textContent = label; });
}

/* ── Arranque ── */
async function boot() {
  loadTeacherConfig();   /* ajustes del docente sobre los valores de fábrica */
  loadConfigMeta();
  wireGlobalListeners();

  /* Configurado para la nube pero el SDK no está disponible (sin red, CDN
     bloqueado en el centro…): avisar EN PANTALLA. Si no, el docente creería
     que los diarios se guardan en la nube y solo estarían en cada tablet. */
  if (cloudConfigured() && typeof Appwrite === 'undefined') {
    showCloudWarning();
  }

  /* Modo nube: si Appwrite está configurado y el SDK cargó */
  if (cloudInit()) {
    $('#btn-logout').classList.remove('hidden');
    wireAuthListeners();
    try { await cloudResume().then(adoptState); } catch (e) { /* sin sesión previa */ }
    /* Ajustes del equipo docente. Si fallan, la tablet sigue con los suyos:
       nunca se queda sin configuración por un problema de red. */
    try { await syncSharedConfig(); } catch (e) { /* se queda con los locales */ }
  } else {
    /* Modo local: el progreso vive en este navegador */
    loadState();
  }

  /* Todos empiezan en la portada: es donde se explica y se elige camino */
  showHome();
}

function showCloudWarning() {
  const bar = document.createElement('div');
  bar.className = 'cloud-warning';
  bar.innerHTML = '⚠️ <strong>Sin conexión con la Sociedad Geográfica.</strong> ' +
    'Se puede jugar, pero el diario se guarda solo en esta tablet y no se sincroniza. ' +
    'Avisa al docente.';
  document.body.prepend(bar);
}

function showOnboarding() {
  readGrade = renderGradePicker('#grade-picker', '#input-grade') || readGrade;
  $('#screen-home').classList.add('hidden');
  $('#screen-teacher').classList.add('hidden');
  $('#screen-auth').classList.add('hidden');
  $('#screen-onboarding').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function wireGlobalListeners() {
  $$('[data-nav]').forEach(el => el.addEventListener('click', () => {
    if (mission && el.dataset.nav !== 'map') return; /* no salir a mitad de misión por tabs */
    if (mission) { abandonMission(); }
    /* en modo docente no hay cuaderno de alumno al que volver: se sale al portal */
    if (teacherOnly && el.dataset.nav === 'dashboard') { showTeacherPortal(); return; }
    show(el.dataset.nav);
  }));
  $('#guardian-back').addEventListener('click', () => {
    if (guardianBranch) openBranch(guardianBranch); else show('map');
  });
  $('#btn-next').addEventListener('click', onNext);
  $('#btn-restore').addEventListener('click', onRestore);
  $('#btn-hint').addEventListener('click', onHint);
  $('#btn-quit').addEventListener('click', () => {
    abandonMission();
    toast('Bruno: «¡Retirada táctica! El tesoro seguirá ahí mañana.»');
    show('map');
  });

  $('#onboarding-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#input-explorer-name').value.trim() || 'Exploradora';
    createState(name);
    S.profile.grade = readGrade();
    saveState();
    startApp();
  });

  $('#pref-large-text').addEventListener('change', e => {
    S.profile.accessibility = S.profile.accessibility || {};
    S.profile.accessibility.large_text = e.target.checked;
    saveState();
    applyTextSize();
  });

  /* Panel del docente (PIN de aula) */
  $('#btn-teacher-panel').addEventListener('click', () => {
    if (teacherUnlocked) { renderAwardList(); showTeacherPanel(); return; }
    $('#teacher-locked').classList.remove('hidden');
    $('#btn-teacher-panel').classList.add('hidden');
    $('#pin-input').focus();
  });
  $('#pin-form').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#pin-input').value === String(ATLAS_CONFIG.teacherPin)) {
      teacherUnlocked = true;
      $('#pin-error').classList.add('hidden');
      $('#pin-input').value = '';
      renderAwardList();
      showTeacherPanel();
    } else {
      $('#pin-error').classList.remove('hidden');
      $('#pin-input').value = '';
    }
  });
  $('#btn-close-panel').addEventListener('click', () => {
    $('#teacher-award').classList.add('hidden');
    $('#btn-teacher-panel').classList.remove('hidden');
  });

  $('#home-student').addEventListener('click', startStudentPath);
  $('#home-teacher').addEventListener('click', async () => {
    if (!teacherUnlocked && !(await askPin())) return;
    teacherUnlocked = true;
    enterTeacherMode();
  });
  $('#teacher-go-class').addEventListener('click', () => { classData = null; teacherScreen('class'); });
  $('#teacher-go-config').addEventListener('click', () => { cfgSection = 'curso'; teacherScreen('config'); });
  $('#teacher-exit').addEventListener('click', showHome);

  $('#btn-open-class').addEventListener('click', async () => {
    if (!teacherUnlocked && !(await askPin())) return;
    teacherUnlocked = true;
    classData = null;               /* siempre datos frescos al entrar */
    show('class');
  });
  $('#class-sort').addEventListener('change', e => { classSort = e.target.value; paintClassView(); });
  $('#class-reload').addEventListener('click', () => { classData = null; renderClassView(); });

  $('#btn-open-config').addEventListener('click', async () => {
    if (!teacherUnlocked && !(await askPin())) return;
    teacherUnlocked = true;
    cfgSection = 'curso';
    show('config');
  });

  $('#btn-logout').addEventListener('click', async () => {
    if (!(await askConfirm('¿Cerrar sesión? Tu diario queda guardado en la nube.', 'Cerrar sesión'))) return;
    await cloudPush();          /* volcar lo pendiente antes de salir */
    await cloudLogout();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sin almacenamiento */ }
    S = null;
    teacherUnlocked = false;
    showHome();
  });

  $('#modal-ok').addEventListener('click', () => {
    const input = $('#modal-input');
    closeModal(input.classList.contains('hidden') ? true : input.value);
  });
  $('#modal-cancel').addEventListener('click', () => closeModal(null));
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(null); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* último volcado a la nube al cerrar la pestaña */
  window.addEventListener('pagehide', () => { if (cloudEnabled() && cloudUser()) cloudPush(); });
}

function wireAuthListeners() {
  const showTab = (login) => {
    $('#tab-login').classList.toggle('active', login);
    $('#tab-register').classList.toggle('active', !login);
    $('#login-form').classList.toggle('hidden', !login);
    $('#register-form').classList.toggle('hidden', login);
    $('#auth-error').classList.add('hidden');
  };
  $('#tab-login').addEventListener('click', () => showTab(true));
  $('#tab-register').addEventListener('click', () => showTab(false));

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#login-form button');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const remote = await cloudLogin($('#login-user').value, $('#login-pass').value);
      adoptState(remote);
      if (S) startApp(); else showOnboarding();
    } catch (err) {
      authError(friendlyAuthError(err));
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar a la expedición 🎒';
    }
  });

  $('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#register-form button');
    btn.disabled = true; btn.textContent = 'Creando…';
    try {
      const name = $('#reg-name').value.trim() || 'Explorador';
      await cloudRegister(name, $('#reg-user').value, $('#reg-pass').value);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e2) { /* sin almacenamiento */ }
      createState(name);        /* diario nuevo, se sube al primer guardado */
      S.profile.grade = readGradeReg();
      saveState();
      startApp();
    } catch (err) {
      authError(friendlyAuthError(err));
    } finally {
      btn.disabled = false; btn.textContent = 'Crear mi diario 📔';
    }
  });
}

function startApp() {
  teacherOnly = false;
  document.body.classList.remove('teacher-mode');
  $('#tab-team').classList.toggle('hidden', !(ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.enabled));
  $('#screen-home').classList.add('hidden');
  $('#screen-teacher').classList.add('hidden');
  $('#screen-auth').classList.add('hidden');
  $('#screen-onboarding').classList.add('hidden');
  $('#app').classList.remove('hidden');
  const events = rolloverIfNeeded();
  applyTextSize();
  renderHud();
  show('map');
  if (events.firstLoginBonus) {
    const banner = $('#daily-banner');
    banner.innerHTML = `⚓ <strong>Primer desembarco del día:</strong> +${events.firstLoginBonus} 🪙 ¡Bienvenido de vuelta, ${S.profile.explorer_name}!`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 6000);
  }
  if (events.weekStamped) { earnDoubloons(50); saveState(); renderHud(); toast('📍 ¡Sello semanal estampado en tu bitácora! +50 🪙', 4000); }
  if (events.weekProtected) toast('🪢 Una cuerda de rescate protegió tu racha esta semana.', 4000);
}

document.addEventListener('DOMContentLoaded', boot);
