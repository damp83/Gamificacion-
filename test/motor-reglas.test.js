/* Las REGLAS del motor, no que no reviente.

   Es la capa donde un fallo no se manifiesta como un fallo: se manifiesta
   como un niño que no avanza, o que avanza sin merecerlo, y eso se confunde
   con el niño. Aquí se juegan misiones enteras —respuesta a respuesta— y se
   comprueba lo que debe cumplirse siempre. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const POZO = 'numeracion';
function nino(grade = 3) {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Ana', username: 'ana', grade });
  return c;
}
/* Juega una misión entera con una tasa de acierto en el PRIMER intento. */
function mision(c, b, s, acierta, kind) {
  if (!c.ev('startMission')(b, s, kind)) return null;
  while (true) {
    const cur = c.ev('mission.current');
    if (!cur) break;
    const ok = typeof acierta === 'function' ? acierta() : acierta;
    c.ev('answerQuestion')(ok ? cur.answer : (cur.answer + 1) % 4);
    if (!c.ev('advance()')) break;
  }
  return c.ev('finishMission()');
}
function guardiana(c, b, acierta) {
  if (!c.ev('startGuardian')(b)) return null;
  while (true) {
    const cur = c.ev('mission.current');
    if (!cur) break;
    c.ev('answerQuestion')(acierta ? cur.answer : (cur.answer + 1) % 4);
    if (!c.ev('advance()')) break;
  }
  return c.ev('finishMission()');
}
function dominarTodo(c, b) {
  for (const s of c.ev('STRATA_ORDER')) {
    let v = 0;
    while (c.ev('getStratum')(b, s).mastery < 0.85 && v < 12) { mision(c, b, s, true); v++; }
  }
}
const est = (c, b, s) => c.ev('getStratum')(b, s);

/* ── Dominio ── */

test('fallar no domina, por muchas veces que se juegue', () => {
  const c = nino();
  for (let i = 0; i < 12; i++) mision(c, POZO, 'recordar', false);
  const st = est(c, POZO, 'recordar');
  assert.ok(st.mastery < 0.8, `mastery=${st.mastery}`);
  assert.notEqual(st.status, 'mastered');
  assert.equal(est(c, POZO, 'comprender').status, 'locked', 'y no abre el siguiente estrato');
});

test('una sola sesión perfecta no da por dominado', () => {
  /* La barra avanza para que se vea el progreso, pero se queda a medio camino:
     con una sesión no hay de dónde saber si fue suerte. */
  const c = nino();
  const r = mision(c, POZO, 'recordar', true);
  assert.ok(!r.nowMastered && r.masteryAfter < 0.8, `mastery tras 1 sesión = ${r.masteryAfter}`);
});

test('acertando siempre se domina, y en pocas sesiones', () => {
  const c = nino();
  let n = 0, dominado = false;
  while (n < 10 && !dominado) { dominado = mision(c, POZO, 'recordar', true).masteryAfter >= 0.8; n++; }
  assert.ok(dominado && n <= 4, `hicieron falta ${n} sesiones perfectas`);
});

/* ── La puerta al estrato siguiente ── */

test('llegar al 0,8 una vez no abre todavía el estrato siguiente', () => {
  /* Una sesión son cinco retos: un niño con 70 % de competencia real saca
     cinco de cinco una de cada seis veces. Esa casualidad no puede decidir
     para siempre. */
  const c = nino();
  let n = 0;
  while (n < 10 && est(c, POZO, 'recordar').mastery < 0.8) { mision(c, POZO, 'recordar', true); n++; }
  assert.ok(est(c, POZO, 'recordar').mastery >= 0.8, 'primero hay que llegar al 0,8');
  assert.equal(est(c, POZO, 'recordar').altas, 1, 'una sola vez por encima');
  assert.equal(est(c, POZO, 'comprender').status, 'locked', 'y la puerta sigue cerrada');
});

test('confirmarlo una segunda vez seguida sí la abre', () => {
  const c = nino();
  let n = 0;
  while (n < 10 && est(c, POZO, 'comprender').status === 'locked') { mision(c, POZO, 'recordar', true); n++; }
  assert.notEqual(est(c, POZO, 'comprender').status, 'locked');
  assert.ok(est(c, POZO, 'recordar').altas >= 2);
});

test('una sesión floja en medio rompe la racha y hay que volver a confirmar', () => {
  const c = nino();
  let n = 0;
  while (n < 10 && est(c, POZO, 'recordar').mastery < 0.8) { mision(c, POZO, 'recordar', true); n++; }
  mision(c, POZO, 'recordar', false);
  assert.equal(est(c, POZO, 'recordar').altas, 0, 'la racha se rompe');
  assert.equal(est(c, POZO, 'comprender').status, 'locked');
});

test('el listón no ha subido: sigue siendo el 0,8 de siempre', () => {
  /* Lo que se pide es repetir la medida, no acertar más. Subir el umbral
     sería otra decisión, y no es esta. */
  const st = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'js', 'state.js'), 'utf8');
  assert.match(st, /const ALTAS_PARA_ABRIR = 2;/);
  /* La puerta pasa por `dominioParaAbrir`, que devuelve 0,8 para todo el
     mundo salvo que ese alumno tenga una adaptación. Bajarla para quien la
     necesita es otra cosa que subirla para todos. */
  assert.match(st, /st\.altas = st\.mastery >= dominioParaAbrir\(S\)/);
  const i = st.indexOf('function dominioParaAbrir');
  const cuerpo = st.slice(i, st.indexOf('\n}\n', i));
  assert.match(cuerpo, /if \(!a\.activa \|\| !a\.dominio\) return 0\.8;/, 'sin adaptación, 0,8');
  assert.match(cuerpo, /Math\.min\(0\.8, Math\.max\(0\.5, n\)\)/, 'y nunca por encima de 0,8');
  assert.ok(!/mastery >= 0\.8[5-9]/.test(st), 'nadie ha subido el umbral por la puerta de atrás');
});

test('lo que ya estaba abierto no se cierra nunca', () => {
  /* Nada se pierde: la regla nueva solo condiciona ABRIR. */
  const c = nino();
  let n = 0;
  while (n < 10 && est(c, POZO, 'comprender').status === 'locked') { mision(c, POZO, 'recordar', true); n++; }
  assert.notEqual(est(c, POZO, 'comprender').status, 'locked');
  for (let i = 0; i < 6; i++) mision(c, POZO, 'recordar', false);
  assert.notEqual(est(c, POZO, 'comprender').status, 'locked', 'sigue abierto tras fallar seis veces');
});

test('al niño se le dice qué le falta, no se le deja adivinando', () => {
  const play = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'js', 'play.js'), 'utf8');
  assert.match(play, /¡Ya casi! Vuelve a superar el estrato de arriba una vez más/);
  assert.match(play, /dos veces seguidas/);
  /* Y Bruno no promete una puerta que aún no se ha abierto. */
  assert.match(play, /Repítelo una vez más y abrimos el estrato de abajo/);
});

test('lo dominado no se pierde por dejar de practicar', () => {
  /* Se cubre de arena y pide repaso, que es otra cosa: PRD §0.2, nada se
     pierde nunca. */
  const c = nino();
  for (let i = 0; i < 6; i++) mision(c, POZO, 'recordar', true);
  const st = est(c, POZO, 'recordar');
  const antes = st.mastery;
  st.last_practiced = '2000-01-01';
  assert.equal(est(c, POZO, 'recordar').mastery, antes);
  assert.equal(est(c, POZO, 'recordar').status, 'mastered');
  assert.ok(c.ev('sandCover')(st) > 0.5, 'pero sí se marca cubierto de arena');
});

/* ── Recompensas ── */

test('los PE se ganan por primer acierto, no por intento', () => {
  const c = nino();
  const antes = c.ev('S.progression.xp_total');
  const r = mision(c, POZO, 'recordar', false);
  assert.equal(c.ev('S.progression.xp_total') - antes, 0, 'fallar todo no da PE');
  assert.equal(r.accuracy, 0);
});

test('un yacimiento ya excavado paga una décima parte', () => {
  /* El tesoro está en la frontera de aprendizaje, no en repetir lo sabido. */
  const c = nino();
  for (let i = 0; i < 6; i++) mision(c, POZO, 'recordar', true);
  assert.ok(est(c, POZO, 'recordar').mastery >= 0.9, 'primero hay que llegar a 0,9');
  const r = mision(c, POZO, 'recordar', true);
  assert.match(r.notes.join(' '), /ya excavado/);
});

test('la fatiga llega y recorta lo que se gana', () => {
  const c = nino();
  const eco = c.ev('deepClone')(c.ev('ATLAS_CONFIG.economy'));
  eco.fatigueMinutes = 0; eco.fatigueThreshold = 3;
  c.ev('setTeacherConfig')('economy', eco);
  const pes = [];
  for (let i = 0; i < 6; i++) {
    const antes = c.ev('S.progression.xp_total');
    const r = mision(c, POZO, 'analizar', true);
    pes.push({ pe: c.ev('S.progression.xp_total') - antes, fatigado: r.fatigued });
  }
  const sin = pes.find(x => !x.fatigado), con = pes.find(x => x.fatigado);
  assert.ok(con, 'nunca se marcó fatiga en 6 misiones seguidas');
  assert.ok(con.pe < sin.pe, `sin fatiga ${sin.pe} PE, con fatiga ${con.pe}`);
});

test('el Bazar no paga sin límite', () => {
  const c = nino();
  const antes = c.ev('S.progression.doubloons_balance');
  for (let i = 0; i < 15; i++) mision(c, POZO, 'recordar', true, 'bazar');
  const eco = c.ev('ATLAS_CONFIG.economy');
  assert.ok(c.ev('S.progression.doubloons_balance') - antes <= eco.bazarPerDay * eco.bazarCoinsMax);
});

/* ── Pistas y restauración ── */

test('la primera pista es gratis, la segunda cuesta y no hay tercera', () => {
  const c = nino();
  c.ev('startMission')(POZO, 'recordar');
  assert.equal(c.ev('requestHint()').cost, 0);
  c.ev('S').progression.doubloons_balance = 0;
  assert.equal(c.ev('requestHint()').reason, 'no-coins', 'sin doblones no se da la segunda');
  c.ev('S').progression.doubloons_balance = 500;
  assert.equal(c.ev('requestHint()').ok, true);
  assert.equal(c.ev('requestHint()').reason, 'no-more');
  c.ev('abandonMission()');
});

test('restaurar un fallo no lo convierte en acierto de primer intento', () => {
  /* Si lo hiciera, el dominio mediría la insistencia y no lo aprendido. */
  const c = nino();
  c.ev('startMission')(POZO, 'recordar');
  const cur = c.ev('mission.current');
  c.ev('answerQuestion')((cur.answer + 1) % 4);
  c.ev('restoreQuestion()');
  c.ev('answerQuestion')(c.ev('mission.current').answer);
  c.ev('completeRestore')(true);
  assert.equal(c.ev('mission.firstTryCorrect'), 0);
  assert.equal(c.ev('S.metrics.self_corrections'), 1, 'pero sí cuenta como autocorrección');
  c.ev('abandonMission()');
});

/* ── La Cámara del Guardián ── */

test('la Cámara no se abre sin dominar todos sus estratos', () => {
  const c = nino();
  assert.equal(c.ev('guardianStatus')(POZO).estado, 'cerrada');
  for (let i = 0; i < 6; i++) mision(c, POZO, 'recordar', true);
  assert.equal(c.ev('guardianStatus')(POZO).estado, 'cerrada', 'con uno solo dominado, cerrada');
  assert.equal(c.ev('startGuardian')(POZO), null, 'y no se puede entrar por la fuerza');
});

test('superarla recupera un fragmento, y solo uno', () => {
  const c = nino();
  dominarTodo(c, POZO);
  assert.equal(c.ev('guardianStatus')(POZO).estado, 'abierta');
  const antes = c.ev('S.progression.atlas_fragments_recovered');
  assert.equal(guardiana(c, POZO, true).superada, true);
  assert.equal(c.ev('S.progression.atlas_fragments_recovered'), antes + 1);
  assert.equal(c.ev('guardianStatus')(POZO).estado, 'superada');
  guardiana(c, POZO, true);
  assert.equal(c.ev('S.progression.atlas_fragments_recovered'), antes + 1, 'no se cobra dos veces');
});

test('suspender la Cámara es gratis, y apunta dónde repasar', () => {
  /* PRD §0.2: fallar no puede costar nada. Lo único que cambia es que pide un
     repaso antes de volver, y ese repaso señala el estrato exacto. */
  const c = nino();
  dominarTodo(c, POZO);
  const masteryAntes = c.ev('STRATA_ORDER').map(s => est(c, POZO, s).mastery);
  const peAntes = c.ev('S.progression.xp_total');
  const r = guardiana(c, POZO, false);
  assert.equal(r.superada, false);
  assert.ok(c.ev('STRATA_ORDER').every((s, i) => est(c, POZO, s).mastery >= masteryAntes[i] - 0.001),
    'no baja el dominio');
  assert.ok(c.ev('S.progression.xp_total') >= peAntes, 'no quita PE');
  const e = c.ev('guardianStatus')(POZO);
  assert.equal(e.estado, 'repaso');
  assert.ok(e.weak, 'y dice qué estrato repasar');
});

/* ── Contenido y cursos ── */

test('a un niño de 1.º no le salen pozos de otros cursos', () => {
  const c = nino(1);
  const ajenos = c.ev('playableBranchIds')(1).filter(id => {
    const b = c.ev('branchDef')(id);
    return b && Array.isArray(b.grades) && !b.grades.includes(1);
  });
  assert.deepEqual(ajenos, []);
  assert.ok(c.ev('siguienteReto')(1), 'y tiene algo que hacer');
});

test('nunca se queda sin nada que excavar', () => {
  const c = nino();
  for (let i = 0; i < 40; i++) {
    const d = c.ev('siguienteReto()');
    assert.ok(d, `sin reto que ofrecer en la vuelta ${i}`);
    mision(c, d.branchId, d.stratumId, () => Math.random() < 0.5);
  }
  assert.ok(c.ev('siguienteReto()'));
});

test('un pozo con un solo reto escrito sigue siendo jugable', () => {
  /* Un pozo a medio llenar no puede cortar el camino. */
  const c = nino();
  const l = c.ev('sitesCopy()');
  l.push({ id: 'corto', name: 'Corto', icon: '🌿', subject: 'X', enabled: true, branches: [
    { id: 'pcorto', name: 'Un reto', icon: '⛏️', enabled: true, grades: [1,2,3,4,5,6], source: 'bank',
      bank: { recordar: [{ question: 'El único', options: ['a','b','c','d'], answer: 0,
                           hint1: 'x', hint2: 'y', explanation: 'z', origen: 'docente' }] } }] });
  c.ev('setTeacherConfig')('sites', l);
  assert.ok(mision(c, 'pcorto', 'recordar', true), 'arranca y termina');
});

test('con banco de sobra no se repite un reto dentro de la misma misión', () => {
  const c = nino();
  const l = c.ev('sitesCopy()');
  l.push({ id: 'mio', name: 'Mío', icon: '🌿', subject: 'X', enabled: true, branches: [
    { id: 'pmio', name: 'Pozo mío', icon: '⛏️', enabled: true, grades: [1,2,3,4,5,6], source: 'bank',
      bank: { recordar: Array.from({ length: 12 }, (_, i) => ({
        question: 'Reto número ' + i, options: ['a','b','c','d'], answer: i % 4,
        hint1: 'x', hint2: 'y', explanation: 'z', origen: 'docente' })) } }] });
  c.ev('setTeacherConfig')('sites', l);
  c.ev('startMission')('pmio', 'recordar');
  const qs = c.ev('mission.questions').map(q => q.question);
  assert.equal(new Set(qs).size, qs.length, `${qs.length} preguntas, ${new Set(qs).size} distintas`);
  c.ev('abandonMission()');
});

test('la primera sesión de un estrato no entra a la dificultad máxima', () => {
  const c = nino();
  c.ev('S').adaptive.tier = 5;
  assert.ok(c.ev('entryTier')(POZO, 'recordar') <= 3);
});

/* ── Clase dirigida ── */

test('el turno va rotando: no sale siempre el mismo', () => {
  const c = nino();
  const lista = ['Ana', 'Leo', 'Sara'].map(n => ({ name: n, username: n.toLowerCase(), grade: 3 }));
  const veces = {};
  for (let i = 0; i < 6; i++) {
    const quien = c.ev('aQuienLeToca')(lista);
    assert.ok(quien, 'siempre le toca a alguien');
    veces[quien.name] = (veces[quien.name] || 0) + 1;
    c.ev('startClassTurn')(quien);
    const cur = c.ev('mission.current');
    if (cur) c.ev('answerQuestion')(cur.answer);
    c.ev('finishMission()');
  }
  const cuentas = Object.values(veces);
  assert.ok(Math.max(...cuentas) - Math.min(...cuentas) <= 1, JSON.stringify(veces));
});
