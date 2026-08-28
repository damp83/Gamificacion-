/* El sello semanal. El PRD §6 pide que «la constancia compre aprendizaje, no
   solo sellos», así que un día solo cuenta como activo si se ha excavado. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function conDiario() {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  return ctx;
}

test('abrir la app no marca el día como activo', () => {
  const ctx = conDiario();
  ctx.ev('rolloverIfNeeded()');
  ctx.ev('rolloverIfNeeded()');
  assert.equal(ctx.ev('S.logbook.active_days_this_week').length, 0,
    'abrir y cerrar tres días estampaba el sello sin responder a nada');
});

test('terminar una excavación sí lo marca', () => {
  const ctx = conDiario();
  ctx.ev('rolloverIfNeeded()');
  ctx.ev('logSessionMission')(8);
  assert.deepEqual(ctx.ev('S.logbook.active_days_this_week'), [ctx.ev('todayStr()')]);
});

test('dos excavaciones el mismo día siguen siendo un día', () => {
  const ctx = conDiario();
  ctx.ev('logSessionMission')(5);
  ctx.ev('logSessionMission')(5);
  ctx.ev('logSessionMission')(5);
  assert.equal(ctx.ev('S.logbook.active_days_this_week').length, 1);
});

test('el sello se estampa con tres días excavados y no con menos', () => {
  for (const [dias, esperado] of [[2, false], [3, true], [5, true]]) {
    const ctx = conDiario();
    ctx.ev(`S.logbook.week_id = '2020-W01';
            S.logbook.active_days_this_week = ${JSON.stringify(
              Array.from({ length: dias }, (_, i) => `2020-01-0${i + 1}`))};`);
    const ev = ctx.ev('rolloverIfNeeded()');
    assert.equal(ev.weekStamped, esperado, `con ${dias} días activos`);
  }
});

test('los sellos ganados no se borran nunca al romper la racha', () => {
  const ctx = conDiario();
  ctx.ev(`S.logbook.stamps_lifetime = 7;
          S.logbook.current_weeks = 4;
          S.logbook.free_rope_used_this_week = true;
          S.logbook.rescue_ropes = 0;
          S.logbook.week_id = '2020-W01';
          S.logbook.active_days_this_week = ['2020-01-01'];`);
  const ev = ctx.ev('rolloverIfNeeded()');
  assert.equal(ev.weekLost, true, 'la racha se corta');
  assert.equal(ctx.ev('S.logbook.current_weeks'), 0);
  assert.equal(ctx.ev('S.logbook.stamps_lifetime'), 7, 'los sellos JAMÁS se borran');
});
