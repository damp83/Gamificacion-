/* Un mérito a una cuadrilla entera, de una vez.

   «Los Jaguares han recogido el campamento» se dice una vez y costaba seis
   paradas: abrir la bolsa de cada niño, pulsar, cerrar, buscar al siguiente.
   Con la clase delante eso no se hace, se deja para luego, y luego no se hace.

   Lo que estas pruebas fijan es que la vía rápida NO sea una vía con reglas
   propias: el mismo tope diario que uno a uno, el mismo registro, los mismos
   doblones. Una segunda puerta más floja se convierte en la que se usa
   siempre, y entonces el tope no existe. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const CUADRILLA = ['Ana', 'Leo', 'Sara'];

function conClase() {
  const c = cargarApp();
  const nombres = CUADRILLA.concat(['Iker']);
  c.ev('setTeacherConfig')('roster', nombres.map((n, i) => ({
    name: n, username: n.toLowerCase(), grade: 3
  })));
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.enabled = true;
  t.list[0].members = CUADRILLA.slice();
  t.list[1].members = ['Iker'];
  c.ev('setTeacherConfig')('teams', t);
  return c;
}
const gente = c => c.ev('aulaAlumnos()').filter(a => CUADRILLA.includes(a.name));
const primerMerito = c => c.ev('ATLAS_CONFIG.behaviors')[0];
/* Un diario recién estrenado no empieza a cero: lo que se compara es lo que
   suma el mérito, no el saldo. */
const saldoDePartida = c => c.ev('defaultState("x")').progression.doubloons_balance;
const saldoDe = (c, quien) => { c.ev('openDiary')(quien, 3); return c.ev('S.progression.doubloons_balance'); };

/* ── Que llegue a todos ── */

test('un solo gesto y lo tienen los tres', () => {
  const c = conClase();
  const b = primerMerito(c);
  const r = c.ev('awardBehaviorAVarios')(gente(c), b.id);
  assert.equal(r.ok, true);
  assert.deepEqual(r.dados.sort(), CUADRILLA.slice().sort());
  assert.deepEqual(r.llenos, []);
  for (const n of CUADRILLA) {
    assert.equal(saldoDe(c, n), saldoDePartida(c) + b.coins, `${n} lo recibió`);
    assert.equal(c.ev('S.behavior_log').length, 1);
  }
});

test('quien no está en la cuadrilla no recibe nada', () => {
  const c = conClase();
  c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  assert.equal(saldoDe(c, { name: 'Iker', username: 'iker' }), saldoDePartida(c));
  assert.equal(c.ev('S.behavior_log').length, 0);
});

test('cuenta como mérito del trimestre de cada uno, no de uno solo', () => {
  const c = conClase();
  c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  for (const n of CUADRILLA) {
    c.ev('openDiary')(n, 3);
    assert.equal(c.ev('trimesterBucket()').merits, 1);
  }
});

/* ── Que el tope siga siendo el de cada niño ── */

test('el tope diario es de cada alumno y se respeta', () => {
  const c = conClase();
  const b = primerMerito(c);
  const tope = b.perDay;
  for (let i = 0; i < tope; i++) c.ev('awardBehaviorAVarios')(gente(c), b.id);
  const extra = c.ev('awardBehaviorAVarios')(gente(c), b.id);
  assert.equal(extra.ok, false, 'agotado para todos');
  assert.deepEqual(extra.dados, []);
  assert.equal(extra.llenos.length, 3);
  c.ev('openDiary')('Ana', 3);
  assert.equal(c.ev('S.behavior_log').length, tope, 'ni uno más del tope');
});

test('a quien ya lo tenía suelto no se le cuenta dos veces', () => {
  /* Ana lo recibió antes en su bolsa. El premio de grupo no puede saltarse
     su tope solo porque venga por otra puerta. */
  const c = conClase();
  const b = primerMerito(c);
  for (let i = 0; i < b.perDay; i++) { c.ev('openDiary')('Ana', 3); c.ev('awardBehavior')(b.id); }
  c.ev('closeDiary')();
  const r = c.ev('awardBehaviorAVarios')(gente(c), b.id);
  assert.deepEqual(r.llenos, ['Ana']);
  assert.equal(r.dados.length, 2);
  assert.equal(r.ok, true, 'que a uno no le quepa no anula el premio de los demás');
});

test('se dice a quién NO le llegó', () => {
  /* Un premio de grupo que calla eso es un premio que el docente cree haber
     dado y el niño no ha recibido. */
  const c = conClase();
  const b = primerMerito(c);
  for (let i = 0; i < b.perDay; i++) { c.ev('openDiary')('Leo', 3); c.ev('awardBehavior')(b.id); }
  c.ev('closeDiary')();
  const r = c.ev('awardBehaviorAVarios')(gente(c), b.id);
  assert.deepEqual(r.llenos, ['Leo']);
});

/* ── A cuántos les cabe, ANTES de pulsar ── */

test('el botón sabe a cuántos les cabe todavía hoy', () => {
  const c = conClase();
  const b = primerMerito(c);
  assert.equal(c.ev('puedenRecibirMerito')(gente(c), b.id).length, 3);
  for (let i = 0; i < b.perDay; i++) { c.ev('openDiary')('Sara', 3); c.ev('awardBehavior')(b.id); }
  c.ev('closeDiary')();
  const caben = c.ev('puedenRecibirMerito')(gente(c), b.id);
  assert.deepEqual(caben.map(a => a.name).sort(), ['Ana', 'Leo']);
});

test('contarlo no abre ni toca ningún diario', () => {
  /* Se llama al pintar la lista, muchas veces. Si abriera diarios, pintar
     marcaría veintidós como modificados y dispararía veintidós subidas. */
  const c = conClase();
  c.ev('openDiary')('Iker', 3);
  const antes = c.ev('diarioActivo');
  c.ev('puedenRecibirMerito')(gente(c), primerMerito(c).id);
  assert.equal(c.ev('diarioActivo'), antes);
  assert.equal(c.ev('S.profile.explorer_name'), 'Iker');
});

/* ── Que no descoloque al docente ── */

test('el diario que estaba abierto sigue abierto al terminar', () => {
  const c = conClase();
  c.ev('openDiary')({ name: 'Iker', username: 'iker' }, 3);
  c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  assert.equal(c.ev('diarioActivo'), 'u:iker');
  assert.equal(c.ev('S.profile.explorer_name'), 'Iker');
});

test('si no había ninguno abierto, no queda ninguno abierto', () => {
  const c = conClase();
  c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  assert.equal(c.ev('diarioActivo'), null);
});

test('el diario abierto sigue siendo el mismo aunque esté en el grupo', () => {
  const c = conClase();
  c.ev('openDiary')({ name: 'Ana', username: 'ana' }, 3);
  const r = c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  assert.equal(r.dados.length, 3);
  assert.equal(c.ev('diarioActivo'), 'u:ana');
  assert.equal(c.ev('S.behavior_log').length, 1, 'y con lo que acaba de recibir');
});

/* ── Los límites ── */

test('en modo consulta no se concede nada', () => {
  /* Mirar el diario de un niño no puede repartir doblones a su cuadrilla. */
  const c = conClase();
  c.ev('abrirDiarioLectura') && c.ev('openDiary')('Ana', 3);
  c.ev('closeDiary')();
  c.ev('LECTURA = true');
  const r = c.ev('awardBehaviorAVarios')(gente(c), primerMerito(c).id);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'lectura');
});

test('sin nadie en el grupo no se inventa nada', () => {
  const c = conClase();
  const r = c.ev('awardBehaviorAVarios')([], primerMerito(c).id);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sin-gente');
});

test('un mérito que no existe no se concede', () => {
  const c = conClase();
  const r = c.ev('awardBehaviorAVarios')(gente(c), 'inventado');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-behavior');
});

test('dos alumnas del mismo nombre en cursos distintos no se funden', () => {
  /* Es el error que ya costó caro una vez: el grupo se resuelve por diario,
     y el diario por usuario. */
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [
    { name: 'Mara', username: 'mara', grade: 2 },
    { name: 'Mara', username: 'mara2', grade: 4 }
  ]);
  const b = c.ev('ATLAS_CONFIG.behaviors')[0];
  const solo = c.ev('aulaAlumnos()').filter(a => a.username === 'mara');
  c.ev('awardBehaviorAVarios')(solo, b.id);
  assert.equal(saldoDe(c, { name: 'Mara', username: 'mara2' }), saldoDePartida(c),
    'la de 4.º no recibió nada');
});

/* ── La interfaz ── */

test('la vía rápida pasa por awardBehavior, no por una copia', () => {
  const game = leer('js/game.js');
  const i = game.indexOf('function awardBehaviorAVarios');
  const cuerpo = game.slice(i, game.indexOf('\n}\n', i));
  assert.match(cuerpo, /awardBehavior\(behaviorId\)/);
  assert.ok(!/earnDoubloons|behavior_log\.push/.test(cuerpo),
    'no puede repartir doblones ni escribir el registro por su cuenta');
});

test('el panel se pinta pegado al grupo al que va', () => {
  /* Con cinco cuadrillas abiertas, un panel suelto se pulsa sobre la que no
     es, y eso son doblones en el diario del niño equivocado. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf('const grupo = (id, titulo, icono, gente) =>');
  const cuerpo = aula.slice(i, i + 1200);
  assert.ok(cuerpo.indexOf('lista.appendChild(cab)') < cuerpo.indexOf('panelDeMeritoGrupo(gente'));
  assert.ok(cuerpo.indexOf('panelDeMeritoGrupo(gente') < cuerpo.indexOf('aula-grupo-gente'));
});

test('hay un botón para toda la clase, que es lo que más se dice', () => {
  assert.match(leer('index.html'), /id="aula-merito-clase"/);
  assert.match(leer('js/aula.js'), /meritoGrupo === 'todos'/);
});

test('el panel dice a cuántos les cabe antes de pulsar', () => {
  const aula = leer('js/aula.js');
  const i = aula.indexOf('function panelDeMeritoGrupo');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.match(cuerpo, /puedenRecibirMerito\(gente, b\.id\)/);
  assert.match(cuerpo, /a \$\{caben\.length\} de \$\{gente\.length\}/);
});
