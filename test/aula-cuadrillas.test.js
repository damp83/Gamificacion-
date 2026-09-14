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
  assert.match(aula, /if \(sueltos\.length\) grupo\('sin-cuadrilla', 'Sin cuadrilla'/);
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

/* ── Los emblemas de quien ya tenía cuadrillas ──

   Los dibujos llegaron después que las cuadrillas. La regla de la fusión es
   que un array se sustituye entero —si el docente borra una cuadrilla, tiene
   que quedarse borrada—, así que quien había tocado las suyas antes tenía
   congelada en sus ajustes una copia SIN el campo del dibujo, y su clase
   siguió viendo el emoji para siempre: los archivos estaban, las rutas
   estaban, y no aparecían.

   Esto no se veía en la demo, porque sus cuadrillas nacen con el dibujo
   puesto. Solo le pasaba a un aula de verdad. */

/* Los ajustes de un docente anteriores a los dibujos. */
function comoAntesDeLosDibujos(c, lista) {
  c.ev('applyOverlay')({ teams: { list: lista } });
  return c.ev('JSON.parse(JSON.stringify(ATLAS_CONFIG.teams.list))');
}

test('una cuadrilla de fábrica guardada sin dibujo lo recupera', () => {
  const c = cargarApp();
  const l = comoAntesDeLosDibujos(c, [
    { id: 'cuervos', name: 'Cuadrilla del Cóndor', icon: '🦅', members: ['Ana'] },
    { id: 'tigres',  name: 'Los Tigres de 4.ºB',   icon: '🐅', members: ['Leo'] }
  ]);
  assert.equal(l[0].img, 'img/cuadrillas/condor.webp');
  assert.equal(l[1].img, 'img/cuadrillas/tigre.webp', 'renombrarla no le quita el dibujo');
  /* Y lo que sí editó el docente se respeta: eso no se toca. */
  assert.equal(l[1].name, 'Los Tigres de 4.ºB');
  assert.equal(l[1].members.length, 1);
  assert.equal(l.length, 2, 'no se le devuelven las cuadrillas que borró');
});

test('el dibujo que haya elegido el docente manda sobre el de fábrica', () => {
  const c = cargarApp();
  const l = comoAntesDeLosDibujos(c, [
    { id: 'cuervos', name: 'Cóndor', icon: '🦅', img: 'img/mio.webp', members: [] }
  ]);
  assert.equal(l[0].img, 'img/mio.webp');
});

test('una cuadrilla que se inventó el docente coge el dibujo de su emoji', () => {
  /* El id lo puso el panel y no dice nada; el emoji sí lo eligió él. */
  const c = cargarApp();
  const l = comoAntesDeLosDibujos(c, [
    { id: 'cuadrilla-x7', name: 'Los Exploradores', icon: '🐢', members: [] },
    { id: 'cuadrilla-x8', name: 'Sin animal',       icon: '🛖', members: [] }
  ]);
  assert.equal(l[0].img, 'img/cuadrillas/tortuga.webp');
  assert.equal(l[1].img, undefined, 'no hay dibujo de cabaña: se queda con su emoji');
});

test('dos cuadrillas no se llevan el mismo dibujo', () => {
  /* Delante de la clase parecerían la misma. La que lo tiene por id gana;
     la otra se queda con su emoji, que es lo honesto. */
  const c = cargarApp();
  const l = comoAntesDeLosDibujos(c, [
    { id: 'cuadrilla-x7', name: 'Los otros tigres', icon: '🐅', members: [] },
    { id: 'tigres',       name: 'Cuadrilla del Tigre', icon: '🐅', members: [] }
  ]);
  assert.equal(l[1].img, 'img/cuadrillas/tigre.webp');
  assert.equal(l[0].img, undefined);
});

test('los cinco dibujos de fábrica existen de verdad en el repositorio', () => {
  /* Con la ruta puesta y el archivo ausente saldría el hueco de una imagen
     rota delante de la clase. */
  const c = cargarApp();
  const lista = c.ev('JSON.parse(JSON.stringify(ATLAS_DEFAULTS.teams.list))');
  assert.equal(lista.length, 5);
  lista.forEach(t => {
    assert.ok(t.img, `${t.id} no tiene dibujo`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', t.img)), `falta el archivo ${t.img}`);
  });
});

test('y viajan a las tablets aunque la capa que se comparte no los lleve', () => {
  /* Lo que se manda es la capa del docente, y ahí el dibujo no está. La
     tablet lo recupera al adoptarla, igual que él. */
  const c = cargarApp();
  c.ev('applyOverlay')({ teams: { list: [
    { id: 'jaguares', name: 'Jaguares', icon: '🐆', members: [] }] } });
  const paquete = { overlay: c.ev('configParaCompartir')() };
  assert.equal(paquete.overlay.teams.list[0].img, undefined, 'no hace falta mandarlo');
  c.ev('adoptSharedConfig')(paquete);
  assert.equal(c.ev('ATLAS_CONFIG.teams.list')[0].img, 'img/cuadrillas/jaguar.webp');
});

test('y la lista de la clase se los lleva a la vista general', () => {
  /* Aquí ya se cayó una vez: se copiaba el emoji y no el dibujo, y la misma
     cuadrilla salía dibujada en la tablet del niño y en emoji en la del
     maestro. */
  const t = leer('js/classview.js');
  assert.match(t, /id: t\.id, name: t\.name, icon: t\.icon, img: t\.img/);
});
