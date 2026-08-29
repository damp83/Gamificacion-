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

/* ── Los cinco agujeros que encontró la auditoría ──
   Todos tenían la misma forma: texto que teclea el docente y que VIAJA a cada
   tablet dentro de los ajustes de la clase, pintado sin escapar. No hace
   falta un atacante para que duela —un nombre de clase con un «<» rompe la
   pantalla— pero con una cuenta de docente comprometida, la carga llega a la
   portada de veinticinco niños.

   Se comprueban sobre el código que se sirve, no sobre una copia: si alguien
   quita un esc() de esas líneas, esto se pone rojo. */
const fs = require('node:fs');
const path = require('node:path');
const LEER = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');

test("esc() también neutraliza la comilla simple", () => {
  assert.equal(esc("'"), '&#39;');
  assert.doesNotMatch(esc(`' onfocus='robar()`), /'/);
});

test('el nombre de la clase y el del docente se escapan en la portada', () => {
  const app = LEER('app.js');
  assert.match(app, /Clase de <strong>\$\{esc\(clase\)\}/);
  assert.match(app, /dirigida por <strong>\$\{esc\(nombre\)\}/);
});

test('el nombre de la clase se escapa en la vista general', () => {
  assert.match(LEER('aula.js'), /class-meta">\$\{clase \? esc\(clase\)/);
});

test('los miembros y la meta de la cuadrilla se escapan', () => {
  const play = LEER('play.js');
  assert.match(play, /team-member\$\{me \? ' team-me' : ''\}">\$\{me \? '🧭 ' : '🧒 '\}\$\{esc\(m\)\}/);
  assert.match(play, /<strong>\$\{esc\(t\.goalLabel\)\}<\/strong>/);
});

test('los iconos del campamento comprado se escapan', () => {
  /* Este solo se veía con el mueble YA comprado: por eso no salía mirando la
     pantalla, solo inyectando. */
  assert.match(LEER('play.js'), /campIcons = S\.inventory\.camp_items\.map\(id =>\s*esc\(/);
});

test('el PIN y los datos de Appwrite se escapan dentro de sus atributos', () => {
  const t = LEER('teacher.js');
  assert.match(t, /value="\$\{esc\(ATLAS_CONFIG\.teacherPin\)\}"/);
  for (const campo of ['cfg-aw-ep', 'cfg-aw-pid', 'cfg-aw-did', 'cfg-aw-cid']) {
    assert.match(t, new RegExp(`id="${campo}" value="\\$\\{esc\\(`), campo + ' sin escapar');
  }
});

test('lo que el docente publica para la clase viaja, y por eso hay que escaparlo', () => {
  /* La razón de que esto sea grave y no cosmético: className y teacherName
     salen de este equipo y entran en el de cada niño. */
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('className', ATAQUE);
  ctx.ev('setTeacherConfig')('teacherName', ATAQUE);
  const paquete = ctx.ev('configParaCompartir()');
  assert.equal(paquete.className, ATAQUE, 'viaja tal cual: el escapado va al pintar');
  assert.equal(paquete.teacherName, ATAQUE);
});

test('las contraseñas del alumnado NO viajan a las demás tablets', () => {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('roster', [{ name: 'Vega', username: 'vega', password: 'secreta123' }]);
  const paquete = ctx.ev('configParaCompartir()');
  assert.ok(!JSON.stringify(paquete).includes('secreta123'));
  assert.equal(paquete.roster[0].username, 'vega', 'el usuario sí, que hace falta');
});

test('ni el PIN ni los datos de conexión viajan', () => {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('teacherPin', '9876');
  const paquete = ctx.ev('configParaCompartir()');
  assert.equal(paquete.teacherPin, undefined);
  assert.equal(paquete.appwrite, undefined);
});
