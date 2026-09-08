/* Borrar una clase.

   Es lo más destructivo que hace la plataforma: se lleva por delante los
   diarios de sus alumnos, que son un trimestre de trabajo de cada niño. Lo
   que se prueba aquí no es que sepa borrar —eso es fácil— sino que sea
   difícil borrar la clase equivocada y que un borrado a medias no deje
   basura invisible. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('se borra de dentro afuera: retos, diarios y el aula al final', () => {
  /* Al revés, si algo fallara a mitad quedarían filas apuntando a una clase
     que ya no existe: invisibles desde la app e imposibles de limpiar sin
     entrar en la consola de Appwrite. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudBorrarAula(');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  const iRetos = cuerpo.indexOf("barrer(c.retosCollectionId");
  const iDiarios = cuerpo.indexOf("barrer(c.collectionId");
  const iAula = cuerpo.indexOf("deleteDocument(c.databaseId, c.aulasCollectionId");
  assert.ok(iRetos > 0 && iDiarios > iRetos && iAula > iDiarios);
});

test('si algo falla, el aula NO se borra', () => {
  /* Mientras el aula exista, lo de dentro sigue siendo alcanzable y se puede
     reintentar. Borrarla dejaría lo que quedó fuera del alcance de la app. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudBorrarAula(');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  const iCorte = cuerpo.indexOf("if (cuenta.fallos) return");
  const iAula = cuerpo.indexOf("deleteDocument(c.databaseId, c.aulasCollectionId");
  assert.ok(iCorte > 0 && iCorte < iAula, 'se corta antes de tocar el aula');
});

test('se cuenta lo que hay dentro ANTES de preguntar', () => {
  /* «¿Borrar la clase?» no significa nada. «Se van 24 diarios y 60 retos»
     sí, y es lo que hace que alguien se lo piense. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf('async function borrarAulaUI(a)');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  const iCuenta = cuerpo.indexOf('cloudContarDeAula(a.id)');
  const iPregunta = cuerpo.indexOf('askConfirm(');
  assert.ok(iCuenta > 0 && iCuenta < iPregunta, 'primero cuenta, después pregunta');
  assert.match(cuerpo, /su progreso, sus méritos y sus doblones/, 'y dice qué es un diario');
});

test('si no se puede contar, no se miente con un cero', () => {
  /* Enseñar «0 diarios» cuando no se ha podido contar invita a borrar una
     clase llena. */
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /catch \(e\) \{ return -1; \}/);
  const aula = leer('js/aula.js');
  assert.match(aula, /un número indeterminado de \$\{varios\}/);
});

test('la copia de seguridad se ofrece ANTES, no después', () => {
  /* Después no sirve para nada. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf('async function borrarAulaUI(a)');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  const iCopia = cuerpo.indexOf("cfgSection = 'copia'");
  const iBorra = cuerpo.indexOf('cloudBorrarAula(a.id');
  assert.ok(iCopia > 0 && iCopia < iBorra);
  assert.match(cuerpo, /return;   \/\* que vuelva cuando la tenga/,
    'y si va a por ella, no se borra nada todavía');
});

test('hay que escribir el nombre de la clase', () => {
  /* Un «¿seguro?» se contesta que sí sin leerlo. Escribir «4.º B» obliga a
     mirar CUÁL se está borrando, que es el error de verdad: borrar la que no
     era. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf('async function borrarAulaUI(a)');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.match(cuerpo, /askPrompt\(/);
  assert.match(cuerpo, /!mismoNombreDeClase\(escrito, a\.name\)/);
  assert.match(cuerpo, /No se ha borrado nada/);
});

test('borrar la clase abierta la suelta de este equipo', () => {
  /* Si no, seguiría enseñando los diarios de una clase que ya no existe. */
  const aula = leer('js/aula.js');
  assert.match(aula, /if \(aulaActiva\(\) === a\.id\) cerrarAula\(\);/);
});

test('un borrado a medias se cuenta, no se da por bueno', () => {
  const aula = leer('js/aula.js');
  assert.match(aula, /No se ha podido borrar del todo/);
  assert.match(aula, /la clase sigue ahí/);
  assert.match(aula, /lo que ya se borró no se repite/, 'y se puede reintentar sin miedo');
});

test('el botón de borrar no compite con el de abrir', () => {
  /* La acción normal es entrar en la clase; borrar es excepcional. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.aula-card-borrar {');
  const cuerpo = css.slice(i, css.indexOf('}', i));
  assert.match(cuerpo, /opacity: \.5/);
  const aula = leer('js/aula.js');
  assert.match(aula, /aria-label`?', `Borrar la clase \$\{a\.name\} y todo lo que contiene/);
});

/* ── El ordinal que bloqueaba el borrado ──
   Pasó de verdad: una clase llamada «4.º A» no se dejaba borrar aunque el
   docente escribiera su nombre. El «º» de la app es U+00BA (indicador ordinal
   masculino) y el del teclado suele ser «°» U+00B0 (grado), o directamente una
   «o». Tres caracteres distintos, idénticos en pantalla, y el aviso decía solo
   «el nombre no coincide»: imposible de adivinar. */

test('el ordinal, el grado y la o valen igual al confirmar', () => {
  const c = cargarApp();
  const mismo = c.ev('mismoNombreDeClase');
  for (const escrito of ['4.º A', '4º A', '4° A', '4.o A', '4 A', '4a', '  4.º a  ']) {
    assert.equal(mismo(escrito, '4.º A'), true, `«${escrito}» debería valer`);
  }
});

test('pero otra clase sigue siendo otra clase', () => {
  /* Aflojar la comparación no puede aflojar la barrera: lo que hay que
     distinguir es cuál se está borrando. */
  const c = cargarApp();
  const mismo = c.ev('mismoNombreDeClase');
  assert.equal(mismo('2.º A', '4.º A'), false);
  assert.equal(mismo('4.º B', '4.º A'), false);
  assert.equal(mismo('', '4.º A'), false);
  assert.equal(mismo('cuarto A', '4.º A'), false);
});

test('las tildes tampoco bloquean, y una clase «Álamos» se borra escribiéndola', () => {
  const c = cargarApp();
  assert.equal(c.ev('mismoNombreDeClase')('alamos', 'Álamos'), true);
});

test('un nombre que al limpiarlo se queda en nada exige el texto tal cual', () => {
  /* Si no, cualquier cosa abriría la puerta de una clase llamada «···». */
  const c = cargarApp();
  const mismo = c.ev('mismoNombreDeClase');
  assert.equal(mismo('lo que sea', '···'), false);
  assert.equal(mismo('···', '···'), true);
});

test('la pantalla dice qué nombre hay que escribir, y qué escribiste', () => {
  /* «El nombre no coincide» a secas manda a probar a ciegas. */
  const aula = leer('js/aula.js');
  assert.match(aula, /Escribe «\$\{a\.name\}» para confirmar/);
  assert.match(aula, /Has escrito «\$\{esc\(String\(escrito\)\.trim\(\)\)\}» y la clase se llama/);
});

test('la «o» solo vale de ordinal detrás de un número', () => {
  /* Aflojar de más sería peor: una clase «4 oro» no puede confundirse con
     «4.º» por dejar caer la o. */
  const c = cargarApp();
  const clave = c.ev('claveDeNombreDeClase');
  assert.notEqual(clave('4 oro'), clave('4.º'));
  assert.equal(clave('1.º ESO'), clave('1º eso'));
});
