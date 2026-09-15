/* «No hay ningún pozo disponible para su curso».

   Era verdad y no servía de nada. Detrás hay tres motivos distintos, se
   arreglan en tres sitios distintos, y el docente no tenía forma de saber cuál
   le había tocado: ni el curso del alumno, ni los cursos que sí cubren sus
   pozos, ni si el problema era que el pozo está vacío.

   Con veinticuatro alumnos y un yacimiento recién creado, eso es una tarde de
   prueba y error en «Dirigir la clase», que es justo la pantalla que se usa
   con la clase delante. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Deja el catálogo con exactamente los pozos que se le pasen. */
function conPozos(c, pozos) {
  c.ev('setTeacherConfig')('sites', [{
    id: 'sx', name: 'Yacimiento', icon: '🏛️', desc: 'x',
    branches: pozos.map((p, i) => Object.assign({
      id: 'b' + i, name: 'Pozo ' + i, icon: '⚱️', desc: 'x', source: 'docente'
    }, p))
  }]);
}
const conRetos = n => ({ bank: { recordar: Array.from({ length: n || 5 }, (_, i) => ({
  question: 'q' + i, options: ['a', 'b', 'c', 'd'], answer: 0 })) } });

test('sin ningún pozo activo, lo dice y dónde se activan', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('sites', []);
  const r = c.ev('porQueNoHayPozo')(3);
  assert.equal(r.motivo, 'sin-pozos');
  assert.match(r.texto, /Yacimientos y pozos/);
});

test('el caso real: el alumno es de un curso que ningún pozo cubre', () => {
  const c = cargarApp();
  /* Un yacimiento recién creado con el asistente: sus pozos llevan los cursos
     que se pidieron, y el alumno que se toca puede no estar en ellos. */
  conPozos(c, [
    Object.assign({ grades: [3, 4] }, conRetos()),
    Object.assign({ grades: [4, 5] }, conRetos())
  ]);
  const r = c.ev('porQueNoHayPozo')(2);
  assert.equal(r.motivo, 'otro-curso');
  /* Las dos mitades del problema, para verlo sin abrir nada: en qué curso está
     él, y qué cursos cubren los pozos que hay. */
  assert.match(r.texto, /Está en 2\.º/);
  assert.match(r.texto, /3\.º, 4\.º, 5\.º/);
  /* Y las dos salidas, porque cualquiera de las dos puede ser la equivocada. */
  assert.match(r.texto, /curso en Alumnado/);
  assert.match(r.texto, /cursos del pozo/);
});

test('un pozo de su curso pero vacío es otro problema, y otro arreglo', () => {
  const c = cargarApp();
  conPozos(c, [{ grades: [2] }, { grades: [2] }]);
  const r = c.ev('porQueNoHayPozo')(2);
  assert.equal(r.motivo, 'sin-retos');
  assert.match(r.texto, /2 pozo\(s\) de 2\.º/);
  assert.match(r.texto, /Recordar/, 'y en qué estrato faltan');
  assert.match(r.texto, /Retos con IA/);
});

test('un pozo sin cursos declarados vale para todos', () => {
  const c = cargarApp();
  /* Es lo que hace que un pozo escrito a mano sirva sin configurar nada, y no
     puede contarse como «no es de su curso». */
  conPozos(c, [conRetos()]);
  for (const g of [1, 3, 6]) {
    assert.notEqual(c.ev('porQueNoHayPozo')(g).motivo, 'otro-curso',
      `en ${g}.º dice que el pozo no es de su curso`);
  }
});

test('un pozo apagado no cuenta como disponible', () => {
  const c = cargarApp();
  conPozos(c, [Object.assign({ grades: [2], enabled: false }, conRetos())]);
  const r = c.ev('porQueNoHayPozo')(2);
  assert.equal(r.motivo, 'sin-pozos', `dice: ${r.texto}`);
});

test('el aviso de «Dirigir la clase» lleva el nombre y el motivo', () => {
  const aula = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'js/aula.js'), 'utf8');
  /* Con la clase delante no hay tiempo de investigar: el aviso tiene que decir
     de quién es y qué pasa, y durar lo bastante para leerlo. */
  assert.match(aula, /alumno\.name \+ ': ' \+ porQueNoHayPozo\(\)\.texto/);
  assert.ok(!/No hay ningún pozo disponible para su curso/.test(aula),
    'sigue el mensaje que no decía nada');
});

test('el diagnóstico mira el curso del ALUMNO, no el de la clase', () => {
  const c = cargarApp();
  conPozos(c, [Object.assign({ grades: [6] }, conRetos())]);
  c.ev('setTeacherConfig')('defaultGrade', 6);
  c.ev(`setTeacherConfig('roster', [{ name: 'Pablo', username: 'pablo', grade: 2 }])`);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo' }, 2)`);
  /* Sin argumento tira de `currentGrade()`, que con el diario abierto es el
     del niño. Si mirara el de la clase, diría que todo está bien mientras el
     alumno se queda sin turno. */
  const r = c.ev('porQueNoHayPozo()');
  assert.equal(r.grade, 2);
  assert.equal(r.motivo, 'otro-curso');
  assert.match(r.texto, /Está en 2\.º/);
});

/* ══════════ El curso, que estaba congelado ══════════ */

test('cambiar el curso en Alumnado se lo aplica al que YA tiene cuaderno', () => {
  const c = cargarApp();
  /* El nombre se corregía desde la lista y el curso no: solo se ponía al CREAR
     el diario y a partir de ahí quedaba congelado. Y el curso no es una
     etiqueta, es lo que decide qué pozos ve el niño: un alumno con el curso
     viejo se quedaba sin nada que excavar y el docente lo «arreglaba» en la
     lista una y otra vez sin que cambiara nada. */
  conPozos(c, [Object.assign({ grades: [3] }, conRetos())]);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 2 }, 2)`);
  assert.equal(c.ev('S.profile.grade'), 2);
  assert.equal(c.ev('porQueNoHayPozo()').motivo, 'otro-curso');

  /* El docente lo pasa a 3.º en Alumnado y vuelve a tocarlo. */
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 3 })`);
  assert.equal(c.ev('S.profile.grade'), 3, 'el curso de la lista tiene que mandar');
  const r = c.ev(`startClassTurn({ name: 'Pablo', username: 'pablo', grade: 3 })`);
  assert.equal(r.ok, true, 'y entonces el turno arranca');
});

test('y el nombre se sigue corrigiendo igual que antes', () => {
  const c = cargarApp();
  conPozos(c, [conRetos()]);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 2 }, 2)`);
  c.ev(`openDiary({ name: 'Pablo Ruiz', username: 'pablo', grade: 2 })`);
  assert.equal(c.ev('S.profile.explorer_name'), 'Pablo Ruiz');
});

test('quien entra sin traer curso no le toca el suyo', () => {
  const c = cargarApp();
  conPozos(c, [conRetos()]);
  /* Un alumno entrando en su tablet no trae ficha de la lista. Que abrir su
     diario le cambiara el curso a un valor de fábrica sería mucho peor que el
     fallo que se está arreglando. */
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 5 }, 5)`);
  assert.equal(c.ev('S.profile.grade'), 5);
  /* La misma ficha sin curso: el diario es el mismo y su curso no se toca. */
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo' })`);
  assert.equal(c.ev('S.profile.grade'), 5, 'sin curso en la ficha, no se toca');
});

test('un curso imposible no entra en el diario', () => {
  const c = cargarApp();
  conPozos(c, [conRetos()]);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 4 }, 4)`);
  for (const malo of [0, 7, -1, 'tercero']) {
    c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: ${JSON.stringify(malo)} })`);
    assert.equal(c.ev('S.profile.grade'), 4, `ha entrado un curso ${malo}`);
  }
});
