/* El desplegable de «Dirigir la clase»: de qué pozo preguntar.

   `branchFitsGrade` tenía dos «sin curso» con significados opuestos y la misma
   cara. No pasar nada quiere decir «el curso del que está jugando». Pasar
   `null` quiere decir «todos», y lo usa este desplegable, donde el docente
   elige el tema y todavía no hay ningún alumno en pantalla.

   Pero `grade || DEFAULT_GRADE` convertía el `null` en 4.º. Un docente de 2.º
   abría el desplegable y solo veía los pozos que además sirven a 4.º —los de
   fábrica—, mientras que los suyos no aparecían. Y sin poder elegir, cada
   alumno caía en el primero del catálogo: siempre Matemáticas. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* El catálogo del caso real: los de fábrica y un yacimiento de Lengua de 2.º. */
function conYacimientoDeSegundo(c) {
  const sites = c.ev('deepClone')(c.ev('ATLAS_CONFIG.sites'));
  sites.push({ id: 'sLengua', name: 'Las Voces', subject: 'Lengua', icon: '🗣️', desc: 'x',
    branches: [{ id: 'bVoces', name: 'El Pozo de las Voces', icon: '🗣️', desc: 'x',
      source: 'docente', grades: [2],
      bank: { recordar: Array.from({ length: 63 }, (_, i) => ({
        question: 'q' + i, options: ['a', 'b', 'c', 'd'], answer: 0 })) } }] });
  c.ev('setTeacherConfig')('sites', sites);
}

test('«sin curso» y «todos los cursos» no son lo mismo', () => {
  const c = cargarApp();
  const cabe = c.ev('branchFitsGrade');
  const pozo = { grades: [2] };
  /* null = todos: es el desplegable, donde aún no hay alumno. */
  assert.equal(cabe(pozo, null), true, 'null tiene que significar «todos»');
  /* Y un curso concreto sigue filtrando como siempre. */
  assert.equal(cabe(pozo, 2), true);
  assert.equal(cabe(pozo, 4), false);
  /* Un pozo sin cursos declarados sirve a todos, como antes. */
  assert.equal(cabe({}, 4), true);
  assert.equal(cabe({}, null), true);
});

test('el desplegable enseña los pozos de TODOS los cursos', () => {
  const c = cargarApp();
  conYacimientoDeSegundo(c);
  /* La clase está puesta en 4.º, que es el valor de fábrica: justo lo que
     escondía los pozos de 2.º sin que nadie se enterara. */
  c.ev('setTeacherConfig')('defaultGrade', 4);
  const nombres = [];
  for (const site of c.ev('sitesEnabled()')) {
    for (const b of c.ev('branchesEnabledOf')(site, null)) nombres.push(b.name);
  }
  assert.ok(nombres.includes('El Pozo de las Voces'),
    `el pozo de 2.º no sale en la lista: ${nombres.join(', ')}`);
  /* Y los de fábrica siguen saliendo: esto añade, no sustituye. */
  assert.ok(nombres.length > 1, 'solo sale uno');
});

test('lo que ve un alumno sigue filtrado por SU curso', () => {
  const c = cargarApp();
  conYacimientoDeSegundo(c);
  /* Lo importante de no haberse pasado de listo: un niño de 4.º no puede
     empezar a ver pozos de 2.º porque el desplegable del docente los liste. */
  c.ev(`setTeacherConfig('roster', [{ name: 'Ana', username: 'ana', grade: 4 }])`);
  c.ev(`openDiary({ name: 'Ana', username: 'ana', grade: 4 }, 4)`);
  assert.ok(!c.ev('playableBranchIds()').includes('bVoces'),
    'a un alumno de 4.º le está saliendo un pozo de 2.º');

  c.ev(`setTeacherConfig('roster', [{ name: 'Pablo', username: 'pablo', grade: 2 }])`);
  c.ev(`openDiary({ name: 'Pablo', username: 'pablo', grade: 2 }, 2)`);
  assert.ok(c.ev('playableBranchIds()').includes('bVoces'),
    'y al de 2.º, que es el suyo, no le sale');
});

test('eligiendo el pozo, el turno va a ESE y no al primero del catálogo', () => {
  const c = cargarApp();
  conYacimientoDeSegundo(c);
  c.ev(`setTeacherConfig('roster', [{ name: 'Pablo', username: 'pablo', grade: 2 }])`);
  /* Con todo a cero no hay nada que «convenga más», así que en automático cae
     siempre el primero del catálogo. Por eso hace falta poder elegir. */
  const auto = c.ev(`startClassTurn({ name: 'Pablo', username: 'pablo', grade: 2 })`);
  assert.equal(auto.ok, true);
  c.ev('closeDiary()');
  const elegido = c.ev(`startClassTurn({ name: 'Pablo', username: 'pablo', grade: 2 }, 'bVoces', 'recordar')`);
  assert.equal(elegido.ok, true);
  assert.equal(elegido.branchId, 'bVoces', 'no ha ido al pozo elegido');
});
