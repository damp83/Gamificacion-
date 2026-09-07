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
  assert.match(cuerpo, /!== String\(a\.name\)\.trim\(\)\.toLowerCase\(\)/);
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
