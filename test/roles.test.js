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

test('los cinco roles existen y cada uno se distingue del resto', () => {
  const c = cargarApp();
  const roles = c.ev('ROLES_CUADRILLA');
  assert.equal(roles.length, 5);
  const ids = roles.map(r => r.id);
  assert.equal(new Set(ids).size, 5, 'dos roles con el mismo id se pisarían al asignarlos');
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
  assert.match(t, /l\[i\]\.roles\[clave\] = e\.target\.value;/);
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
