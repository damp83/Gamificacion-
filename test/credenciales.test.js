/* Las contraseñas del alumnado, en los dos equipos del docente.

   Los ajustes de la clase viajan en un documento que puede leer cualquier
   alumno logueado (`read(Role.users())`), así que las contraseñas se le quitan
   antes de subirlo: meterlas ahí sería enseñarle a cada niño la de los demás.
   El efecto era que el segundo equipo del docente abría la hoja de
   credenciales en blanco, y lo que se hacía entonces era peor que quedarse sin
   ellas: generar otras. Cambiar el texto de la lista NO cambia la contraseña
   de la cuenta de Appwrite, así que esas nuevas no abren nada.

   De ahí este canal: un documento aparte, en la misma colección, con permisos
   solo para la cuenta del docente. Lo que estas pruebas fijan es lo que no
   puede fallar: que ningún alumno pueda leerlo, que un equipo que no las tiene
   no vacíe el del que sí, y que lo guardado nunca pise lo de aquí. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* Un contexto con la nube encendida y un almacén de documentos de mentira. */
function conNube({ roster = [], docs = {} } = {}) {
  const ctx = cargarApp();
  ctx.Appwrite = {
    Query: { equal: () => ({}), limit: () => ({}), select: () => ({}), cursorAfter: () => ({}) },
    Permission: { read: r => `read(${r})`, update: r => `update(${r})`, delete: r => `delete(${r})` },
    Role: { user: id => `user:${id}`, users: () => 'users' }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios'; c.aulasCollectionId = 'aulas';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  const almacen = { ...docs };
  const registro = [];
  CLOUD.db = {
    getDocument: async (db, col, id) => {
      if (!almacen[id]) { const e = new Error('Document with the requested ID could not be found.'); throw e; }
      return { $id: id, ...almacen[id] };
    },
    updateDocument: async (db, col, id, data, perms) => {
      if (!almacen[id]) throw new Error('Document with the requested ID could not be found.');
      registro.push({ op: 'update', id, data, perms });
      almacen[id] = { ...almacen[id], ...data };
      return { $id: id };
    },
    createDocument: async (db, col, id, data, perms) => {
      registro.push({ op: 'create', id, data, perms });
      almacen[id] = data;
      return { $id: id };
    },
    deleteDocument: async (db, col, id) => { registro.push({ op: 'delete', id }); delete almacen[id]; },
    listDocuments: async () => ({
      documents: Object.entries(almacen).map(([id, d]) => ({ $id: id, ...d })),
      total: Object.keys(almacen).length
    })
  };
  ctx.ev('setAulaActiva')('aula-A', '4.º A');
  ctx.ev('setTeacherConfig')('roster', roster);
  ctx.almacen = almacen;
  ctx.registro = registro;
  return ctx;
}

const CRED = 'aula-A-cred';
const guardado = ctx => JSON.parse(ctx.almacen[CRED].config).cred;

/* ── Lo que no puede leer un alumno ── */

test('el documento de credenciales solo lo puede leer la cuenta del docente', async () => {
  const ctx = conNube({ roster: [{ name: 'Vega', username: 'vega', password: 'colina2024' }] });
  await ctx.ev('cloudGuardarCredenciales()');
  const perms = ctx.registro[ctx.registro.length - 1].perms;
  assert.deepEqual(perms, ['read(user:docente1)', 'update(user:docente1)', 'delete(user:docente1)']);
});

test('en ningún caso lleva el rol `users`, que es el de cualquier alumno logueado', async () => {
  const ctx = conNube({ roster: [{ name: 'Vega', username: 'vega', password: 'colina2024' }] });
  await ctx.ev('cloudGuardarCredenciales()');
  for (const paso of ctx.registro) {
    for (const p of (paso.perms || [])) assert.ok(!/\busers\b/.test(p), `permiso de más: ${p}`);
  }
});

test('el documento del aula, que sí leen los alumnos, no lleva la lista', () => {
  /* Ni las contraseñas ni el resto: nombre, apellidos, curso y usuario de los
     veinticuatro estaban a un GET de distancia para cualquier alumno. */
  const ctx = conNube({ roster: [{ name: 'Vega Serrano', username: 'vega', password: 'colina2024' }] });
  const paquete = ctx.ev('configParaCompartir()');
  assert.equal(paquete.roster, undefined);
  assert.ok(!JSON.stringify(paquete).includes('vega'));
});

test('la lista entera sí va en el documento privado, con contraseñas y todo', async () => {
  /* Este documento es del docente y de nadie más, así que aquí no hay nada
     que esconder: lo que hace falta es que llegue a su segundo equipo. */
  const ctx = conNube({ roster: [{ name: 'Vega Serrano', username: 'vega', password: 'colina2024', grade: 4 }] });
  await ctx.ev('cloudGuardarCredenciales()');
  const doc = JSON.parse(ctx.almacen[CRED].config);
  assert.deepEqual(doc.cred, { vega: 'colina2024' });
  assert.equal(doc.roster.length, 1);
  assert.equal(doc.roster[0].name, 'Vega Serrano');
  assert.equal(doc.roster[0].password, 'colina2024');
  assert.ok(doc.rosterAt > 0, 'con su marca de tiempo, para saber cuál es la más nueva');
});

/* ── Lo que no puede perderse ── */

test('un equipo sin contraseñas NO vacía el documento del que sí las tiene', async () => {
  const ctx = conNube({
    roster: [{ name: 'Vega', username: 'vega' }, { name: 'Nilo', username: 'nilo' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'colina2024' } }) } }
  });
  const r = await ctx.ev('cloudGuardarCredenciales()');
  assert.equal(r.vacio, true);
  assert.deepEqual(guardado(ctx), { vega: 'colina2024' });
  assert.equal(ctx.registro.length, 0, 'no debería haber escrito nada');
});

test('un equipo que solo conoce una de tres no se lleva por delante las otras dos', async () => {
  const ctx = conNube({
    roster: [{ username: 'vega' }, { username: 'nilo', password: 'sendero7788' }, { username: 'mara' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'colina2024', mara: 'brujula33' } }) } }
  });
  await ctx.ev('cloudGuardarCredenciales()');
  assert.deepEqual(guardado(ctx), { vega: 'colina2024', mara: 'brujula33', nilo: 'sendero7788' });
});

test('lo que sabe este equipo manda sobre lo guardado', async () => {
  const ctx = conNube({
    roster: [{ username: 'vega', password: 'nueva12345' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'vieja12345' } }) } }
  });
  await ctx.ev('cloudGuardarCredenciales()');
  assert.deepEqual(guardado(ctx), { vega: 'nueva12345' });
});

test('quien ya no está en la lista no se arrastra para siempre', async () => {
  const ctx = conNube({
    roster: [{ username: 'vega', password: 'colina2024' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'x', quesefue: 'y' } }) } }
  });
  await ctx.ev('cloudGuardarCredenciales()');
  assert.deepEqual(guardado(ctx), { vega: 'colina2024' });
});

/* ══════════ LA LISTA DE CLASE ══════════
   Es el dato más serio que maneja la plataforma: nombres de menores y el
   usuario con el que entra cada uno. Y es lo que más caro sale perder. */

test('el segundo equipo recibe la lista entera', async () => {
  const ctx = conNube({
    roster: [],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: {}, notas: {},
      rosterAt: 1000, roster: [{ name: 'Vega', username: 'vega', password: 'colina2024', grade: 4 }] }) } }
  });
  const r = await ctx.ev('rellenarCredenciales()');
  assert.equal(r.roster, 1);
  const lista = ctx.ev('ATLAS_CONFIG.roster');
  assert.equal(lista.length, 1);
  assert.equal(lista[0].password, 'colina2024');
});

test('un equipo sin lista NO le vacía la clase al que la tiene', async () => {
  const ctx = conNube({
    roster: [],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: {}, notas: {},
      rosterAt: 1000, roster: [{ name: 'Vega', username: 'vega' }] }) } }
  });
  await ctx.ev('cloudGuardarCredenciales()');
  assert.equal(JSON.parse(ctx.almacen[CRED].config).roster.length, 1);
});

test('ni el que la tiene vieja al que la tiene nueva', async () => {
  /* Se da de alta a un alumno en el portátil y se toca un ajuste en la tablet
     antes de que le llegue. Sin esto, la tablet subiría su lista de ayer y el
     alumno nuevo desaparecería de las dos. */
  const ctx = conNube({
    roster: [{ name: 'Vega', username: 'vega' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: {}, notas: {},
      rosterAt: 9999999999999,
      roster: [{ name: 'Vega', username: 'vega' }, { name: 'Nilo', username: 'nilo' }] }) } }
  });
  await ctx.ev('cloudGuardarCredenciales()');
  const doc = JSON.parse(ctx.almacen[CRED].config);
  assert.equal(doc.roster.length, 2, 'la más nueva se queda');
  assert.equal(doc.rosterAt, 9999999999999, 'y con su marca, para que se adopte luego');
});

test('la propia no se vuelve a adoptar en bucle', async () => {
  const ctx = conNube({ roster: [{ name: 'Vega', username: 'vega', password: 'colina2024' }] });
  await ctx.ev('cloudGuardarCredenciales()');
  const marca = ctx.ev('ATLAS_CONFIG_META.rosterAt');
  assert.ok(marca > 0, 'se apunta lo que se acaba de escribir');
  const r = await ctx.ev('rellenarCredenciales()');
  assert.equal(r.roster, 0);
});

test('una lista más vieja que la de aquí no pisa la de aquí', async () => {
  const ctx = conNube({
    roster: [{ name: 'Vega', username: 'vega' }, { name: 'Nilo', username: 'nilo' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: {}, notas: {},
      rosterAt: 1, roster: [{ name: 'Vega', username: 'vega' }] }) } }
  });
  ctx.ev('ATLAS_CONFIG_META.rosterAt = 1000');
  await ctx.ev('rellenarCredenciales()');
  assert.equal(ctx.ev('ATLAS_CONFIG.roster').length, 2);
});

test('un documento de aula antiguo que aún lleve la lista se reescribe solo', () => {
  /* Adoptarlo no la borra del documento: hay que volver a escribirlo. Sin
     esto, el agujero seguiría abierto hasta que al docente le diera por
     cambiar un ajuste. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function traerAjustesDeAula');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /const traiaLaLista = Array\.isArray\(ajustes\.roster\)/);
  assert.match(cuerpo, /if \(traiaLaLista && aulaActiva\(\)\) programarSubidaAjustes\(\)/);
});

test('y un equipo que se estrena la rescata del documento antiguo', () => {
  /* Mientras queden documentos sin reescribir, son la única copia que tiene
     un equipo nuevo. Llegan sin contraseñas; de eso se encarga el canal
     privado un momento después. */
  const ctx = cargarApp();
  ctx.ev('adoptSharedConfig')({ overlay: { roster: [{ name: 'Vega', username: 'vega' }] },
                                updated_at: Date.now() });
  assert.equal(ctx.ev('ATLAS_CONFIG.roster').length, 1);
});

test('pero si este equipo ya tiene lista, la suya manda', () => {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('roster', [{ name: 'Nilo', username: 'nilo', password: 'sendero7788' }]);
  ctx.ev('adoptSharedConfig')({ overlay: { roster: [{ name: 'Vega', username: 'vega' }] },
                                updated_at: Date.now() });
  const l = ctx.ev('ATLAS_CONFIG.roster');
  assert.equal(l.length, 1);
  assert.equal(l[0].username, 'nilo');
  assert.equal(l[0].password, 'sendero7788', 'con su contraseña intacta');
});

/* ── Lo que recibe el segundo equipo ── */

test('rellena las que faltan al abrir el panel', async () => {
  const ctx = conNube({
    roster: [{ name: 'Vega', username: 'vega', account: true }, { name: 'Nilo', username: 'nilo', account: true }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'colina2024', nilo: 'sendero7788' } }) } }
  });
  const r = await ctx.ev('rellenarCredenciales()');
  assert.equal(r.puestas, 2);
  assert.deepEqual(ctx.ev('ATLAS_CONFIG.roster').map(x => x.password), ['colina2024', 'sendero7788']);
});

test('NUNCA pisa una contraseña que ya esté puesta aquí', async () => {
  const ctx = conNube({
    roster: [{ username: 'vega', password: 'la-de-aqui-1' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'la-de-alla-1' } }) } }
  });
  const r = await ctx.ev('rellenarCredenciales()');
  assert.equal(r.puestas, 0);
  assert.equal(ctx.ev('ATLAS_CONFIG.roster')[0].password, 'la-de-aqui-1');
});

test('que el documento no exista todavía es lo normal, no un error', async () => {
  const ctx = conNube({ roster: [{ username: 'vega' }] });
  const r = await ctx.ev('cloudTraerCredenciales()');
  assert.equal(r.ok, true);
  assert.deepEqual(r.cred, {});
});

test('el usuario se busca en minúsculas: la lista puede tener mayúsculas', async () => {
  const ctx = conNube({
    roster: [{ username: 'Vega' }],
    docs: { [CRED]: { owner: 'docente1', config: JSON.stringify({ v: 1, cred: { vega: 'colina2024' } }) } }
  });
  await ctx.ev('rellenarCredenciales()');
  assert.equal(ctx.ev('ATLAS_CONFIG.roster')[0].password, 'colina2024');
});

/* ── Lo que no debe aparecer donde no toca ── */

test('el documento de credenciales no sale en la lista de clases', async () => {
  const ctx = conNube({
    docs: {
      'aula-A': { owner: 'docente1', name: '4.º A', updated_at: '1' },
      [CRED]: { owner: 'docente1', name: 'Credenciales', updated_at: '2' }
    }
  });
  const r = await ctx.ev('cloudListAulas()');
  assert.deepEqual(r.aulas.map(a => a.id), ['aula-A']);
});

test('borrar la clase se lleva sus contraseñas', () => {
  /* Dejarlas sería guardar las contraseñas de veinticinco niños de una clase
     que ya no existe, sin nada en la app que las enseñe ni las borre. */
  const src = leer('js/cloud.js');
  const i = src.indexOf('async function cloudBorrarAula');
  assert.ok(i > 0);
  const cuerpo = src.slice(i, src.indexOf('\n}\n', i));
  assert.ok(/idDeCredenciales\(aulaId\)/.test(cuerpo));
  /* Y después de que el aula se haya ido de verdad: un borrado que se corta a
     medias hay que poder reintentarlo, y sin las contraseñas no se puede
     volver a entregar nada. */
  assert.ok(cuerpo.indexOf('c.aulasCollectionId, aulaId') < cuerpo.indexOf('idDeCredenciales(aulaId)'));
});

test('en la tablet de un niño no se pide nada: no hay clase abierta', async () => {
  /* La clase solo se abre desde «Mis clases», que es el panel. Un alumno tiene
     su aula apuntada en el diario, pero no abierta, así que esto se corta sin
     gastar una petición. Y si la gastara, el documento no le dejaría leerlo. */
  const ctx = conNube({ roster: [{ username: 'vega' }] });
  ctx.ev('setAulaActiva')('', '');
  let pedido = false;
  ctx.ev('CLOUD').db.getDocument = async () => { pedido = true; return {}; };
  const r = await ctx.ev('rellenarCredenciales()');
  assert.equal(r.ok, false);
  assert.equal(pedido, false);
});

test('el arranque las pide sin comprobar si es el docente: lo hace la propia función', () => {
  const app = leer('js/app.js');
  const i = app.indexOf('async function boot()');
  const cuerpo = app.slice(i, app.indexOf('\n}\n', i));
  assert.ok(/await rellenarCredenciales\(\)/.test(cuerpo));
  /* Y después de traer los ajustes: la lista de clase llega ahí, y sin lista
     no hay a quién ponerle la contraseña. */
  assert.ok(cuerpo.indexOf('traerAjustesDeAula()') < cuerpo.indexOf('rellenarCredenciales()'));
});

/* ── Lo que el panel tiene que decir ── */

test('a una cuenta creada sin contraseña aquí no se le dice «le falta»', () => {
  const ctx = cargarApp();
  const pega = ctx.ev('pegaDeLaCuenta')({ name: 'Vega', username: 'vega', account: true });
  assert.ok(/otro dispositivo/.test(pega), pega);
  assert.ok(!/^Le falta la contrase/.test(pega));
});

test('«Completar fichas» no le inventa una contraseña a quien ya tiene cuenta', () => {
  /* Sería tapar el hueco con un dato falso: esa contraseña no abre la cuenta
     que ya existe, y el niño se queda fuera con un papel en la mano. */
  const src = leer('js/teacher.js');
  const i = src.indexOf("const fill = $('#ros-fill')");
  assert.ok(i > 0);
  const cuerpo = src.slice(i, src.indexOf("$('#ros-add')", i));
  assert.ok(/if \(r\.account\) continue;/.test(cuerpo));
  assert.ok(cuerpo.indexOf('if (r.account) continue;') < cuerpo.indexOf('makePassword()'));
});

test('cambiar la contraseña de una cuenta creada avisa de que no cambia la cuenta', () => {
  /* Atlas no sabe cambiar contraseñas en Appwrite: no hay updatePassword en
     todo el código. Mientras eso siga así, hay que decirlo en voz alta. */
  const src = leer('js/cloud.js') + leer('js/teacher.js');
  assert.ok(!/updatePassword/.test(src), 'si ya se sabe cambiar, este aviso sobra');
  const t = leer('js/teacher.js');
  const i = t.indexOf("$$('.ros-pass')");
  const cuerpo = t.slice(i, i + 900);
  assert.ok(/ya\.account/.test(cuerpo) && /toast\(/.test(cuerpo));
});

test('la hoja de credenciales no enseña un hueco en blanco donde falta una', () => {
  const src = leer('js/teacher.js');
  assert.ok(/otro dispositivo — no está aquí/.test(src));
});
