/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — play.js
   Las pantallas del alumno: el mapa de yacimientos, el pozo y sus
   estratos, la Cámara del Guardián, la misión en curso con su feedback,
   el resultado, el Campamento Base, el Fondo de la Sociedad, la bitácora,
   las cuadrillas, los méritos y el cuaderno.

   Todo lo de aquí pinta lo que el motor (game.js) y el estado (state.js)
   deciden; ninguna regla del juego vive en este fichero.
   ═══════════════════════════════════════════════════════════ */

/* ── Mapa ── */
function renderMap() {
  renderHud();
  const pct = Math.round(mapRevealPct() * 100);
  $('#map-reveal-fill').style.width = pct + '%';
  const gi = gradeInfo(S.profile.grade);
  const frags = fragmentsRecovered();
  $('#map-reveal-pct').textContent = `${pct}% del mundo dibujado · ${gi.label} (${gi.age})` +
    (frags ? ` · ${frags} fragmento${frags === 1 ? '' : 's'} del Atlas` : '');

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
    header.innerHTML = `<span class="site-icon">${esc(site.icon)}</span>
      <div><h3>${esc(site.name)}</h3><p>${esc(site.subject)}${esc(site.desc ? ' · ' + site.desc : '')}</p></div>`;
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
      card.innerHTML = `<span class="branch-icon">${esc(b.icon)}</span>
        <div class="branch-info">
          <strong>${esc(b.name)}</strong>
          <div class="branch-strata-dots">${withContent.map(sId => {
            const st = strata[sId];
            const cls = st.mastery >= 0.8 ? 'dot-mastered' : st.status === 'locked' ? 'dot-locked' : 'dot-open';
            return `<span class="dot ${cls}" title="${STRATA_META[sId].label}"></span>`;
          }).join('')}</div>
          <small>${mastered}/${withContent.length} estratos dominados</small>
        </div><span class="branch-go">${ico('pickaxe')}</span>`;
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
      <span class="bazar-icon">${ico(target.paraGuardian ? 'idol' : 'basket')}</span>
      <div><strong>${target.paraGuardian ? 'Repaso para el Guardián' : 'Encargo del Bazar'}</strong>
      <p>${target.paraGuardian
        ? `El Guardián de ${esc(b.name)} pide que repases «${meta.name}» antes de dejarte volver a entrar.`
        : `«${meta.name}» de ${esc(b.name)} se está cubriendo de arena… Un repaso rápido lo redescubrirá. (+10–15 ${ico('coin')})`}</p></div>
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
    row.className = 'stratum-row' + (locked || !hasContent ? ' locked' : '')
      + (st.mastery >= 0.8 ? ' excavado' : '');
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
        <small>Dominio: ${masteryPct}%${st.mastery >= 0.9 ? ' · ya excavado (PE al 10%)' : ''}${cover > 0.2 ? ' · cubierto de arena' : ''}</small>`;
    }

    row.innerHTML = `
      <span class="stratum-depth"><i>Estrato</i><b>${i + 1}</b></span>
      <span class="stratum-icon">${ico(!hasContent ? 'crate' : locked ? 'lock' : ICO_ESTRATO[sId])}</span>
      <div class="stratum-info"><strong>${meta.label} · «${meta.name}»</strong>${detail}</div>
      <span class="stratum-go">${locked || !hasContent ? '' : ico('pickaxe')}</span>`;

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
      <span class="guardian-card-icon">${ico('idol','ico-lg')}</span>
      <div><strong>Cámara del Guardián · superada</strong>
      <small>Recuperaste el fragmento del Atlas de este pozo${est.fecha ? ' el ' + est.fecha.split('-').reverse().slice(0,2).join('/') : ''}.</small></div>
      <span class="guardian-card-go">${ico('pickaxe')}</span></div>`;
    return;
  }
  if (est.estado === 'cerrada') {
    const faltan = est.faltan.map(sId => STRATA_META[sId].label).join(', ');
    cont.innerHTML = `<div class="guardian-card guardian-locked">
      <span class="guardian-card-icon">${ico('lock','ico-lg')}</span>
      <div><strong>Cámara del Guardián</strong>
      <small>Se abre con todo el pozo dominado. Te falta: ${faltan}.</small></div></div>`;
    return;
  }
  if (est.estado === 'repaso') {
    const w = STRATA_META[est.weak] ? STRATA_META[est.weak].label : '';
    cont.innerHTML = `<div class="guardian-card guardian-wait">
      <span class="guardian-card-icon">${ico('basket','ico-lg')}</span>
      <div><strong>El Guardián te espera</strong>
      <small>Pide un Encargo del Bazar sobre <strong>${w}</strong> antes de volver a intentarlo.
      Lo tienes en el mapa.</small></div></div>`;
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'guardian-card guardian-open';
  btn.innerHTML = `<span class="guardian-card-icon">${ico('idol','ico-lg')}</span>
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
      <span class="guardian-stratum-icon">${ico(ICO_ESTRATO[sId])}</span>
      <div><strong>${meta.label}</strong><small>«${meta.name}» · lo llevas al ${Math.round(st.mastery * 100)}%</small></div>
    </div>`;
  }).join('');

  const total = Math.max(4, Math.min(20, g.questions || 10));
  const acts = $('#guardian-actions');
  acts.innerHTML = `<p class="guardian-meta">${total} retos encadenados ·
    hacen falta ${Math.round((g.passAccuracy || 0.8) * 100)}% de aciertos a la primera ·
    premio: ${ico('map')} un fragmento del Atlas y ${g.coins || 100} ${ico('coin')}</p>`;
  const entrar = document.createElement('button');
  entrar.className = 'btn btn-primary';
  entrar.id = 'guardian-enter';
  entrar.innerHTML = 'Entrar en la cámara ' + ico('idol');
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
  $('#mission-title').innerHTML =
      mission.kind === 'bazar'    ? `${ico('basket')} Encargo: ${esc(meta.name)}`
    : mission.kind === 'guardian' ? `${ico('idol')} Cámara del Guardián · ${esc(b.name)}`
    : `<span class="mh-site">${esc(b.icon)} ${esc(b.name)}</span>
       <span class="mh-sep"></span>
       ${ico(ICO_ESTRATO[mission.stratumId])} ${esc(meta.label)}`;
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
  $('#btn-hint').innerHTML = ico('beetle') + ' Pista de Kira';
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
    selloFeedback('wrench', 'logro');
    $('#feedback-title').textContent = '¡Hallazgo restaurado!';
    $('#feedback-explain').textContent = extra.restoreCoins
      ? `Corregiste tu propio error. +${extra.restoreCoins} doblones por restaurar el hallazgo.`
      : 'Corregiste tu propio error. (Ya usaste las 5 restauraciones con premio de hoy.)';
  } else if (res.correct) {
    selloFeedback('check', 'bien');
    $('#feedback-title').textContent = pick(['¡Hallazgo descubierto!', '¡Excavación perfecta!', '¡Kira aplaude con las antenas!', '¡Tobías ladra de alegría!']);
    $('#feedback-explain').textContent = res.explanation;
  } else {
    selloFeedback('cross', 'mal');
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
        ? 'Restaurar hallazgo (+5 doblones)'
        : 'Restaurar hallazgo (sin premio hoy)';
    }
  }
  $('#btn-next').textContent = mission.index >= mission.questions.length - 1 ? 'Terminar excavación' : 'Continuar →';
}

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
    toast(h.reason === 'no-coins' ? 'No tienes Doblones para otra pista (cuesta 10).' : 'Kira ya no tiene más pistas: ¡confía en tu pala!');
    return;
  }
  $('#kira-box').classList.remove('hidden');
  $('#kira-text').textContent = h.text + (h.cost ? ` (−${h.cost} doblones)` : '');
  if (mission.hintsShown >= 2) { $('#btn-hint').disabled = true; }
  else { $('#btn-hint').innerHTML = `${ico('beetle')} Otra pista (${ECO().hintCost} ${ico('coin')})`; }
  renderHud();
}

/* ── Resultado ── */
function renderResult(r) {
  if (r.kind === 'guardian') return renderGuardianResult(r);
  const meta = STRATA_META[r.stratumId];
  const good = r.accuracy >= 0.7;
  /* Sello de expedición en vez de un emoji gigante: el premio se estampa. */
  sello(r.nowMastered ? 'medal' : good ? 'star' : 'compass', r.nowMastered || good);
  $('#result-title').textContent = r.nowMastered
    ? `¡Estrato «${meta.name}» dominado!`
    : r.kind === 'bazar' ? 'Encargo completado' : 'Excavación terminada';

  const rewards = $('#result-rewards');
  rewards.innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span><strong>${r.firstTryCorrect}/${r.total}</strong></div>
    <div class="reward-row"><span>${ico('star')} Puntos de Expedición</span><strong>+${r.pe}</strong></div>
    <div class="reward-row"><span>${ico('coin')} Doblones</span><strong>+${r.coins}</strong></div>
    ${r.restored ? `<div class="reward-row"><span>${ico('vessel')} Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
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

/* Estampa el sello del resultado. `logrado` distingue el latón encendido
   de la versión apagada, para que ganar y no ganar no se vean igual. */
function sello(nombre, logrado) {
  const el = $('#result-emoji');
  el.className = 'sello' + (logrado ? ' sello-logro' : '');
  el.innerHTML = ico(nombre, 'ico-lg');
}

/* Sello del aviso que aparece justo después de responder. `tono` decide el
   color: bien, mal o logro. */
function selloFeedback(nombre, tono) {
  const el = $('#feedback-icon');
  el.className = 'sello sello-' + tono;
  el.innerHTML = ico(nombre, 'ico-lg');
}

/* ── Resultado de la Cámara del Guardián ──
   Ganar da un fragmento del Atlas; perder no quita nada. Lo que sí hace el
   Guardián en las dos es decir DÓNDE se falló: una evaluación que no explica
   el error no sirve de nada a un niño de nueve años. */
function renderGuardianResult(r) {
  const b = branchDef(r.branchId);
  sello(r.superada ? 'map' : 'idol', r.superada);
  $('#result-title').textContent = r.superada
    ? '¡Fragmento del Atlas recuperado!'
    : 'El Guardián no te deja pasar… todavía';

  /* Reparto de fallos por estrato: el mapa del error, no solo la nota */
  const desglose = (r.strata || []).map(sId => {
    const meta = STRATA_META[sId];
    const err = r.errorsByStratum[sId] || 0;
    return `<div class="reward-row"><span>${ico(ICO_ESTRATO[sId])} ${meta.label}</span>
      <strong>${err ? err + (err === 1 ? ' fallo' : ' fallos') : 'sin fallos'}</strong></div>`;
  }).join('');

  $('#result-rewards').innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span>
      <strong>${r.firstTryCorrect}/${r.total} (${Math.round(r.accuracy * 100)}%)</strong></div>
    <div class="reward-row"><span>Hacía falta</span><strong>${Math.round(r.umbral * 100)}%</strong></div>
    ${desglose}
    ${r.pe ? `<div class="reward-row"><span>${ico('star')} Puntos de Expedición</span><strong>+${r.pe}</strong></div>` : ''}
    ${r.coins ? `<div class="reward-row"><span>${ico('coin')} Doblones</span><strong>+${r.coins}</strong></div>` : ''}
    ${r.restored ? `<div class="reward-row"><span>${ico('vessel')} Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
    ${r.leveledUp ? `<div class="reward-levelup">🎉 ¡Has subido al nivel ${r.newLevel}! Ahora eres ${rankForLevel(r.newLevel).name}.</div>` : ''}
    ${r.fragment ? `<div class="reward-levelup">${ico('map')} Llevas ${r.fragmentsTotal} fragmento(s) del Atlas de Ossian.</div>` : ''}
    ${!r.superada ? `<div class="reward-note">No has perdido nada: ni PE, ni Doblones, ni dominio.
      El Guardián quiere que repases <strong>${STRATA_META[r.weakStratum] ? STRATA_META[r.weakStratum].label : ''}</strong>
      en un Encargo del Bazar y vuelvas.</div>` : ''}`;

  const bruno = r.superada
    ? `«¡LO HAS HECHO! Mil años esperando y llega ${esc(S.profile.explorer_name)} y lo resuelve antes de merendar.
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
        return `<span class="gear-chip" title="${esc(item.name)}">${esc(item.icon)}</span>`;
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
    row.innerHTML = `<span class="shop-icon">${esc(item.icon)}</span>
      <div class="shop-info"><strong>${esc(item.name)}</strong><small>${item.cost} ${ico('coin')}</small></div>`;
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
  /* El total de clase lo anota el docente leyendo todos los diarios, así que
     YA incluye lo de este niño: sumarle lo suyo lo contaría dos veces. Se coge
     el mayor de los dos, que además evita que la barra retroceda cuando el
     apunte del docente va por detrás de la realidad.
     Consecuencia que conviene tener presente: si el total de clase va por
     delante, una donación pequeña no mueve la barra. Lo que sí confirma
     siempre que ha llegado es el aviso al donar y la línea de «tú has
     aportado», que salen de la bolsa del propio niño. */
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
      <strong>${total} ${ico('coin')}</strong> reunidos entre toda la clase
      ${siguiente ? `<span>· faltan <strong>${Math.max(0, hasta - total)}</strong> para ${esc(siguiente.icon)} ${esc(siguiente.name)}</span>` : ''}
    </div>`;

  const hitos = (f.milestones || []).concat(
    alcanzados.filter(m => !(f.milestones || []).some(x => x.at === m.at)));
  $('#fund-milestones').innerHTML = hitos.map(m => {
    const hecho = total >= m.at;
    return `<div class="fund-milestone ${hecho ? 'fund-done' : ''}">
      <span class="fund-icon">${hecho ? esc(m.icon) : ico('lock')}</span>
      <div><strong>${esc(m.name)}</strong><small>${hecho ? esc(m.desc) : `Se abre con ${m.at} ${ico('coin')} de la clase`}</small></div>
    </div>`;
  }).join('');

  const cont = $('#fund-buttons');
  cont.innerHTML = '';
  for (const n of (f.steps || [5, 10, 25, 50])) {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btn-small';
    b.innerHTML = `${n} ${ico('coin')}`;
    b.disabled = S.progression.doubloons_balance < n;
    b.addEventListener('click', () => {
      const res = donateToFund(n);
      if (!res.ok) { toast('No tienes Doblones suficientes.'); return; }
      const antes = fundMilestoneFor(total).alcanzados.length;
      const ahora = fundMilestoneFor(fundTotal()).alcanzados.length;
      toast(ahora > antes
        ? '¡Hito conseguido! La Sociedad se pone manos a la obra 🎉'
        : `¡Gracias! ${n} doblones para el Fondo.`);
      renderCamp();
    });
    cont.appendChild(b);
  }

  const mio = S.progression.fund_donated || 0;
  /* Va por innerHTML porque lleva el icono del doblón dentro. Con textContent
     el niño leía el `<svg viewBox=...>` entero en mitad de la frase. */
  $('#fund-mine').innerHTML = mio
    ? `Tú has aportado ${Number(mio) || 0} ${ico('coin')} al Fondo. Donar no da ninguna ventaja: es por las ruinas.`
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
    html += `<div class="dash-branch"><h4>${esc(b.icon)} ${esc(b.name)}</h4><div class="dash-strata">`;
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
  /* ── Conceptos flojos de ESTE alumno ──
     El dominio por estrato dice cuánto; esto dice qué. Es lo que se mira
     antes de sentarse cinco minutos con un niño. */
  const flojos = typeof conceptosFlojos === 'function' ? conceptosFlojos(5) : [];
  if (flojos.length) {
    html += `<div class="dash-branch dash-conceptos">
      <h4>${ico('target')} Le está costando</h4>
      ${flojos.map(c => {
        const info = conceptoInfo(c.id);
        return `<div class="dash-row">
          <span class="dash-row-label">${esc(info.label)} <em>${esc(info.area)}</em></span>
          <div class="mastery-bar"><div class="mastery-fill" style="width:${Math.round(c.tasa * 100)}%"></div></div>
          <span class="dash-row-num">${c.errors}/${c.attempts} fallos</span>
        </div>`;
      }).join('')}
    </div>`;
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
      if (st.status === 'mastered' && sandCover(st) > 0.3) decayed.push(`${esc(branchDef(branchId).name)} · ${STRATA_META[sId].label}`);
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
      <p>«Todavía no te he asignado cuadrilla, ${esc(S.profile.explorer_name)}. ¡Paciencia!
      En cuanto lo haga, aparecerá aquí tu equipo.»</p></div></div>`;
    return;
  }

  const share = teamGoalShare();
  const mine = Math.round(S.progression.team_contribution);
  const pct = share ? Math.min(100, Math.round((mine / share) * 100)) : 0;

  body.innerHTML = `
    <div class="team-banner">
      <span class="team-icon">${esc(team.icon)}</span>
      <div><h3>${esc(team.name)}</h3>
        <p>${(team.members || []).length} exploradores</p></div>
    </div>

    <div class="team-goal">
      <strong>${t.goalLabel}</strong>
      <p class="team-goal-note">Toda la clase excava hacia la misma meta. Cada Doblón que ganas
      aporta un poco, y <em>no se descuenta de tu bolsa</em>: cooperar no cuesta nada.</p>
      <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
      <div class="team-goal-nums"><span>Tu aportación: <strong>${mine} ${ico('coin')}</strong></span>
        <span>Tu parte de la meta: <strong>${share} ${ico('coin')}</strong></span></div>
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
        `<div class="team-other"><span>${esc(x.icon)}</span> ${esc(x.name)}
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
    <div class="logbook-stat"><strong>${st.coins}</strong><span>${ico('coin')} por comportamiento</span></div>
    <div class="logbook-stat"><strong>${tri.merits}</strong><span>este trimestre</span></div>`;

  /* lo conseguido hoy, con el tope a la vista */
  const today = todayStr();
  $('#merits-today').innerHTML = ATLAS_CONFIG.behaviors.map(b => {
    const n = S.behavior_log.filter(e => e.id === b.id && e.date === today).length;
    return `<div class="merit-row${n ? ' merit-earned' : ''}">
      <span class="merit-icon">${esc(b.icon)}</span>
      <div class="merit-info"><strong>${esc(b.name)}</strong><small>${b.coins} ${ico('coin')} · hasta ${b.perDay} al día</small></div>
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
          return b ? `<span title="${esc(b.name)}">${esc(b.icon)}</span>` : '';
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
    btn.innerHTML = `<span class="award-icon">${esc(b.icon)}</span>
      <span class="award-name">${esc(b.name)}</span>
      <span class="award-meta">+${b.coins} ${ico('coin')} · ${used}/${b.perDay}</span>`;
    btn.addEventListener('click', () => {
      const res = awardBehavior(b.id);
      if (res.ok) {
        toast(`${b.icon} ¡${b.name}! +${b.coins} doblones`);
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


/* ══════════ MIS CLASES ══════════
   Con varios docentes en el mismo despliegue, cada uno entra con su cuenta y
   ve solo sus clases. El aislamiento lo garantizan los permisos de Appwrite;
   esta pantalla es el camino para llegar a ellas. */

/* ── El curso por trimestres (cuaderno docente) ── */
function renderCourse() {
  const now = currentTrimesterIndex();
  const rows = ATLAS_CONFIG.course.trimesters.map((t, i) => {
    const c = S.course.trimesters[i];
    const state = i === now ? 'en curso' : (i < now ? 'cerrado' : 'por venir');
    return `<div class="tri-card${i === now ? ' tri-current' : ''}">
      <div class="tri-head"><strong>${esc(t.name)}</strong><span class="tri-state">${state}</span></div>
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
    `<p class="course-label">${esc(ATLAS_CONFIG.course.label)}</p><div class="tri-grid">${rows}</div>`;
}
