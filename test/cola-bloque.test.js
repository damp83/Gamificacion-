/* Revisar la cola sin pagar una descarga por clic, y mover un reto de sitio.

   Cada acción sobre un reto —aprobar, descartar, corregir una palabra— se
   bajaba la tabla ENTERA detrás. Diez retos aprobados de uno en uno eran diez
   escrituras y diez descargas completas, y con trescientos retos en el banco
   aprobar uno se bajaba los trescientos. El dato ya se tiene: si acabo de
   poner «banco» en una fila y Appwrite ha dicho que sí, no hace falta
   preguntárselo otra vez. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const RETO = (i) => ({
  $id: 'r' + i, estado: 'cola', aula: 'aulaX', siteId: 'kaldros', branchId: 'sendero',
  estrato: 'recordar', materia: 'matematicas', skill: 'valor_posicional',
  question: 'q' + i, options: ['a', 'b', 'c', 'd'], answer: 0,
  hint1: 'p1', hint2: 'p2', explanation: 'e', comprobado: true
});

test('ninguna acción se baja la tabla entera', () => {
  const t = leer('js/teacher.js');
  assert.equal((t.match(/await cloudTraerRetos\(\)/g) || []).length, 0,
    'no queda ninguna recarga completa después de una acción');
  assert.match(t, /actualizarRetoEnCache\(/);
  assert.match(t, /quitarRetoDeCache\(/);
  assert.match(t, /añadirRetosACache\(/);
});

test('tocar una fila de la caché la recoloca en su pozo', () => {
  /* Si no se recolocara, aprobar un reto no lo metería en el banco hasta
     recargar la página: el docente lo aprueba y no aparece. */
  const c = cargarApp();
  const sitio = c.ev('ATLAS_CONFIG.sites')[0];
  const reto = Object.assign(RETO(1), { siteId: sitio.id, branchId: sitio.branches[0].id });
  c.ev('saveRetosCache')('aulaX', [reto]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));
  const banco = () => (c.ev('ATLAS_CONFIG.sites')[0].branches[0].bank || {}).recordar || [];
  assert.equal(banco().length, 0, 'en la cola no está en el banco');

  c.ev('actualizarRetoEnCache')('r1', { estado: 'banco' });
  assert.equal(banco().length, 1, 'aprobado, aparece en el pozo sin recargar nada');

  c.ev('quitarRetoDeCache')('r1');
  assert.equal(banco().length, 0);
});

test('la caché no se duplica al añadir lo mismo dos veces', () => {
  const c = cargarApp();
  c.ev('saveRetosCache')('aulaX', [RETO(1)]);
  assert.equal(c.ev('añadirRetosACache')([RETO(1), RETO(2)]), 1, 'solo entra el que no estaba');
  assert.equal(c.ev('retosEnCache')().length, 2);
});

test('tocar una fila que no existe no rompe ni inventa', () => {
  const c = cargarApp();
  c.ev('saveRetosCache')('aulaX', [RETO(1)]);
  assert.equal(c.ev('actualizarRetoEnCache')('noexiste', { estado: 'banco' }), false);
  assert.equal(c.ev('quitarRetoDeCache')('noexiste'), false);
  assert.equal(c.ev('retosEnCache')().length, 1);
});

test('el modo en bloque no repinta el panel en cada reto', () => {
  /* Repintar el panel entero después de cada uno de los diez sería tirar el
     trabajo que se acaba de ahorrar. */
  const t = leer('js/teacher.js');
  assert.match(t, /async function aprobarRetoCallado\(id\)/);
  assert.match(t, /async function descartarRetoCallado\(id\)/);
  const i = t.indexOf('async function aprobarRetoCallado(id)');
  const cuerpo = t.slice(i, t.indexOf('\n}', i));
  assert.ok(!/renderTeacherConfig\(\)/.test(cuerpo), 'la versión callada no pinta');
  assert.ok(!/iaEstado =/.test(cuerpo), 'ni escribe estado: lo cuenta quien la llama');
});

test('aprobar en bloque valida cada uno, como si fuera de uno en uno', () => {
  /* Marcar diez y darle a aprobar no puede ser una puerta de atrás que se
     salte el validador. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('async function aprobarRetoCallado(id)');
  const cuerpo = t.slice(i, t.indexOf('\n}', i));
  assert.match(cuerpo, /if \(!validarRetoIA\(c, \{ materia: c\.materia \}\)\.ok\) return false;/);
});

test('lo que falla en un bloque sigue en la cola, y se dice cuánto', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf('const enBloque = async');
  const cuerpo = t.slice(i, i + 900);
  assert.match(cuerpo, /if \(ok\) \{ hechos\+\+; iaMarcados\.delete\(ids\[i\]\); \} else fallos\+\+;/,
    'solo se desmarca lo que salió bien');
  assert.match(cuerpo, /sin poder: siguen en la cola/);
});

test('la marca no sobrevive a cerrar la app', () => {
  /* Una selección de ayer al volver mañana es peor que ninguna: se aprueba
     algo que ya no se recuerda haber marcado. */
  const t = leer('js/teacher.js');
  assert.match(t, /let iaMarcados = new Set\(\);/);
  assert.ok(!/setTeacherConfig\('iaMarcados'/.test(t), 'no se guarda en los ajustes');
});

test('mover un reto cambia pozo o estrato, y nada más', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf('const mover = async (id, campos)');
  const cuerpo = t.slice(i, i + 700);
  assert.match(cuerpo, /cloudActualizarReto\(c\.\$id, campos\)/);
  assert.match(cuerpo, /actualizarRetoEnCache\(c\.\$id, campos\)/, 'sin traerse la tabla');
  assert.match(t, /const \[siteId, branchId\] = String\(e\.target\.value\)\.split\('\/'\)/);
});

test('el desplegable de estrato avisa de lo que NO hace', () => {
  /* Un enunciado escrito para reconocer no se convierte en uno de encontrar
     el error por ponerle otra etiqueta. Mover retos «para rellenar Analizar»
     estropea justo lo que hace útil el diagnóstico. */
  const t = leer('js/teacher.js');
  assert.match(t, /no se convierte\s*\n?\s*en uno de encontrar el error por ponerle otra etiqueta/);
  assert.match(t, /no para rellenar un estrato vacío/);
});
