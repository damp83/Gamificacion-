/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — app.js
   Portada, acceso y arranque. Lo que decide QUÉ pantalla se ve y quién
   la está mirando: las dos puertas de la portada (explorador y docente),
   el acceso con Appwrite, el modo de sesión, la navegación global y el
   boot que lo encadena todo.

   Las pantallas en sí están en ui.js (chasis), play.js (alumno),
   aula.js (docente en el aula) y teacher.js (panel de configuración).
   ═══════════════════════════════════════════════════════════ */

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

/* En clase dirigida el alumnado no entra a la app, así que su puerta no se
   enseña: ofrecerla sería invitar a algo que el docente ha desactivado. */
function aplicarModoSesion() {
  const modo = ATLAS_CONFIG.sessionMode || 'ambos';
  const puerta = $('#home-student');
  const soloDocente = modo === 'docente';
  puerta.classList.toggle('hidden', soloDocente);
  $('#home-doors-note').classList.toggle('hidden', !soloDocente);
  document.body.classList.toggle('solo-docente', soloDocente);
}

function showHome() {
  teacherOnly = false;
  document.body.classList.remove('teacher-mode');
  ['#screen-auth', '#screen-onboarding', '#screen-teacher'].forEach(x => $(x).classList.add('hidden'));
  $('#app').classList.add('hidden');
  aplicarModoSesion();
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
        <span class="home-site-icon">${esc(site.icon)}</span>
        <div><strong>${esc(site.name)}</strong>
          <small>${esc(site.subject)}${esc(site.desc ? ' · ' + site.desc : '')}</small>
          <div class="home-site-wells">${branchesEnabledOf(site)
            .map(b => `<span class="home-well">${esc(b.icon)} ${esc(b.name)}</span>`).join('')}</div>
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
  /* El aviso de copia va aquí, no enterrado en el panel: nadie abre
     «Copia de seguridad» por iniciativa propia, y es lo que salva el curso. */
  const aviso = $('#teacher-backup-warn');
  const pend = copiaPendiente();
  aviso.classList.toggle('hidden', !pend);
  if (pend) {
    aviso.innerHTML = `<span class="teacher-warn-icon">💾</span>
      <div><strong>${pend.motivo === 'nunca'
        ? 'Todavía no has guardado ninguna copia'
        : `Hace ${pend.dias} días de tu última copia`}.</strong>
      ${pend.diarios === 1
        ? 'El diario de la clase está'
        : `Los ${pend.diarios} diarios de la clase están`} solo en este equipo: si se borra el
      perfil o se limpian los datos de navegación, se ${pend.diarios === 1 ? 'pierde' : 'pierden'}.</div>
      <button class="btn btn-secondary btn-small" id="teacher-go-backup">💾 Guardar copia</button>`;
    $('#teacher-go-backup').addEventListener('click', () => { cfgSection = 'copia'; teacherScreen('config'); });
  }

  renderAulaBar();
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
  loadAula();
  vozInit();
  prepararDescargas();
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
  wireAula();
  wireAulas();
  wireTaller();
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

  $('#lectura-salir').addEventListener('click', salirDeLectura);
  $('#btn-voz').addEventListener('click', leerRetoActual);
  $('#pref-read-aloud').addEventListener('change', e => {
    S.profile.accessibility = S.profile.accessibility || {};
    S.profile.accessibility.read_aloud = e.target.checked;
    saveState();
    aplicarVoz();
    if (!e.target.checked) vozParar();
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
  $('#teacher-go-aula').addEventListener('click', () => { aulaAlumno = null; teacherScreen('aula'); });
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
  aplicarVoz();
  renderHud();
  show('map');
  if (events.firstLoginBonus) {
    const banner = $('#daily-banner');
    /* El texto va dentro de un <span>: el aviso es un flex y, suelto, cada
       trozo se convertía en una columna propia y se partía en un móvil. */
    banner.innerHTML = `${ico('anchor')}<span><strong>Primer desembarco del día:</strong>
      +${events.firstLoginBonus} ${ico('coin')} ¡Bienvenido de vuelta, ${esc(S.profile.explorer_name)}!</span>`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 6000);
  }
  if (events.weekStamped) { earnDoubloons(50); saveState(); renderHud(); toast('¡Sello semanal estampado en tu bitácora! +50 doblones', 4000); }
  if (events.weekProtected) toast('🪢 Una cuerda de rescate protegió tu racha esta semana.', 4000);
}

document.addEventListener('DOMContentLoaded', boot);
