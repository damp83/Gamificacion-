/* Consulta: el docente ve el cuaderno de un alumno sin tocarlo.
   Lo que se prueba aquí no es que se vea —eso se ve— sino que MIRAR no deje
   rastro. En una plataforma que promete que nada se pierde ni se falsea, que
   abrir el cuaderno de un niño le cambie el diario es justo lo que no puede
   pasar. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Deja en el equipo el diario de una alumna que ya ha jugado. */
function conDiarioDeVega() {
  const ctx = cargarApp();
  ctx.ev('openDiary')('Vega Serrano', 4);
  ctx.ev('rolloverIfNeeded()');
  ctx.ev('startMission')('numeracion', 'recordar');
  ctx.ev('while (mission) { answerQuestion(mission.current.answer); if (!advance()) break; }');
  ctx.ev('finishMission()');
  ctx.ev('closeDiary()');
  return ctx;
}

/* Retrato del diario tal y como está GUARDADO, para comparar antes y después. */
const foto = (ctx, clave) => JSON.stringify(ctx.ev(`loadDiaries()[${JSON.stringify(clave || 'vega serrano')}]`));

test('abrir el cuaderno de un alumno no le cambia el diario', () => {
  const ctx = conDiarioDeVega();
  const antes = foto(ctx);

  assert.ok(ctx.ev('abrirDiarioLectura')('Vega Serrano'));
  assert.equal(ctx.ev('enModoLectura()'), true);
  assert.equal(ctx.ev('S.profile.explorer_name'), 'Vega Serrano');

  assert.equal(foto(ctx), antes, 'ni una coma, ni siquiera updated_at');
});

test('en consulta, saveState() no escribe aunque se le llame', () => {
  /* Es la barrera de fondo: aguanta aunque alguien añada mañana una pantalla
     que guarde sin acordarse de comprobar el modo. */
  const ctx = conDiarioDeVega();
  const antes = foto(ctx);
  ctx.ev('abrirDiarioLectura')('Vega Serrano');

  ctx.ev('S.progression.doubloons_balance = 99999;');
  ctx.ev('S.progression.xp_total = 99999;');
  ctx.ev('saveState()');

  assert.equal(foto(ctx), antes, 'lo guardado sigue intacto');
});

test('no se puede jugar por el alumno', () => {
  const ctx = conDiarioDeVega();
  ctx.ev('abrirDiarioLectura')('Vega Serrano');
  assert.equal(ctx.ev('startMission')('numeracion', 'recordar'), null);
  assert.equal(ctx.ev('startGuardian')('numeracion'), null);
});

test('no se puede gastar del bolsillo del niño', () => {
  const ctx = conDiarioDeVega();
  ctx.ev('abrirDiarioLectura')('Vega Serrano');
  ctx.ev('S.progression.doubloons_balance = 500;');

  assert.equal(ctx.ev('buyItem')('sombrero_ala_ancha').ok, false);
  assert.equal(ctx.ev('donateToFund')(50).ok, false);
  assert.equal(ctx.ev('awardBehavior')('ayudar').ok, false);
  assert.equal(ctx.ev('crearReto')({
    question: 'Una pregunta larga de prueba', options: ['a', 'b', 'c', 'd'], answer: 0
  }).ok, false);
  assert.equal(ctx.ev('toggleEquip')('sombrero_ala_ancha'), false);
});

test('mirar no le regala el desembarco del día', () => {
  /* El turno de clase dirigida llama a rolloverIfNeeded() a propósito, que da
     15 doblones. Consultar NO puede pasar por ahí: sería regalárselos a quien
     ni ha tocado la tablet. */
  const ctx = cargarApp();
  ctx.ev('openDiary')('Nilo', 4);
  ctx.ev('closeDiary()');
  const antes = foto(ctx, 'nilo');
  const doblonesAntes = ctx.ev("loadDiaries()['nilo'].progression.doubloons_balance");

  ctx.ev('abrirDiarioLectura')('Nilo');
  assert.equal(ctx.ev('S.daily.first_login_bonus_given'), false, 'no se ha disparado el desembarco');
  ctx.ev('cerrarLectura()');

  assert.equal(ctx.ev("loadDiaries()['nilo'].progression.doubloons_balance"), doblonesAntes,
    'ni un doblón de más por haber mirado');
  assert.equal(foto(ctx, 'nilo'), antes, 'el diario entero, igual que estaba');
});

test('salir de la consulta devuelve el equipo a como estaba', () => {
  const ctx = conDiarioDeVega();
  ctx.ev('abrirDiarioLectura')('Vega Serrano');
  ctx.ev('cerrarLectura()');

  assert.equal(ctx.ev('enModoLectura()'), false);
  assert.equal(ctx.ev('diarioActivo'), null);
  /* Y a partir de aquí se vuelve a poder escribir con normalidad */
  ctx.ev('openDiary')('Vega Serrano', 4);
  ctx.ev('S.progression.doubloons_balance = 777;');
  ctx.ev('saveState()');
  assert.equal(ctx.ev("loadDiaries()['vega serrano'].progression.doubloons_balance"), 777);
});

test('consultar a un alumno que no está en el equipo no rompe nada', () => {
  const ctx = cargarApp();
  assert.equal(ctx.ev('abrirDiarioLectura')('Nadie'), null);
  assert.equal(ctx.ev('enModoLectura()'), false, 'no se queda a medias en modo consulta');
});

/* ── Con el alumnado en su propio dispositivo ──
   La vista de clase baja solo el resumen (<1 KB), así que el diario entero no
   está en este equipo. Los dos botones que lo necesitan —ver el cuaderno y el
   informe para la familia— dependían de que estuviera, así que en el modo en
   que el alumnado entra con su cuenta no aparecían nunca. */
function docenteConNube(doc) {
  const ctx = cargarApp();
  ctx.Appwrite = { Query: { limit: () => ({}) } };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  CLOUD.db = { getDocument: async () => { if (doc instanceof Error) throw doc; return doc; } };
  return ctx;
}

test('el diario de un alumno se trae de la nube cuando no está aquí', async () => {
  const ctx = cargarApp();
  const estado = ctx.ev('defaultState')('Nadia Roca');
  const dctx = docenteConNube({ state: JSON.stringify(estado), name: 'Nadia Roca' });

  const r = await dctx.ev('diarioCompletoDe')('alu7');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Nadia Roca');
  assert.equal(r.estado.profile.explorer_name, 'Nadia Roca');
});

test('lo local gana: no se pide a la red lo que ya está aquí', async () => {
  /* En clase dirigida los diarios viven en el equipo. Salir a la red por cada
     ficha sería gastar la red del centro en algo que ya se tiene. */
  const ctx = docenteConNube(new Error('no debería llamarse'));
  ctx.ev('saveDiaries')({ 'vega serrano': ctx.ev('defaultState')('Vega Serrano') });
  const r = await ctx.ev('diarioCompletoDe')('vega serrano');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Vega Serrano');
});

test('sin permiso para leerlo, se dice dónde mirar', async () => {
  const ctx = docenteConNube(new Error('User (role: guest) missing scope / not authorized'));
  const r = await ctx.ev('diarioCompletoDe')('alu7');
  assert.equal(r.ok, false);
  assert.match(r.texto, /Comprobar la conexión/);
});

test('consultar un diario traído de la nube tampoco lo toca', async () => {
  /* La garantía de siempre, ahora también por este camino: mirar no escribe. */
  const ctx = cargarApp();
  const estado = ctx.ev('defaultState')('Nadia Roca');
  ctx.__st = estado;
  assert.ok(ctx.ev('abrirEstadoEnLectura(__st, "Nadia Roca")'));
  assert.equal(ctx.ev('enModoLectura()'), true);
  assert.equal(ctx.ev('S.profile.explorer_name'), 'Nadia Roca');

  ctx.ev('S.progression.doubloons_balance = 99999');
  ctx.ev('saveState()');
  assert.deepEqual(Object.keys(ctx.ev('loadDiaries()')), [], 'no ha guardado nada en este equipo');
});
