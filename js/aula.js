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
    const card = document.createElement('button');
    card.className = 'aula-alumno-card' + (t.rondas ? ' aula-ya' : '');
    card.innerHTML = `
      <span class="aula-card-avatar">${t.rondas ? '✅' : '🧒'}</span>
      <span class="aula-card-nombre">${esc(a.name)}</span>
      <span class="aula-card-meta">${gradeInfo(a.grade).label}${
        tiene ? ` · ${t.rondas} ronda(s) hoy` : ' · primera vez'}</span>`;
    card.addEventListener('click', () => empezarTurno(a));
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
  setTimeout(() => {
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

function wireAula() {
  $('#aula-salir').addEventListener('click', () => {
    if (mission) { aulaTerminar(); return; }
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

function paintClassView() {
  const d = classData;
  $('#class-body').classList.remove('hidden');

  const clase = (ATLAS_CONFIG.className || '').trim();
  const enLista = d.enLista || 0;
  /* Antes, en modo local, este aviso sustituía al recuento: el docente añadía
     tres alumnos, veía una sola ficha y en ninguna parte se decía «1 de 3». */
  const recuento = `<p class="class-meta">${clase ? clase + ' · ' : ''}${
    enLista ? `<strong>${d.deLaLista} de ${enLista}</strong> de la lista han empezado su diario${
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
  }
  classStatus(recuento + nota);

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
        ${urgentes.map(s => esc(s.name)).join(', ')} — ${urgentes.length === 1 ? 'acumula' : 'acumulan'}
        tres o más señales. Míralo en persona antes de tocar nada del juego.</div>`
    : '';

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
      <small class="student-seen">Última expedición: ${esc(s.lastSeen || '—')}</small>
    </div>`).join('') + pendientesHtml(d);

  const cmp = ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.enabled;
  $('#class-teams').innerHTML = !cmp
    ? '<p class="empty-note">Las cuadrillas están desactivadas.</p>'
    : d.teams.map(t => {
        const meta = ATLAS_CONFIG.teams.goalTarget || 1;
        const pct = Math.min(100, Math.round((t.contribution / meta) * 100));
        return `<div class="class-team">
          <div class="class-team-head"><span>${esc(t.icon)} <strong>${esc(t.name)}</strong></span>
            <span class="student-num">${t.contribution} / ${meta} ${ico('coin')}</span></div>
          <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
          <small>${t.members} con diario${t.listed !== t.members ? ` de ${t.listed} asignados` : ''} · ${t.mastered} estratos entre todos</small>
        </div>`;
      }).join('');

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

/* ── Alumnos de la lista que todavía no han empezado ──
   Antes solo salían en una nota al pie que además hablaba de cuadrillas: el
   docente añadía a tres, veía una ficha y pensaba que se habían perdido.
   Ahora ocupan su sitio en la lista, con lo que falta para que aparezcan. */
function pendientesHtml(d) {
  if (!d.missing.length) return '';
  const hayNube = cloudEnabled() && cloudUser();
  return d.missing.map(m => {
    let falta;
    if (!hayNube) falta = 'Necesita su propia cuenta: sin nube, cada tablet guarda un único diario.';
    else if (m.account) falta = 'Ya tiene cuenta. Solo falta que entre y cree su diario.';
    else if (m.enLista) falta = 'Todavía sin cuenta. Créala en «Alumnado» → Crear las cuentas.';
    else falta = `Está en ${esc(m.team)}, pero no en la lista de clase. ¿Una errata en el nombre?`;
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
