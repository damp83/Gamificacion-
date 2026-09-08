/* Dar de alta a un alumno son DOS cosas y ocurren en dos momentos: el panel
   crea la CUENTA, y el diario lo crea el niño la primera vez que entra.

   No puede ser de otra forma. El panel intentaba crear también el diario, ya
   con su clase y su dueño, y Appwrite lo rechazaba: solo deja repartir
   permisos que uno mismo tiene, y el docente no es el alumno. Crearlo con los
   permisos del docente a secas habría sido peor —el niño no podría ni leer su
   propio diario—, así que el panel lo ADOPTA después: le pone `aula` y
   `owner` al que ya existe. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function panelDeDocente({ diario, fallaEscritura } = {}) {
  const ctx = cargarApp();
  const escritos = [];
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
    createDocument: async (db, col, id, data, permisos) => { escritos.push({ id, data, permisos, creado: true }); return { $id: id }; },
    updateDocument: async (db, col, id, data) => {
      if (fallaEscritura) throw new Error(fallaEscritura);
      escritos.push({ id, data });
      return { $id: id };
    },
    getDocument: async (db, col, id) => {
      if (!diario) throw new Error('Document with the requested ID could not be found.');
      return Object.assign({ $id: id }, diario);
    },
    listDocuments: async () => ({ documents: [], total: 0 })
  };
  ctx.ev('setAulaActiva')('aula-A', '4.º B');
  return { ctx, escritos };
}

test('vincular le pone a su diario esta clase y este docente', async () => {
  const { ctx, escritos } = panelDeDocente({ diario: { $id: 'alu9', name: 'Gero Prats' } });
  const r = await ctx.ev('cloudVincularDiario')('alu9');

  assert.equal(r.ok, true);
  assert.equal(r.cambiado, true);
  assert.equal(escritos.length, 1);
  assert.equal(escritos[0].id, 'alu9', 'el documento del alumno es el de su cuenta');
  assert.equal(escritos[0].data.aula, 'aula-A');
  assert.equal(escritos[0].data.owner, 'docente1');
  assert.ok(!('state' in escritos[0].data), 'no se toca lo que el niño lleve jugado');
});

test('el que ya estaba en su sitio no se vuelve a escribir', async () => {
  /* Se pulsa cada vez que entra alguien nuevo: reescribir los veinte diarios
     cada vez sería gastar la red del centro y mover la fecha de todos. */
  const { ctx, escritos } = panelDeDocente({
    diario: { $id: 'alu9', aula: 'aula-A', owner: 'docente1' }
  });
  const r = await ctx.ev('cloudVincularDiario')('alu9');
  assert.equal(r.ok, true);
  assert.equal(r.cambiado, false);
  assert.equal(escritos.length, 0);
});

test('quien no ha entrado todavía no es un error', async () => {
  /* Es lo normal el día que se crean las cuentas: se reparte la hoja y aún no
     ha entrado nadie. Decirlo como fallo mandaría a buscar un problema. */
  const { ctx } = panelDeDocente();          /* sin diario: getDocument falla */
  const r = await ctx.ev('cloudVincularDiario')('alu9');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sin-estrenar');
});

test('sin permiso de escritura se dice cuál falta, no «error»', async () => {
  /* Es el paso que se olvida al montar Appwrite: el equipo docentes con Read
     pero sin Update. Sin este aviso, «vincular» falla sin decir qué mirar. */
  const { ctx } = panelDeDocente({
    diario: { $id: 'alu9' },
    fallaEscritura: 'The current user is not authorized to perform the requested action.'
  });
  const r = await ctx.ev('cloudVincularDiario')('alu9');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sin-permiso');
});

test('una columna que falta se nombra, no se traga', async () => {
  /* Pasó de verdad: la columna estaba escrita «ower» en la consola. */
  const { ctx } = panelDeDocente({
    diario: { $id: 'alu9' },
    fallaEscritura: 'Invalid document structure: Unknown attribute: "owner"'
  });
  const r = await ctx.ev('cloudVincularDiario')('alu9');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'falta-columna');
  assert.match(r.detail, /owner/);
});

test('sin clase abierta se ata igual al docente', async () => {
  /* Un solo docente sin la colección de aulas: el aislamiento no hace falta,
     pero saber de quién es cada diario sí. */
  const { ctx, escritos } = panelDeDocente({ diario: { $id: 'alu9' } });
  ctx.ev('setAulaActiva')('', '');
  const r = await ctx.ev('cloudVincularDiario')('alu9');
  assert.equal(r.ok, true);
  assert.equal(escritos[0].data.owner, 'docente1');
  assert.ok(!('aula' in escritos[0].data));
});

test('el panel no intenta crear el diario del alumno', async () => {
  /* Es el fallo que costó entender: Appwrite responde «Permissions must be
     one of: (any, users, user:<el docente>…)» porque nadie puede dar un
     permiso que no tiene. Si alguien vuelve a escribir esa llamada, esto lo
     para antes de que llegue a un aula. */
  const fs = require('node:fs');
  const path = require('node:path');
  const cloud = fs.readFileSync(path.join(__dirname, '..', 'js', 'cloud.js'), 'utf8');
  const teacher = fs.readFileSync(path.join(__dirname, '..', 'js', 'teacher.js'), 'utf8');
  assert.ok(!/cloudCrearDiarioDe/.test(cloud + teacher), 'la creación desde el panel no vuelve');
  const i = cloud.indexOf('async function cloudVincularDiario');
  assert.ok(!/createDocument/.test(cloud.slice(i, i + 2000)), 'vincular solo actualiza');
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
  assert.equal(enviados[0].id, 'alu9', 'guarda en SU documento, el mismo que el panel vincula');
  assert.deepEqual(Object.keys(enviados[0].data).sort(), ['name', 'state', 'summary'],
    'no manda «aula» ni «owner»: lo que no se manda, no se pisa');
});

test('tener diario y haber empezado dejan de contarse igual', () => {
  /* Un diario existe desde que el niño entra, pero también puede existir sin
     estrenar —restaurado de una copia, o creado y abandonado—, y contar
     documentos decía «2 de 2 han empezado» de quien no había jugado nunca. */
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
