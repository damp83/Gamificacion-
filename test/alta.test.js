/* Dar de alta a un alumno son DOS cosas, y hasta ahora era una. La cuenta se
   creaba desde el panel y el diario lo creaba después el niño desde su casa,
   donde no puede saber de qué clase es ni de quién: nacía con `aula` vacío,
   sin dueño y con permiso solo para él. El docente no lo veía y la clase no lo
   reconocía como suyo. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function panelDeDocente({ falla } = {}) {
  const ctx = cargarApp();
  const creados = [];
  ctx.Appwrite = {
    Query: { equal: () => ({}), limit: () => ({}), cursorAfter: () => ({}) },
    Permission: {
      read: r => ({ p: 'read', r }), update: r => ({ p: 'update', r }), delete: r => ({ p: 'delete', r })
    },
    Role: { user: id => `user:${id}`, users: () => 'users', team: t => `team:${t}` },
    ID: { unique: () => 'nuevo' }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios'; c.aulasCollectionId = 'aulas';

  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1', name: 'Diego' };
  CLOUD.db = {
    createDocument: async (db, col, id, data, permisos) => {
      if (falla) throw new Error(falla);
      creados.push({ id, data, permisos });
      return { $id: id };
    },
    updateDocument: async () => ({}),
    getDocument: async () => { throw new Error('no'); },
    listDocuments: async () => ({ documents: [], total: 0 })
  };
  ctx.ev('setAulaActiva')('aula-A', '4.º B');
  return { ctx, creados };
}

test('el diario nace con su clase y con su docente', async () => {
  const { ctx, creados } = panelDeDocente();
  const r = await ctx.ev('cloudCrearDiarioDe')('alu9', 'Gero Prats', 3);

  assert.equal(r.ok, true);
  assert.equal(creados.length, 1);
  assert.equal(creados[0].id, 'alu9', 'el id es el del alumno: es donde su app guardará luego');
  assert.equal(creados[0].data.aula, 'aula-A');
  assert.equal(creados[0].data.owner, 'docente1');
  assert.equal(creados[0].data.name, 'Gero Prats');
  assert.equal(JSON.parse(creados[0].data.state).profile.grade, 3, 'y con su curso');
});

test('lo lee y lo escribe el niño; lo ve su docente; borrarlo, solo el docente', () => {
  /* Un despiste de un crío no puede costarle el curso, y el docente tiene que
     poder verlo sin depender de ningún permiso de colección. */
  const { ctx, creados } = panelDeDocente();
  return ctx.ev('cloudCrearDiarioDe')('alu9', 'Gero Prats', 3).then(() => {
    const p = creados[0].permisos.map(x => `${x.p}:${x.r}`);
    assert.deepEqual(p.sort(), [
      'delete:user:docente1', 'read:user:alu9', 'read:user:docente1',
      'update:user:alu9', 'update:user:docente1'
    ]);
    assert.ok(!p.includes('delete:user:alu9'), 'el niño no puede borrarse el diario');
  });
});

test('sin clase abierta se crea igual, con su docente', async () => {
  /* Un solo docente sin la colección de aulas: el aislamiento no hace falta,
     pero verlo sí. */
  const { ctx, creados } = panelDeDocente();
  ctx.ev('setAulaActiva')('', '');
  const r = await ctx.ev('cloudCrearDiarioDe')('alu9', 'Gero Prats', 3);
  assert.equal(r.ok, true);
  assert.ok(!('aula' in creados[0].data));
  assert.equal(creados[0].data.owner, 'docente1');
});

test('una columna que falta se nombra, no se traga', async () => {
  /* Pasó de verdad: la columna estaba escrita «ower» en la consola. Sin este
     aviso, el alta parecía ir bien y el diario no se creaba nunca. */
  const { ctx } = panelDeDocente({ falla: 'Invalid document structure: Unknown attribute: "owner"' });
  const r = await ctx.ev('cloudCrearDiarioDe')('alu9', 'Gero', 3);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'falta-columna');
  assert.match(r.detail, /owner/);
});

test('si ya tiene diario no se pisa', async () => {
  const { ctx } = panelDeDocente({ falla: 'Document with the requested ID already exists' });
  const r = await ctx.ev('cloudCrearDiarioDe')('alu9', 'Gero', 3);
  assert.equal(r.reason, 'existe');
});

test('el alta devuelve el id de la cuenta, que es lo único que lo hace posible', async () => {
  const ctx = cargarApp();
  ctx.Appwrite = { ID: { unique: () => 'nuevo' } };
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.account = { create: async (id, email, pass, name) => ({ $id: 'alu9', name }) };
  const r = await ctx.ev('cloudCreateStudent')('Gero', 'gero', 'contrasena8');
  assert.equal(r.ok, true);
  assert.equal(r.id, 'alu9');
});

test('un diario sin estrenar no dice que se ha jugado hoy', async () => {
  /* «Última expedición: hoy» de un niño que no ha entrado nunca es peor que
     no decir nada: manda a buscar un problema donde no lo hay. */
  const ctx = cargarApp();
  const nuevo = ctx.ev('diarioSinEstrenar')('Gero', 3);
  const jugado = ctx.ev('defaultState')('Vega');

  assert.equal(ctx.ev('buildSummaryOf')(nuevo).lastSeen, null);
  assert.equal(ctx.ev('buildSummaryOf')(jugado).lastSeen, ctx.ev('todayStr()'));

  const d = ctx.ev('buildClassOverview')([
    { id: 'u1', name: 'Gero', summary: ctx.ev('buildSummaryOf')(nuevo) }
  ], ctx.ev('todayStr()'));
  assert.equal(d.students[0].lastSeen, null);
  assert.equal(d.students[0].activeDays, 0);
});

test('el primer arranque de verdad sí cobra su primer desembarco', () => {
  /* Quitarle la fecha del día no puede costarle al niño el bono de entrada:
     sin fecha, el arranque lo trata como día nuevo, que es justo lo que es. */
  const ctx = cargarApp();
  ctx.__st = ctx.ev('diarioSinEstrenar')('Gero', 3);
  ctx.ev('S = __st');
  const eventos = ctx.ev('rolloverIfNeeded()');
  assert.ok(eventos.firstLoginBonus > 0, 'cobra su primer desembarco');
  assert.equal(ctx.ev('S.daily.date'), ctx.ev('todayStr()'), 'y ya queda con fecha');
});

test('cuando el niño guarda, su clase y su docente siguen ahí', async () => {
  /* La otra mitad del arreglo, y la que lo desharía sin que se notara: si el
     guardado del alumno mandara el documento entero, borraría `aula` y
     `owner` en el primer turno que jugara. */
  const ctx = cargarApp();
  const enviados = [];
  ctx.Appwrite = {
    Permission: { read: () => ({}), update: () => ({}), delete: () => ({}) },
    Role: { user: () => ({}) }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'alu9' };
  CLOUD.db = {
    updateDocument: async (db, col, id, data) => { enviados.push({ id, data }); return {}; },
    createDocument: async () => ({})
  };
  ctx.__st = ctx.ev('diarioSinEstrenar')('Gero', 3);
  ctx.ev('S = __st');

  assert.equal(await ctx.ev('cloudPush()'), true);
  assert.equal(enviados[0].id, 'alu9', 'guarda en SU documento, el que creó el panel');
  assert.deepEqual(Object.keys(enviados[0].data).sort(), ['name', 'state', 'summary'],
    'no manda «aula» ni «owner»: lo que no se manda, no se pisa');
});

test('tener diario y haber empezado dejan de contarse igual', () => {
  /* Desde que el panel crea el diario con la cuenta, contar documentos decía
     «2 de 2 han empezado» de dos niños que no habían abierto la app nunca. */
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('roster', [{ name: 'Gero Prats' }, { name: 'Vega Serrano' }]);
  const sinEstrenar = ctx.ev('buildSummaryOf')(ctx.ev('diarioSinEstrenar')('Gero Prats', 3));
  const jugado = ctx.ev('buildSummaryOf')(ctx.ev('defaultState')('Vega Serrano'));

  const d = ctx.ev('buildClassOverview')([
    { id: 'u1', name: 'Gero Prats', summary: sinEstrenar },
    { id: 'u2', name: 'Vega Serrano', summary: jugado }
  ], ctx.ev('todayStr()'));

  assert.equal(d.deLaLista, 2, 'los dos tienen diario');
  assert.equal(d.empezados, 1, 'pero solo uno ha entrado');
  assert.equal(d.sinEstrenar, 1);
});
