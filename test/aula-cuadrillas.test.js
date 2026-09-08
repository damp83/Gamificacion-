/* La lista de clase, agrupada por cuadrillas.

   Con veintidós nombres en una rejilla plana, encontrar a quien buscas es
   leerlos uno a uno. Agrupados se localiza por dónde está antes de leer
   ningún nombre, y de paso se ve a qué cuadrilla le toca salir. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function conCuadrillas() {
  const c = cargarApp();
  const nombres = ['Ana', 'Leo', 'Sara', 'Iker', 'Nora'];
  c.ev('setTeacherConfig')('roster', nombres.map(n => ({ name: n, grade: 3 })));
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.list[0].members = ['Ana', 'Leo'];
  t.list[1].members = ['Sara'];
  t.list[2].members = [];
  c.ev('setTeacherConfig')('teams', t);
  return c;
}

test('cada alumno cae en su cuadrilla', () => {
  const c = conCuadrillas();
  assert.equal(c.ev('cuadrillaDe')('Ana').id, 'cuervos');
  assert.equal(c.ev('cuadrillaDe')('Sara').id, 'jaguares');
  assert.equal(c.ev('cuadrillaDe')('Iker'), null, 'quien no está en ninguna, a ninguna');
});

test('el nombre se compara sin distinguir mayúsculas ni espacios', () => {
  /* El docente escribe «Ana» al apuntarla y «ana » al asignarla al equipo. */
  const c = conCuadrillas();
  assert.equal(c.ev('cuadrillaDe')('  ANA ').id, 'cuervos');
  assert.equal(c.ev('cuadrillaDe')('ana').id, 'cuervos');
});

test('sin cuadrillas activadas no agrupa nada', () => {
  const c = conCuadrillas();
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.enabled = false;
  c.ev('setTeacherConfig')('teams', t);
  assert.equal(c.ev('cuadrillaDe')('Ana'), null);
});

test('la misma regla que usa el juego para saber tu cuadrilla', () => {
  /* Si la lista de clase agrupara con un criterio y el juego dijera otro,
     un niño vería «Cuadrilla del Jaguar» en su pantalla y su docente lo
     tendría en otro grupo. */
  const state = leer('js/state.js');
  const iMio = state.indexOf('function myTeam()');
  const iOtro = state.indexOf('function cuadrillaDe(nombre)');
  const norma = /String\(m\)\.trim\(\)\.toLowerCase\(\) === /;
  assert.match(state.slice(iMio, iMio + 500), norma);
  assert.match(state.slice(iOtro, iOtro + 500), norma);
});

test('quien no tiene cuadrilla no se pierde: va en su propio grupo', () => {
  /* Es el fallo que se cuela solo: agrupar por equipos y dejar fuera de la
     pantalla a los que no tienen. */
  const aula = leer('js/aula.js');
  assert.match(aula, /if \(sueltos\.length\) grupo\('Sin cuadrilla'/);
});

test('una cuadrilla sin nadie de esta clase no pinta un título vacío', () => {
  const aula = leer('js/aula.js');
  assert.match(aula, /const g = porCuadrilla\.get\(t\.id\);\n\s*if \(g\) grupo\(/);
});

test('el interruptor solo aparece si hay algo que agrupar', () => {
  /* Un mando que no hace nada es peor que no tenerlo. */
  const aula = leer('js/aula.js');
  assert.match(aula, /zona\.classList\.toggle\('hidden', !hayCuadrillas\)/);
  assert.match(aula, /\(ATLAS_CONFIG\.teams\.list \|\| \[\]\)\.some\(t => \(t\.members \|\| \[\]\)\.length\)/,
    'hace falta que alguna cuadrilla tenga gente, no solo que existan');
});

test('la rejilla se mueve al grupo cuando se agrupa', () => {
  /* Si el contenedor siguiera siendo rejilla, los títulos entrarían como una
     celda más y saldrían al lado de un alumno. */
  const aula = leer('js/aula.js');
  assert.match(aula, /lista\.classList\.toggle\('aula-lista-grupos', agrupar\)/);
  const css = leer('css/styles.css');
  assert.match(css, /\.aula-lista-grupos \{ display: block; \}/);
  assert.match(css, /\.aula-grupo-gente \{\s*\n?\s*display: grid;/);
});

test('cada grupo dice cuántos han salido hoy', () => {
  /* Es la razón de agrupar en clase: saber a qué cuadrilla le toca. */
  const aula = leer('js/aula.js');
  assert.match(aula, /\$\{salidos\} de \$\{gente\.length\} hoy/);
});
