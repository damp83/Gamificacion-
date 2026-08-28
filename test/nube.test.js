/* Configuración de Appwrite y el diagnóstico de conexión.
   Los IDs de colección se copian a mano de la consola, y equivocarse en uno
   deja la plataforma en un fallo mudo: parece que guarda y no llega nada. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();

test('la configuración de Appwrite está completa y bien formada', () => {
  const a = ev('ATLAS_DEFAULTS.appwrite');
  assert.match(a.endpoint, /^https:\/\/.+\/v1$/, 'el endpoint acaba en /v1');
  assert.ok(a.projectId && a.databaseId && a.collectionId, 'proyecto, base de datos y diarios');
  for (const [k, v] of Object.entries(a)) {
    assert.equal(v, String(v).trim(), `«${k}» lleva espacios de más`);
  }
  assert.equal(ev('cloudConfigured()'), true, 'la app se considera configurada para la nube');
});

test('el endpoint no apunta a la región equivocada por un dedazo', () => {
  /* Un proyecto de Fráncfort contra cloud.appwrite.io responde 404 en todo,
     y el síntoma se parece mucho a «el ID de la colección está mal». */
  const a = ev('ATLAS_DEFAULTS.appwrite');
  assert.doesNotMatch(a.endpoint, /^https:\/\/cloud\.appwrite\.io/,
    'este proyecto vive en fra.cloud.appwrite.io');
});

test('un ID de colección inexistente se señala como tal', () => {
  const r = ev('interpretarSondeo')(new Error('Collection with the requested ID could not be found.'));
  assert.equal(r.ok, false);
  assert.equal(r.veredicto, 'no-existe');
  assert.match(r.texto, /ID/);
});

test('que no deje listar no se confunde con que no exista', () => {
  /* Con seguridad por documento y sin sesión, Appwrite contesta 401. Es la
     configuración CORRECTA: decir «no existe» ahí mandaría a cambiar un ID
     que estaba bien. */
  for (const msg of ['User (role: guests) missing scope (documents.read)',
                     'The current user is not authorized to perform the requested action.']) {
    const r = ev('interpretarSondeo')(new Error(msg));
    assert.equal(r.ok, true, msg);
    assert.equal(r.veredicto, 'sin-permiso');
  }
});

test('un fallo de red se distingue de un ID mal puesto', () => {
  const r = ev('interpretarSondeo')(new TypeError('Failed to fetch'));
  assert.equal(r.veredicto, 'sin-red');
  assert.match(r.texto, /Platforms/, 'apunta a dónde se arregla');
});

test('sin error, la colección responde', () => {
  const r = ev('interpretarSondeo')(null);
  assert.equal(r.ok, true);
  assert.equal(r.veredicto, 'existe');
});

test('el diagnóstico prueba todas las colecciones configuradas', async () => {
  const ctx = cargarApp();
  ctx.Appwrite = { Query: { limit: () => ({}) } };
  const pedidas = [];
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'd1', name: 'Diego' };
  CLOUD.db = { listDocuments: async (db, col) => { pedidas.push(col); return { documents: [] }; } };
  ctx.ev('ATLAS_CONFIG.appwrite').configCollectionId = 'configuracion';

  const pasos = await ctx.ev('cloudDiagnostico')();
  assert.deepEqual(pedidas, ['diarios', 'aulas', 'configuracion']);
  assert.ok(pasos.every(s => s.ok), 'con todo respondiendo, ningún paso falla');
  assert.ok(pasos.some(s => /Sesión/.test(s.que)));
});

test('sin SDK cargado el diagnóstico lo dice y no revienta', async () => {
  const ctx = cargarApp();
  const pasos = await ctx.ev('cloudDiagnostico')();
  assert.equal(pasos.length, 1);
  assert.equal(pasos[0].ok, false);
  assert.match(pasos[0].texto, /modo local/);
});
