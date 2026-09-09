/* Los dos derechos que la portada le promete a una familia.

   «Podéis pedir ver qué se guarda de vuestro hijo y podéis pedir que se
   borre.» Eso estaba escrito en la portada y la app no sabía cumplirlo: los
   datos de un niño estaban repartidos por seis sitios y no había forma de
   reunirlos ni de quitarlos de todos a la vez. Lo que se fija aquí es que la
   promesa se cumpla entera, y que lo que la app NO puede hacer se diga en vez
   de darse por hecho. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function claseCon(c, { nube } = {}) {
  c.ev('setTeacherConfig')('roster', [
    { name: 'Vega Serrano', username: 'vega', password: 'colina2024', account: true, authId: 'cta1', grade: 3 },
    { name: 'Nilo Ferrer', username: 'nilo', password: 'sendero7788', account: false, grade: 3 }]);
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.enabled = true;
  t.list[0].members = ['Vega Serrano'];
  t.list[0].roles = { 'vega serrano': (c.ev('ROLES_CUADRILLA') || [{ id: 'x' }])[0].id };
  c.ev('setTeacherConfig')('teams', t);
  c.ev('guardarNotaDeAlumno')('u:vega', 'Ha dado un salto este trimestre.');
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('S.progression.xp_total = 320');
  c.ev('saveState()');
  c.ev('closeDiary()');
  return c;
}

/* ── Ver qué se guarda ── */

test('la ficha reúne todo lo que hay de un alumno, sin resumir', () => {
  const c = claseCon(cargarApp());
  const d = c.ev('datosDeAlumno')('u:vega');
  assert.equal(d.nombre, 'Vega Serrano');
  assert.equal(d.lista.usuario, 'vega');
  assert.equal(d.lista.contrasena, 'colina2024');
  assert.equal(d.lista.idDeCuenta, 'cta1');
  assert.equal(d.diario.pe, 320);
  assert.equal(d.cuadrilla.nombre, c.ev('ATLAS_CONFIG.teams').list[0].name);
  assert.equal(d.notas.length, 1);
});

test('y dice dónde vive cada cosa, que si no «borrar» hay que creérselo', () => {
  const c = claseCon(cargarApp());
  const d = c.ev('datosDeAlumno')('u:vega');
  assert.equal(d.donde.esteEquipo, true);
  assert.equal(d.donde.enLaNube, true, 'tiene id de cuenta: su diario está arriba');
  assert.equal(d.donde.documentoPrivado, true);
  const sinNada = c.ev('datosDeAlumno')('u:nilo');
  assert.equal(sinNada.donde.enLaNube, false, 'sin cuenta creada, no hay nada arriba');
});

test('la ficha que se descarga NO imprime la contraseña', () => {
  /* Es un documento que se le enseña a una familia o se archiva. La
     contraseña se entrega aparte y a quien toca. */
  const c = claseCon(cargarApp());
  const html = c.ev('fichaDeDatosHtml')('u:vega');
  assert.ok(html.includes('Vega Serrano'));
  assert.ok(!html.includes('colina2024'));
  assert.match(html, /<html lang="es">/);
  assert.match(html, /Ni fotografías, ni ubicación/);
});

/* ── Borrar ── */

test('borrar se lleva las seis cosas de este equipo', () => {
  const c = claseCon(cargarApp());
  const hecho = c.ev('borrarDatosLocalesDeAlumno')('u:vega');
  assert.deepEqual(hecho, { diario: true, lista: true, notas: true, cuadrilla: true });
  assert.deepEqual(c.ev('ATLAS_CONFIG.roster').map(r => r.name), ['Nilo Ferrer']);
  assert.equal(c.ev('loadDiaries()')['u:vega'], undefined);
  assert.equal(c.ev('ATLAS_CONFIG.notasInforme')['u:vega'], undefined);
  assert.deepEqual(c.ev('ATLAS_CONFIG.teams').list[0].members, []);
  assert.deepEqual(c.ev('ATLAS_CONFIG.teams').list[0].roles, {},
    'y su rol, que suelto reaparecería al rotar');
});

test('no se lleva por delante a nadie más', () => {
  const c = claseCon(cargarApp());
  c.ev('openDiary')({ name: 'Nilo Ferrer', username: 'nilo' }, 3);
  c.ev('saveState()');
  c.ev('closeDiary()');
  c.ev('borrarDatosLocalesDeAlumno')('u:vega');
  assert.ok(c.ev('loadDiaries()')['u:nilo'], 'el diario de Nilo sigue');
});

test('también el diario guardado bajo la clave antigua del nombre', () => {
  /* Un diario de antes de que la clave fuera el usuario está bajo el nombre.
     Dejarlo sería no haber borrado nada. */
  const c = claseCon(cargarApp());
  const map = c.ev('loadDiaries()');
  map['vega serrano'] = map['u:vega'];
  c.ev('saveDiaries')(map);
  c.ev('borrarDatosLocalesDeAlumno')('u:vega');
  assert.equal(c.ev('loadDiaries()')['vega serrano'], undefined);
});

test('se pide el nombre escrito antes de borrar', () => {
  /* Es lo más destructivo que se puede hacer con un niño concreto, y va en una
     lista de veinticuatro fichas que se tocan con el dedo. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('async function borrarAlumnoUI');
  const cuerpo = t.slice(i, t.indexOf('\n}\n', i));
  assert.match(cuerpo, /askPrompt\(/);
  assert.match(cuerpo, /no coincide: no se ha borrado nada/);
  assert.ok(cuerpo.indexOf('no coincide') < cuerpo.indexOf('borrarDatosLocalesDeAlumno'),
    'primero se comprueba, después se borra');
});

/* ── Lo que la app NO puede borrar, dicho ── */

test('la cuenta de Appwrite no se borra desde la app, y se dice', () => {
  /* El SDK del navegador no tiene servicio de usuarios. Callarlo sería dar por
     cumplido un borrado a medias: el niño podría seguir entrando. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudBorrarAlumno');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /Su CUENTA de Appwrite sigue existiendo/);
  assert.match(cuerpo, /Auth → Users/);
});

test('y si falta el permiso de borrar diarios, se dice cuál y dónde', () => {
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudBorrarAlumno');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /Team «docentes» → Delete/);
});

test('sin sesión no se toca nada de la nube', () => {
  const c = cargarApp();
  return c.ev('cloudBorrarAlumno')({ username: 'vega' }).then(r => {
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'sin-sesion');
    assert.deepEqual(r.hecho, { privado: false, diario: false });
  });
});

/* ── Menos dato desde el origen ── */

test('«Vega Serrano» se puede guardar como «Vega S.»', () => {
  const c = cargarApp();
  const corto = c.ev('nombreCorto');
  assert.equal(corto('Vega Serrano'), 'Vega S.');
  assert.equal(corto('Mara Ibáñez Ruiz'), 'Mara I. R.');
  assert.equal(corto('Nadia'), 'Nadia', 'sin apellido no hay nada que acortar');
  assert.equal(corto('  Leo   Sanz  '), 'Leo S.');
});

test('el usuario sale del nombre completo aunque se guarde acortado', () => {
  /* Dos «Vega S.» de apellidos distintos tienen que poder distinguirse al
     entrar, y el usuario es lo que las separa en toda la app. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("const acortar = !!($('#ros-inicial')");
  const cuerpo = t.slice(i, i + 1400);
  assert.match(cuerpo, /const guardado = acortar \? nombreCorto\(name\) : name;/);
  assert.match(cuerpo, /makeUsername\(name, taken\)/, 'del completo, no del acortado');
  assert.match(cuerpo, /name: guardado/);
});

test('lo decide el docente y se recuerda', () => {
  const c = cargarApp();
  assert.equal(c.ev('ATLAS_CONFIG.nombresCortos'), false, 'de fábrica no se toca lo que escribe');
  c.ev('setTeacherConfig')('nombresCortos', true);
  assert.equal(c.ev('ATLAS_CONFIG.nombresCortos'), true);
});
