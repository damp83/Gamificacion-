/* El pulso de la sala de mapas. Lo que se prueba no es que sepa contar, sino
   la regla que decide QUÉ se enseña: una fila de ceros ocupa sitio sin decir
   nada, así que un cero o se convierte en algo que hacer o no sale. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const fichas = c => c.ev('pulsoDocente')();
/* Las fichas se buscan por su icono, que desde v117 es el nombre de un
   símbolo del pliego («group», «pickaxe») y no un emoji del sistema: 🆘 en
   rojo de semáforo y 👥 en azul eran los dos colores que peor casaban con el
   pergamino, y al lado de los iconos de trazo parecían de otra app. */
const busca = (l, icono) => l.find(f => f.icono === icono);

test('sin clase todavía, los ceros salen como algo que hacer', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', []);
  const l = fichas(c);
  const gente = busca(l, 'group');
  assert.equal(gente.n, undefined, 'no se enseña un 0');
  assert.match(gente.accion, /Apunta/, 'se enseña el verbo');
  assert.equal(gente.ir, 'alumnado', 'y lleva a donde se arregla');
});

test('con alumnos apuntados, la cifra y el plural correcto', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Ana', grade: 3 }, { name: 'Leo', grade: 3 }]);
  const gente = busca(fichas(c), 'group');
  assert.equal(gente.n, 2);
  assert.equal(gente.que, 'exploradores');

  c.ev('setTeacherConfig')('roster', [{ name: 'Ana', grade: 3 }]);
  assert.equal(busca(fichas(c), 'group').que, 'explorador', 'uno solo no es «exploradores»');
});

test('cuenta pozos abiertos, no yacimientos', () => {
  /* Un yacimiento con todos los pozos cerrados no da juego a nadie: contarlo
     diría que hay dónde excavar cuando no lo hay. */
  const c = cargarApp();
  const pozos = busca(fichas(c), 'pickaxe');
  let n = 0;
  for (const s of c.ev('sitesEnabled')()) n += c.ev('branchesEnabledOf')(s).length;
  assert.equal(pozos.n, n);
  assert.ok(n > c.ev('sitesEnabled')().length, 'hay más pozos que yacimientos, si no la prueba no dice nada');
});

test('la cola de la IA solo sale si hay algo que revisar', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('iaCola', []);
  assert.equal(busca(fichas(c), 'feather'), undefined, 'sin cola, no ocupa sitio');

  c.ev('setTeacherConfig')('iaCola', [{ id: 'a' }, { id: 'b' }]);
  const ia = busca(fichas(c), 'feather');
  assert.equal(ia.n, 2);
  assert.equal(ia.ir, 'ia');
  assert.ok(ia.avisa, 'es un recado, va destacado');
});

test('sin diarios en este equipo no se inventa un «van todos bien»', () => {
  /* Leyendo de la nube solo llega el resumen: la cifra de rescate sería
     mentira. Un 0 ahí se lee como «nadie necesita ayuda», que es justo lo
     contrario de «no lo sé». */
  const c = cargarApp();
  assert.equal(busca(fichas(c), 'flag'), undefined);
});

test('cada ficha lleva a algún sitio', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('iaCola', [{ id: 'a' }]);
  for (const f of fichas(c)) {
    assert.ok(f.ir || f.clase, `la ficha ${f.icono} no lleva a ninguna parte`);
  }
});

test('lo que hay que atender hoy va delante', () => {
  /* Un recado detrás de dos cifras que no cambian nunca se lee tarde o no se
     lee. Las fichas de aviso solo salen cuando hay algo, así que ponerlas
     primero no marea: lo que cambia es que aparezcan, no dónde. */
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Ana', grade: 3 }]);
  c.ev('setTeacherConfig')('iaCola', [{ id: 'a' }]);
  const l = fichas(c);
  assert.equal(l[0].icono, 'feather', 'el recado, el primero');

  c.ev('setTeacherConfig')('roster', []);
  const sinClase = fichas(c);
  const pos = sinClase.findIndex(f => f.icono === 'group');
  assert.ok(pos < sinClase.findIndex(f => f.icono === 'pickaxe'),
    'sin alumnos, apuntarlos va antes que informar de los pozos');
});

test('los iconos del pulso son del pliego, no emoji del sistema', () => {
  /* Justo encima del pergamino y al lado de las tarjetas de trazo, un emoji
     de sistema canta: el 🆘 va en rojo de semáforo y el 👥 en azul, que son
     los dos colores más ajenos a esta paleta. Todos estaban ya dibujados. */
  const fs = require('node:fs');
  const path = require('node:path');
  const raiz = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Ana', grade: 3 }]);
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  fichas(c).forEach(f => {
    assert.ok(!emoji.test(f.icono), `la ficha «${f.que || f.accion}» sigue con un emoji`);
    assert.ok(html.includes(`id="i-${f.icono}"`), `no existe el símbolo i-${f.icono}`);
  });
});
