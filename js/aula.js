/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — aula.js
   Las pantallas del docente dentro del aula, que son tres y distintas:

   · «Mis clases»  — entrar con su cuenta, crear una clase y abrirla en
                     este equipo (renderAulas y compañía).
   · Clase dirigida — el docente pregunta desde su equipo y el alumnado
                     responde en voz alta, repartiendo turnos.
   · Vista de clase — todos los diarios de un vistazo, con las señales de
                     rescate del PRD §6.

   El cálculo del resumen NO está aquí: vive en classview.js, que es una
   función pura y se prueba con datos de mentira. Esto solo lo pinta.
   ═══════════════════════════════════════════════════════════ */

function aulasMsg(texto, tono) {
  const el = $('#aulas-msg');
  el.textContent = texto || '';
  el.className = 'cfg-warn' + (texto ? '' : ' hidden');
  if (texto && tono === 'ok') el.className = 'cfg-equipo cfg-equipo-ok';
}

function docError(texto) {
  const el = $('#doc-error');
  el.textContent = texto || '';
  el.classList.toggle('hidden', !texto);
}

async function renderAulas() {
  const acceso = $('#aulas-acceso');
  const zona = $('#aulas-lista-zona');

  if (!aulasOn()) {
    acceso.classList.add('hidden');
    zona.classList.add('hidden');
    $('#aulas-sub').innerHTML = 'Para que <strong>varios docentes</strong> usen la plataforma con ' +
      'sus clases por separado hace falta configurar Appwrite y la colección de aulas, en ' +
      '<em>Configurar la expedición → Acceso y nube</em>. Sin eso, esta plataforma funciona ' +
      'con una sola clase guardada en este equipo.';
    return;
  }
  if (!cloudUser()) {
    acceso.classList.remove('hidden');
    zona.classList.add('hidden');
    docError('');
    return;
  }
  acceso.classList.add('hidden');
  zona.classList.remove('hidden');

  const lista = $('#aulas-lista');
  lista.innerHTML = '<p class="class-loading">Buscando tus clases…</p>';
  const res = await cloudListAulas();
  if (!res.ok) {
    lista.innerHTML = '';
    aulasMsg(res.reason === 'sin-permiso'
      ? '⚠️ Tu cuenta no puede leer la colección de aulas. Revisa sus permisos en Appwrite.'
      : '⚠️ No se han podido consultar tus clases' + (res.detail ? ': ' + res.detail : '.'));
    return;
  }
  aulasMsg('');

  if (!res.aulas.length) {
    lista.innerHTML = '<p class="empty-note">Todavía no tienes ninguna clase. Crea la primera ' +
      'y empieza a dirigir sesiones: sus diarios quedarán guardados en tu cuenta.</p>';
    return;
  }

  lista.innerHTML = '';
  for (const a of res.aulas) {
    const abierta = aulaActiva() === a.id;
    const card = document.createElement('button');
    card.className = 'aula-alumno-card' + (abierta ? ' aula-ya' : '');
    card.innerHTML = `<span class="aula-card-avatar">${abierta ? '📂' : '🏫'}</span>
      <span class="aula-card-nombre">${esc(a.name)}</span>
      <span class="aula-card-meta">${abierta ? 'abierta en este equipo' : 'pulsa para abrirla'}</span>`;
    card.addEventListener('click', () => abrirAulaUI(a));
    lista.appendChild(card);
  }
}

async function abrirAulaUI(a) {
  const cambia = aulaActiva() && aulaActiva() !== a.id;
  if (cambia) {
    const ok = await askConfirm(
      `Vas a cambiar de «${AULA.name || 'la clase abierta'}» a «${a.name}».\n\n` +
      'Primero se suben a su clase los diarios que haya en este equipo, y después ' +
      'se quitan de aquí para no mezclarlos. Al volver a abrirla se recuperan.',
      'Cambiar de clase');
    if (!ok) return;
  }
  aulasMsg(cambia ? 'Guardando los diarios de la clase anterior…' : 'Abriendo la clase…');
  let r = await abrirAula(a.id, a.name);

  /* No se ha podido subir todo. Cambiar ahora borraría de este equipo un
     trabajo que no está en ninguna otra parte, así que se pregunta en vez de
     hacerlo: lo normal es que sea la red del centro y baste con reintentar. */
  if (!r.ok && r.reason === 'sin-subir') {
    aulasMsg('');
    const seguir = await askConfirm(
      `No se han podido subir ${r.pendientes} diario(s) de «${AULA.name || 'la clase abierta'}».\n\n` +
      'Si cambias de clase ahora, ese trabajo se pierde: solo está en este equipo. ' +
      'Lo normal es que sea la red; vuelve a intentarlo en un momento, o guarda una ' +
      'copia de seguridad antes desde Configuración → Copia de seguridad.',
      'Cambiar igualmente y perderlos');
    if (!seguir) {
      aulasMsg('⚠️ No se ha cambiado de clase. Los diarios siguen aquí, intactos.');
      return;
    }
    aulasMsg('Abriendo la clase…');
    r = await abrirAula(a.id, a.name, { descartarSinSubir: true });
  }

  if (!r.ok) {
    aulasMsg(r.reason === 'sin-permiso'
      ? '⚠️ Esa clase no es tuya o su permiso no te deja leerla.'
      : '⚠️ No se ha podido abrir' + (r.detail ? ': ' + r.detail : '.'));
    return;
  }
  aulasMsg('');
  toast(`«${r.aula.name}» abierta ✓ ${r.nuevos + r.actualizados} diario(s) traído(s)`);
  renderAulas();
  showTeacherPortal();
}

/* Crear una clase: se queda abierta al momento, que es lo que se espera */
async function crearAulaUI() {
  const nombre = await askPrompt('¿Cómo se llama la clase?', ATLAS_CONFIG.className || '4.º B', 'Crear');
  if (!nombre) return;
  aulasMsg('Creando…');
  const r = await cloudCreateAula(nombre);
  if (!r.ok) {
    aulasMsg(r.reason === 'sin-permiso'
      ? '⚠️ Tu cuenta no puede crear aulas. En Appwrite, da permiso de Create al rol «users» en esa colección.'
      : '⚠️ No se ha podido crear' + (r.detail ? ': ' + r.detail : '.'));
    return;
  }
  setTeacherConfig('className', nombre);
  setAulaActiva(r.aula.id, r.aula.name);
  await cloudSaveAulaConfig();
  aulasMsg('');
  toast(`Clase «${r.aula.name}» creada ✓`);
  renderAulas();
}

function wireAulas() {
  $('#aulas-salir').addEventListener('click', () => showTeacherPortal());
  $('#aula-nueva').addEventListener('click', crearAulaUI);

  $$('[data-dtab]').forEach(b => b.addEventListener('click', () => {
    const cual = b.dataset.dtab;
    $$('[data-dtab]').forEach(x => x.classList.toggle('active', x === b));
    $('#docente-login').classList.toggle('hidden', cual !== 'login');
    $('#docente-registro').classList.toggle('hidden', cual !== 'registro');
    docError('');
  }));

  /* cloudLogin y cloudRegister LANZAN si algo falla: no devuelven {ok}.
     Tratarlas como si lo hicieran daba error al entrar bien y silencio al
     fallar, que son las dos formas de estar mal a la vez. */
  $('#docente-login').addEventListener('submit', async e => {
    e.preventDefault();
    docError('');
    const btn = $('#docente-login button');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await cloudLogin($('#doc-user').value.trim(), $('#doc-pass').value);
      /* La sesión del docente no arrastra ningún diario de alumno */
      closeDiary();
      renderAulas();
    } catch (err) {
      docError(friendlyAuthError(err));
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  $('#docente-registro').addEventListener('submit', async e => {
    e.preventDefault();
    docError('');
    const btn = $('#docente-registro button');
    btn.disabled = true; btn.textContent = 'Creando…';
    const nombre = $('#doc-nombre').value.trim();
    try {
      await cloudRegister(nombre || 'Docente', $('#doc-user2').value.trim(), $('#doc-pass2').value);
      if (nombre) setTeacherConfig('teacherName', nombre);
      closeDiary();
      renderAulas();
    } catch (err) {
      docError(friendlyAuthError(err));
    } finally {
      btn.disabled = false; btn.textContent = 'Crear mi cuenta';
    }
  });

  $('#doc-salir').addEventListener('click', async () => {
    if (!(await askConfirm('¿Cerrar tu sesión de docente? Los diarios de la clase abierta se quedan en este equipo.', 'Cerrar sesión'))) return;
    await cloudLogout();
    renderAulas();
  });
}

/* Barra de la sala de mapas: qué clase está abierta y si falta por subir */
function renderAulaBar() {
  const bar = $('#teacher-aula-bar');
  if (!bar) return;
  if (!aulasOn()) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const abierta = aulaActiva();
  bar.innerHTML = `<span class="teacher-warn-icon">🏫</span>
    <div>${abierta
      ? `Clase abierta: <strong>${esc(AULA.name || 'sin nombre')}</strong>. Lo que trabajes aquí se guarda en ella.`
      : cloudUser()
        ? 'No tienes ninguna clase abierta. Ábrela para que lo que trabajes se guarde en tu cuenta.'
        : 'Entra con tu cuenta de docente para trabajar con tus clases.'}</div>
    <button class="btn btn-secondary btn-small" id="ir-aulas">🏫 Mis clases</button>`;
  $('#ir-aulas').addEventListener('click', () => { teacherScreen('aulas'); });
}

/* ══════════ CLASE DIRIGIDA ══════════
   La pantalla que usa el docente para llevar la sesión: elige a quién
   pregunta, lee el reto en voz alta y marca lo que responde el alumno.
   Por dentro es el mismo motor que una expedición; lo único distinto es
   quién toca la pantalla. */

let aulaTema = 'auto';        /* 'auto' o un id de pozo */
let aulaAlumno = null;        /* { name, grade } del turno en curso */

/* La lista de a quién se puede preguntar: la clase, más quien ya tenga
   diario en este equipo aunque se le haya quitado de la lista. */
function aulaAlumnos() {
  const vistos = new Set();
  const out = [];
  for (const r of (ATLAS_CONFIG.roster || [])) {
    const k = diaryKey(r.name);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    out.push({ name: r.name, grade: r.grade || ATLAS_CONFIG.defaultGrade, enLista: true });
  }
  for (const d of allDiaries()) {
    if (vistos.has(d.key)) continue;
    vistos.add(d.key);
    out.push({ name: d.name, grade: d.state.profile.grade, enLista: false });
  }
  return out;
}

function renderAula() {
  if (mission && aulaAlumno) return renderAulaPregunta();
  aulaAlumno = null;
  $('#aula-turnos').classList.remove('hidden');
  $('#aula-turno').classList.add('hidden');
  $('#aula-bolsa').classList.add('hidden');
  bolsaAlumno = null;
  bolsaDesdeTurno = false;

  /* Selector de tema: automático o un pozo concreto (hoy tocan fracciones) */
  const sel = $('#aula-tema');
  const pozos = [];
  for (const site of sitesEnabled()) {
    for (const b of branchesEnabledOf(site, null)) pozos.push({ id: b.id, name: `${site.subject} · ${b.name}` });
  }
  sel.innerHTML = `<option value="auto">Lo que más le convenga a cada uno</option>` +
    pozos.map(p => `<option value="${p.id}"${aulaTema === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  sel.value = aulaTema;

  const alumnos = aulaAlumnos();
  const turnos = turnosDeHoy();
  const conRonda = alumnos.filter(a => (turnos[diaryKey(a.name)] || {}).rondas).length;

  $('#aula-resumen').textContent = alumnos.length
    ? `${conRonda} de ${alumnos.length} han salido hoy`
    : '';

  const vacia = $('#aula-vacia');
  const lista = $('#aula-lista');
  if (!alumnos.length) {
    lista.innerHTML = '';
    vacia.classList.remove('hidden');
    vacia.innerHTML = 'Todavía no hay nadie en la lista de clase. Añádela en ' +
      '<strong>Configurar la expedición → Alumnado</strong> y vuelve aquí.';
    $('#aula-siguiente').disabled = true;
    return;
  }
  vacia.classList.add('hidden');
  $('#aula-siguiente').disabled = false;

  lista.innerHTML = '';
  for (const a of alumnos) {
    const t = turnos[diaryKey(a.name)] || { rondas: 0, minutos: 0 };
    const tiene = diaryExists(a.name);
    /* Dos acciones por alumno, no una: darle turno y abrir su bolsa. Un botón
       dentro de otro botón no es HTML válido, así que la tarjeta es un
       contenedor y el turno es el botón grande de dentro. */
    const card = document.createElement('div');
    card.className = 'aula-alumno-card' + (t.rondas ? ' aula-ya' : '');
    const turno = document.createElement('button');
    turno.className = 'aula-card-turno';
    turno.innerHTML = `
      <span class="aula-card-avatar">${t.rondas ? '✅' : '🧒'}</span>
      <span class="aula-card-nombre">${esc(a.name)}</span>
      <span class="aula-card-meta">${gradeInfo(a.grade).label}${
        tiene ? ` · ${t.rondas} ronda(s) hoy` : ' · primera vez'}</span>`;
    turno.addEventListener('click', () => empezarTurno(a));
    card.appendChild(turno);

    const bolsa = document.createElement('button');
    bolsa.className = 'aula-card-bolsa';
    bolsa.title = `Comprar o donar por ${a.name}`;
    bolsa.setAttribute('aria-label', `Bolsa de ${a.name}: comprar o donar`);
    bolsa.innerHTML = ico('coin');
    bolsa.addEventListener('click', () => abrirBolsa(a, false));
    card.appendChild(bolsa);
    lista.appendChild(card);
  }
}

function empezarTurno(alumno) {
  const tema = aulaTema === 'auto' ? null : aulaTema;
  let destino = null;
  if (tema) {
    /* Con un pozo elegido, el estrato lo sigue decidiendo el motor: el
       docente marca el tema, no la dificultad. */
    openDiary(alumno.name, alumno.grade);
    const def = branchDef(tema);
    const abierto = STRATA_ORDER.filter(sId => stratumHasContent(def, sId) &&
      getStratum(tema, sId).status !== 'locked');
    if (!abierto.length) { toast('Ese pozo aún no está abierto para ' + alumno.name + '.'); return; }
    let peor = abierto[0];
    for (const sId of abierto) if (getStratum(tema, sId).mastery < getStratum(tema, peor).mastery) peor = sId;
    destino = { branchId: tema, stratumId: peor };
  }

  const r = startClassTurn(alumno.name, alumno.grade, destino && destino.branchId, destino && destino.stratumId);
  if (!r.ok) {
    toast(r.reason === 'sin-contenido'
      ? 'No hay ningún pozo disponible para su curso.'
      : 'Ese estrato todavía no tiene retos preparados.');
    return;
  }
  aulaAlumno = alumno;
  renderAulaPregunta();
  $('#aula-turnos').classList.add('hidden');
  $('#aula-turno').classList.remove('hidden');
}

function renderAulaPregunta() {
  const q = mission.current;
  const b = branchDef(mission.branchId);
  const meta = STRATA_META[mission.stratumId];

  $('#aula-avatar').textContent = avatarEmoji();
  $('#aula-nombre').textContent = aulaAlumno.name;
  $('#aula-detalle').textContent =
    `${gradeInfo(S.profile.grade).label} · ${b.icon} ${b.name} · ${meta.label} · Nv. ${levelFromXp(S.progression.xp_total)}`;
  $('#aula-merito-quien').textContent = aulaAlumno.name;   /* el nombre, sin espacio doble */

  $('#aula-progreso').innerHTML = mission.questions.map((_, i) => {
    let cls = 'qdot';
    if (i < mission.resolved.length) cls += mission.resolved[i] ? ' qdot-ok' : ' qdot-fail';
    else if (i === mission.index) cls += ' qdot-current';
    return `<span class="${cls}"></span>`;
  }).join('');

  $('#aula-feedback').classList.add('hidden');
  $('#aula-pregunta-card').classList.remove('hidden');
  $('#aula-kira').classList.add('hidden');
  $('#aula-pregunta').textContent = q.question;

  const cont = $('#aula-opciones');
  cont.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.dataset.letra = 'ABCD'[i];
    btn.textContent = opt;
    btn.addEventListener('click', () => aulaResponder(i, btn));
    cont.appendChild(btn);
  });
  $('#aula-pista').disabled = false;
  renderAulaMeritos();
}

function aulaResponder(index, btn) {
  $$('#aula-opciones .option').forEach(o => o.disabled = true);
  const restaurando = mission.restoring;
  const res = answerQuestion(index);
  btn.classList.add(res.correct ? 'option-correct' : 'option-wrong');
  if (!res.correct) {
    const ok = $$('#aula-opciones .option')[mission.current.answer];
    if (ok) ok.classList.add('option-reveal');
  }
  programarFeedback(() => {
    let coins = 0;
    if (restaurando) coins = completeRestore(res.correct);
    aulaFeedback(res, restaurando, coins);
  }, 600);
}

function aulaFeedback(res, restaurando, coins) {
  $('#aula-pregunta-card').classList.add('hidden');
  const card = $('#aula-feedback');
  card.classList.remove('hidden');
  const restaurar = $('#aula-restaurar');
  restaurar.classList.add('hidden');

  if (restaurando) {
    $('#aula-fb-icon').textContent = res.correct ? '🔧✨' : '🪨';
    $('#aula-fb-title').textContent = res.correct ? '¡Hallazgo restaurado!' : 'Esta vez tampoco salió';
    $('#aula-fb-explain').textContent = res.correct
      ? (coins ? `Se corrigió solo. +${coins} doblones por restaurar el hallazgo.` : 'Se corrigió solo. (Ya usó las 5 restauraciones con premio de hoy.)')
      : res.explanation;
  } else if (res.correct) {
    $('#aula-fb-icon').textContent = '💎';
    $('#aula-fb-title').textContent = '¡Correcto!';
    $('#aula-fb-explain').textContent = res.explanation;
  } else {
    $('#aula-fb-icon').textContent = '🪤';
    $('#aula-fb-title').textContent = 'No era esa';
    $('#aula-fb-explain').textContent = res.explanation;
    /* Restaurar el hallazgo es metacognición: se le ofrece al alumno la
       oportunidad de corregirse, igual que si jugara solo. */
    if (!mission.restoring) {
      restaurar.classList.remove('hidden');
      restaurar.onclick = () => {
        restoreQuestion();
        renderAulaPregunta();
      };
    }
  }
  $('#aula-continuar').textContent = mission.index + 1 >= mission.questions.length
    ? 'Terminar el turno →' : 'Siguiente reto →';
  renderAulaMeritos();
}

function aulaContinuar() {
  if (!advance()) return aulaTerminar();
  renderAulaPregunta();
}

function aulaTerminar() {
  if (!mission) { renderAula(); return; }
  const respondidas = mission.resolved.length;
  if (!respondidas) {                 /* nadie respondió: no se puntúa nada */
    abandonMission();
    toast('Turno cerrado sin respuestas: no se ha anotado nada.');
    volverATurnos();
    return;
  }
  const r = finishMission();
  const quien = aulaAlumno ? aulaAlumno.name : '';
  toast(`${quien}: ${r.firstTryCorrect}/${r.total} a la primera · +${r.pe} PE · +${r.coins} doblones`);
  if (r.nowMastered) toast(`¡${quien} ha dominado un estrato! 🗺️`, 3200);
  volverATurnos();
}

function volverATurnos() {
  aulaAlumno = null;
  closeDiary();               /* se vuelve al diario propio del dispositivo */
  renderAula();
  $('#aula-turnos').classList.remove('hidden');
  $('#aula-turno').classList.add('hidden');
}

/* Los méritos se conceden aquí mismo, sin salir del turno: es donde ocurren
   («ha ayudado a su compañera», «ha recogido el material»). */
function renderAulaMeritos() {
  const cont = $('#aula-merito-lista');
  cont.innerHTML = '';
  for (const b of ATLAS_CONFIG.behaviors) {
    const usados = behaviorCountToday(b.id);
    const lleno = usados >= b.perDay;
    const btn = document.createElement('button');
    btn.className = 'award-btn' + (lleno ? ' award-full' : '');
    btn.disabled = lleno;
    btn.innerHTML = `<span class="award-icon">${esc(b.icon)}</span>
      <span class="award-name">${esc(b.name)}</span>
      <span class="award-meta">+${b.coins} ${ico('coin')} · ${usados}/${b.perDay}</span>`;
    btn.addEventListener('click', () => {
      const res = awardBehavior(b.id);
      if (res.ok) {
        toast(`${b.icon} ${aulaAlumno.name}: ${b.name} · +${b.coins} doblones`);
        renderAulaMeritos();
      } else toast('Ya se alcanzó el tope de hoy para ese mérito.');
    });
    cont.appendChild(btn);
  }
}

/* ══════════ LA BOLSA DE UN ALUMNO ══════════
   En clase el niño pide en voz alta —«me compro el sombrero», «dono diez al
   Fondo»— y hasta ahora tenía que entrar en la app para hacerlo él. Con
   veinticinco críos eso es la sesión entera esperando turnos de tablet.

   Se opera sobre SU diario, no sobre el del equipo: si no hay turno abierto se
   abre el suyo y se cierra al salir. La compra pasa por buyItem() y la
   donación por donateToFund(), las mismas funciones que usa el niño, así que
   los topes y las reglas son exactamente los suyos. */
let bolsaAlumno = null;
let bolsaDesdeTurno = false;

function abrirBolsa(alumno, desdeTurno) {
  bolsaAlumno = alumno;
  bolsaDesdeTurno = !!desdeTurno;
  /* Durante un turno, S YA es el diario de ese niño y hay una misión viva:
     volver a abrirlo la tiraría. Fuera del turno hay que abrirlo. */
  if (!desdeTurno) openDiary(alumno.name, alumno.grade);
  $('#aula-turnos').classList.add('hidden');
  $('#aula-turno').classList.add('hidden');
  $('#aula-bolsa').classList.remove('hidden');
  renderBolsa();
  window.scrollTo(0, 0);
}

function cerrarBolsa() {
  $('#aula-bolsa').classList.add('hidden');
  if (bolsaDesdeTurno) {
    $('#aula-turno').classList.remove('hidden');
  } else {
    closeDiary();
    $('#aula-turnos').classList.remove('hidden');
    renderAula();
  }
  bolsaAlumno = null;
  bolsaDesdeTurno = false;
  window.scrollTo(0, 0);
}

function renderBolsa() {
  if (!bolsaAlumno || !S) return;
  const saldo = S.progression.doubloons_balance;
  $('#bolsa-avatar').textContent = avatarEmoji();
  $('#bolsa-nombre').textContent = bolsaAlumno.name;
  $('#bolsa-detalle').innerHTML = `${esc(gradeInfo(S.profile.grade).label)} · <strong>${saldo}</strong> ${ico('coin')} en su bolsa`;

  /* ── Almacén ──
     Lo que ya tiene sale marcado y lo que no puede pagar sale con lo que le
     falta: es la respuesta a «¿y esto puedo?» sin tener que restar en alto. */
  const cont = $('#bolsa-tienda');
  cont.innerHTML = '';
  for (const item of shopCatalog()) {
    const suyo = item.type !== 'treat' &&
      (S.inventory.gear_owned.includes(item.id) || S.inventory.camp_items.includes(item.id));
    const falta = item.cost - saldo;
    const btn = document.createElement('button');
    btn.className = 'award-btn' + (suyo || falta > 0 ? ' award-full' : '');
    btn.disabled = suyo || falta > 0;
    btn.innerHTML = `<span class="award-icon">${esc(item.icon)}</span>
      <span class="award-name">${esc(item.name)}</span>
      <span class="award-meta">${suyo ? 'ya lo tiene'
        : falta > 0 ? `le faltan ${falta} ${ico('coin')}`
        : `${item.cost} ${ico('coin')}`}</span>`;
    btn.addEventListener('click', () => {
      const res = buyItem(item.id);
      if (!res.ok) {
        toast(res.reason === 'no-coins' ? 'No le llegan los doblones.'
          : res.reason === 'owned' ? 'Ya lo tiene.' : 'No se ha podido comprar.');
        return;
      }
      toast(`${item.icon} ${bolsaAlumno.name}: ${item.name} · −${item.cost} doblones`);
      renderBolsa();
    });
    cont.appendChild(btn);
  }

  /* ── Fondo de la Sociedad ── */
  const f = ATLAS_CONFIG.fund || {};
  const mio = S.progression.fund_donated || 0;
  $('#bolsa-fondo-nota').innerHTML = mio
    ? `Ya ha aportado ${mio} ${ico('coin')}. Donar es voluntario y no da ninguna ventaja: es por las ruinas.`
    : 'Donar es voluntario y no da ninguna ventaja en las excavaciones.';
  const caja = $('#bolsa-fondo');
  caja.innerHTML = '';
  for (const n of (f.steps || [5, 10, 25, 50])) {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btn-small';
    b.innerHTML = `${n} ${ico('coin')}`;
    b.disabled = saldo < n;
    b.addEventListener('click', () => {
      const res = donateToFund(n);
      if (!res.ok) { toast('No le llegan los doblones.'); return; }
      toast(`${bolsaAlumno.name} dona ${n} doblones al Fondo. ¡Gracias!`);
      renderBolsa();
    });
    caja.appendChild(b);
  }
}

function wireAula() {
  $('#aula-abrir-bolsa').addEventListener('click', () => {
    if (aulaAlumno) abrirBolsa(aulaAlumno, true);
  });
  $('#bolsa-cerrar').addEventListener('click', cerrarBolsa);

  $('#aula-salir').addEventListener('click', () => {
    if (mission) { aulaTerminar(); return; }
    /* Puede quedarse abierta la bolsa de un alumno: cerrar el aula tiene que
       soltar su diario, o el siguiente turno se daría sobre el suyo. */
    $('#aula-bolsa').classList.add('hidden');
    bolsaAlumno = null;
    bolsaDesdeTurno = false;
    closeDiary();
    showTeacherPortal();
  });
  $('#aula-tema').addEventListener('change', e => { aulaTema = e.target.value; });
  $('#aula-siguiente').addEventListener('click', () => {
    const a = aQuienLeToca(aulaAlumnos());
    if (a) empezarTurno(a);
  });
  $('#aula-terminar').addEventListener('click', aulaTerminar);
  $('#aula-continuar').addEventListener('click', aulaContinuar);
  $('#aula-saltar').addEventListener('click', () => {
    /* Saltar no cuenta ni a favor ni en contra: la pregunta se cambia por otra */
    const nueva = makeQuestion(branchDef(mission.branchId), mission.stratumId,
      mission.tier, mission.usedIdx, currentGrade());
    if (nueva) { nueva.stratumId = mission.stratumId; mission.questions[mission.index] = nueva; mission.current = nueva; }
    renderAulaPregunta();
  });
  $('#aula-pista').addEventListener('click', () => {
    const r = requestHint();
    const caja = $('#aula-kira');
    if (!r.ok) {
      if (r.reason === 'no-more') { $('#aula-pista').disabled = true; toast('Ya no quedan más pistas para este reto.'); }
      else toast('No le quedan Doblones para la segunda pista.');
      return;
    }
    caja.classList.remove('hidden');
    caja.innerHTML = `<span class="dialog-avatar">🪲</span>
      <div class="dialog-text"><strong>Kira</strong><p>${r.text}</p>
      ${r.cost ? `<small>(−${r.cost} ${ico('coin')})</small>` : ''}</div>`;
  });
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
    /* En clase dirigida los diarios de todo el grupo están aquí mismo: la
       vista puede enseñar la clase entera sin nube ninguna. */
    const locales = allDiaries();
    const propio = S && !diarioActivo
      ? [{ id: 'local', name: S.profile.explorer_name, state: S }] : [];
    const entradas = locales.concat(
      propio.filter(p => !locales.some(l => l.key === diaryKey(p.name))));
    classData = buildClassOverview(entradas);
    classData.localOnly = true;
    classData.enEsteEquipo = locales.length;
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
    ${res.detail ? `<p class="cfg-hint">${esc(res.detail)}</p>` : ''}
    <button class="btn btn-secondary btn-small" onclick="classData=null;renderClassView()">Reintentar</button>
  </div>`;
}

/* ── Nube puesta y cero diarios ──
   Antes no se decía nada, y es justo el momento en que el docente no sabe si
   se ha equivocado. Va aparte porque el texto es la mitad del arreglo y así
   se puede probar sin pintar. */
function notaClaseVacia(modo) {
  if (modo === 'docente') {
    return `<div class="class-note">${ico('mic')} <strong>Aún no ha empezado nadie.</strong> Esta clase está en
      <em>dirigida por el docente</em>: el diario de cada alumno se crea la primera vez que le das un
      turno desde <em>Dirigir la clase</em>. No hacen falta cuentas para eso.</div>`;
  }
  /* Con el alumnado entrando por su cuenta hay una segunda causa, y es la que
     deja atascado a un docente: un diario que su cuenta no puede leer NO da
     error. Appwrite contesta con la lista vacía, igual que si no existiera.
     Decir solo «aún no ha empezado nadie» es afirmar lo que no se sabe. */
  return `<div class="class-note">${ico('explorer')} <strong>Aquí no aparece ningún diario.</strong> Los
    diarios salen en cuanto el alumnado entre con su cuenta; las cuentas se crean en
    Configuración → Alumnado.
    <br><br><strong>Pero si alguno ya ha entrado y aun así no está, es un permiso que falta.</strong>
    Un diario que tu cuenta no puede leer no da error: Appwrite contesta con la lista vacía, igual
    que si no existiera. Cada alumno crea el suyo con permiso solo para él —eso es lo correcto, así
    ninguno lee el de otro— y tu cuenta necesita el suyo aparte:
    <br>en la consola de Appwrite, <strong>Auth → Teams</strong>, crea el equipo <code>docentes</code>
    y añádete; luego en la colección de diarios, <strong>Settings → Permissions → Add role →
    Team «docentes» → Read</strong>. Cierra sesión y vuelve a entrar. <em>Comprobar la conexión</em>,
    en Acceso y nube, te dice cuántos diarios ve tu cuenta ahora mismo.</div>`;
}

function paintClassView() {
  const d = classData;
  $('#class-body').classList.remove('hidden');

  const clase = (ATLAS_CONFIG.className || '').trim();
  const enLista = d.enLista || 0;
  /* Antes, en modo local, este aviso sustituía al recuento: el docente añadía
     tres alumnos, veía una sola ficha y en ninguna parte se decía «1 de 3». */
  /* «Han empezado» es haber abierto la app, no tener documento: desde que el
     panel crea el diario al dar de alta la cuenta, las dos cosas dejaron de
     coincidir y contar documentos daba de alta a niños que no han entrado. */
  const empezados = typeof d.empezados === 'number' ? d.empezados : d.deLaLista;
  const recuento = `<p class="class-meta">${clase ? esc(clase) + ' · ' : ''}${
    enLista ? `<strong>${empezados} de ${enLista}</strong> de la lista han empezado su diario${
        d.sinEstrenar ? ` · ${d.sinEstrenar} con la cuenta creada sin estrenar` : ''}${
        d.fueraDeLista ? ` · ${d.fueraDeLista} diario(s) más, fuera de la lista` : ''}`
            : `${d.students.length} explorador(es) con diario`} · datos al ${d.generatedAt}</p>`;
  /* Tres situaciones distintas, y decir la equivocada confunde más que callar:
     hay diarios de clase en este equipo · solo está el diario del propio
     dispositivo (modo alumno) · no hay ninguno todavía. */
  let nota = '';
  if (d.localOnly && d.enEsteEquipo) {
    nota = `<div class="class-note">💼 <strong>Clase dirigida.</strong> Los ${d.enEsteEquipo} diario(s)
      se guardan en este equipo, que es donde se dirigen las sesiones. Si además quieres que el alumnado
      entre por su cuenta desde casa, hace falta configurar Appwrite en «Acceso y nube».</div>`;
  } else if (d.localOnly && d.students.length) {
    nota = `<div class="class-note">${ico('phone')} <strong>Esta tablet solo guarda un diario.</strong> Sin cuentas
      en la nube, cada dispositivo tiene el suyo, así que aquí solo puede aparecer quien lo esté usando
      ahora. Para ver a la clase entera, dirige las sesiones desde <em>Dirigir la clase</em> o hay que
      configurar Appwrite en «Acceso y nube».</div>`;
  } else if (d.localOnly) {
    nota = `<div class="class-note">${ico('phone')} <strong>Todavía no hay ningún diario.</strong> Empieza una sesión
      desde <em>Dirigir la clase</em> y se irá creando el de cada alumno al que preguntes.</div>`;
  } else if (!d.students.length) {
    nota = notaClaseVacia(ATLAS_CONFIG.sessionMode);
  }
  classStatus(recuento + nota);

  /* ── Sin diarios todavía ──
     Antes esto borraba media pantalla y dejaba un «no hay ningún diario» a
     secas. Era justo al revés de lo que hace falta: el docente que acaba de
     dar de alta a su clase y no ve NADA no sabe si se ha equivocado, si tarda
     o si le falta un paso. Y las tarjetas de «quién falta», que existen para
     contestar precisamente eso, se tiraban a la basura.

     Ahora se enseña quién falta y qué le falta a cada uno; los KPI sí se
     esconden, porque promediar cero alumnos no dice nada. */
  const sinDiarios = !d.students.length;
  $('#class-kpis').classList.toggle('hidden', sinDiarios);
  if (sinDiarios) {
    $('#class-alerts').innerHTML = '';
    $('#class-students').innerHTML = d.missing.length
      ? pendientesHtml(d)
      : `<p class="empty-note">Todavía no hay ningún diario, y la lista de clase está vacía.
         Añade a tu alumnado en Configuración → Alumnado.</p>`;
    pintarRepaso(d);
    pintarCuadrillas(d);
    $('#class-missing').innerHTML = '';
    paintClassFund(d);
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
        ${urgentes.map(s => esc(s.name)).join(', ')} — ${urgentes.length === 1 ? 'acumula' : 'acumulan'}
        tres o más señales. Míralo en persona antes de tocar nada del juego.</div>`
    : '';

  pintarRepaso(d);

  $('#class-students').innerHTML = sortStudents(d.students, classSort).map(s => `
    <div class="student-card${s.needsHelp ? ' student-alert' : ''}">
      <div class="student-head">
        <strong>${esc(s.name)}</strong>
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
        <span title="Estratos dominados de los disponibles">${ico('pickaxe')} ${s.mastered}/${s.totalStrata} estratos</span>
        <span title="Minutos de excavación en 7 días">${ico('clock')} ${s.minutes7} min/7d</span>
        <span title="Días activos de los 3 que exige el sello">${ico('calendar')} ${s.activeDays}/3 días</span>
        <span title="Precisión en las últimas 10 respuestas">${ico('target')} ${s.accuracy === null ? '—' : Math.round(s.accuracy * 100) + '%'}</span>
        <span title="Hallazgos restaurados (autocorrección)">${ico('wrench')} ${s.selfCorrections}</span>
        <span title="Méritos concedidos">${ico('medal')} ${s.merits}</span>
        <span title="Cámaras del Guardián superadas">${ico('map')} ${s.fragments} fragmentos</span>
      </div>
      ${s.signals.length ? `<div class="student-signals">${s.signals.map(x => `<span class="signal-chip">${x}</span>`).join('')}</div>` : ''}
      ${s.stuck.length ? `<small class="student-stuck">Atascado en: ${esc(s.stuck.join(' · '))}</small>` : ''}
      <small class="student-seen">${s.lastSeen
        ? 'Última expedición: ' + esc(s.lastSeen)
        : 'Cuenta creada · aún no ha entrado'}</small>
      ${(s.tieneDiario || (s.id && cloudEnabled() && cloudUser())) ? `<div class="student-acciones">
        <button class="btn btn-secondary btn-small student-ver"
          data-ver="${esc(s.clave || s.id)}">${ico('lens')} Ver su cuaderno</button>
        <button class="btn btn-secondary btn-small student-informe"
          data-informe="${esc(s.clave || s.id)}">${ico('logbook')} Informe para la familia</button>
      </div>` : ''}
    </div>`).join('') + pendientesHtml(d);

  $$('#class-students .student-informe').forEach(b =>
    b.addEventListener('click', () => descargarInforme(b.dataset.informe)));
  $$('#class-students .student-ver').forEach(b =>
    b.addEventListener('click', () => entrarEnLectura(b.dataset.ver)));

  pintarCuadrillas(d);

  /* Al pie solo queda el aviso que de verdad pide una corrección: alguien
     asignado a una cuadrilla cuyo nombre no está en la lista de clase suele
     ser una errata al escribirlo, y por eso nunca casará con su diario. */
  const erratas = d.missing.filter(m => m.origen === 'equipo' && !m.enLista);
  $('#class-missing').innerHTML = erratas.length
    ? `<div class="class-warn">⚠️ En una cuadrilla hay nombres que no están en la lista de clase:
        ${erratas.map(m => `<strong>${esc(m.name)}</strong> (${esc(m.team)})`).join(', ')}.
        Si es una errata, su diario no se juntará nunca con su cuadrilla: corrígelo en
        «Cuadrillas de excavación».</div>`
    : '';

  paintClassFund(d);
}

/* ══════════ INFORME PARA LA FAMILIA ══════════
   Lo único que salía de la plataforma era la copia de seguridad en JSON, que
   sirve para restaurar, no para leer. Esto es lo que se imprime y se manda a
   casa, y por eso cambia todo el registro:

   · Sin porcentajes ni notas. Una familia no necesita «62 % de dominio»,
     necesita «ya sabe el valor posicional; le está costando la resta
     llevando». Los números que sí van son los que se entienden solos:
     días que ha trabajado, minutos, cámaras superadas.
   · Sin comparación con nadie. El PRD §0.2 prohíbe rankings entre niños y eso
     vale también —sobre todo— para lo que llega a una casa.
   · Sin nada que suene a castigo. Lo que falla se llama «en lo que está
     trabajando ahora», porque es literalmente lo que es.

   Sale como HTML autocontenido para poder abrirlo e imprimirlo sin la
   plataforma delante. */
function informeFamilia(estado, opciones) {
  const s = estado || S;
  if (!s || !s.profile) return null;
  const o = opciones || {};
  const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ── Qué sabe hacer, en palabras que se entiendan fuera del aula ──
     Los estratos se llaman «Recordar · Comprender · Aplicar · Analizar»: son
     los niveles de Bloom y le dicen algo a un maestro, no a una familia. Aquí
     se cuenta por CONCEPTO —«ya le sale comparar números»— y los pozos se
     resumen por cuánto llevan hechos. */
  const dominados = conceptosDominadosDe(s, 8).map(c => conceptoInfo(c.id).label);
  const flojos = conceptosFlojosDe(s, 4).map(c => conceptoInfo(c.id).label);

  const pozos = [];
  for (const siteId in (s.dig_sites || {})) {
    for (const bId in s.dig_sites[siteId]) {
      const def = branchDef(bId);
      const strata = s.dig_sites[siteId][bId].strata || {};
      let hechos = 0, hay = 0, tocado = false;
      for (const sId of STRATA_ORDER) {
        const st = strata[sId];
        if (!st || (def && !stratumHasContent(def, sId))) continue;
        hay++;
        if ((st.mastery || 0) >= 0.8) hechos++;
        if (st.attempts > 0) tocado = true;
      }
      if (!hay || !tocado) continue;
      pozos.push(`${def ? def.name : bId} — ${hechos === hay
        ? 'terminado'
        : `${hechos} de ${hay} bloques`}`);
    }
  }
  const evalu = metricasEvaluacion(s);
  const camaras = historialEvaluacion(s);
  const log = (s.metrics && s.metrics.sessions_log) || [];
  const dias30 = log.filter(e => Math.floor((new Date(todayStr()) - new Date(e.date)) / 86400000) < 30);
  const minutos = dias30.reduce((a, x) => a + (x.minutes || 0), 0);

  const lista = (arr, vacio) => arr.length
    ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : `<p class="vacio">${esc(vacio)}</p>`;

  return `<!doctype html>
<meta charset="utf-8">
<title>Informe de ${esc(s.profile.explorer_name)} — Expedición Atlas</title>
<style>
  body { font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; color: #2b2118;
         max-width: 720px; margin: 32px auto; padding: 0 20px; }
  h1 { font-size: 1.5rem; margin: 0 0 2px; }
  h2 { font-size: 1.05rem; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e0d3ba; }
  .sub { color: #6b5d4a; margin: 0 0 22px; }
  ul { margin: 6px 0; padding-left: 22px; } li { margin: 3px 0; }
  .vacio { color: #6b5d4a; font-style: italic; margin: 6px 0; }
  .cifras { display: flex; gap: 26px; flex-wrap: wrap; margin: 10px 0; }
  .cifra strong { display: block; font-size: 1.5rem; line-height: 1.1; }
  .cifra span { color: #6b5d4a; font-size: .85rem; }
  .nota { background: #f6efe2; border-left: 4px solid #b8862b; padding: 11px 14px;
          margin: 24px 0 0; font-size: .9rem; }
  @media print { body { margin: 0; max-width: none; } .nota { break-inside: avoid; } }
</style>
<h1>${esc(s.profile.explorer_name)}</h1>
<p class="sub">Expedición Atlas${o.clase ? ' · ' + esc(o.clase) : ''} · ${esc(hoy)}</p>

<h2>Lo que ya le sale</h2>
${lista(dominados, 'Está empezando: todavía no ha practicado lo suficiente como para decirlo.')}

<h2>En lo que está trabajando ahora</h2>
${flojos.length
  ? `<ul>${flojos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
     <p>Es normal y es justo donde toca practicar; en clase se está trabajando.</p>`
  : '<p class="vacio">Ahora mismo no hay nada que se le esté atragantando.</p>'}

<h2>Por dónde va la expedición</h2>
${lista(pozos, 'Todavía no ha empezado ningún bloque.')}

<h2>Constancia</h2>
<div class="cifras">
  <div class="cifra"><strong>${dias30.length}</strong><span>días trabajados (30 días)</span></div>
  <div class="cifra"><strong>${minutos}</strong><span>minutos en total</span></div>
  <div class="cifra"><strong>${(s.logbook && s.logbook.stamps_lifetime) || 0}</strong><span>semanas completas</span></div>
  <div class="cifra"><strong>${evalu.superadas}</strong><span>pruebas superadas</span></div>
</div>

${camaras.length ? `<h2>Pruebas realizadas</h2>
<ul>${camaras.map(c => {
  const ult = c.intentos[c.intentos.length - 1];
  return `<li><strong>${esc(c.name)}</strong> — ${c.cleared
    ? `superada${c.clearedAt ? ' el ' + esc(c.clearedAt.split('-').reverse().join('/')) : ''}`
    : 'todavía no superada'}${c.attempts > 1 ? ` · ${c.attempts} intentos` : ''}${
    !c.cleared && ult ? '. Volverá a intentarlo tras repasar.' : ''}</li>`;
}).join('')}</ul>` : ''}

<p class="nota"><strong>Cómo leer esto.</strong> Aquí no hay notas ni comparaciones con nadie:
la plataforma no puntúa ni ordena a los niños. Lo que aparece como «en lo que está trabajando»
no es un suspenso, es lo que toca ahora. Equivocarse forma parte de excavar, y de hecho corregir
el propio error da premio dentro del juego.</p>
`;
}

/* Nombre de archivo que se entiende dentro de seis meses en una carpeta */
function informeFileName(estado) {
  const limpio = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `informe-${limpio((estado || S).profile.explorer_name) || 'alumno'}-${todayStr()}.html`;
}

/* ── Entrar y salir de la consulta ──
   Se ve exactamente lo que ve el niño: sus pestañas, su HUD, su mapa. Por eso
   se quita `teacher-mode`, que las esconde. Lo que NO se puede es jugar,
   comprar ni donar: eso está bloqueado en el motor, no solo escondido. */
async function entrarEnLectura(clave) {
  const r = await diarioCompletoDe(clave);
  if (!r.ok) { toast(r.texto); return; }
  if (!abrirEstadoEnLectura(r.estado, r.name || r.estado.profile.explorer_name)) {
    toast('No se ha podido abrir.'); return;
  }

  document.body.classList.remove('teacher-mode');
  document.body.classList.add('en-consulta');
  $('#lectura-quien').textContent = S.profile.explorer_name;
  $('#lectura-bar').classList.remove('hidden');
  $('#screen-teacher').classList.add('hidden');
  $('#app').classList.remove('hidden');
  applyTextSize();
  renderHud();
  show('map');
  window.scrollTo(0, 0);
}

function salirDeLectura() {
  cerrarLectura();
  $('#lectura-bar').classList.add('hidden');
  document.body.classList.remove('en-consulta');
  if (teacherOnly) document.body.classList.add('teacher-mode');
  classData = null;            /* al volver, la vista se recalcula */
  showTeacherPortal();
}

/* ── El diario ENTERO de un alumno, esté donde esté ──
   Dos sitios posibles y ninguno es opcional: en clase dirigida los diarios
   viven en este equipo; con el alumnado entrando desde el suyo, viven en la
   nube y aquí solo ha llegado el resumen. Ver el cuaderno y escribir el
   informe necesitan el diario completo, así que se trae el de ESE alumno.
   Uno, a propósito: bajarlos todos por si acaso son 20 KB × 25 cada vez que
   se abre la pantalla. */
async function diarioCompletoDe(clave) {
  const diarios = loadDiaries();
  const local = diarios[clave] || (S && diaryKey(S.profile.explorer_name) === clave ? S : null);
  if (local) return { ok: true, estado: migrateState(local), name: local.profile.explorer_name };

  if (!(cloudEnabled() && cloudUser())) {
    return { ok: false, texto: 'No encuentro el diario de ese alumno en este equipo.' };
  }
  const r = await cloudTraerDiario(clave);
  if (!r.ok) {
    return { ok: false, texto: r.reason === 'sin-permiso'
      ? 'Tu cuenta no puede leer ese diario. Míralo en Acceso y nube → Comprobar la conexión.'
      : r.reason === 'ilegible' ? 'Ese diario está guardado en un formato que no se puede leer.'
      : 'No se ha podido traer ese diario de la nube.' };
  }
  return { ok: true, estado: migrateState(r.estado), name: r.name };
}

/* Genera y descarga el informe de un alumno a partir de su diario completo. */
async function descargarInforme(clave) {
  toast('Preparando el informe…');
  const r = await diarioCompletoDe(clave);
  if (!r.ok) { toast(r.texto); return; }
  const st = r.estado;
  const html = informeFamilia(st, { clase: ATLAS_CONFIG.className });
  if (!html) { toast('No se ha podido generar el informe.'); return; }
  const guardado = await guardarArchivo(informeFileName(st), html, 'text/html');
  toast(guardado && guardado.ok === false
    ? 'No se ha podido descargar. Prueba desde Configuración → Copia de seguridad.'
    : `Informe de ${st.profile.explorer_name} descargado ✓`);
}

/* ── Lo que conviene repasar mañana ──
   El docente entra aquí con una pregunta: «¿qué doy mañana?». Hasta ahora la
   pantalla contestaba a otra —«¿cómo va cada uno?»— y la primera había que
   deducirla leyendo veinticinco tarjetas.

   Se muestran los conceptos que falla más de un tercio de los intentos, con
   cuántos niños los fallan y quiénes. A partir de tres alumnos se marca como
   cosa de clase; por debajo es una conversación con quien sea, no una
   lección. */
const REPASO_TOPE = 6;
const REPASO_ES_DE_CLASE = 3;

function pintarRepaso(d) {
  const caja = $('#class-repasar');
  if (!caja) return;
  const lista = (d.repasar || []).slice(0, REPASO_TOPE);
  if (!lista.length) {
    caja.classList.add('hidden');
    caja.innerHTML = '';
    return;
  }
  caja.classList.remove('hidden');
  caja.innerHTML = `
    <h3>${ico('target')} Lo que conviene repasar</h3>
    <p class="class-repasar-intro">Conceptos que se fallan más de un tercio de las veces, ordenados
    por a cuántos alumnos les pasa. Sale del primer intento de cada reto, que es el que mide.</p>
    <div class="repaso-lista">
      ${lista.map(c => {
        const n = c.alumnos.length;
        const deClase = n >= REPASO_ES_DE_CLASE;
        return `<div class="repaso-fila${deClase ? ' repaso-clase' : ''}">
          <div class="repaso-cabeza">
            <strong>${esc(c.label)}</strong>
            <span class="repaso-area">${esc(c.area)}</span>
          </div>
          <div class="repaso-barra"><div class="repaso-relleno" style="width:${Math.round(c.tasa * 100)}%"></div></div>
          <div class="repaso-pie">
            <span class="repaso-num">${n} ${n === 1 ? 'alumno' : 'alumnos'}</span>
            <span class="repaso-tasa">${Math.round(c.tasa * 100)} % de fallo en ${c.attempts} intentos</span>
          </div>
          <small class="repaso-quien">${esc(c.alumnos.slice(0, 8).join(', '))}${
            c.alumnos.length > 8 ? ` y ${c.alumnos.length - 8} más` : ''}</small>
        </div>`;
      }).join('')}
    </div>
    ${lista.some(c => c.alumnos.length >= REPASO_ES_DE_CLASE)
      ? '<p class="class-repasar-nota">Lo resaltado lo falla media clase o más: eso se lleva a la pizarra. El resto se resuelve mejor de uno en uno.</p>'
      : '<p class="class-repasar-nota">Nada que afecte a tres o más alumnos: de momento son conversaciones sueltas, no una clase.</p>'}`;
}

/* ── Cuadrillas ──
   Va en su propia función porque hay que pintarla también cuando todavía no
   hay ningún diario: la cabecera «Cuadrillas» es marcado fijo de index.html, y
   dejarla sin nada debajo era lo que se veía antes. Si no hay nada que decir,
   se esconde la sección entera en vez de dejar el título flotando. */
function pintarCuadrillas(d) {
  const cmp = ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.enabled;
  const lista = cmp ? (d.teams || []) : [];
  const seccion = $('#class-teams-seccion');
  if (seccion) seccion.classList.toggle('hidden', !cmp);
  if (!cmp) { $('#class-teams').innerHTML = ''; return; }
  if (!lista.length) {
    $('#class-teams').innerHTML = '<p class="empty-note">No hay ninguna cuadrilla creada. ' +
      'Se montan en Configuración → Cuadrillas de excavación.</p>';
    return;
  }
  $('#class-teams').innerHTML = lista.map(t => {
        const meta = ATLAS_CONFIG.teams.goalTarget || 1;
        const pct = Math.min(100, Math.round((t.contribution / meta) * 100));
        return `<div class="class-team">
          <div class="class-team-head"><span>${esc(t.icon)} <strong>${esc(t.name)}</strong></span>
            <span class="student-num">${t.contribution} / ${meta} ${ico('coin')}</span></div>
          <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
          <small>${t.members} con diario${t.listed !== t.members ? ` de ${t.listed} asignados` : ''} · ${t.mastered} estratos entre todos</small>
        </div>`;
      }).join('');
}

/* ── Alumnos de la lista que todavía no han empezado ──
   Antes solo salían en una nota al pie que además hablaba de cuadrillas: el
   docente añadía a tres, veía una ficha y pensaba que se habían perdido.
   Ahora ocupan su sitio en la lista, con lo que falta para que aparezcan. */
function pendientesHtml(d) {
  if (!d.missing.length) return '';
  const hayNube = cloudEnabled() && cloudUser();
  const dirigida = (ATLAS_CONFIG.sessionMode || 'ambos') === 'docente';
  return d.missing.map(m => {
    let falta;
    /* Lo que le falta a un alumno depende de CÓMO se usa la plataforma en esta
       clase. En clase dirigida no necesita cuenta ninguna: su diario nace la
       primera vez que le das un turno. Decirle al docente que cree cuentas
       cuando no le hacen falta lo manda a un callejón sin salida, que es lo
       que pasaba: el texto daba por hecho que el niño entra por su cuenta. */
    if (!m.enLista && m.origen === 'equipo') {
      falta = `Está en ${esc(m.team)}, pero no en la lista de clase. ¿Una errata en el nombre?`;
    } else if (dirigida) {
      falta = 'Su diario se creará en cuanto le des un turno en «Dirigir la clase».';
    } else if (!hayNube) {
      falta = 'Necesita su propia cuenta: sin nube, cada tablet guarda un único diario.';
    } else if (m.account) {
      falta = 'Ya tiene cuenta. Solo falta que entre y cree su diario.';
    } else {
      falta = 'Todavía sin cuenta. Créala en «Alumnado» → Crear las cuentas.';
    }
    return `<div class="student-card student-pending">
      <div class="student-head">
        <strong>${esc(m.name)}</strong>
        <span class="student-pending-tag">Aún no ha entrado</span>
      </div>
      <small class="student-seen">${esc(m.origen === 'equipo' ? m.team : 'En la lista de clase')} · ${falta}</small>
    </div>`;
  }).join('');
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
    <h3>🌍 ${esc(f.name || 'Fondo de la Sociedad')}</h3>
    <p class="class-meta">Donado de verdad entre todos: <strong>${real} ${ico('coin')}</strong> ·
      anotado en la configuración: <strong>${anotado} ${ico('coin')}</strong>
      ${siguiente ? `· siguiente hito: ${esc(siguiente.icon)} ${esc(siguiente.name)} (${siguiente.at} ${ico('coin')})` : ''}</p>
    ${real !== anotado
      ? `<button class="btn btn-secondary btn-small" id="class-fund-sync">${ico('pin')} Anotar ${real} ${ico('coin')} para que lo vea la clase</button>`
      : '<p class="cfg-hint">La clase ya ve el total correcto.</p>'}`;

  const btn = $('#class-fund-sync');
  if (btn) btn.addEventListener('click', () => {
    setTeacherConfig('fund.classTotal', real);
    toast('Anotado. La clase ya ve ' + real + ' doblones en el Fondo.');
    paintClassFund(d);
  });
}
