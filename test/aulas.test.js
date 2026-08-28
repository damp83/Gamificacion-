/* Cambiar de clase vacía los diarios de este equipo. Antes de borrar nada
   tienen que estar arriba: si no, con el aula sin red se pierde la sesión
   entera y no hay de dónde tirar. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Prepara un equipo con la clase A abierta y dos diarios sin subir. */
function equipoConClaseAbierta({ subidaFunciona }) {
  const ctx = cargarApp();
  ctx.Appwrite = {
    Query: { equal: () => ({}), limit: () => ({}), cursorAfter: () => ({}) },
    Permission: { read: () => ({}), update: () => ({}), delete: () => ({}) },
    Role: { user: () => ({}), users: () => ({}), team: () => ({}) },
    ID: { unique: () => 'nuevo' }
  };
  ctx.ev('ATLAS_CONFIG.appwrite').aulasCollectionId = 'aulas';
  ctx.ev('ATLAS_CONFIG.appwrite').databaseId = 'db';
  ctx.ev('ATLAS_CONFIG.appwrite').collectionId = 'diarios';

  const escribir = async () => {
    if (!subidaFunciona) throw new Error('Failed to fetch');
    return { $id: 'x' };
  };
  const CLOUD = ctx.ev('CLOUD');
  CLOUD.enabled = true;
  CLOUD.user = { $id: 'docente1' };
  CLOUD.db = {
    updateDocument: escribir,
    createDocument: escribir,
    /* leer sí funciona: es el caso realista de una red que va a trompicones */
    getDocument: async () => ({ $id: 'aula-B', name: '5.º A', teacher: 'Diego', config: '{}' }),
    listDocuments: async () => ({ documents: [] })
  };

  ctx.ev('setAulaActiva')('aula-A', '4.º B');
  ctx.ev('saveDiaries')({
    'vega serrano': { profile: { explorer_name: 'Vega Serrano' }, updated_at: 100 },
    'nilo ferrer': { profile: { explorer_name: 'Nilo Ferrer' }, updated_at: 100 }
  });
  return ctx;
}

test('sin red, cambiar de clase NO borra los diarios y lo dice', async () => {
  const ctx = equipoConClaseAbierta({ subidaFunciona: false });
  const r = await ctx.ev('abrirAula')('aula-B', '5.º A');

  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sin-subir');
  assert.equal(r.pendientes, 2, 'tiene que decir cuántos hay en juego');
  assert.deepEqual(Object.keys(ctx.ev('loadDiaries()')).sort(), ['nilo ferrer', 'vega serrano']);
  assert.equal(ctx.ev('aulaActiva()'), 'aula-A', 'la clase de antes sigue abierta');
});

test('con red, cambiar de clase sube primero y entonces sí limpia', async () => {
  const ctx = equipoConClaseAbierta({ subidaFunciona: true });
  const r = await ctx.ev('abrirAula')('aula-B', '5.º A');

  assert.equal(r.ok, true);
  assert.equal(ctx.ev('aulaActiva()'), 'aula-B');
  assert.deepEqual(Object.keys(ctx.ev('loadDiaries()')), [],
    'los de la clase anterior se quitan, pero ya están arriba');
});

test('quien insiste a propósito puede cambiar perdiéndolos', async () => {
  /* Es lo que hace el segundo diálogo del panel: se puede seguir, pero
     hay que decirlo, no ocurre solo. */
  const ctx = equipoConClaseAbierta({ subidaFunciona: false });
  const r = await ctx.ev('abrirAula')('aula-B', '5.º A', { descartarSinSubir: true });
  assert.equal(r.ok, true);
  assert.equal(ctx.ev('aulaActiva()'), 'aula-B');
});

test('abrir la MISMA clase que ya está abierta no borra nada', async () => {
  const ctx = equipoConClaseAbierta({ subidaFunciona: false });
  const r = await ctx.ev('abrirAula')('aula-A', '4.º B');
  assert.equal(r.ok, true, 'no hay cambio de clase: no hay nada que subir antes');
  assert.equal(Object.keys(ctx.ev('loadDiaries()')).length, 2);
});
