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
  assert.match(cuerpo, /Permission\.update\(Appwrite\.Role\.user\(yo\)\)/);
  assert.match(cuerpo, /Permission\.delete\(Appwrite\.Role\.user\(yo\)\)/);
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

test('un fallo al guardar dice POR QUÉ, no «sin conexión»', () => {
  /* Se tragaba el error de Appwrite: `cloudCrearRetos` devolvía el resultado
     sin `reason` ni `texto`, quien llamaba no encontraba nada y enseñaba
     «sin conexión» —con el iPad conectado—. El motivo real (falta una
     columna, la cuenta no está en el equipo) se perdía por el camino. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudCrearRetos(');
  const cuerpo = cloud.slice(i, cloud.indexOf('\nasync function cloudActualizarReto', i));
  assert.match(cuerpo, /const primero = fallidos\.length \? fallidos\[0\]\.error : null;/);
  assert.match(cuerpo, /texto: primero \? textoDeFalloAlCrear\(primero\) : undefined/);

  const teacher = leer('js/teacher.js');
  /* Y ningún mensaje de error del panel usa «sin conexión» como comodín
     cuando no sabe la causa: eso fue exactamente lo que despistó. */
  assert.ok(!/\|\| 'sin conexión'/.test(teacher),
    'ya no se da por supuesto que el problema es la conexión');
});

test('cada motivo de fallo dice dónde se arregla', () => {
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('function textoDeFalloAlCrear(err)');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}', i));
  assert.match(cuerpo, /equipo «docentes»/, 'permiso: dónde mirar');
  assert.match(cuerpo, /falta alguna columna/, 'esquema: qué revisar');
  assert.match(cuerpo, /no existe ninguna tabla/, 'id mal copiado');
});

test('el diagnóstico prueba a ESCRIBIR, no solo a leer', () => {
  /* La tabla se lee con `users` y se escribe con el equipo «docentes»: se
     puede listar perfectamente y no poder guardar nada. Un diagnóstico que
     solo lista daría verde con el problema delante. */
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /async function cloudProbarEscrituraRetos\(\)/);
  const i = cloud.indexOf('async function cloudProbarEscrituraRetos()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n\n', i));
  assert.match(cuerpo, /createDocument/, 'crea');
  assert.match(cuerpo, /deleteDocument/, 'y borra, para no dejar basura');
  assert.match(cuerpo, /Se puede crear, pero NO borrar/, 'y distingue los dos permisos');
});

test('si los permisos por fila estorban, se crea sin ellos antes de rendirse', () => {
  /* Nombran un equipo por su ID, y ese ID no tiene por qué existir. Con el
     «Row level security» apagado se ignoran igualmente, así que mandarlos
     solo puede estorbar: perder un reto por eso sería absurdo. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudCrearRetos(');
  const cuerpo = cloud.slice(i, cloud.indexOf('\nasync function cloudActualizarReto', i));
  const conPermisos = cuerpo.indexOf("'unique()', fila, permisosDeReto()");
  const sinPermisos = cuerpo.indexOf("'unique()', fila);");
  assert.ok(conPermisos > 0 && sinPermisos > conPermisos, 'primero con, después sin');
  assert.match(cuerpo, /catch \(e2\) \{ fallidos\.push/, 'y solo entonces se da por fallido');
});

test('el mensaje de Appwrite se enseña LITERAL, pase lo que pase', () => {
  /* Mi traducción ayuda cuando acierto y estorba cuando no. Sin el original
     no hay forma de averiguar qué pasa desde fuera: Appwrite nombra la
     columna que sobra o falta, y esa palabra es la que arregla el problema. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('function textoDeFalloAlCrear(err)');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}', i));
  assert.match(cuerpo, /const crudo = d \? ' — Appwrite dice: «' \+ d \+ '»' : '';/);
  const ramas = cuerpo.split('return ').slice(1);
  assert.ok(ramas.length >= 4, 'hay varias salidas');
  for (const r of ramas) assert.match(r, /crudo/, 'todas llevan el mensaje original');
});

test('el diagnóstico enseña qué columnas manda la app', () => {
  /* Son diecinueve. Encontrar a ojo la que baila entre la consola y el
     código es un suplicio; verlas en fila al lado del error, no. */
  const c = cargarApp();
  c.ev('CLOUD').user = { $id: 'd1' };
  const cols = c.ev('columnasQueSeMandan')();
  assert.match(cols, /options \(String\[\]\)/, 'dice cuál es un array');
  assert.match(cols, /answer \(Integer\)/);
  assert.match(cols, /comprobado \(Boolean\)/);
  assert.equal(cols.split(',').length, 19);
});

test('los permisos de fila nunca nombran a un equipo', () => {
  /* Appwrite solo acepta permisos que quien escribe pueda otorgar, y a los
     equipos los identifica por su ID, no por su etiqueta. Un equipo
     etiquetado «docentes» tiene un ID como 6a92c58d001142cf8ba2, así que
     `team:docentes` no existe y Appwrite rechaza la escritura ENTERA:

       Permissions must be one of: (any, users, user:…, team:6a92c58d…)

     `users` y `user:<uno mismo>` los puede otorgar cualquiera siempre. No se
     pierde nada: quien da permiso al claustro es la pestaña Security de la
     tabla, y estos permisos se suman a los de ahí, nunca los recortan. */
  const cloud = leer('js/cloud.js');
  assert.ok(!/Role\.team\(/.test(cloud),
    'ninguna escritura nombra a un equipo: se rechazaría entera');
});

test('sin sesión no se inventa un permiso de nadie', () => {
  const c = cargarApp();
  c.ev('CLOUD').user = null;
  c.Appwrite = {
    Permission: { read: r => 'read:' + r, update: r => 'upd:' + r, delete: r => 'del:' + r },
    Role: { users: () => 'users', user: u => 'user:' + u }
  };
  assert.deepEqual(c.ev('permisosDeReto')(), ['read:users']);
});

test('los pozos de fábrica también dejan abrir su banco', () => {
  /* Enseñaban «Retos automáticos · infinitos» y ninguna puerta para entrar.
     Pero el generador de IA los ofrece como destino y lo aprobado entra ahí:
     los retos quedaban guardados donde el docente no podía verlos, ni
     corregir una pregunta, ni saber cuántos había. Contradicción mía, no
     del docente que no los encontraba. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("b.source === 'builtin'");
  const cuerpo = t.slice(i, i + 900);
  assert.match(cuerpo, /data-bank="\$\{site\.id\}:\$\{b\.id\}"/,
    'un pozo de fábrica también lleva el botón de su banco');
  assert.match(cuerpo, /Retos escritos \(\$\{total\}\)/, 'y dice cuántos hay escritos');
  assert.match(cuerpo, /\+ automáticos, infinitos/, 'sin dejar de decir que además genera solo');
});

test('el editor explica que en un pozo de fábrica los escritos van primero', () => {
  /* Es la regla que decide qué ve el niño, y sin decirla el docente no sabe
     si sus tres retos se usan o se pierden entre los automáticos. */
  const t = leer('js/teacher.js');
  assert.match(t, /se sirve <strong>antes<\/strong> que los retos/);
  assert.match(t, /cuando se agotan, el pozo sigue generando solo/);
});
