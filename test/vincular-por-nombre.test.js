/* Rescatar los diarios que se quedaron sueltos.

   Desde que el alta guarda el id de la cuenta, vincular un diario es ir
   directo a su documento. Las cuentas creadas ANTES no lo tienen y no hay
   forma de recuperarlo: `account.create` sobre un correo que ya existe
   contesta «already exists» y no devuelve el id, y el alta salta a quien ya
   está marcado como creado, así que volver a pulsarla tampoco sirve.

   Queda un camino, y es el único: el id del documento de un diario ES el id
   de la cuenta de ese niño, y el equipo docente puede leer la colección. Se
   empareja por nombre, que es justo lo que se quitó del resto de la app, así
   que aquí NO se hace solo: se propone y lo confirma el docente. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function conDiarios(docs, { aula = 'aula-A' } = {}) {
  const ctx = cargarApp();
  ctx.Appwrite = {
    Query: { limit: () => ({}), select: () => ({}), cursorAfter: () => ({}) },
    Permission: { read: r => r, update: r => r, delete: r => r },
    Role: { user: id => `user:${id}`, users: () => 'users' }
  };
  const c = ctx.ev('ATLAS_CONFIG.appwrite');
  c.databaseId = 'db'; c.collectionId = 'diarios';
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  CLOUD.db = { listDocuments: async () => ({ documents: docs, total: docs.length }) };
  ctx.ev('setAulaActiva')(aula, '4.º A');
  return ctx;
}

test('trae los diarios sin dueño: son los que nadie ha reclamado', async () => {
  const ctx = conDiarios([
    { $id: 'alu1', name: 'Geysha', aula: '', owner: '' },
    { $id: 'alu2', name: 'Leyah', aula: '', owner: '' }
  ]);
  const r = await ctx.ev('cloudDiariosParaVincular()');
  assert.equal(r.ok, true);
  assert.deepEqual(r.diarios.map(d => d.id), ['alu1', 'alu2']);
});

test('y los que ya son míos, que también hay que poder reparar', async () => {
  const ctx = conDiarios([{ $id: 'alu1', name: 'Geysha', aula: 'aula-A', owner: 'docente1' }]);
  const r = await ctx.ev('cloudDiariosParaVincular()');
  assert.equal(r.diarios.length, 1);
});

test('el diario de otro docente no se enseña siquiera', async () => {
  /* Proponerlo ya sería invitar a pisarlo: vincularlo le pondría mi clase
     encima al alumno de otra persona. */
  const ctx = conDiarios([
    { $id: 'ajeno', name: 'Geysha', aula: 'aula-Z', owner: 'otro-docente' },
    { $id: 'mio', name: 'Leyah', aula: '', owner: '' }
  ]);
  const r = await ctx.ev('cloudDiariosParaVincular()');
  assert.deepEqual(r.diarios.map(d => d.id), ['mio']);
});

test('ni el de otra clase mía, si estoy trabajando en esta', async () => {
  const ctx = conDiarios([{ $id: 'otra', name: 'Geysha', aula: 'aula-B', owner: 'docente1' }]);
  const r = await ctx.ev('cloudDiariosParaVincular()');
  assert.deepEqual(r.diarios, []);
});

test('una colección sin las columnas nuevas se dice, no se traga', async () => {
  const ctx = conDiarios([]);
  ctx.ev('CLOUD').db.listDocuments = async () => { throw new Error('Invalid query: Unknown attribute "owner"'); };
  const r = await ctx.ev('cloudDiariosParaVincular()');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'falta-columna');
});

test('el emparejado solo mira las fichas sin id de cuenta', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf("$('#ros-buscar')");
  const cuerpo = t.slice(i, i + 2200);
  assert.match(cuerpo, /if \(f\.authId \|\| !f\.name\) continue;/);
});

test('un nombre repetido entre los diarios no se empareja solo', () => {
  /* Elegir uno al azar sería escribir en el diario del niño equivocado, que
     es el fallo que esta pantalla existe para no cometer. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("$('#ros-buscar')");
  const cuerpo = t.slice(i, i + 2200);
  assert.match(cuerpo, /if \(cand\.length === 1\)/);
  assert.match(cuerpo, /hay \$\{cand\.length\} diarios con ese nombre/);
});

test('el nombre se compara sin tildes ni dobles espacios', () => {
  /* «Geysha » de la lista y «Geysha» del diario son la misma niña. */
  const t = leer('js/teacher.js');
  assert.match(t, /function normalizarNombre\(t\)/);
  assert.match(t, /normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)/);
});

test('el botón solo sale si hay alguien a quien rescatar', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /const huerfanos = roster\.filter\(r => r\.account && !r\.authId\)\.length;/);
  assert.match(t, /\$\{huerfanos \? `<button class="btn btn-secondary btn-small" id="ros-buscar">/);
});

test('el aviso de «no se pudo» manda al botón que lo arregla', () => {
  /* Antes decía que había que hacerlo a mano, que no era ni verdad. */
  const t = leer('js/teacher.js');
  assert.match(t, /Buscar el diario<\/strong>: los empareja por el\s*\n?\s*nombre/);
});
