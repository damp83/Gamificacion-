/* Dos alumnas que se llaman igual.

   La clave de un diario era el nombre, y eso daba por hecho que en una clase
   no se repite ninguno. En un colegio con varios cursos sí: dos niñas llamadas
   igual, una en 2.º y otra en 4.º, compartían diario, cuadrilla y rol, y lo que
   hacía una se lo encontraba la otra. Lo que no se repite es el usuario. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function conDosSarahs() {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [
    { name: 'Sarah', username: 'sarah', password: 'cofre1234', grade: 2 },
    { name: 'Sarah', username: 'sarah2', password: 'vasija5678', grade: 4 },
    { name: 'Nilo', username: 'nilo', password: 'tinaja9012', grade: 3 }
  ]);
  return c;
}

test('cada una tiene su clave, y no es el nombre', () => {
  const c = conDosSarahs();
  const r = c.ev('ATLAS_CONFIG.roster');
  assert.equal(c.ev('diaryKey')(r[0]), 'u:sarah');
  assert.equal(c.ev('diaryKey')(r[1]), 'u:sarah2');
  assert.notEqual(c.ev('diaryKey')(r[0]), c.ev('diaryKey')(r[1]));
});

test('con el nombre suelto, y solo una que se llame así, acierta igual', () => {
  /* Es como lo llaman las pantallas del propio alumno, que no tienen ficha. */
  const c = conDosSarahs();
  assert.equal(c.ev('diaryKey')('Nilo'), 'u:nilo');
  assert.equal(c.ev('diaryKey')(' NILO '), 'u:nilo');
});

test('con el nombre suelto y dos iguales no se inventa una: deja la clave vieja', () => {
  /* Elegir una de las dos al azar sería peor que no elegir: le enseñaría a una
     niña el diario de la otra. */
  const c = conDosSarahs();
  assert.equal(c.ev('diaryKey')('Sarah'), 'sarah');
});

test('quien no está en ninguna lista conserva la clave de su nombre', () => {
  const c = conDosSarahs();
  assert.equal(c.ev('diaryKey')('Vega'), 'vega');
  assert.equal(c.ev('diaryKey')(''), '');
});

test('los diarios de antes se mudan a la clave nueva, una vez', () => {
  const c = conDosSarahs();
  c.ev('saveDiaries')({ nilo: c.ev('defaultState')('Nilo') });
  assert.equal(c.ev('migrarClavesDeDiarios()'), true);
  const map = c.ev('loadDiaries()');
  assert.ok(map['u:nilo'], 'está en su clave nueva');
  assert.ok(!map.nilo, 'y ya no en la vieja');
  assert.equal(c.ev('migrarClavesDeDiarios()'), false, 'la segunda vez no hay nada que mudar');
});

test('la mudanza nunca pisa un diario que ya esté en el destino', () => {
  /* Si por lo que sea existieran los dos, quedarse con uno sería perder el
     otro sin decirlo. */
  const c = conDosSarahs();
  const viejo = c.ev('defaultState')('Nilo');
  const nuevo = c.ev('defaultState')('Nilo');
  nuevo.wallet = 999;
  c.ev('saveDiaries')({ nilo: viejo, 'u:nilo': nuevo });
  c.ev('migrarClavesDeDiarios()');
  const map = c.ev('loadDiaries()');
  assert.equal(map['u:nilo'].wallet, 999, 'el del destino se queda');
  assert.ok(map.nilo, 'y el otro no se borra: se puede mirar');
});

test('abrir el diario de una no abre el de la otra', () => {
  const c = conDosSarahs();
  const r = c.ev('ATLAS_CONFIG.roster');
  c.ev('openDiary')(r[0]);
  c.ev('S').wallet = 111;
  c.ev('saveState()');
  c.ev('openDiary')(r[1]);
  assert.notEqual(c.ev('S.wallet'), 111, 'la de 4.º no hereda la bolsa de la de 2.º');
  c.ev('S').wallet = 222;
  c.ev('saveState()');
  c.ev('openDiary')(r[0]);
  assert.equal(c.ev('S.wallet'), 111, 'y la de 2.º recupera la suya');
});

test('abrir por la ficha coge su curso sin tener que pasarlo aparte', () => {
  const c = conDosSarahs();
  c.ev('openDiary')(c.ev('ATLAS_CONFIG.roster')[1]);
  assert.equal(c.ev('S.profile.grade'), 4);
});

test('un diario que existe bajo el nombre no se pierde al cambiar la clave', () => {
  /* Pasa con quien entró antes de estar en la lista: su diario está bajo el
     nombre y su ficha ya dice otra clave. Manda el que existe. */
  const c = conDosSarahs();
  const suyo = c.ev('defaultState')('Nilo');
  suyo.wallet = 77;
  c.ev('saveDiaries')({ nilo: suyo });
  assert.equal(c.ev('diaryExists')(c.ev('ATLAS_CONFIG.roster')[2]), true);
  c.ev('openDiary')(c.ev('ATLAS_CONFIG.roster')[2]);
  assert.equal(c.ev('S.wallet'), 77);
});

test('la lista de a quién preguntar enseña a las dos, no a una', () => {
  /* Este era el síntoma que se veía: veintidós alumnos en la lista y
     veintiuna fichas en la pantalla. */
  const c = conDosSarahs();
  const l = c.ev('aulaAlumnos()');
  assert.equal(l.length, 3);
  assert.equal(l.filter(a => a.name === 'Sarah').length, 2);
  assert.ok(l.every(a => a.username), 'y cada una lleva su usuario, que es lo que las separa');
});

test('el cuadro de altas entiende el curso escrito detrás del nombre', () => {
  const c = cargarApp();
  const leerLinea = c.ev('leerLineaDeAlta');
  assert.deepEqual(leerLinea('Mara Ibáñez, 4'), { name: 'Mara Ibáñez', grade: 4 });
  assert.deepEqual(leerLinea('Mara Ibáñez (4.º)'), { name: 'Mara Ibáñez', grade: 4 });
  assert.deepEqual(leerLinea('Mara Ibáñez 4.º'), { name: 'Mara Ibáñez', grade: 4 });
  assert.equal(leerLinea('Mara Ibáñez').grade, c.ev('ATLAS_CONFIG.defaultGrade'),
    'sin curso, el de la clase');
});

test('un número que es parte del nombre no se confunde con un curso', () => {
  const c = cargarApp();
  assert.equal(c.ev('leerLineaDeAlta')('Luis 2 Pérez').name, 'Luis 2 Pérez');
});

test('el mismo nombre en otro curso ya no se rechaza como repetido', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /=== name\.toLowerCase\(\)\s*\n\s*&& \(r\.grade \|\| ATLAS_CONFIG\.defaultGrade\) === grade\)/,
    'la repetición es nombre Y curso, no solo nombre');
});

test('la hoja de credenciales dice el curso cuando el nombre se repite', () => {
  /* Una hoja con dos líneas «Sarah» es una hoja que se reparte mal. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('id="ros-sheet"');
  assert.match(t.slice(i, i + 500), /repes\.has\(/);
});
