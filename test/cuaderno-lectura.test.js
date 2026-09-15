/* Mirar el cuaderno de un alumno no es lo mismo que no tener retos.

   `startMission` devuelve null en modo lectura a propósito: jugar en el diario
   de un niño sería jugar POR él, y su dominio es lo que decide qué se le abre.
   Pero devuelve null también cuando el estrato está vacío, y los cuatro sitios
   que lo llaman trataban las dos cosas igual.

   El resultado: un docente con sesenta y tres retos aprobados abría el cuaderno
   de un alumno, tocaba el estrato, leía «Ese estrato aún no tiene retos
   preparados» y se iba a buscar un fallo de sincronización que no existía. El
   mismo null, dos verdades distintas, y la que se enseñaba era la falsa. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');
const leer = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

/* Un pozo del docente con retos de verdad en su primer estrato. */
function conPozoLleno(c) {
  const sites = c.ev('deepClone')(c.ev('ATLAS_CONFIG.sites'));
  sites.push({ id: 'sx', name: 'Yacimiento', icon: '🏛️', desc: 'x', branches: [{
    id: 'bx', name: 'El Pozo de las Voces', icon: '🗣️', desc: 'x',
    source: 'docente', grades: [1, 2, 3, 4, 5, 6],
    bank: { recordar: Array.from({ length: 12 }, (_, i) => ({
      question: 'reto ' + i, options: ['a', 'b', 'c', 'd'], answer: 0, skill: 'orto_bv' })) } }] });
  c.ev('setTeacherConfig')('sites', sites);
  return sites;
}

test('el estrato SÍ tiene contenido: el problema nunca fue ese', () => {
  const c = cargarApp();
  conPozoLleno(c);
  const def = c.ev('branchDef')('bx');
  assert.ok(c.ev('stratumHasContent')(def, 'recordar'),
    'la tarjeta se dibuja con barra de dominio porque hay contenido');
  assert.equal(c.ev('branchPlayable')(def), true);
});

test('en el cuaderno de otro no se juega, y se dice POR QUÉ', () => {
  const c = cargarApp();
  conPozoLleno(c);
  c.ev(`setTeacherConfig('roster', [{ name: 'Pablo', username: 'pablo', grade: 2 }])`);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo' }, 2)`);
  /* Jugando de verdad, la misión arranca: doce retos esperando. */
  assert.ok(c.ev(`startMission('bx', 'recordar', 'expedition')`),
    'con el diario abierto para jugar, la misión tiene que arrancar');
  c.ev('closeDiary()');

  /* Y en consulta NO, que es lo correcto: su dominio decide qué se le abre. */
  c.ev(`abrirDiarioLectura('Pablo')`);
  assert.equal(c.ev('enModoLectura()'), true);
  assert.equal(c.ev(`startMission('bx', 'recordar', 'expedition')`), null,
    'en consulta no se juega por el niño');
  /* Lo que NO puede pasar es que eso se cuente como «no hay retos». */
  c.ev(`globalThis.__dicho = ''; toast = m => { __dicho = m; }`);
  assert.equal(c.ev('noSeJuegaEnElCuadernoDeOtro()'), true);
  const dicho = c.ev('__dicho');
  assert.match(dicho, /no se juega/, `dice: ${dicho}`);
  assert.match(dicho, /Pablo|cuaderno/, 'y de quién es el cuaderno');
  assert.ok(!/no tiene retos|sin retos|preparados/i.test(dicho),
    `sigue diciendo que no hay retos: ${dicho}`);
});

test('jugando de verdad, el guarda no estorba', () => {
  const c = cargarApp();
  conPozoLleno(c);
  c.ev(`setTeacherConfig('roster', [{ name: 'Pablo', username: 'pablo', grade: 2 }])`);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo' }, 2)`);
  /* El guarda solo puede saltar en consulta: si se pasara de listo, ningún
     alumno podría excavar. */
  assert.equal(c.ev('noSeJuegaEnElCuadernoDeOtro()'), false);
});

test('los cuatro sitios que juegan preguntan antes', () => {
  const play = leer('js/play.js');
  /* Expedición, bazar, «seguir excavando» y la Cámara del Guardián. Los cuatro
     traducían el mismo null a un motivo inventado y distinto cada uno: «no
     tiene retos», «ya no está disponible», «la cámara no está abierta». */
  assert.equal((play.match(/noSeJuegaEnElCuadernoDeOtro\(\)\) return;/g) || []).length, 4,
    'falta el guarda en alguno de los cuatro');
  for (const llamada of ['startMission(branchId, sId', 'startMission(destino.branchId',
                         "startMission(target.branchId", 'startGuardian(branchId)']) {
    const i = play.indexOf(llamada);
    assert.ok(i > 0, `no encuentro ${llamada}`);
    const antes = play.slice(Math.max(0, i - 200), i);
    assert.match(antes, /noSeJuegaEnElCuadernoDeOtro/, `${llamada} no pregunta antes`);
  }
});
