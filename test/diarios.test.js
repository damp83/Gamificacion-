/* El id del documento de cada diario y lo que pasa al cambiar de clase:
   los dos sitios donde un fallo se lleva por delante el trabajo de un niño. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const docIdDiario = ev('docIdDiario');
const AULA = '6839a1b2c3d4e5f60718';        /* 20 caracteres, como los de unique() */

test('el id cabe en los 36 caracteres que admite Appwrite', () => {
  for (const n of ['ana', 'maría del carmen sánchez de la fuente y borbón', '']) {
    const id = docIdDiario(AULA, n);
    assert.ok(id.length <= 36, `«${n}» da un id de ${id.length}`);
    assert.match(id[0], /[a-zA-Z0-9]/, 'no puede empezar por un carácter especial');
  }
});

test('dos nombres compuestos que empiezan igual NO comparten documento', () => {
  /* El fallo real: con el nombre recortado a 15 caracteres, estas dos niñas
     escribían en el mismo documento y la segunda pisaba a la primera. */
  const a = docIdDiario(AULA, 'ana maría rodríguez pérez');
  const b = docIdDiario(AULA, 'ana maría rodríguez gómez');
  assert.notEqual(a, b);
});

test('el mismo alumno escrito con y sin tildes cae en su documento', () => {
  assert.equal(docIdDiario(AULA, 'josé antonio fernández'),
               docIdDiario(AULA, 'jose antonio fernandez'));
  assert.equal(docIdDiario(AULA, '  José Antonio Fernández  '.trim().toLowerCase()),
               docIdDiario(AULA, 'jose antonio fernandez'));
});

test('el mismo nombre en dos clases distintas son dos documentos', () => {
  assert.notEqual(docIdDiario('aulaA', 'vega serrano'), docIdDiario('aulaB', 'vega serrano'));
});

test('un aula entera de nombres compuestos sin una sola colisión', () => {
  const nom = ['ana', 'maria', 'jose', 'juan', 'carmen', 'lucia', 'pablo', 'marta'];
  const ape = ['garcia', 'rodriguez', 'fernandez', 'gonzalez', 'lopez', 'martinez', 'sanchez', 'perez'];
  const ids = new Map();
  let colisiones = 0;
  for (const a of nom) for (const b of nom) for (const c of ape) for (const d of ape) {
    const nombre = `${a} ${b} ${c} ${d}`;
    const id = docIdDiario(AULA, nombre);
    if (ids.has(id) && ids.get(id) !== nombre) colisiones++;
    ids.set(id, nombre);
  }
  assert.equal(colisiones, 0, `${colisiones} colisiones sobre ${nom.length ** 2 * ape.length ** 2} nombres`);
});

test('restaurar una copia fusiona los diarios quedándose el más reciente', () => {
  const ctx = cargarApp();
  ctx.ev(`
    saveDiaries({
      'vega serrano': { profile: { explorer_name: 'Vega Serrano' }, updated_at: 500 },
      'nilo ferrer':  { profile: { explorer_name: 'Nilo Ferrer'  }, updated_at: 500 }
    });
  `);
  const res = ctx.ev('importBackup')({
    atlas: 'expedicion-atlas-copia', v: 1, fecha: '2026-08-20T10:00:00.000Z',
    diarios: {
      'vega serrano': { profile: { explorer_name: 'Vega Serrano' }, updated_at: 100 },  /* más vieja */
      'mara ibanez':  { profile: { explorer_name: 'Mara Ibáñez'  }, updated_at: 900 }   /* nueva */
    }
  });
  assert.equal(res.ok, true);
  assert.equal(res.nuevos, 1, 'Mara entra');
  assert.equal(res.conservados, 1, 'la Vega de la copia es más vieja: no pisa a la de aquí');
  assert.equal(ctx.ev('loadDiaries()')['vega serrano'].updated_at, 500, 'Vega conserva lo del equipo');
  assert.equal(res.total, 3);
});

test('restaurar una copia vieja NO deshace los ajustes cambiados después', () => {
  /* El panel promete que restaurar fusiona. Valía para los diarios, pero los
     ajustes se sustituían siempre: la copia del viernes borraba el pozo que
     se había creado el lunes. */
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('className', '5.º A de este lunes');
  const res = ctx.ev('importBackup')({
    atlas: 'expedicion-atlas-copia', v: 1, fecha: '2020-01-01T10:00:00.000Z',
    diarios: {}, ajustes: { className: '4.º B del viernes pasado' }
  });
  assert.equal(res.ajustes, 'conservados');
  assert.equal(ctx.ev('ATLAS_CONFIG.className'), '5.º A de este lunes');
});

test('una copia más nueva que lo de aquí sí aplica sus ajustes', () => {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('className', 'lo viejo');
  const res = ctx.ev('importBackup')({
    atlas: 'expedicion-atlas-copia', v: 1, fecha: new Date(Date.now() + 60000).toISOString(),
    diarios: {}, ajustes: { className: 'lo de la copia' }
  });
  assert.equal(res.ajustes, 'aplicados');
  assert.equal(ctx.ev('ATLAS_CONFIG.className'), 'lo de la copia');
});
