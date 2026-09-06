/* Los retos en su propia tabla de Appwrite.

   Estuvieron dentro del campo `config` del aula, con dos fallos. Uno de
   tamaño: ese campo son 200.000 caracteres y un reto ocupa unos 718, así que
   el techo estaba en ~278 para toda la clase. Y otro peor, que nadie habría
   visto hasta usarlo en clase: ese documento solo lo puede leer su docente,
   así que un reto aprobado NUNCA llegaba a la tablet de un niño. La cola de
   revisión no desembocaba en ninguna parte. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');

const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const RETO = {
  $id: 'r1', estado: 'banco', aula: 'aulaX',
  siteId: 'ruinas', branchId: 'sendero', estrato: 'recordar',
  materia: 'matematicas', curso: 4, skill: 'valor_posicional',
  question: '¿Qué cifra ocupa el lugar de las centenas en 3.582?',
  options: ['El 3', 'El 5', 'El 8', 'El 2'], answer: 1,
  hint1: 'Cuenta desde la derecha.', hint2: 'Empieza por el 2.',
  explanation: 'La tercera desde la derecha.', origen: 'ia', comprobado: true
};

test('los retos NO viven en los ajustes: por eso no vuelven a topar', () => {
  /* Si estuvieran en el overlay volverían a viajar dentro del `config` del
     aula, y el techo de los 200.000 caracteres estaría otra vez ahí. */
  const c = cargarApp();
  const suyo = { ...RETO, siteId: c.ev('ATLAS_CONFIG.sites')[0].id,
    branchId: c.ev('ATLAS_CONFIG.sites')[0].branches[0].id };
  c.ev('saveRetosCache')('aulaX', [suyo]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));

  const overlay = JSON.stringify(c.ev('ATLAS_OVERLAY'));
  assert.ok(!overlay.includes('centenas'), 'el reto no ha entrado en los ajustes');
  const paquete = JSON.stringify(c.ev('configParaCompartir')());
  assert.ok(!paquete.includes('centenas'), 'ni en lo que se sube al aula');
});

test('un reto aprobado acaba en el banco del pozo, que es de donde lee el juego', () => {
  const c = cargarApp();
  const sitio = c.ev('ATLAS_CONFIG.sites')[0];
  const suyo = { ...RETO, siteId: sitio.id, branchId: sitio.branches[0].id };
  c.ev('saveRetosCache')('aulaX', [suyo]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));

  const banco = c.ev('ATLAS_CONFIG.sites')[0].branches[0].bank || {};
  const preguntas = (banco.recordar || []).map(x => x.question);
  assert.ok(preguntas.includes(RETO.question), 'está en el estrato que le toca');
});

test('los de la cola NO se sirven a nadie hasta aprobarlos', () => {
  /* Es la razón de ser de la cola: nada escrito por una IA llega a un niño
     sin que un docente lo haya leído. */
  const c = cargarApp();
  const sitio = c.ev('ATLAS_CONFIG.sites')[0];
  c.ev('saveRetosCache')('aulaX', [{ ...RETO, estado: 'cola',
    siteId: sitio.id, branchId: sitio.branches[0].id }]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));

  const banco = c.ev('ATLAS_CONFIG.sites')[0].branches[0].bank || {};
  const preguntas = (banco.recordar || []).map(x => x.question);
  assert.ok(!preguntas.includes(RETO.question), 'la cola no llega al pozo');
});

test('recalcular la configuración no se lleva los retos por delante', () => {
  /* Los retos no están en el overlay, así que cada applyOverlay los borraría
     del pozo si no se volvieran a mezclar. Y applyOverlay se llama en cada
     cambio del panel: sin esto, tocar cualquier ajuste vaciaría el banco. */
  const c = cargarApp();
  const sitio = c.ev('ATLAS_CONFIG.sites')[0];
  c.ev('saveRetosCache')('aulaX', [{ ...RETO, siteId: sitio.id, branchId: sitio.branches[0].id }]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));
  c.ev('setTeacherConfig')('className', 'Cuarto B');   /* un cambio cualquiera */

  const banco = c.ev('ATLAS_CONFIG.sites')[0].branches[0].bank || {};
  assert.ok((banco.recordar || []).some(x => x.question === RETO.question),
    'siguen ahí después de tocar un ajuste');
});

test('cada fila se crea con los permisos correctos', () => {
  /* Leen todas las cuentas con sesión —las tablets del alumnado, que es el
     objetivo— y escribe solo el equipo docente. Un alumno con el id de la
     tabla no puede tocar una pregunta. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('function permisosDeReto()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}', i));
  assert.match(cuerpo, /Permission\.read\(Appwrite\.Role\.users\(\)\)/);
  assert.match(cuerpo, /Permission\.update\(Appwrite\.Role\.team\('docentes'\)\)/);
  assert.match(cuerpo, /Permission\.delete\(Appwrite\.Role\.team\('docentes'\)\)/);
  assert.ok(!/Role\.any\(\)/.test(cuerpo), 'nunca «any»: eso es internet entero');
});

test('los campos se recortan a lo que declara cada columna', () => {
  /* Pasarse de largo es un 400 de Appwrite con un mensaje que no dice cuál
     de los dieciocho campos se pasó. */
  const c = cargarApp();
  c.ev('CLOUD').user = { $id: 'd1' };
  const largo = 'x'.repeat(3000);
  const fila = c.ev('filaDeReto')({ question: largo, explanation: largo, hint1: largo,
    criterio: largo, options: [largo], skill: largo, answer: 2 }, 'aulaX', 'cola');
  assert.equal(fila.question.length, 600);
  assert.equal(fila.explanation.length, 1000);
  assert.equal(fila.hint1.length, 500);
  assert.equal(fila.criterio.length, 600);
  assert.equal(fila.options[0].length, 200);
  assert.equal(fila.skill.length, 48);
  assert.equal(fila.estado, 'cola');
});

test('«sin comprobar» se guarda como lo contrario, y no se pierde', () => {
  /* Un reto que no pasó la segunda pasada tiene que seguir marcado en la
     nube: si no, al abrirlo en otro equipo parecería tan revisado como los
     demás. */
  const c = cargarApp();
  c.ev('CLOUD').user = { $id: 'd1' };
  assert.equal(c.ev('filaDeReto')({ sinComprobar: true }, 'a', 'cola').comprobado, false);
  assert.equal(c.ev('filaDeReto')({}, 'a', 'cola').comprobado, true);
});

test('la mudanza sube primero y borra después', () => {
  /* Al revés perdería los retos si la subida falla a mitad. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function migrarRetosALaTabla()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  const iSube = cuerpo.indexOf('cloudCrearRetos(cola');
  const iCorta = cuerpo.indexOf("if (fallos) return");
  const iBorra = cuerpo.indexOf("setTeacherConfig('iaCola', [])");
  assert.ok(iSube > 0 && iCorta > iSube && iBorra > iCorta,
    'sube, comprueba que no hubo fallos, y solo entonces borra');
});

test('traer los retos pagina: un banco grande no se corta en silencio', () => {
  /* Sin paginar, a partir de la primera página los retos dejarían de
     aparecer sin ningún error. Ya pasó con los diarios. */
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /Query\.cursorAfter\(cursor\)/);
  assert.match(cloud, /if \(res\.documents\.length < RETOS_PAGINA\) break;/);
});

test('la tablet de un niño sabe de qué clase es por su propio diario', () => {
  /* Es lo único que le dice qué retos le tocan: sin esto habría que bajarse
     los de todos los docentes del centro. */
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /if \(doc\.aula\) recordarMiAula\(doc\.aula\)/);
  assert.match(cloud, /function miAula\(\)/);
  assert.match(cloud, /const abierta = \(typeof aulaActiva === 'function' && aulaActiva\(\)\)/,
    'el docente usa la clase abierta; el alumno, la de su diario');
});

test('el identificador de la tabla viene puesto', () => {
  const c = cargarApp();
  assert.match(c.ev('ATLAS_CONFIG.appwrite.retosCollectionId'), /^[a-z0-9]{16,}$/);
});

test('guardar los yacimientos no se lleva los retos de la nube a los ajustes', () => {
  /* El fallo más fácil de introducir aquí, y el más caro: `sitesCopy()` copia
     la configuración YA CALCULADA, y ahí dentro están los retos inyectados
     desde la tabla. Guardarla tal cual los metería en los ajustes —el techo
     de los 200.000 otra vez— y saldrían por duplicado, una copia desde la
     tabla y otra desde los ajustes. Y pasa con cualquier cambio del panel:
     renombrar un pozo también guarda el array entero. */
  const c = cargarApp();
  const sitio = c.ev('ATLAS_CONFIG.sites')[0];
  c.ev('saveRetosCache')('aulaX', [{ ...RETO, siteId: sitio.id, branchId: sitio.branches[0].id }]);
  c.ev('applyOverlay')(c.ev('ATLAS_OVERLAY'));

  const copia = c.ev('sitesCopy')();
  copia[0].branches[0].name = 'Pozo renombrado';
  c.ev('writeSites')(copia, false);

  const overlay = JSON.stringify(c.ev('ATLAS_OVERLAY'));
  assert.ok(!overlay.includes('centenas'), 'el reto NO ha entrado en los ajustes');
  assert.equal(c.ev('ATLAS_CONFIG.sites')[0].branches[0].name, 'Pozo renombrado', 'y el cambio sí se guardó');
  const banco = c.ev('ATLAS_CONFIG.sites')[0].branches[0].bank || {};
  assert.equal((banco.recordar || []).length, 1, 'sigue habiendo UN reto, no dos');
});

test('la mudanza se lleva también los escritos a mano', () => {
  /* Estuvieron fuera una versión y fue un error: los ajustes del aula solo
     los lee su docente, así que un reto escrito a mano tampoco llegaba a
     ninguna tablet. Dónde vive un reto no puede depender de quién lo
     escribió. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function migrarRetosALaTabla()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.ok(!/origen === 'ia'/.test(cuerpo), 'ya no se filtra por quién lo escribió');
  assert.match(cuerpo, /if \(r && !r\.docId\)/, 'se sube lo que aún no está en la tabla');
  assert.match(cuerpo, /origen: r\.origen \|\| 'docente'/);
});

test('mudar dos veces no duplica nada', () => {
  /* Se ejecuta en cada arranque con clase abierta. Sin la comprobación del
     docId, cada mañana habría una copia más de cada reto. */
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /Los que ya viven en la tabla llegan con docId/);
});

test('el editor a mano escribe en la tabla, no en los ajustes', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /const guardarCampo = async \(qi, campos, msg\)/);
  assert.match(t, /if \(q && q\.docId && typeof cloudActualizarReto === 'function'\)/);
  assert.match(t, /origen: 'docente'/, 'los nuevos nacen marcados como escritos por el docente');
  /* Y el alta masiva también: es la vía por la que un docente mete veinte de
     golpe, justo la que más engordaría los ajustes. */
  const i = t.indexOf("$('#cfg-bulk-go')");
  const cuerpo = t.slice(i, i + 2000);
  assert.match(cuerpo, /cloudCrearRetos\(conDestino, 'banco'\)/);
});
