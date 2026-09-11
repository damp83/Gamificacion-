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
    /* Dos acciones por clase: abrirla y borrarla. Un botón dentro de otro no
       es HTML válido, así que la tarjeta es un contenedor. */
    const card = document.createElement('div');
    card.className = 'aula-alumno-card' + (abierta ? ' aula-ya' : '');
    const abrir = document.createElement('button');
    abrir.className = 'aula-card-turno';
    abrir.innerHTML = `<span class="aula-card-avatar">${abierta ? '📂' : '🏫'}</span>
      <span class="aula-card-nombre">${esc(a.name)}</span>
      <span class="aula-card-meta">${abierta ? 'abierta en este equipo' : 'pulsa para abrirla'}</span>`;
    abrir.addEventListener('click', () => abrirAulaUI(a));
    card.appendChild(abrir);

    const borrar = document.createElement('button');
    borrar.className = 'aula-card-borrar';
    borrar.title = `Borrar la clase ${a.name}`;
    borrar.setAttribute('aria-label', `Borrar la clase ${a.name} y todo lo que contiene`);
    borrar.textContent = '🗑️';
    borrar.addEventListener('click', () => borrarAulaUI(a));
    card.appendChild(borrar);
    lista.appendChild(card);
  }
}

/* ── ¿Es esta la clase? ──
   La barrera es «demuestra que sabes cuál estás borrando», no «demuestra que
   sabes teclear el ordinal masculino». Una clase llamada «4.º A» lleva U+00BA,
   que NO es el grado (°) del teclado ni una o; el docente escribía su propia
   clase, le decía que no coincidía, y no había forma de adivinar por qué.

   Así que se comparan solo las letras y los números: se quitan tildes,
   espacios, puntos y ordinales. «4.º A», «4º A», «4°A» y «4 a» son la misma
   clase; «2.º A» sigue siendo otra, que es lo único que hay que distinguir. */
function claveDeNombreDeClase(t) {
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    /* El ordinal de un curso, escrito de las cuatro formas que se escribe:
       «4.º», «4º», «4°» y «4.o». Se quita entero, así que las cuatro —y «4» a
       secas— acaban igual. La «o» solo cuenta como ordinal detrás de un
       número y sin más letras detrás: «4 oro» no es «4». */
    .replace(/(\d)\s*\.?\s*[º°ª]/g, '$1')
    .replace(/(\d)\s*\.?\s*o(?![a-z])/g, '$1')
    .replace(/[^a-z0-9]+/g, '');
}
function mismoNombreDeClase(escrito, real) {
  const a = claveDeNombreDeClase(escrito), b = claveDeNombreDeClase(real);
  /* Un nombre que se queda en nada al limpiarlo —«···»— no puede abrir la
     puerta a cualquier cosa: ahí se exige el texto tal cual. */
  if (!b) return String(escrito || '').trim() === String(real || '').trim();
  return a === b;
}

/* ── Borrar una clase ──
   Se lleva por delante los diarios de sus alumnos, que son un trimestre de
   trabajo de cada niño. La barrera va en tres tramos, y ninguno sobra:

     1. Se CUENTA antes lo que hay dentro y se enseña. «Borrar la clase» no
        significa nada; «se van 24 diarios y 60 retos» sí.
     2. Se ofrece la copia de seguridad ANTES, no después. Después no sirve.
     3. Hay que escribir el nombre de la clase. Un «¿seguro?» se contesta que
        sí sin leerlo; escribir «4.º B» obliga a mirar cuál se está borrando,
        que es el error de verdad: borrar la que no era. */
async function borrarAulaUI(a) {
  aulasMsg('Mirando qué hay dentro de la clase…');
  const dentro = await cloudContarDeAula(a.id);
  aulasMsg('');
  const nd = dentro.ok ? dentro.diarios : -1;
  const nr = dentro.ok ? dentro.retos : -1;

  const trozo = (n, uno, varios) =>
    n < 0 ? `un número indeterminado de ${varios}` : n === 1 ? `1 ${uno}` : `${n} ${varios}`;
  const resumen = `Se van a borrar para siempre:\n\n` +
    `· ${trozo(nd, 'diario de alumno', 'diarios de alumno')} — su progreso, sus méritos y sus doblones\n` +
    `· ${trozo(nr, 'reto escrito', 'retos escritos')}\n` +
    `· Los ajustes de la clase: yacimientos, pozos, cuadrillas y economía\n\n` +
    `Las cuentas de los alumnos NO se borran, pero se quedan sin diario.\n` +
    `Esto no se puede deshacer.`;

  if (!(await askConfirm(`«${a.name}»\n\n${resumen}\n\n¿Sigues?`, 'Sigo'))) return;

  if (nd > 0) {
    const copia = await askConfirm(
      'Antes de borrar, ¿guardas una copia de seguridad? Es lo único que puede devolver ' +
      'esos diarios si te equivocas de clase.', 'Guardar copia primero');
    if (copia) {
      cfgSection = 'copia';
      teacherScreen('config');
      return;   /* que vuelva cuando la tenga: borrar puede esperar */
    }
  }

  const escrito = await askPrompt(
    `Escribe «${a.name}» para confirmar que es esta clase y no otra:`, '', 'Borrar para siempre');
  if (escrito === null) return;
  if (!mismoNombreDeClase(escrito, a.name)) {
    aulasMsg(`⚠️ Has escrito «${esc(String(escrito).trim())}» y la clase se llama «${esc(a.name)}». ` +
      'No se ha borrado nada.');
    return;
  }

  aulasMsg('Borrando…');
  const r = await cloudBorrarAula(a.id, (que, n) => aulasMsg(`Borrando… ${n} ${que}`));
  if (!r.ok) {
    aulasMsg(`⚠️ No se ha podido borrar del todo (${r.detail || r.reason}). ` +
      `Se borraron ${r.retos || 0} reto(s) y ${r.diarios || 0} diario(s); la clase sigue ahí. ` +
      `Vuelve a intentarlo: lo que ya se borró no se repite.`);
    renderAulas();
    return;
  }

  /* Si era la que estaba abierta aquí, este equipo se queda sin clase: hay
     que soltarla y limpiar sus diarios locales, o seguiría enseñando los de
     una clase que ya no existe. */
  if (aulaActiva() === a.id) cerrarAula();
  aulasMsg(`Clase «${a.name}» borrada: ${r.diarios} diario(s) y ${r.retos} reto(s).`);
  renderAulas();
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
/* Qué grupo tiene abierto el panel de méritos: el id de una cuadrilla,
   'todos' para la clase entera, o null si no hay ninguno. Vive fuera de
   `renderAula()` porque conceder repinta la lista y el panel tiene que
   seguir abierto: en clase se dan dos o tres seguidos. */
let meritoGrupo = null;
/* Y a mano: quién está marcado cuando el docente elige a dedo. Se guardan
   claves de diario, no nombres, porque dos alumnas pueden llamarse igual y
   marcar a una no puede marcar a la otra. */
let eligiendo = false;
let elegidos = new Set();

/* La lista de a quién se puede preguntar: la clase, más quien ya tenga
   diario en este equipo aunque se le haya quitado de la lista. */
function aulaAlumnos() {
  const vistos = new Set();
  const out = [];
  for (const r of (ATLAS_CONFIG.roster || [])) {
    /* El usuario viaja con cada alumno: es lo que distingue a dos que se
       llaman igual en cursos distintos. Sin él, aquí se fundían en uno y el
       docente veía una sola ficha para las dos niñas. */
    const k = diaryKey(r);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    out.push({ name: r.name, username: r.username || '', authId: r.authId || '',
               grade: r.grade || ATLAS_CONFIG.defaultGrade, enLista: true });
  }
  for (const d of allDiaries()) {
    if (vistos.has(d.key)) continue;
    vistos.add(d.key);
    out.push({ name: d.name, grade: d.state.profile.grade, enLista: false, clave: d.key });
  }
  return out;
}

/* ══════════ UN MÉRITO A VARIOS DE UNA VEZ ══════════

   «Los Jaguares han recogido el campamento» se dice una vez y se daba seis:
   abrir la bolsa de cada niño, pulsar, cerrar, buscar al siguiente. Con la
   clase delante eso no se hace, se deja para luego, y luego no se hace.

   El panel se abre pegado al grupo al que va —bajo el título de la cuadrilla,
   o arriba del todo si es la clase entera—, porque un panel lejos de su grupo
   es un panel que se pulsa sobre el equipo equivocado. Cada botón dice a
   cuántos les cabe todavía hoy ANTES de pulsarlo, y después se dice a quién
   no le llegó: un premio de grupo que calla eso es un premio que el docente
   cree haber dado. */
function panelDeMeritoGrupo(gente, titulo, icono) {
  const caja = document.createElement('div');
  caja.className = 'aula-merito-grupo';
  caja.setAttribute('role', 'group');
  caja.setAttribute('aria-label', `Dar un mérito a ${titulo}`);

  const cab = document.createElement('div');
  cab.className = 'amg-cab';
  cab.innerHTML = `<span class="amg-icono">${esc(icono)}</span>
    <strong>Mérito para ${esc(titulo)}</strong>
    <span class="amg-cuenta">${gente.length} explorador(es)</span>`;
  const cerrar = document.createElement('button');
  cerrar.className = 'amg-cerrar';
  cerrar.setAttribute('aria-label', 'Cerrar el panel de méritos');
  cerrar.textContent = '✕';
  cerrar.addEventListener('click', () => { meritoGrupo = null; renderAula(); });
  cab.appendChild(cerrar);
  caja.appendChild(cab);

  const lista = document.createElement('div');
  lista.className = 'award-list';
  const behaviors = ATLAS_CONFIG.behaviors || [];
  for (const b of behaviors) {
    const caben = puedenRecibirMerito(gente, b.id);
    const btn = document.createElement('button');
    btn.className = 'award-btn' + (caben.length ? '' : ' award-full');
    btn.disabled = !caben.length;
    btn.innerHTML = `<span class="award-icon">${iconoDeFicha(b)}</span>
      <span class="award-name">${esc(b.name)}</span>
      <span class="award-meta">+${b.coins} ${ico('coin')} · ${caben.length === gente.length
        ? `a los ${gente.length}` : `a ${caben.length} de ${gente.length}`}</span>`;
    btn.addEventListener('click', () => {
      const r = awardBehaviorAVarios(gente, b.id);
      if (!r.ok) {
        toast(r.reason === 'lectura'
          ? 'Esto es una consulta: no se puede conceder nada desde aquí.'
          : `Hoy ya no le queda «${b.name}» a nadie de ${titulo}.`);
        return;
      }
      const aQuien = r.llenos.length ? `a ${r.dados.length} de ${r.total}` : `a los ${r.total}`;
      toast(`${b.icon} ${conMayuscula(titulo)} · ${b.name}: +${b.coins} doblones ${aQuien}`
        + (r.llenos.length ? `. Hoy ya no le quedaba a ${nombresCortos(r.llenos)}.` : ''),
        r.llenos.length ? 4600 : 2800);
      renderAula();
    });
    lista.appendChild(btn);
  }
  caja.appendChild(lista);

  if (!behaviors.length) {
    lista.innerHTML = '<p class="empty-note">No hay reconocimientos configurados. ' +
      'Se crean en Configuración → Comportamientos, tareas y actividades.</p>';
  } else {
    const nota = document.createElement('p');
    nota.className = 'amg-nota';
    nota.textContent = 'Se concede a quien todavía le quepa hoy, con el mismo tope diario '
      + 'que si se diera uno a uno. A quien ya llegó a su tope no se le cuenta dos veces.';
    caja.appendChild(nota);
  }
  return caja;
}

/* «los 2 elegidos» encaja dentro de «Mérito para…» y chirría al empezar un
   aviso. Es la misma cadena en dos sitios, así que se arregla al usarla. */
function conMayuscula(t) {
  const x = String(t || '');
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/* Tres nombres y luego «y N más»: una lista de doce en un aviso no se lee. */
function nombresCortos(nombres) {
  if (nombres.length <= 3) return nombres.join(', ');
  return nombres.slice(0, 3).join(', ') + ` y ${nombres.length - 3} más`;
}

/* La barra del modo elegir: cuántos van, qué se les da y cómo se sale. Vive
   pegada a la barra de arriba, no flotando al final, porque lo que cuenta es
   el número y hay que verlo mientras se marca. */
function pintarBarraDeSeleccion(todos, marcados) {
  const zona = $('#aula-seleccion');
  if (!zona) return;
  zona.classList.toggle('hidden', !eligiendo);
  if (!eligiendo) { zona.innerHTML = ''; return; }
  zona.innerHTML = '';

  const cuenta = document.createElement('span');
  cuenta.className = 'aula-sel-cuenta';
  cuenta.textContent = marcados.length
    ? `${marcados.length} de ${todos.length} elegidos`
    : 'Toca a quien quieras darle el mérito';
  zona.appendChild(cuenta);

  const boton = (texto, clase, alPulsar, apagado) => {
    const b = document.createElement('button');
    b.className = 'btn btn-small ' + clase;
    b.innerHTML = texto;
    b.disabled = !!apagado;
    b.addEventListener('click', alPulsar);
    zona.appendChild(b);
    return b;
  };

  boton(`${ico('medal')} Dar mérito${marcados.length ? ` a ${marcados.length}` : ''}`, 'btn-primary', () => {
    meritoGrupo = meritoGrupo === 'seleccion' ? null : 'seleccion';
    renderAula();
  }, !marcados.length);

  /* «Todos» aquí no es la clase entera: es marcar a todos los que se están
     viendo, que es como se empieza cuando la excepción son dos. */
  boton(marcados.length === todos.length ? 'Desmarcar todos' : 'Marcar todos', 'btn-secondary', () => {
    if (marcados.length === todos.length) elegidos.clear();
    else for (const a of todos) elegidos.add(diaryKey(a));
    renderAula();
  });

  boton('Salir', 'btn-quit', () => {
    eligiendo = false;
    elegidos.clear();
    meritoGrupo = null;
    renderAula();
  });
}

/* El botón que abre el panel de un grupo. Cerrarlo es volver a pulsarlo. */
function botonDeMeritoGrupo(id, etiqueta) {
  const btn = document.createElement('button');
  btn.className = 'aula-grupo-merito' + (meritoGrupo === id ? ' on' : '');
  btn.setAttribute('aria-label', etiqueta);
  btn.setAttribute('aria-expanded', meritoGrupo === id ? 'true' : 'false');
  btn.title = etiqueta;
  btn.innerHTML = ico('medal');
  btn.addEventListener('click', () => {
    meritoGrupo = meritoGrupo === id ? null : id;
    renderAula();
  });
  return btn;
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
  const conRonda = alumnos.filter(a => (turnos[diaryKey(a)] || {}).rondas).length;

  $('#aula-resumen').textContent = alumnos.length
    ? `${conRonda} de ${alumnos.length} han salido hoy`
    : '';

  const vacia = $('#aula-vacia');
  const lista = $('#aula-lista');

  /* «Toda la clase ha trabajado en silencio» es lo que más se dice y lo que
     más caro salía: veintidós bolsas. El botón está en la barra de arriba
     porque no pertenece a ninguna cuadrilla. */
  const btnClase = $('#aula-merito-clase');
  if (btnClase) {
    /* Mientras se elige a mano, los dos botones de grupo se apagan: son otro
       grupo distinto y el toque siguiente iría al que no es. */
    btnClase.disabled = !alumnos.length || eligiendo;
    btnClase.classList.toggle('on', meritoGrupo === 'todos');
    btnClase.setAttribute('aria-expanded', meritoGrupo === 'todos' ? 'true' : 'false');
    btnClase.onclick = () => {
      meritoGrupo = meritoGrupo === 'todos' ? null : 'todos';
      renderAula();
    };
  }

  /* ── Elegir a dedo ──
     Las cuadrillas cubren el caso de siempre, pero no todo lo que pasa en un
     aula es una cuadrilla: los cuatro que recogieron la biblioteca, los que
     salieron a la pizarra. Para eso se marcan a mano. */
  const btnElegir = $('#aula-elegir');
  if (btnElegir) {
    btnElegir.disabled = !alumnos.length;
    btnElegir.classList.toggle('on', eligiendo);
    btnElegir.setAttribute('aria-pressed', eligiendo ? 'true' : 'false');
    btnElegir.onclick = () => {
      eligiendo = !eligiendo;
      if (!eligiendo) elegidos.clear();
      /* Los dos modos no conviven: un panel de cuadrilla abierto mientras se
         marca a mano son dos grupos distintos pidiendo el mismo toque. */
      meritoGrupo = null;
      renderAula();
    };
  }

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

  /* Solo se conservan los que siguen en la lista: si el docente quita a
     alguien mientras elige, marcado no puede quedarse. */
  const porClave = new Map(alumnos.map(a => [diaryKey(a), a]));
  for (const k of [...elegidos]) if (!porClave.has(k)) elegidos.delete(k);
  const marcados = [...elegidos].map(k => porClave.get(k));
  pintarBarraDeSeleccion(alumnos, marcados);

  lista.innerHTML = '';
  /* El panel de la clase entera va arriba del todo, antes de la primera
     ficha: es a quien afecta. */
  if (meritoGrupo === 'todos') {
    lista.appendChild(panelDeMeritoGrupo(alumnos, 'toda la clase', '👥'));
  }
  if (meritoGrupo === 'seleccion' && marcados.length) {
    lista.appendChild(panelDeMeritoGrupo(marcados,
      marcados.length === 1 ? marcados[0].name : `los ${marcados.length} elegidos`, '☑️'));
  }

  /* ── Por cuadrillas, o todos seguidos ──
     Con veintidós nombres en una rejilla plana, encontrar a quien buscas es
     leerlos uno a uno. Agrupados por cuadrilla se localiza por dónde está
     antes de leer ningún nombre, y de paso se ve de un vistazo a qué
     cuadrilla le toca salir. */
  const hayCuadrillas = !!(ATLAS_CONFIG.teams && ATLAS_CONFIG.teams.enabled &&
    (ATLAS_CONFIG.teams.list || []).some(t => (t.members || []).length));
  const agrupar = hayCuadrillas && ATLAS_CONFIG.aulaAgrupar !== false;

  const pintarAlumno = (a, donde) => {
    const clave = diaryKey(a);
    const t = turnos[clave] || { rondas: 0, minutos: 0 };
    const tiene = diaryExists(a);
    /* Dos acciones por alumno, no una: darle turno y abrir su bolsa. Un botón
       dentro de otro botón no es HTML válido, así que la tarjeta es un
       contenedor y el turno es el botón grande de dentro. */
    const card = document.createElement('div');
    card.className = 'aula-alumno-card' + (t.rondas ? ' aula-ya' : '');
    const turno = document.createElement('button');
    turno.className = 'aula-card-turno';
    /* El avatar es su rol si lo tiene: en clase se busca «el del reloj» antes
       que un nombre en una rejilla de veintidós. El tic de que ya ha salido
       manda sobre el rol, que es la información del momento. */
    const rol = rolDe(a.name);
    turno.innerHTML = `
      <span class="aula-card-avatar">${t.rondas ? '✅' : (rol ? avatarDeRol(rol) : '🧒')}</span>
      <span class="aula-card-nombre">${esc(a.name)}</span>
      <span class="aula-card-meta">${rol ? esc(rol.personaje.split(',')[0]) + ' · ' : ''}${
        gradeInfo(a.grade).label}${tiene ? ` · ${t.rondas} ronda(s) hoy` : ''}</span>`;
    /* Eligiendo a mano, la tarjeta deja de dar turno y pasa a marcarse. Es un
       cambio de significado del mismo toque, así que se ve: la tarjeta se
       resalta, sale un tic y el modo se anuncia arriba. Mantener las dos
       cosas en el mismo gesto —turno con un toque, marca con uno largo— es
       justo lo que se pulsa mal con prisa y delante de la clase. */
    if (eligiendo) {
      const marcado = elegidos.has(clave);
      card.classList.toggle('aula-card-elegida', marcado);
      turno.setAttribute('role', 'checkbox');
      turno.setAttribute('aria-checked', marcado ? 'true' : 'false');
      turno.setAttribute('aria-label', `${a.name}: ${marcado ? 'quitar de' : 'añadir a'} los elegidos`);
      const tic = document.createElement('span');
      tic.className = 'aula-card-tic';
      tic.setAttribute('aria-hidden', 'true');
      tic.textContent = marcado ? '☑' : '☐';
      card.appendChild(tic);
      turno.addEventListener('click', () => {
        if (elegidos.has(clave)) elegidos.delete(clave); else elegidos.add(clave);
        renderAula();
      });
      card.appendChild(turno);
      donde.appendChild(card);
      return;
    }

    turno.addEventListener('click', () => empezarTurno(a));
    card.appendChild(turno);

    const bolsa = document.createElement('button');
    bolsa.className = 'aula-card-bolsa';
    bolsa.title = `Méritos, almacén y fondo de ${a.name}`;
    bolsa.setAttribute('aria-label', `${a.name}: dar un mérito, comprar o donar`);
    bolsa.innerHTML = ico('coin');
    bolsa.addEventListener('click', () => abrirBolsa(a, false));
    card.appendChild(bolsa);
    donde.appendChild(card);
  };

  /* La rejilla vive en el contenedor cuando van todos seguidos, y dentro de
     cada grupo cuando van agrupados: si no, los títulos entrarían como una
     celda más de la rejilla. */
  lista.classList.toggle('aula-lista-grupos', agrupar);

  if (!agrupar) {
    for (const a of alumnos) pintarAlumno(a, lista);
    pintarSelectorDeVista(hayCuadrillas, agrupar);
    return;
  }

  /* Un grupo por cuadrilla, en el orden en que las creó el docente, y al
     final quien no está en ninguna. Una cuadrilla sin nadie de esta clase no
     se pinta: sería un título vacío. */
  const porCuadrilla = new Map();
  const sueltos = [];
  for (const a of alumnos) {
    const cu = cuadrillaDe(a.name);
    if (!cu) { sueltos.push(a); continue; }
    if (!porCuadrilla.has(cu.id)) porCuadrilla.set(cu.id, { cuadrilla: cu, gente: [] });
    porCuadrilla.get(cu.id).gente.push(a);
  }

  const grupo = (id, titulo, icono, gente) => {
    const salidos = gente.filter(a => (turnos[diaryKey(a)] || {}).rondas).length;
    const cab = document.createElement('div');
    cab.className = 'aula-grupo-cab';
    cab.innerHTML = `<span class="aula-grupo-icono">${esc(icono)}</span>
      <strong>${esc(titulo)}</strong>
      <span class="aula-grupo-meta">${salidos} de ${gente.length} hoy</span>`;
    if (!eligiendo) cab.appendChild(botonDeMeritoGrupo(id, `Dar un mérito a ${titulo}`));
    lista.appendChild(cab);
    /* Pegado a su título, no en un cajón aparte: con cinco cuadrillas
       abiertas, un panel suelto se pulsa sobre la que no es. */
    if (meritoGrupo === id) lista.appendChild(panelDeMeritoGrupo(gente, titulo, icono));
    const caja = document.createElement('div');
    caja.className = 'aula-grupo-gente';
    for (const a of gente) pintarAlumno(a, caja);
    lista.appendChild(caja);
  };

  for (const t of (ATLAS_CONFIG.teams.list || [])) {
    const g = porCuadrilla.get(t.id);
    if (g) grupo(t.id, g.cuadrilla.name, g.cuadrilla.icon || '🛖', g.gente);
  }
  if (sueltos.length) grupo('sin-cuadrilla', 'Sin cuadrilla', '👤', sueltos);

  pintarSelectorDeVista(hayCuadrillas, agrupar);
}

/* El interruptor entre las dos vistas. Solo se ofrece si hay cuadrillas con
   gente: si no, no hay nada que agrupar y sería un mando que no hace nada. */
function pintarSelectorDeVista(hayCuadrillas, agrupar) {
  const zona = $('#aula-vista');
  if (!zona) return;
  zona.classList.toggle('hidden', !hayCuadrillas);
  if (!hayCuadrillas) return;
  zona.innerHTML = `
    <button class="aula-vista-btn${agrupar ? ' on' : ''}" data-vista="grupos">🛖 Por cuadrillas</button>
    <button class="aula-vista-btn${agrupar ? '' : ' on'}" data-vista="lista">👥 Todos</button>`;
  zona.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => {
    /* Un panel abierto sobre una cuadrilla no tiene sitio en la vista plana:
       se quedaría abierto sin verse y al volver aparecería solo. */
    if (meritoGrupo && meritoGrupo !== 'todos') meritoGrupo = null;
    setTeacherConfig('aulaAgrupar', b.dataset.vista === 'grupos');
    renderAula();
  }));
}

function empezarTurno(alumno) {
  /* Dar turno cierra el modo elegir: al volver, una selección a medias de
     hace diez minutos ya no es la que el docente tenía en la cabeza. */
  eligiendo = false;
  elegidos.clear();
  meritoGrupo = null;
  const tema = aulaTema === 'auto' ? null : aulaTema;
  let destino = null;
  if (tema) {
    /* Con un pozo elegido, el estrato lo sigue decidiendo el motor: el
       docente marca el tema, no la dificultad. */
    openDiary(alumno);
    const def = branchDef(tema);
    const abierto = STRATA_ORDER.filter(sId => stratumHasContent(def, sId) &&
      getStratum(tema, sId).status !== 'locked');
    if (!abierto.length) { toast('Ese pozo aún no está abierto para ' + alumno.name + '.'); return; }
    let peor = abierto[0];
    for (const sId of abierto) if (getStratum(tema, sId).mastery < getStratum(tema, peor).mastery) peor = sId;
    destino = { branchId: tema, stratumId: peor };
  }

  const r = startClassTurn(alumno, destino && destino.branchId, destino && destino.stratumId);
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

  $('#aula-avatar').innerHTML = avatarDelExplorador(aulaAlumno);
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
    btn.innerHTML = `<span class="award-icon">${iconoDeFicha(b)}</span>
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
  if (!desdeTurno) openDiary(alumno);
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
  $('#bolsa-avatar').innerHTML = avatarDelExplorador(bolsaAlumno);
  $('#bolsa-nombre').textContent = bolsaAlumno.name;
  $('#bolsa-detalle').innerHTML = `${esc(gradeInfo(S.profile.grade).label)} · <strong>${saldo}</strong> ${ico('coin')} en su bolsa`;

  /* ── Méritos ──
     Los mismos que salen en la tablet del niño, con el mismo tope diario. Se
     conceden desde aquí porque en clase el momento de reconocer algo es
     justo cuando pasa, y pedirle la tablet al niño para dárselo rompe la
     clase: para cuando la ha desbloqueado, el momento se ha ido. */
  const meritos = $('#bolsa-meritos');
  meritos.innerHTML = '';
  for (const b of (ATLAS_CONFIG.behaviors || [])) {
    const usados = behaviorCountToday(b.id);
    const lleno = usados >= b.perDay;
    const btn = document.createElement('button');
    btn.className = 'award-btn' + (lleno ? ' award-full' : '');
    btn.disabled = lleno;
    btn.innerHTML = `<span class="award-icon">${iconoDeFicha(b)}</span>
      <span class="award-name">${esc(b.name)}</span>
      <span class="award-meta">+${b.coins} ${ico('coin')} · ${usados}/${b.perDay}</span>`;
    btn.addEventListener('click', () => {
      const r = awardBehavior(b.id);
      if (r.ok) {
        toast(`${b.icon} ${bolsaAlumno.name}: ¡${b.name}! +${b.coins} doblones`);
        /* Repinta entero: el saldo de arriba y el almacén cambian, porque
           acaba de tener más doblones para gastar. */
        renderBolsa();
      } else if (r.reason === 'cap') {
        toast(`Hoy ya no quedan «${b.name}» para ${bolsaAlumno.name}.`);
      }
    });
    meritos.appendChild(btn);
  }
  if (!(ATLAS_CONFIG.behaviors || []).length) {
    meritos.innerHTML = '<p class="empty-note">No hay reconocimientos configurados. ' +
      'Se crean en Configuración → Comportamientos, tareas y actividades.</p>';
  }

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
    btn.innerHTML = `<span class="award-icon">${iconoDeFicha(item)}</span>
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
    caja.innerHTML = `${retrato('kira', 'dialog-avatar')}
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
  /* «Han empezado» es haber abierto la app, no tener documento. Las dos cosas
     no coinciden: un diario puede existir sin estrenar —restaurado de una
     copia, o creado y abandonado—, y contar documentos daba por empezados a
     niños que no habían jugado nunca. */
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
  /* ── Un diario que este equipo no puede leer ──
     Se salta al reunirlos, para no perder los demás por uno roto, pero
     callarlo era lo que hacía que un niño desapareciera de la pantalla sin
     que nadie supiera por qué. */
  const rotos = (typeof ilegiblesDeEsteEquipo === 'function') ? ilegiblesDeEsteEquipo() : [];
  const avisoRotos = rotos.length ? `<div class="class-note">⚠️ <strong>${rotos.length}
    diario(s) de este equipo no se han podido leer</strong> y no salen abajo. Están guardados,
    pero con algo dentro que la app no entiende: ${esc(rotos.join(', '))}. Si tienes una copia
    de seguridad anterior, restaurarla los recupera.</div>` : '';

  classStatus(recuento + nota + avisoRotos);

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
  pintarEvaluacion(d);
  pintarBotonDeInformes(d);

  $('#class-students').innerHTML = sortStudents(d.students, classSort).map(s => `
    <div class="student-card${s.needsHelp ? ' student-alert' : ''}">
      <div class="student-head">
        <strong>${esc(s.name)}</strong>
        ${s.adaptado ? `<span class="student-adaptado" title="Tiene una adaptación: sus señales se leen con eso delante">🧩</span>` : ''}
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
        ${DEMO && s.clave ? `<button class="btn btn-secondary btn-small student-jugar"
          data-jugar="${esc(s.clave)}">${ico('explorer')} Jugar como ${esc(s.name)}</button>` : ''}
      </div>` : ''}
    </div>`).join('') + pendientesHtml(d);

  $$('#class-students .student-informe').forEach(b =>
    b.addEventListener('click', () => descargarInforme(b.dataset.informe)));
  $$('#class-students .student-ver').forEach(b =>
    b.addEventListener('click', () => entrarEnLectura(b.dataset.ver)));
  $$('#class-students .student-jugar').forEach(b =>
    b.addEventListener('click', () => jugarEnDemo(b.dataset.jugar)));

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
function datosDelInforme(estado, opciones) {
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
  /* De cada uno de los que le cuestan sale además QUÉ HACER en casa. Decir
     solo el nombre del concepto informa a la familia y no le da nada que
     hacer con eso; la frase de al lado sí. */
  const flojos = conceptosFlojosDe(s, 4).map(c => {
    const info = conceptoInfo(c.id);
    return { label: info.label, casa: info.casa || '' };
  });

  /* ── Por dónde va cada pozo ──
     Tres estados, no dos. «Terminado» decía que los bloques estaban al 80 %,
     y eso podía convivir —en la misma hoja, cuatro líneas más abajo— con «la
     prueba, todavía no superada». Para una familia «terminado» cierra un
     tema, así que solo se dice cuando la Cámara del Guardián, que es la que
     confirma, está superada. Y justamente ese caso es en el que la propia app
     ya sospecha que la barra de dominio va por delante de lo aprendido.

     Un pozo que el docente retiró del catálogo no sale: sin `branchDef` solo
     se puede imprimir su identificador interno, y `pozo_borrado` en una hoja
     que va a una casa no informa de nada. Al docente sí se lo dice su propia
     pantalla, que es donde se arregla. */
  const conGuardian = !!(ATLAS_CONFIG.guardian && ATLAS_CONFIG.guardian.enabled);
  const pozos = [];
  for (const siteId in (s.dig_sites || {})) {
    for (const bId in s.dig_sites[siteId]) {
      const def = branchDef(bId);
      if (!def) continue;
      const pozo = s.dig_sites[siteId][bId];
      const strata = pozo.strata || {};
      let hechos = 0, hay = 0, tocado = false;
      for (const sId of STRATA_ORDER) {
        const st = strata[sId];
        if (!st || !stratumHasContent(def, sId)) continue;
        hay++;
        if ((st.mastery || 0) >= 0.8) hechos++;
        if (st.attempts > 0) tocado = true;
      }
      if (!hay || !tocado) continue;
      const superada = !!(pozo.guardian && pozo.guardian.cleared);
      pozos.push(`${def.name} — ${hechos < hay
        ? `${hechos} de ${hay} bloques`
        : (!conGuardian || superada)
          ? 'terminado'
          : 'los bloques hechos, a falta de la prueba final'}`);
    }
  }
  /* ── De qué periodo habla esta hoja ──
     Antes no lo decía, y por dentro mezclaba tres ventanas: conceptos y
     pruebas de toda la vida del diario, días y minutos de los últimos treinta
     y sellos desde el principio. Dos informes del mismo curso no se podían
     comparar porque no se sabía qué parte se había reiniciado.

     Ahora manda el trimestre, que es la unidad del centro. Todo lo que lleva
     fecha se acota a él; lo que no la lleva se dice que es de todo el curso,
     en su propia sección, en vez de colarse entre lo demás. */
  const iTri = typeof o.trimestre === 'number' ? o.trimestre : currentTrimesterIndex();
  const tri = (ATLAS_CONFIG.course.trimesters || [])[iTri] || null;
  const dentro = f => !tri || !f || (String(f) >= tri.start && String(f) <= tri.end);
  const cubo = ((s.course && s.course.trimesters) || [])[iTri] || {};

  const evalu = metricasEvaluacion(s);
  /* Las pruebas sí llevan fecha en cada intento: se queda con las de este
     trimestre, y una cámara sin ningún intento dentro no se enseña. */
  const camaras = historialEvaluacion(s)
    .map(c => ({ ...c, intentos: (c.intentos || []).filter(i => dentro(i.date)) }))
    .filter(c => c.intentos.length);
  const superadasTri = camaras.filter(c => c.intentos.some(i => i.passed)).length;

  const log = ((s.metrics && s.metrics.sessions_log) || []).filter(e => dentro(e.date));
  const minutos = log.reduce((a, x) => a + (x.minutes || 0), 0);
  const sesiones = log.reduce((a, x) => a + (x.missions || 0), 0);

  const lista = (arr, vacio) => arr.length
    ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : `<p class="vacio">${esc(vacio)}</p>`;

  /* ── Lo que dice el docente ──
     Va lo primero, antes que ninguna cifra, porque es lo único de esta hoja
     que ha escrito una persona mirando a ese niño. Las anteriores se enseñan
     debajo y con su fecha: así una familia ve el camino —«en diciembre le
     costaba, en marzo ya no»— y no una foto suelta. */
  const notas = (o.notas || []).filter(n => n && n.texto);
  const ultima = notas.length ? notas[notas.length - 1] : null;
  const antiguas = notas.slice(0, -1).reverse();
  const enEspanol = f => String(f || '').split('-').reverse().join('/');
  const bloqueNota = ultima ? `
<h2>Lo que dice ${o.docente ? esc(o.docente) : 'su maestro'}</h2>
<div class="nota-docente"><p>${esc(ultima.texto).replace(/\n+/g, '</p><p>')}</p>
  <p class="firma">${esc(enEspanol(ultima.fecha))}</p></div>
${antiguas.length ? `<details class="antes"><summary>Lo que se dijo antes</summary>
  ${antiguas.map(n => `<div class="nota-vieja"><p>${esc(n.texto).replace(/\n+/g, '</p><p>')}</p>
    <p class="firma">${esc(enEspanol(n.fecha))}</p></div>`).join('')}</details>` : ''}` : '';

  /* ── Dos maneras de no tener nada que contar ──
     Un informe de cuatro ceros se lee en casa como buenas noticias, y una de
     sus frases —«ahora mismo no hay nada que se le esté atragantando»— es la
     correcta para un niño que trabaja sin dificultades y la peor posible para
     uno que no ha abierto la aplicación. No es lo mismo no haber empezado
     nunca que no haber trabajado este trimestre, y ninguna de las dos se dice
     con ceros. */
  const haJugadoAlguna = ((s.metrics && s.metrics.questions_answered) || 0) > 0
    || (((s.metrics && s.metrics.sessions_log) || []).length > 0)
    /* Y cualquier otro rastro de haber excavado: un concepto anotado, un pozo
       tocado, una prueba intentada. Mirar solo el contador de preguntas dejaba
       fuera a quien sí ha jugado y le mandaba a la familia el informe de quien
       no ha entrado nunca, que es peor que el de ceros. */
    || Object.keys((s.metrics && s.metrics.errors_by_concept) || {}).length > 0
    || pozos.length > 0
    || historialEvaluacion(s).length > 0;
  const vacio = !haJugadoAlguna
    ? 'nunca'
    : (!log.length && !camaras.length ? 'trimestre' : '');

  return cuerpoDelInforme(s, o, {
    dominados, flojos, pozos, camaras, superadasTri, log, minutos, sesiones, cubo, tri, hoy,
    lista, bloqueNota, enEspanol, vacio
  });
}

/* El informe de un alumno, como documento completo. */
function informeFamilia(estado, opciones) {
  const s = estado || S;
  if (!s || !s.profile) return null;
  const cuerpo = datosDelInforme(s, opciones);
  return cuerpo ? envolverInforme(s, cuerpo) : null;
}

/* ── Los informes de toda la clase, en un solo documento ──
   Un botón por alumno son veintidós descargas y veintidós archivos que
   colocar, justo la semana en que menos tiempo hay. Esto es la misma función
   en bucle: un informe por página, listo para imprimir y repartir.

   Aquí NO se pregunta la nota de cada familia: preguntarla veintidós veces
   seguidas no es escribir, es rellenar. Se usa la que ya esté guardada de
   cada uno, y quien quiera escribirla lo hace desde su ficha. */
function informeDeClase(cuerpos, opciones) {
  const o = opciones || {};
  return `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<title>Informes${o.clase ? ' de ' + esc(o.clase) : ' de la clase'} — Expedición Atlas</title>
${ESTILO_INFORME}
<style>
  /* Cada informe empieza en una hoja: se reparten uno a uno. */
  .informe { break-after: page; page-break-after: always; }
  .informe:last-child { break-after: auto; page-break-after: auto; }
  @media screen { .informe { border-bottom: 2px solid #e0d3ba; padding-bottom: 28px; margin-bottom: 34px; } }
  .informe:last-child { border-bottom: none; }
</style>
${cuerpos.join('\n')}
</html>
`;
}

/* El estilo del informe, aparte: lo comparte el de un alumno y el de la clase
   entera, y duplicarlo sería garantizar que un día se cambie solo uno. */
const ESTILO_INFORME = `<style>
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
  .periodo { color: #6b5d4a; margin: -14px 0 22px; font-size: .92rem; }
  .nota { background: #f6efe2; border-left: 4px solid #b8862b; padding: 11px 14px;
          margin: 24px 0 0; font-size: .9rem; }
  .nota-docente { border-left: 4px solid #2f5d8a; background: #f2f6fa;
                  padding: 12px 16px; margin: 8px 0 0; }
  .nota-docente p { margin: 0 0 8px; }
  .nota-docente p:last-child { margin-bottom: 0; }
  .firma { color: #6b5d4a; font-size: .82rem; }
  .encasa { margin: 10px 0 0; }
  .encasa dt { font-weight: 600; margin: 12px 0 1px; }
  .encasa dt:first-child { margin-top: 0; }
  .encasa dd { margin: 0; color: #4a4034; }
  .antes { margin: 10px 0 0; font-size: .9rem; }
  .antes summary { cursor: pointer; color: #6b5d4a; }
  .nota-vieja { border-left: 3px solid #ddd2bd; padding: 6px 12px; margin: 8px 0 0; color: #4a4034; }
  .nota-vieja p { margin: 0 0 5px; }
  @media print {
    body { margin: 0; max-width: none; }
    .nota, .nota-docente { break-inside: avoid; }
    .encasa dt, .encasa dd { break-inside: avoid; }
    /* En papel no hay nada que desplegar: lo anterior se imprime abierto. */
    .antes { display: block; } .antes summary { display: none; }
  }
</style>
`;

/* Un documento completo con un solo informe dentro. */
function envolverInforme(s, cuerpo) {
  return `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<title>Informe de ${esc(s.profile.explorer_name)} — Expedición Atlas</title>
${ESTILO_INFORME}
${cuerpo}
</html>
`;
}

/* Solo el contenido, sin cabecera de documento: así el informe de un alumno y
   el de la clase entera se escriben una vez. */
function cuerpoDelInforme(s, o, d) {
  const { dominados, flojos, pozos, camaras, superadasTri, log, minutos, sesiones,
          cubo, tri, hoy, lista, bloqueNota, enEspanol, vacio } = d;
  const dentro = f => !tri || !f || (String(f) >= tri.start && String(f) <= tri.end);

  const cabecera = `<article class="informe">
<h1>${esc(s.profile.explorer_name)}</h1>
<p class="sub">Expedición Atlas${o.clase ? ' · ' + esc(o.clase) : ''} · ${esc(hoy)}</p>
<p class="periodo">${tri
  ? `Este informe habla del <strong>${esc(tri.name)}</strong>, del ${esc(enEspanol(tri.start))}
     al ${esc(enEspanol(tri.end))}.`
  : 'Este informe habla de todo lo que lleva hecho.'}</p>

${bloqueNota}`;

  /* Quien no ha entrado nunca: se dice, y no se rellena una hoja de ceros que
     se lea como que todo va bien. */
  if (vacio === 'nunca') {
    return `${cabecera}
<h2>Todavía no ha empezado</h2>
<p>${esc(s.profile.explorer_name)} tiene su cuenta creada, pero aún no ha entrado a excavar
ninguna vez, así que no hay nada que contar todavía: ni lo que ya le sale, ni lo que le está
costando. En cuanto empiece, este informe se llena solo.</p>
<p class="nota">Si en casa no ha podido entrar —una contraseña que no funciona, una tablet sin
sitio—, decídnoslo y lo miramos: no es que no quiera, es que no ha podido.</p>
</article>`;
  }

  return `${cabecera}
<h2>Lo que ya le sale</h2>
${lista(dominados, 'Está empezando: todavía no ha practicado lo suficiente como para decirlo.')}

<h2>En lo que está trabajando ahora</h2>
${flojos.length
  ? `<p>Es normal y es justo donde toca practicar; en clase se está trabajando. Si
       queréis echar una mano desde casa, esto es lo que más ayuda de cada cosa.</p>
     <dl class="encasa">${flojos.map(x => `<dt>${esc(x.label)}</dt>${
       x.casa ? `<dd>${esc(x.casa)}</dd>` : ''}`).join('')}</dl>`
  : '<p class="vacio">Ahora mismo no hay nada que se le esté atragantando.</p>'}

<h2>Por dónde va la expedición</h2>
${lista(pozos, 'Todavía no ha empezado ningún bloque.')}

<h2>Constancia${tri ? ` en el ${esc(tri.name)}` : ''}</h2>
${vacio === 'trimestre'
  ? `<p class="vacio">No ha trabajado en la expedición durante este trimestre. Lo de arriba es lo
     que aprendió antes, que no se pierde.</p>`
  : `<div class="cifras">
  <div class="cifra"><strong>${log.length}</strong><span>${log.length === 1 ? 'día trabajado' : 'días trabajados'}</span></div>
  <div class="cifra"><strong>${minutos}</strong><span>${minutos === 1 ? 'minuto' : 'minutos'} de trabajo</span></div>
  <div class="cifra"><strong>${sesiones}</strong><span>${sesiones === 1 ? 'expedición' : 'expediciones'}</span></div>
  <div class="cifra"><strong>${enteroSano(cubo.stamps, 0, 0, 99)}</strong><span>${
    enteroSano(cubo.stamps, 0, 0, 99) === 1 ? 'semana completa' : 'semanas completas'}</span></div>
  <div class="cifra"><strong>${enteroSano(cubo.strata, 0, 0, 999)}</strong><span>${
    enteroSano(cubo.strata, 0, 0, 999) === 1 ? 'bloque dominado' : 'bloques dominados'}</span></div>
</div>`}

${camaras.length ? `<h2>Pruebas${tri ? ' de este trimestre' : ''}</h2>
<p>Ha superado <strong>${superadasTri} de ${camaras.length}</strong>
  ${camaras.length === 1 ? 'la prueba que ha hecho' : `las ${camaras.length} que ha hecho`}.
  Una prueba no superada no es un suspenso: se repasa y se vuelve a intentar tantas veces como
  haga falta, sin perder nada por el camino.</p>
<ul>${camaras.map(c => {
  const superadaAqui = c.intentos.some(i => i.passed);
  const n = c.intentos.length;
  return `<li><strong>${esc(c.name)}</strong> — ${superadaAqui
    ? `superada${c.clearedAt && dentro(c.clearedAt) ? ' el ' + esc(enEspanol(c.clearedAt)) : ''}`
    : 'todavía no superada'}${n > 1 ? ` · ${n} intentos` : ''}${
    !superadaAqui ? '. Volverá a intentarlo tras repasar.' : ''}</li>`;
}).join('')}</ul>` : ''}

<p class="nota"><strong>Cómo leer esto.</strong> Aquí no hay notas ni comparaciones con nadie:
la plataforma no puntúa ni ordena a los niños. Lo que aparece como «en lo que está trabajando»
no es un suspenso, es lo que toca ahora. Equivocarse forma parte de excavar, y de hecho corregir
el propio error da premio dentro del juego.
${tri ? `<br><br><strong>Qué periodo cubre cada parte.</strong> «Constancia» y «Pruebas» son de
este trimestre. «Lo que ya le sale», «en lo que está trabajando» y «por dónde va la expedición»
cuentan desde que empezó a excavar, porque el aprendizaje no se reinicia en enero.` : ''}</p>
</article>`;
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

/* Genera y descarga el informe de un alumno a partir de su diario completo.

   Antes de generarlo se pregunta qué quiere decirle el docente a esa familia.
   No es un paso de más: es lo único de la hoja que no sale de un contador, y
   pedirlo justo aquí —con el informe delante— es cuando se sabe qué decir.
   Se puede aceptar en blanco y el informe sale sin nota, como siempre. */
async function descargarInforme(clave) {
  const previa = ultimaNotaDeAlumno(clave);
  const nombre = (aulaAlumnos().find(a => diaryKey(a) === clave) || {}).name || 'este alumno';
  const texto = await askParrafo(
    `¿Qué quieres decirle a la familia de ${nombre}?`,
    previa ? previa.texto : '',
    'Descargar el informe',
    previa
      ? `Esto es lo que escribiste el ${esc(String(previa.fecha).split('-').reverse().join('/'))}. `
        + 'Si lo cambias hoy, se guarda como una nota nueva y la anterior sigue en el informe, con su fecha.'
      : 'Va lo primero del informe, antes que ninguna cifra. Puedes dejarlo en blanco.');
  if (texto === null) return;            /* cancelado: no se descarga nada */
  guardarNotaDeAlumno(clave, texto);

  toast('Preparando el informe…');
  const r = await diarioCompletoDe(clave);
  if (!r.ok) { toast(r.texto); return; }
  const st = r.estado;
  const html = informeFamilia(st, {
    clase: ATLAS_CONFIG.className,
    docente: ATLAS_CONFIG.teacherName,
    notas: notasDeAlumno(clave)
  });
  if (!html) { toast('No se ha podido generar el informe.'); return; }
  const guardado = await guardarArchivo(informeFileName(st), html, 'text/html');
  toast(guardado && guardado.ok === false
    ? 'No se ha podido descargar. Prueba desde Configuración → Copia de seguridad.'
    : `Informe de ${st.profile.explorer_name} descargado ✓`);
}

/* Descarga un solo documento con el informe de toda la clase. Va uno a uno
   porque cada diario hay que traerlo, y se dice por dónde va: con veintidós
   alumnos y red de centro esto tarda, y una pantalla quieta parece rota. */
/* ── La evaluación de la clase ──
   Las dos cifras del PRD §6 se calculaban desde hacía versiones, viajaban en
   el resumen de cada diario, se sumaban por clase… y no se pintaban en ningún
   sitio. La segunda es la que de verdad avisa, y no avisa sobre los niños:
   si la barra de dominio prometía 0,9 y la prueba da 0,5, lo que hay que
   revisar es el banco de retos de ese pozo, que se ha quedado corto o repite
   demasiado. Es la métrica que más puede mejorar el contenido. */
const DIVERGENCIA_RUIDO = 0.15;

function pintarEvaluacion(d) {
  const caja = $('#class-evaluacion');
  if (!caja) return;
  const k = (d && d.kpis) || {};
  const intentos = k.guardianIntentos || 0;
  if (!intentos) {           /* nadie ha hecho ninguna prueba todavía */
    caja.classList.add('hidden');
    caja.innerHTML = '';
    return;
  }
  caja.classList.remove('hidden');
  const div = k.divergencia;
  const alta = div !== null && div > DIVERGENCIA_RUIDO;
  const pct = x => Math.round(x * 100) + ' %';

  caja.innerHTML = `
    <h3>${ico('map')} Las Cámaras del Guardián</h3>
    <p class="class-eval-intro">La prueba sumativa de cada pozo: la única cifra que confirma lo
    que la barra de dominio va prometiendo.</p>
    <div class="class-eval-cifras">
      <div class="class-eval-dato"><strong>${k.guardianSuperadas || 0} de ${k.guardianCamaras || 0}</strong>
        <span>cámaras superadas</span></div>
      <div class="class-eval-dato"><strong>${k.guardianPassRate === null ? '—' : pct(k.guardianPassRate)}</strong>
        <span>intentos que salen bien${intentos ? ` · ${intentos} en total` : ''}</span></div>
      <div class="class-eval-dato${alta ? ' class-eval-aviso' : ''}">
        <strong>${div === null ? '—' : (div > 0 ? '+' : '') + pct(div)}</strong>
        <span>lo que la barra prometía de más</span></div>
    </div>
    ${div === null
      ? '<p class="class-eval-nota">Todavía no hay intentos suficientes para comparar el dominio con la prueba.</p>'
      : alta
        ? `<p class="class-eval-nota class-eval-nota-aviso">La barra de dominio va
           ${pct(div)} por delante de lo que confirman las pruebas. <strong>Eso no es cosa de los
           niños</strong>: apunta a que el banco de retos de algún pozo es demasiado fácil, o repite
           demasiado entre sí, y el dominio se gana sin haber aprendido. Mira los pozos donde más
           se falla la Cámara y añade variedad.</p>`
        : `<p class="class-eval-nota">El dominio que marca la app y lo que rinden las pruebas van
           de la mano: por debajo de ${pct(DIVERGENCIA_RUIDO)} es ruido normal. El banco de retos
           está midiendo lo que dice medir.</p>`}`;
}

function pintarBotonDeInformes(d) {
  const caja = $('#class-informes');
  if (!caja) return;
  const cuantos = ((d && d.students) || []).filter(s => s.clave || s.id).length;
  caja.classList.toggle('hidden', !cuantos);
  if (!cuantos) { caja.innerHTML = ''; return; }
  caja.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary btn-small';
  btn.innerHTML = `${ico('logbook')} Informes de toda la clase (${cuantos})`;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await descargarInformesDeClase(); } finally { btn.disabled = false; }
  });
  caja.appendChild(btn);
  const nota = document.createElement('small');
  nota.className = 'class-informes-nota';
  nota.textContent = 'Un archivo con un informe por página, listo para imprimir y repartir. '
    + 'Para escribirle una nota a una familia concreta, usa el botón de su ficha.';
  caja.appendChild(nota);
}

async function descargarInformesDeClase() {
  const fichas = ((classData && classData.students) || []).filter(s => s.clave || s.id);
  if (!fichas.length) { toast('No hay ningún diario del que hacer informe.'); return; }
  if (!(await askConfirm(`Se van a preparar ${fichas.length} informes, uno por página, en un solo
    archivo para imprimir. Se usa la nota que ya tengas escrita de cada familia; las que falten
    salen sin ella.`, `Preparar ${fichas.length} informes`))) return;

  const cuerpos = [];
  const fallos = [];
  for (let i = 0; i < fichas.length; i++) {
    const f = fichas[i];
    toast(`Preparando ${i + 1} de ${fichas.length}: ${f.name}…`, 4000);
    const r = await diarioCompletoDe(f.clave || f.id);
    if (!r.ok) { fallos.push(f.name); continue; }
    const cuerpo = datosDelInforme(r.estado, {
      clase: ATLAS_CONFIG.className,
      docente: ATLAS_CONFIG.teacherName,
      notas: notasDeAlumno(f.clave || f.id)
    });
    if (cuerpo) cuerpos.push(cuerpo); else fallos.push(f.name);
  }
  if (!cuerpos.length) { toast('No se ha podido preparar ningún informe.'); return; }

  const html = informeDeClase(cuerpos, { clase: ATLAS_CONFIG.className });
  const nombre = `informes-${String(ATLAS_CONFIG.className || 'clase')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'clase'}-${todayStr()}.html`;
  const guardado = await guardarArchivo(nombre, html, 'text/html');
  toast(guardado && guardado.ok === false
    ? 'No se ha podido descargar. Prueba desde Configuración → Copia de seguridad.'
    : `${cuerpos.length} informe(s) descargados ✓${fallos.length
        ? ` No se ha podido con: ${fallos.slice(0, 3).join(', ')}${fallos.length > 3 ? '…' : ''}` : ''}`,
    fallos.length ? 5200 : 2800);
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
/* ── Cuándo algo es cosa de toda la clase ──
   Estaba fijo en tres alumnos, y el pie decía «lo falla media clase o más».
   En una clase de veintidós, tres es el catorce por ciento: la decisión que
   ese texto pide —parar la clase entera para repasar— no le corresponde a
   tres niños.

   Ahora el umbral es un tercio de los que tienen datos, con un mínimo de tres
   para que en un grupo pequeño no baste con uno. Y se escribe la cifra de
   verdad, «lo fallan 7 de 22», que es lo que permite decidir sin fiarse de un
   adjetivo. */
const REPASO_MINIMO = 3;
const REPASO_PROPORCION = 1 / 3;

function umbralDeClase(cuantosAlumnos) {
  return Math.max(REPASO_MINIMO, Math.ceil((cuantosAlumnos || 0) * REPASO_PROPORCION));
}

function pintarRepaso(d) {
  const caja = $('#class-repasar');
  if (!caja) return;
  const lista = (d.repasar || []).slice(0, REPASO_TOPE);
  /* Sobre los que tienen datos, no sobre la lista de clase: quien no ha
     entrado nunca no puede fallar nada, y contarlo bajaría el listón. */
  const conDatos = ((d.students || []).filter(s => (s.conceptos || []).length).length)
    || ((d.students || []).length);
  const umbral = umbralDeClase(conDatos);
  if (!lista.length) {
    caja.classList.add('hidden');
    caja.innerHTML = '';
    return;
  }
  caja.classList.remove('hidden');
  /* El botón solo si la generación puede funcionar: sin clave y sin función
     llevaría a una pantalla que no hace nada. */
  const puedeGenerar = cloudConfigured() && cloudEnabled()
    && !!(ATLAS_CONFIG.appwrite.generadorFunctionId || '').trim()
    && !!(ATLAS_CONFIG.iaClave || '').trim();
  caja.innerHTML = `
    <h3>${ico('target')} Lo que conviene repasar</h3>
    <p class="class-repasar-intro">Conceptos que se fallan más de un tercio de las veces, ordenados
    por a cuántos alumnos les pasa. Sale del primer intento de cada reto, que es el que mide.
    La etiqueta del nivel dice <strong>dónde</strong> se rompe: fallarlo al aplicar es no tener el
    procedimiento; fallarlo al analizar es tenerlo y no saber cuándo usarlo. No se prepara igual.</p>
    <div class="repaso-lista">
      ${lista.map(c => {
        const n = c.alumnos.length;
        const deClase = n >= umbral;
        return `<div class="repaso-fila${deClase ? ' repaso-clase' : ''}">
          <div class="repaso-cabeza">
            <strong>${esc(c.label)}</strong>
            <span class="repaso-area">${esc(c.area)}</span>
            ${c.estrato ? `<span class="repaso-estrato" title="El nivel en el que se atasca más gente">${
              ico(ICO_ESTRATO[c.estrato] || 'lens')} ${esc(STRATA_META[c.estrato].label)}</span>` : ''}
          </div>
          <div class="repaso-barra"><div class="repaso-relleno" style="width:${Math.round(c.tasa * 100)}%"></div></div>
          <div class="repaso-pie">
            <span class="repaso-num">${n} de ${conDatos} ${conDatos === 1 ? 'alumno' : 'alumnos'}</span>
            <span class="repaso-tasa">${Math.round(c.tasa * 100)} % de fallo en ${c.attempts} intentos</span>
          </div>
          <small class="repaso-quien">${esc(c.alumnos.slice(0, 8).join(', '))}${
            c.alumnos.length > 8 ? ` y ${c.alumnos.length - 8} más` : ''}</small>
          ${puedeGenerar ? `<button class="btn btn-secondary btn-small repaso-gen"
            data-concepto="${esc(c.id)}" data-cuantos="${n}">🤖 Generar retos de esto</button>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${lista.some(c => c.alumnos.length >= umbral)
      ? `<p class="class-repasar-nota">Lo resaltado lo falla al menos <strong>${umbral} de
         ${conDatos}</strong>: eso se lleva a la pizarra. El resto se resuelve mejor de uno en
         uno.</p>`
      : `<p class="class-repasar-nota">Nada que le pase a ${umbral} o más de los ${conDatos} que
         han trabajado: de momento son conversaciones sueltas, no una clase.</p>`}`;

  /* De «nueve alumnos fallan la resta llevando» a una tanda de retos de eso,
     sin tener que traducirlo a materia, pozo y estrato a mano. */
  $$('#class-repasar .repaso-gen').forEach(b => b.addEventListener('click', () =>
    generarParaConcepto(b.dataset.concepto, +b.dataset.cuantos || 0)));
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
      }).join('') + avisoDeNombresRepetidos(d);
}

/* Dos alumnos que se llaman igual y están asignados a cuadrillas: la
   pertenencia se guarda por NOMBRE, así que ahí no hay forma de saber a cuál
   se refería el docente. Antes se les asignaba a los dos —dos equipos con la
   aportación de ambos— y no lo decía nadie. Ahora no se asigna ninguno y se
   dice, que es lo único honesto hasta que las cuadrillas guarden el usuario. */
function avisoDeNombresRepetidos(d) {
  const l = (d && d.ambiguos) || [];
  if (!l.length) return '';
  return `<div class="class-warn">⚠️ <strong>${l.map(n => esc(n)).join(', ')}</strong>
    ${l.length === 1 ? 'lo llevan dos alumnos' : 'los llevan dos alumnos cada uno'} de esta clase, y
    las cuadrillas se guardan por el nombre: no se puede saber a cuál asignaste, así que
    <strong>no cuentan en ninguna</strong> en vez de contar en las dos. Sus diarios y sus méritos
    sí están separados; es solo la cuadrilla. Para arreglarlo, cámbiale el nombre a uno de los dos
    en la lista de clase —«Mara I.» y «Mara S.», por ejemplo— y vuelve a asignarlos.</div>`;
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
      ${siguiente ? `· siguiente hito: ${iconoDeFicha(siguiente, 'hito-linea')} ${esc(siguiente.name)} (${siguiente.at} ${ico('coin')})` : ''}</p>
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
