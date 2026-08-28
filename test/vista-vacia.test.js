/* La vista de clase cuando todavía no ha empezado nadie. Es el primer momento
   en que un docente la abre, y era justo el peor: un «no hay ningún diario» a
   secas, la cabecera «Cuadrillas» flotando sin nada debajo, y ni una palabra
   sobre qué hacer a continuación. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function claseSinEmpezar(modo) {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('className', '4.º A');
  ctx.ev('setTeacherConfig')('sessionMode', modo || 'docente');
  ctx.ev('setTeacherConfig')('roster', [
    { name: 'Vega Serrano' }, { name: 'Nilo Ferrer' },
    { name: 'Mara Ibáñez' }, { name: 'Hugo Gil' }
  ]);
  return ctx;
}

test('con la lista puesta y sin diarios, se sabe quién falta', () => {
  const ctx = claseSinEmpezar();
  const d = ctx.ev('buildClassOverview')([], ctx.ev('todayStr()'));

  assert.equal(d.students.length, 0);
  assert.equal(d.enLista, 4);
  assert.equal(d.deLaLista, 0);
  assert.equal(d.missing.length, 4, 'los cuatro tienen que aparecer como pendientes');
  assert.deepEqual(d.missing.map(m => m.name).sort(),
    ['Hugo Gil', 'Mara Ibáñez', 'Nilo Ferrer', 'Vega Serrano']);
});

test('las cuadrillas se calculan aunque no haya ni un diario', () => {
  /* La cabecera «Cuadrillas» es marcado fijo: si no se pinta nada debajo, se
     queda flotando. Los datos estaban; lo que fallaba era el pintado. */
  const ctx = claseSinEmpezar();
  const d = ctx.ev('buildClassOverview')([], ctx.ev('todayStr()'));
  assert.equal(d.teams.length, 3);
  assert.ok(d.teams.every(t => t.members === 0 && t.contribution === 0));
});

test('en clase dirigida NO se manda al docente a crear cuentas', () => {
  /* En ese modo el diario nace al dar el turno: decirle que cree cuentas es
     mandarlo a un callejón sin salida. */
  const ctx = claseSinEmpezar('docente');
  ctx.ev('classData = buildClassOverview([], todayStr());');
  const html = ctx.ev('pendientesHtml(classData)');

  assert.match(html, /turno/i);
  assert.match(html, /Dirigir la clase/);
  assert.doesNotMatch(html, /Crear las cuentas/, 'en clase dirigida no hacen falta cuentas');
});

test('con el alumnado en su dispositivo sí se le manda a crear cuentas', () => {
  const ctx = claseSinEmpezar('alumno');
  ctx.ev('CLOUD.enabled = true; CLOUD.user = { $id: "d1" };');
  ctx.ev('classData = buildClassOverview([], todayStr());');
  const html = ctx.ev('pendientesHtml(classData)');

  assert.match(html, /cuenta/i);
  assert.doesNotMatch(html, /Dirigir la clase/);
});

test('un nombre de cuadrilla que no está en la lista se sigue señalando como errata', () => {
  const ctx = claseSinEmpezar('docente');
  ctx.ev(`setTeacherConfig('teams', { enabled: true, goalTarget: 2000, contributionRate: 0.1,
    list: [{ id: 't1', name: 'Cuadrilla del Cóndor', icon: '🦅', members: ['Vega Serano'] }] });`);
  ctx.ev('classData = buildClassOverview([], todayStr());');
  const html = ctx.ev('pendientesHtml(classData)');
  assert.match(html, /errata/i, 'apellido mal escrito: eso sí es un aviso');
});

test('sin lista y sin diarios se dice qué falta, no un hueco', () => {
  const ctx = cargarApp();
  const d = ctx.ev('buildClassOverview')([], ctx.ev('todayStr()'));
  assert.equal(d.missing.length, 0);
  assert.equal(d.enLista, 0);
});
