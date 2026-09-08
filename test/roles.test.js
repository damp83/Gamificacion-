/* Los roles dentro de la cuadrilla.

   Un equipo de cinco sin reparto de trabajo es un niño resolviendo y cuatro
   mirando. Darle a cada uno una tarea concreta —quien lee el objetivo, quien
   vigila el reloj, quien custodia los Doblones— es lo que convierte al grupo
   en cuadrilla. Estas pruebas cuidan que el reparto llegue entero desde el
   panel del docente hasta la pantalla del niño. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function conRoles() {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', ['Ana', 'Leo', 'Sara'].map(n => ({ name: n, grade: 3 })));
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.list[0].members = ['Ana', 'Leo'];
  t.list[0].roles = { ana: 'cartografo', leo: 'cronometradora' };
  t.list[1].members = ['Sara'];
  c.ev('setTeacherConfig')('teams', t);
  return c;
}

test('los roles existen y cada uno se distingue del resto', () => {
  const c = cargarApp();
  const roles = c.ev('ROLES_CUADRILLA');
  assert.equal(roles.length, 6, 'cinco de cuadrilla y el Intendente de clase');
  const ids = roles.map(r => r.id);
  assert.equal(new Set(ids).size, roles.length, 'dos roles con el mismo id se pisarían al asignarlos');
  for (const r of roles) {
    assert.ok(r.icon && r.personaje && r.rol && r.desc, `${r.id} incompleto`);
    assert.equal(typeof r.img, 'string', 'img debe existir aunque esté vacía');
  }
});

test('cada rol dice qué hace, no solo cómo se llama', () => {
  /* El nombre del personaje es el gancho; la tarea es lo que el niño cumple. */
  const c = cargarApp();
  for (const r of c.ev('ROLES_CUADRILLA')) {
    assert.ok(r.desc.length > 40, `${r.id} necesita una descripción que se pueda cumplir`);
  }
});

test('rolDe devuelve el rol del alumno dentro de su cuadrilla', () => {
  const c = conRoles();
  assert.equal(c.ev('rolDe')('Ana').id, 'cartografo');
  assert.equal(c.ev('rolDe')('Leo').id, 'cronometradora');
});

test('sin rol asignado, o sin cuadrilla, no revienta: devuelve null', () => {
  const c = conRoles();
  assert.equal(c.ev('rolDe')('Sara'), null, 'está en cuadrilla pero sin rol');
  assert.equal(c.ev('rolDe')('Iker'), null, 'no está en ninguna cuadrilla');
  assert.equal(c.ev('rolDe')(''), null);
});

test('el nombre se compara igual que en el resto de la aplicación', () => {
  /* El docente apunta «Ana» y luego escribe «ana » al asignar. Si aquí se
     comparase distinto, el niño vería su cuadrilla pero no su rol. */
  const c = conRoles();
  assert.equal(c.ev('rolDe')('  ANA ').id, 'cartografo');
});

test('un id de rol que ya no existe se ignora en vez de romper la pantalla', () => {
  /* Pasaría si se retirase un rol del catálogo con clases ya repartidas. */
  const c = conRoles();
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.list[0].roles = { ana: 'inventado' };
  c.ev('setTeacherConfig')('teams', t);
  assert.equal(c.ev('rolDe')('Ana'), null);
});

test('el avatar es emoji mientras no haya ilustración, e <img> en cuanto la haya', () => {
  /* Así el docente solo tiene que dejar los dibujos en img/roles/ y ponerlos
     en el catálogo: ni una línea de pantalla cambia. */
  const c = cargarApp();
  const rol = c.ev('rolPorId')('cartografo');
  assert.match(c.ev('avatarDeRol')(rol), /rol-emoji/);
  assert.match(c.ev('avatarDeRol')(Object.assign({}, rol, { img: 'img/roles/leo.png' })),
    /<img class="rol-img" src="img\/roles\/leo\.png"/);
  assert.equal(c.ev('avatarDeRol')(null), '', 'sin rol no pinta nada');
});

test('el avatar escapa lo que le llega', () => {
  const c = cargarApp();
  const salida = c.ev('avatarDeRol')({ icon: '🧭', img: '"><script>x()</script>', personaje: 'A' });
  assert.ok(!salida.includes('<script>'), salida);
});

test('el docente reparte los roles desde la ficha de la cuadrilla', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /class="cfg-t-rol" data-i="\$\{i\}" data-name="\$\{esc\(m\)\}"/);
  assert.match(t, /l\[i\]\.roles\[clave\] = valor;/);
  assert.match(t, /else delete l\[i\]\.roles\[clave\];/,
    'quitar el rol tiene que borrarlo, no dejar la clave a cadena vacía');
});

test('al sacar a alguien de la cuadrilla se va también su rol', () => {
  /* Si no, el rol volvería solo al readmitirlo, o quedaría ocupando sitio
     en unos ajustes que viajan a todas las tablets. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("$$('.cfg-t-pick')");
  assert.ok(i > 0, 'no encuentro el manejador de las casillas');
  assert.match(t.slice(i, i + 900), /delete l\[i\]\.roles\[clave\]/);
});

test('el niño ve su papel destacado y el de cada compañero', () => {
  const p = leer('js/play.js');
  assert.match(p, /const miRol = rolDe\(S\.profile\.explorer_name, team\);/);
  assert.match(p, /team-rol-mio/);
  assert.match(p, /const r = rolDe\(m, team\);/);
});

test('la lista de clase del docente enseña el rol de cada alumno', () => {
  const a = leer('js/aula.js');
  assert.match(a, /const rol = rolDe\(a\.name\);/);
  assert.match(a, /avatarDeRol\(rol\)/);
});

test('los estilos de los roles existen', () => {
  const css = leer('css/styles.css');
  for (const clase of ['.rol-emoji', '.rol-img', '.team-rol-mio', '.cfg-rol-fila']) {
    assert.ok(css.includes(clase + ' '), `falta ${clase}`);
  }
});

/* ── El Intendente de Campo: un encargo de la clase, no de la cuadrilla ── */

function conIntendentes(quienes) {
  const c = cargarApp();
  const nombres = ['Ana', 'Leo', 'Sara', 'Gael', 'Iker', 'Nora'];
  c.ev('setTeacherConfig')('roster', nombres.map(n => ({ name: n, grade: 3 })));
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.list[0].members = nombres.slice(0, 3);
  t.list[1].members = nombres.slice(3, 6);
  t.list[0].roles = {}; t.list[1].roles = {};
  for (const q of quienes) {
    const i = nombres.indexOf(q) < 3 ? 0 : 1;
    t.list[i].roles[q.toLowerCase()] = 'intendente';
  }
  c.ev('setTeacherConfig')('teams', t);
  return c;
}

test('el Intendente lleva tope, los roles de cuadrilla no', () => {
  const c = cargarApp();
  assert.equal(c.ev('topeDeRol')('intendente'), 2);
  assert.equal(c.ev('topeDeRol')('cartografo'), 0, 'este se puede repetir cuanto haga falta');
});

test('el tope se cuenta en toda la clase, no dentro de cada cuadrilla', () => {
  /* Es lo que lo distingue del resto: dos Cartógrafos en dos cuadrillas son
     normales; dos Intendentes ya son todos los que hay. */
  const c = conIntendentes(['Ana', 'Gael']);
  assert.deepEqual(c.ev('quienLleva')('intendente'), ['Ana', 'Gael']);
  assert.equal(c.ev('cabeOtroConRol')('intendente', 'Nora'), false,
    'están en cuadrillas distintas y aun así el tope se agota');
});

test('con una sola plaza dada, todavía cabe otro', () => {
  const c = conIntendentes(['Ana']);
  assert.equal(c.ev('cabeOtroConRol')('intendente', 'Nora'), true);
});

test('quien ya lo lleva no se bloquea a sí mismo', () => {
  /* Si no, al repintar el panel su propia opción saldría deshabilitada y el
     desplegable mostraría un rol que dice no caber. */
  const c = conIntendentes(['Ana', 'Gael']);
  assert.equal(c.ev('cabeOtroConRol')('intendente', 'Gael'), true);
  assert.equal(c.ev('cabeOtroConRol')('intendente', ' gael '), true, 'y con el nombre mal escrito');
});

test('un rol sin tope nunca se llena', () => {
  const c = conIntendentes(['Ana', 'Gael']);
  assert.equal(c.ev('cabeOtroConRol')('cartografo', 'Nora'), true);
});

test('el panel impide pasarse del tope también al guardar', () => {
  /* La opción deshabilitada frena el ratón; el teclado y un repintado a
     destiempo no. La regla tiene que estar donde se escribe. */
  const t = leer('js/teacher.js');
  assert.match(t, /if \(valor && !cabeOtroConRol\(valor, nombre\)\) \{/);
  assert.match(t, /const lleno = !cabeOtroConRol\(x\.id, m\);/);
  assert.match(t, /lleno \? ' disabled' : ''/);
});

test('rotar mueve el rol de cada niño al siguiente de su cuadrilla', () => {
  const c = conRoles();
  const l = c.ev('rotarRoles')(c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams.list')));
  /* Ana → Leo → Ana: con dos miembros se intercambian. */
  assert.equal(l[0].roles.leo, 'cartografo');
  assert.equal(l[0].roles.ana, 'cronometradora');
});

test('rotar no puede romper un tope: los mismos roles, en otras manos', () => {
  const c = conIntendentes(['Ana', 'Gael']);
  const l = c.ev('rotarRoles')(c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams.list')));
  const cuantos = l.reduce((n, t) => n +
    Object.values(t.roles || {}).filter(r => r === 'intendente').length, 0);
  assert.equal(cuantos, 2);
});

test('una cuadrilla de uno, o vacía, se queda como está al rotar', () => {
  const c = conRoles();
  const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams.list'));
  l[1].roles = { sara: 'guardian' };
  const r = c.ev('rotarRoles')(l);
  assert.equal(r[1].roles.sara, 'guardian', 'rotar solo no le quita el rol a nadie');
  assert.equal(Object.keys(r[2].roles || {}).length, 0);
});

test('rotar no deja rastro de quien ya no está en la cuadrilla', () => {
  /* El reparto se reconstruye desde los miembros de hoy, así que un nombre
     viejo colgado en roles no sobrevive a la rotación. */
  const c = conRoles();
  const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams.list'));
  l[0].roles = Object.assign({}, l[0].roles, { fantasma: 'guardian' });
  const r = c.ev('rotarRoles')(l);
  assert.equal(r[0].roles.fantasma, undefined);
});

test('el botón de rotar solo sale si hay algo repartido', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /const hayRoles = \(t\.list \|\| \[\]\)\.some\(x => Object\.keys\(x\.roles \|\| \{\}\)\.length\);/);
  assert.match(t, /\$\{hayRoles \? `<button class="btn btn-secondary btn-small" id="cfg-rotar-roles">/);
});

test('rotar pregunta antes: cambia el reparto de toda la clase', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf("cfg-rotar-roles'");
  assert.match(t.slice(i, i + 500), /await askConfirm\(/);
});
