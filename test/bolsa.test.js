/* En clase el niño pide en voz alta —«me compro el sombrero», «dono diez al
   Fondo»— y hasta ahora tenía que entrar en la app para hacerlo él. Con
   veinticinco críos eso es la sesión esperando turnos de tablet. Lo que se
   prueba aquí es que hacerlo el docente sea EXACTAMENTE lo mismo: mismas
   reglas, mismo bolsillo, y sobre el diario del niño y no sobre otro. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Un equipo de clase dirigida con el diario de una alumna con doblones. */
function claseConVega(saldo) {
  const ctx = cargarApp();
  ctx.ev('openDiary')('Vega Serrano', 4);
  ctx.ev('S.progression.doubloons_balance = ' + (saldo === undefined ? 500 : saldo));
  ctx.ev('saveState()');
  ctx.ev('closeDiary()');
  return ctx;
}
const bolsa = (ctx, quien) => ctx.ev(`loadDiaries()[${JSON.stringify(quien || 'vega serrano')}]`);

test('la compra sale de la bolsa del alumno, no de la del equipo', () => {
  const ctx = claseConVega(500);
  const item = ctx.ev('shopCatalog()')[0];

  ctx.ev('openDiary')('Vega Serrano', 4);
  const r = ctx.ev('buyItem')(item.id);
  ctx.ev('closeDiary()');

  assert.equal(r.ok, true);
  assert.equal(bolsa(ctx).progression.doubloons_balance, 500 - item.cost);
  assert.equal(ctx.ev('localStorage.getItem(STORAGE_KEY)'), null,
    'el diario propio del equipo no existe siquiera: nada se le ha cargado a él');
});

test('donar por él sale de su bolsa y le consta a él', () => {
  const ctx = claseConVega(100);
  ctx.ev('openDiary')('Vega Serrano', 4);
  const r = ctx.ev('donateToFund')(25);
  ctx.ev('closeDiary()');

  assert.equal(r.ok, true);
  assert.equal(bolsa(ctx).progression.doubloons_balance, 75);
  assert.equal(bolsa(ctx).progression.fund_donated, 25);
});

test('ni comprar ni donar tocan sus PE', () => {
  /* La regla de fondo del PRD: no se compra aprendizaje ni se pierde. Que lo
     haga el docente en vez del niño no puede abrir esa puerta. */
  const ctx = claseConVega(500);
  ctx.ev('openDiary')('Vega Serrano', 4);
  const pe = ctx.ev('S.progression.xp_total');
  ctx.ev('buyItem')(ctx.ev('shopCatalog()')[0].id);
  ctx.ev('donateToFund')(10);
  assert.equal(ctx.ev('S.progression.xp_total'), pe);
  ctx.ev('closeDiary()');
});

test('sin doblones suficientes no se compra ni se queda a deber', () => {
  const ctx = claseConVega(1);
  ctx.ev('openDiary')('Vega Serrano', 4);
  const item = ctx.ev('shopCatalog()')[0];
  const r = ctx.ev('buyItem')(item.id);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-coins');
  assert.equal(ctx.ev('S.progression.doubloons_balance'), 1, 'su bolsa no se mueve');
  assert.equal(ctx.ev('donateToFund')(5).reason, 'sin-fondos');
  ctx.ev('closeDiary()');
});

test('cada compra va al diario de su dueño, no se mezclan', () => {
  /* El error que más caro sale en un aula: comprarle a Nilo con la bolsa de
     Vega porque quedó abierto el diario anterior. */
  const ctx = claseConVega(500);
  ctx.ev('openDiary')('Nilo Ferrer', 4);
  ctx.ev('S.progression.doubloons_balance = 500');
  ctx.ev('saveState()');
  ctx.ev('closeDiary()');

  const item = ctx.ev('shopCatalog()')[0];
  ctx.ev('openDiary')('Nilo Ferrer', 4);
  ctx.ev('buyItem')(item.id);
  ctx.ev('closeDiary()');

  assert.equal(bolsa(ctx, 'nilo ferrer').progression.doubloons_balance, 500 - item.cost);
  assert.equal(bolsa(ctx, 'vega serrano').progression.doubloons_balance, 500, 'a Vega no se le toca');
});

test('el diario vuelve al documento del que vino, no a uno derivado del nombre', () => {
  /* Un diario puede vivir en dos ids distintos: el derivado del nombre (clase
     dirigida) o el de la cuenta del alumno (entró él). Sin recordarlo, lo que
     el docente le compre acaba en un SEGUNDO documento y el niño no lo ve. */
  const ctx = cargarApp();
  const enviados = [];
  ctx.Appwrite = {
    Query: { equal: () => ({}), limit: () => ({}), cursorAfter: () => ({}) },
    Permission: { read: () => ({}), update: () => ({}), delete: () => ({}) },
    Role: { user: () => ({}) }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios'; c.aulasCollectionId = 'aulas';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  CLOUD.db = {
    updateDocument: async (db, col, id) => { enviados.push(id); return {}; },
    createDocument: async (db, col, id) => { enviados.push(id); return {}; }
  };
  ctx.ev('setAulaActiva')('aula-A', '4.º B');

  /* Llega de la nube el diario que creó el propio alumno, con SU id */
  const estado = ctx.ev('defaultState')('Vega Serrano');
  ctx.__entrantes = [{ $id: 'alu7', state: JSON.stringify(estado) }];
  ctx.ev('fusionarDiarios(__entrantes)');
  assert.equal(ctx.ev('docIdConocido')('vega serrano'), 'alu7');

  ctx.__st = estado;
  return ctx.ev('cloudPushDiario("vega serrano", __st)').then(() => {
    assert.deepEqual(enviados, ['alu7'], 'al suyo, no a uno nuevo');
  });
});

test('un diario nacido en este equipo sigue yendo a su id de siempre', () => {
  /* Clase dirigida sin cuentas: nadie ha traído un id, y el derivado del
     nombre es el que hace que el mismo niño escrito desde dos equipos caiga
     en el mismo documento. */
  const ctx = cargarApp();
  const enviados = [];
  ctx.Appwrite = {
    Permission: { read: () => ({}), update: () => ({}), delete: () => ({}) },
    Role: { user: () => ({}) }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios'; c.aulasCollectionId = 'aulas';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  CLOUD.db = { updateDocument: async (db, col, id) => { enviados.push(id); return {}; } };
  ctx.ev('setAulaActiva')('aula-A', '4.º B');

  ctx.__st = ctx.ev('defaultState')('Vega Serrano');
  return ctx.ev('cloudPushDiario("vega serrano", __st)').then(() => {
    assert.equal(enviados[0], ctx.ev('docIdDiario')('aula-A', 'vega serrano'));
  });
});

test('cerrar la clase olvida también de dónde vino cada diario', () => {
  /* Si no, al abrir otra clase un nombre repetido escribiría en el documento
     de la clase anterior. */
  const ctx = cargarApp();
  ctx.__entrantes = [{ $id: 'alu7', state: JSON.stringify(ctx.ev('defaultState')('Vega Serrano')) }];
  ctx.ev('fusionarDiarios(__entrantes)');
  ctx.ev('cerrarAula()');
  assert.equal(ctx.ev('docIdConocido')('vega serrano'), '');
});
