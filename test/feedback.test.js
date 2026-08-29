/* El aviso de acierto/fallo llega con retardo —medio segundo largo, para que
   el niño vea moverse la losa antes de que le tapen la pantalla— y en ese
   rato la misión puede haberse acabado: el crío toca «Mapa», o el docente
   pulsa «Terminar turno». El aviso llegaba entonces a una misión que ya no
   existía. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function enMision() {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega Serrano');
  ctx.ev('startMission')('numeracion', 'recordar');
  return ctx;
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

test('el aviso no se pinta si la misión se abandonó mientras esperaba', async () => {
  const ctx = enMision();
  ctx.__pintado = 0;
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  ctx.ev('abandonMission()');
  await esperar(80);
  assert.equal(ctx.__pintado, 0, 'no se pinta sobre una misión que ya no existe');
});

test('tampoco si la misión terminó', async () => {
  const ctx = enMision();
  ctx.__pintado = 0;
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  ctx.ev('finishMission()');
  await esperar(80);
  assert.equal(ctx.__pintado, 0);
});

test('con la misión intacta, el aviso sí llega', async () => {
  /* El arreglo no puede comerse el caso normal, que es el 99 % de las veces. */
  const ctx = enMision();
  ctx.__pintado = 0;
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  await esperar(80);
  assert.equal(ctx.__pintado, 1);
});

test('el aviso de un turno no se pinta encima del turno siguiente', async () => {
  /* En clase dirigida el docente puede cortar el turno de un niño y empezar
     el del siguiente en ese medio segundo. Comprobar solo que HAY misión no
     bastaría: hay que comprobar que es la MISMA. */
  const ctx = enMision();
  ctx.__pintado = 0;
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  ctx.ev('abandonMission()');
  ctx.ev('openDiary')('Nilo Ferrer', 4);
  ctx.ev('startMission')('numeracion', 'recordar');
  await esperar(80);
  assert.equal(ctx.__pintado, 0, 'el aviso de Vega no aparece en el turno de Nilo');
  assert.ok(ctx.ev('!!mission'), 'y el turno de Nilo sigue vivo');
});

test('dos respuestas seguidas dejan un solo aviso pendiente', async () => {
  const ctx = enMision();
  ctx.__pintado = 0;
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  ctx.ev('programarFeedback(() => { __pintado++; }, 30)');
  await esperar(80);
  assert.equal(ctx.__pintado, 1, 'el primero se cancela, no se acumulan');
});
