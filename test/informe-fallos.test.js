/* Los fallos que encontró la auditoría de los informes.

   Cada uno con la prueba que impide que vuelva. No son pruebas de pintado:
   son las afirmaciones que el informe hace sobre un niño y que llegan a una
   casa, o los recuentos con los que un docente decide qué da mañana. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const texto = html => html.replace(/<style>[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* Un pozo con los cuatro estratos hechos y su cámara en el estado que se pida */
function conPozoHecho(c, { camaraSuperada }) {
  const s = c.ev('defaultState')('Vega');
  s.metrics.questions_answered = 40;
  const strata = {};
  for (const sId of c.ev('STRATA_ORDER')) {
    strata[sId] = { mastery: 0.9, status: 'mastered', attempts: 12, last_practiced: c.ev('todayStr()') };
  }
  s.dig_sites = { ciudad: { numeracion: { strata, guardian: {
    cleared: camaraSuperada, clearedAt: camaraSuperada ? c.ev('todayStr()') : null, attempts: 2,
    history: [{ date: c.ev('todayStr()'), accuracy: camaraSuperada ? 0.9 : 0.5,
                passed: camaraSuperada, masteryThen: 0.9 }] } } } };
  return s;
}

/* ── 01 · el informe se contradecía a sí mismo ── */

test('«terminado» solo con la prueba final superada', () => {
  const c = cargarApp();
  const t = texto(c.ev('informeFamilia')(conPozoHecho(c, { camaraSuperada: true }), {}));
  assert.match(t, /La Bóveda de los Números — terminado/);
});

test('con los bloques hechos y la prueba sin superar, se dice eso', () => {
  /* Antes ponía «terminado» y cuatro líneas más abajo «todavía no superada».
     Para una familia, «terminado» cierra un tema. */
  const c = cargarApp();
  const t = texto(c.ev('informeFamilia')(conPozoHecho(c, { camaraSuperada: false }), {}));
  assert.ok(!/— terminado/.test(t), 'no puede decir terminado');
  assert.match(t, /a falta de la prueba final/);
  assert.match(t, /todavía no superada/, 'y sigue diciendo la verdad abajo');
});

/* ── 02 · los informes no olvidaban ── */

test('un concepto ya resuelto sale de «está trabajando» en pocos aciertos', () => {
  /* Con el acumulado de por vida hacían falta 6 para dejar de salir y 19 para
     pasar a «ya le sale»: semanas diciéndole a una familia que su hijo sigue
     atascado en algo que ya sabe hacer. */
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 4; i++) c.ev('recordConcepto')('resta_llevada', false, 'aplicar');
  for (let i = 0; i < 4; i++) c.ev('recordConcepto')('resta_llevada', true, 'aplicar');
  c.ev("S.metrics.errors_by_concept.resta_llevada.ultimo = '2000-01-01'");

  const flojo = () => c.ev('conceptosFlojosDe')(c.ev('S'), 9).some(x => x.id === 'resta_llevada');
  const dom = () => c.ev('conceptosDominadosDe')(c.ev('S'), 9).some(x => x.id === 'resta_llevada');
  let n = 0;
  while (flojo() && n < 60) { c.ev('recordConcepto')('resta_llevada', true, 'aplicar'); n++; }
  assert.ok(n <= 6, `deja de salir como flojo en ${n} aciertos`);
  let m = n;
  while (!dom() && m < 60) { c.ev('recordConcepto')('resta_llevada', true, 'aplicar'); m++; }
  assert.ok(m <= 10, `pasa a «ya le sale» en ${m} aciertos`);
});

test('el acumulado de siempre no se pierde: es el histórico', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 4; i++) c.ev('recordConcepto')('resta_llevada', false, 'aplicar');
  for (let i = 0; i < 20; i++) c.ev('recordConcepto')('resta_llevada', true, 'aplicar');
  const e = c.ev('S.metrics.errors_by_concept.resta_llevada');
  assert.equal(e.errors, 4, 'los fallos de siempre siguen ahí');
  assert.equal(e.attempts, 24);
  assert.equal(e.rec.length, c.ev('CONCEPTO_VENTANA'), 'y la ventana no crece sin fin');
});

test('un diario anterior a la ventana se mide con lo que tiene', () => {
  const c = cargarApp();
  const s = c.ev('defaultState')('V');
  s.metrics.errors_by_concept = { resta_llevada: { errors: 5, attempts: 9 } };
  assert.equal(c.ev('conceptosFlojosDe')(s, 9).length, 1);
});

test('la señal de rescate mira lo reciente, no lo de siempre', () => {
  /* Una alerta que no se puede quitar de encima por más que se mejore deja de
     ser una alerta y pasa a ser una etiqueta pegada al niño. */
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 8; i++) c.ev('recordConcepto')('resta_llevada', false, 'aplicar');
  assert.ok(c.ev('tasaRecienteDe')(c.ev('S')) > 0.4);
  for (let i = 0; i < 10; i++) c.ev('recordConcepto')('resta_llevada', true, 'aplicar');
  assert.equal(c.ev('tasaRecienteDe')(c.ev('S')), 0, 'ha mejorado y se le nota');
  assert.equal(c.ev('buildSummary()').errorRate, 0);
});

/* ── 03 · dos alumnos del mismo nombre ── */

function claseConDosMaras(c) {
  c.ev('setTeacherConfig')('roster', [
    { name: 'Mara Ibáñez', username: 'mara', grade: 2 },
    { name: 'Mara Ibáñez', username: 'mara2', grade: 4 },
    { name: 'Nilo', username: 'nilo', grade: 3 }]);
}

test('la que no ha empezado aparece en «quién falta»', () => {
  /* Antes no salía en ninguna de las dos listas donde el docente la buscaría:
     ni como alumna ni como pendiente. Nadie se enteraba de que le faltaba. */
  const c = cargarApp();
  claseConDosMaras(c);
  const st = c.ev('defaultState')('Mara Ibáñez');
  st.daily = { date: c.ev('todayStr()') };
  const d = c.ev('buildClassOverview')([
    { id: 'a', key: 'u:mara', name: 'Mara Ibáñez', state: st }], c.ev('todayStr()'));
  assert.deepEqual(d.missing.map(m => m.name).sort(), ['Mara Ibáñez', 'Nilo']);
  assert.equal(d.deLaLista, 1);
  assert.equal(d.empezados, 1);
});

test('cuando las dos han empezado, las dos cuentan', () => {
  const c = cargarApp();
  claseConDosMaras(c);
  const mk = n => { const s = c.ev('defaultState')(n); s.daily = { date: c.ev('todayStr()') }; return s; };
  const d = c.ev('buildClassOverview')([
    { id: 'a', key: 'u:mara', name: 'Mara Ibáñez', state: mk('Mara Ibáñez') },
    { id: 'b', key: 'u:mara2', name: 'Mara Ibáñez', state: mk('Mara Ibáñez') }], c.ev('todayStr()'));
  assert.equal(d.deLaLista, 2);
  assert.deepEqual(d.missing.map(m => m.name), ['Nilo']);
});

test('un diario en la nube se reconoce por el id de la cuenta', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Ana', username: 'ana', authId: 'cuenta-1' }]);
  const d = c.ev('buildClassOverview')([
    { id: 'cuenta-1', name: 'Ana', summary: { v: 1, xp: 10, lastSeen: '2026-09-09' } }
  ], '2026-09-09');
  assert.equal(d.deLaLista, 1);
  assert.deepEqual(d.missing, []);
});

test('un diario antiguo, guardado por el nombre, se empareja si no hay duda', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Ana Ruiz', username: 'ana' }]);
  const st = c.ev('defaultState')('Ana Ruiz');
  const d = c.ev('buildClassOverview')([
    { id: 'x', key: 'ana ruiz', name: 'Ana Ruiz', state: st }], c.ev('todayStr()'));
  assert.equal(d.deLaLista, 1);
});

test('ninguna cuadrilla se apunta a las dos', () => {
  /* Cada cuadrilla se apuntaba a las dos Maras y sumaba la aportación de
     ambas: dos equipos de «2 miembros» con el doble de doblones. */
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [
    { name: 'Mara Ibáñez', username: 'mara' }, { name: 'Mara Ibáñez', username: 'mara2' }]);
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.enabled = true; t.list[0].members = ['Mara Ibáñez']; t.list[1].members = ['Mara Ibáñez'];
  c.ev('setTeacherConfig')('teams', t);
  const mk = x => { const s = c.ev('defaultState')('Mara Ibáñez');
    s.daily = { date: c.ev('todayStr()') }; s.progression.team_contribution = x; return s; };
  const d = c.ev('buildClassOverview')([
    { id: 'a', key: 'u:mara', name: 'Mara Ibáñez', state: mk(10) },
    { id: 'b', key: 'u:mara2', name: 'Mara Ibáñez', state: mk(20) }], c.ev('todayStr()'));
  for (const eq of d.teams) assert.equal(eq.members, 0, eq.name);
  assert.deepEqual(d.ambiguos, ['Mara Ibáñez'], 'y se dice por qué');
});

test('y el aviso lo explica y dice cómo arreglarlo', () => {
  const aula = leer('js/aula.js');
  const i = aula.indexOf('function avisoDeNombresRepetidos');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.match(cuerpo, /no cuentan en ninguna/);
  assert.match(cuerpo, /cámbiale el nombre/i);
});

/* ── 04 · el informe de ceros ── */

test('quien no ha entrado nunca recibe un informe que lo dice', () => {
  const c = cargarApp();
  const t = texto(c.ev('informeFamilia')(c.ev('defaultState')('Nilo'), {}));
  assert.match(t, /Todavía no ha empezado/);
  assert.ok(!/no hay nada que se le esté atragantando/.test(t));
});

test('quien empezó antes pero no este trimestre, también', () => {
  const c = cargarApp();
  const s = c.ev('defaultState')('Ada');
  s.metrics.questions_answered = 40;
  s.metrics.errors_by_concept = { comparar_numeros: { errors: 0, attempts: 6, dias: 3, rec: '111111' } };
  s.metrics.sessions_log = [{ date: '2020-05-05', missions: 9, minutes: 60 }];
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.match(t, /No ha trabajado en la expedición durante este trimestre/);
  assert.match(t, /Lo que ya le sale/, 'pero lo que aprendió antes sigue contándose');
});

/* ── 05 · el estrato que se está perdiendo ── */

test('un estrato que se dominó y se cae ya no queda en un punto ciego', () => {
  /* Mismo dominio y mismo abandono: avisaba o no según por dónde hubiera
     pasado, porque el estado nunca vuelve de «mastered». */
  const c = cargarApp();
  const mk = (status, ever) => {
    const s = c.ev('defaultState')('X');
    s.dig_sites = { ciudad: { numeracion: { strata: { recordar: {
      mastery: 0.55, status, ever_mastered: ever, attempts: 20, last_practiced: '2026-08-01' } } } } };
    return s;
  };
  const dosCasos = ['mastered', 'in_progress'].map(st =>
    c.ev('baseDesdeDiario')(mk(st, st === 'mastered'), c.ev('todayStr()')).stuck);
  assert.equal(dosCasos[0].length, 1, 'el que lo tuvo y lo está perdiendo también avisa');
  assert.equal(dosCasos[1].length, 1);
  assert.match(dosCasos[0][0], /se le está olvidando/, 'y no es lo mismo que no haberlo ganado');
  assert.ok(!/se le está olvidando/.test(dosCasos[1][0]));
});

/* ── 06 · el umbral de «media clase» ── */

test('el umbral de clase es un tercio, no tres a secas', () => {
  const c = cargarApp();
  const u = c.ev('umbralDeClase');
  assert.equal(u(22), 8, 'en una clase de 22, tres alumnos no son media clase');
  assert.equal(u(9), 3);
  assert.equal(u(4), 3, 'con un mínimo, para que en un grupo pequeño no baste con uno');
});

test('y se escribe la cifra de verdad, no un adjetivo', () => {
  const aula = leer('js/aula.js');
  const i = aula.indexOf('function pintarRepaso');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.ok(!/media clase o más/.test(cuerpo), 'el adjetivo mentía en una clase de 22');
  assert.match(cuerpo, /n\} de \$\{conDatos\}/, 'sale «7 de 22»');
});

/* ── 09 · el pozo borrado ── */

test('un pozo retirado del catálogo no sale en el informe', () => {
  /* «pozo_borrado — terminado» en una hoja que va a una casa no informa de
     nada, y encima cuenta solo los estratos que quedaran guardados. */
  const c = cargarApp();
  const s = c.ev('defaultState')('Ada');
  s.metrics.questions_answered = 10;
  s.dig_sites = { sitio: { pozo_borrado: { strata: {
    recordar: { mastery: 0.9, status: 'mastered', attempts: 5 } } } } };
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(!/pozo_borrado/.test(t));
  assert.match(t, /Todavía no ha empezado ningún bloque/);
});
