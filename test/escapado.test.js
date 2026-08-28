/* Que el texto que escribe una persona no pueda convertirse en marcado.
   El caso que importa: el nombre de explorador y el resumen los sube el
   cliente DEL ALUMNO, y la vista de clase los pinta en el navegador del
   docente, con su sesión de Appwrite abierta. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const esc = ev('esc');
const ATAQUE = '<img src=x onerror="robar()">';

test('esc() neutraliza los cinco caracteres que abren marcado', () => {
  assert.equal(esc('<'), '&lt;');
  assert.equal(esc('>'), '&gt;');
  assert.equal(esc('&'), '&amp;');
  assert.equal(esc('"'), '&quot;');
});

test('esc() deja el resultado sin ninguna etiqueta que el navegador pueda abrir', () => {
  assert.doesNotMatch(esc(ATAQUE), /<[a-zA-Z/]/);
});

test('esc() no toca lo que no hace falta: el docente ve su texto tal cual', () => {
  /* El escapado se deshace al pintarlo; lo que no puede pasar es que se
     escape dos veces y el alumno lea «&amp;» en el nombre del yacimiento. */
  assert.equal(esc('Ruinas de Kaldros'), 'Ruinas de Kaldros');
  assert.equal(esc('Áng€l · 3.º B'), 'Áng€l · 3.º B');
});

test('esc() aguanta null, undefined y números sin reventar', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(42), '42');
});

test('un resumen hostil llega saneado a la ficha del alumno', () => {
  const ficha = ev('buildClassOverview')([{
    id: 'x1',
    name: ATAQUE,
    summary: { v: 1, xp: 100, level: ATAQUE, merits: ATAQUE, mastered: ATAQUE,
               minutes7: ATAQUE, stuck: [ATAQUE], lastSeen: ATAQUE, avgMastery: ATAQUE }
  }], '2026-08-28').students[0];

  /* Los números vienen del cliente del alumno: si no se convierten, una
     cadena con marcado dentro se cuela entera en la plantilla. */
  for (const campo of ['level', 'merits', 'mastered', 'minutes7', 'avgMastery']) {
    assert.equal(typeof ficha[campo], 'number', `${campo} debería ser número`);
    assert.ok(Number.isFinite(ficha[campo]), `${campo} debería ser finito`);
  }
  /* El nombre y los textos siguen siendo texto, pero acotados y escapables */
  assert.ok(ficha.name.length <= 64);
  assert.doesNotMatch(esc(ficha.name), /<[a-zA-Z/]/);
  assert.doesNotMatch(esc(ficha.stuck.join(' · ')), /<[a-zA-Z/]/);
});

test('una lista de atascos larguísima no puede llenar la pantalla del docente', () => {
  const ficha = ev('buildClassOverview')([{
    id: 'x1', name: 'Vega',
    summary: { v: 1, xp: 10, stuck: Array(500).fill('x'.repeat(400)) }
  }], '2026-08-28').students[0];
  assert.ok(ficha.stuck.length <= 12, 'como mucho doce entradas');
  assert.ok(ficha.stuck.every(x => x.length <= 80), 'cada una acotada');
});

test('un resumen que no es lo que dice ser no tumba la vista de clase', () => {
  const d = ev('buildClassOverview')([
    { id: 'a', name: 'Ana', summary: { v: 1, stuck: 'no soy una lista', accuracy: 'ni yo un número' } },
    { id: 'b', name: 'Bru', summary: { v: 1 } }
  ], '2026-08-28');
  assert.equal(d.students.length, 2);
  assert.ok(Array.isArray(d.students[0].stuck));
  /* Un valor ilegible es «no se sabe», no «0 %»: pintar 0 % levantaría una
     alerta de rescate a un alumno que a lo mejor va perfectamente. */
  assert.equal(d.students[0].accuracy, null);
  assert.ok(!d.students[0].signals.includes('fuera del canal de flujo'));
});
