/* Por qué un yacimiento recién creado no le aparece a los alumnos.

   No es sincronización: un pozo solo sale en el mapa cuando tiene al menos
   un reto en el PRIMER estrato, y un yacimiento cuyos pozos están todos así
   desaparece entero. La regla es buena —un pozo vacío que se abre y no tiene
   nada es peor que no verlo— pero no estaba escrita en ninguna parte, así
   que desde el panel parecía que los ajustes no habían llegado. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const pozoVacio = () => ({
  id: 'p1', icon: '⛏️', name: 'Pozo nuevo', enabled: true, source: 'bank',
  grades: [1, 2, 3, 4, 5, 6], bank: { recordar: [], comprender: [], aplicar: [], analizar: [] }
});
const yacimiento = (branches) => ({
  id: 'piramides', icon: '🏛️', name: 'La escritura de las pirámides',
  subject: 'Matemáticas', enabled: true, branches
});

test('un pozo sin retos en el primer estrato no se le sirve al alumno', () => {
  const c = cargarApp();
  const site = yacimiento([pozoVacio()]);
  assert.equal(c.ev('branchesEnabledOf')(site, 2).length, 0, 'vacío: no se ve');

  const con = yacimiento([Object.assign(pozoVacio(), {
    bank: { recordar: [{ question: 'q', options: ['a','b','c','d'], answer: 0 }] } })]);
  assert.equal(c.ev('branchesEnabledOf')(con, 2).length, 1, 'con un reto en Recordar: se ve');
});

test('un reto en un estrato posterior NO basta', () => {
  /* Se entra por Recordar: un pozo cuyo primer estrato está vacío no se
     puede empezar, por muchos retos que tenga en Analizar. */
  const c = cargarApp();
  const site = yacimiento([Object.assign(pozoVacio(), {
    bank: { recordar: [], analizar: [{ question: 'q', options: ['a','b','c','d'], answer: 0 }] } })]);
  assert.equal(c.ev('branchesEnabledOf')(site, 2).length, 0);
});

test('el panel avisa de que un pozo no se ve, y por qué', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /Tus alumnos todavía no ven este pozo/);
  assert.match(t, /al menos un reto en <strong>\$\{esc\(STRATA_META\[STRATA_ORDER\[0\]\]\.label\)\}/,
    'nombra el estrato que hace falta, sin escribir «Recordar» a mano');
  assert.match(t, /Escríbele uno y aparecerá solo/, 'y dice qué hacer');
});

test('y avisa también a nivel de yacimiento', () => {
  /* Es la pregunta que llegó: «he creado un yacimiento y mis alumnos no lo
     ven». El aviso tiene que estar donde se mira, no solo dentro del pozo. */
  const t = leer('js/teacher.js');
  assert.match(t, /Este yacimiento no le aparece a nadie\s*\n?\s*todavía/);
  assert.match(t, /No tiene pozos\. Añádele al menos uno/, 'distingue «sin pozos» de «pozos vacíos»');
  assert.match(t, /const mudo = site\.enabled !== false && !visibles;/,
    'un yacimiento apagado a propósito no da la lata: ya se sabe que no se ve');
});

test('el aviso desaparece en cuanto el pozo es jugable', () => {
  /* Un aviso que no se va cuando arreglas la causa enseña a ignorar los
     avisos. */
  const t = leer('js/teacher.js');
  assert.match(t, /\$\{b\.source !== 'builtin' && !branchPlayable\(b\)/,
    'la condición es la misma que decide si el alumno lo ve');
});
