/* El avatar del explorador.

   El retrato del rol salía en la Cuadrilla y en la lista de clase, y se
   esfumaba en cuanto el niño entraba en un reto: esas cuatro pantallas —el
   HUD, el turno, la bolsa y el campamento— pintaban un emoji fijo que no
   miraba el rol de nadie. Y no podía mirarlo aunque quisiera, porque el emoji
   solo dependía del sombrero comprado. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function conRol(rol) {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Izan', username: 'izan', grade: 2 }]);
  const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
  t.list[0].members = ['Izan'];
  if (rol) t.list[0].roles = { izan: rol };
  c.ev('setTeacherConfig')('teams', t);
  c.ev('openDiary')({ name: 'Izan', username: 'izan', grade: 2 });
  return c;
}

test('con rol repartido, el avatar es su retrato', () => {
  const c = conRol('guardian');
  assert.match(c.ev('avatarDelExplorador')(), /img\/roles\/guardian\.png/);
});

test('sin rol, el niño de siempre', () => {
  const c = conRol(null);
  assert.equal(c.ev('avatarDelExplorador')(), '🧒');
});

test('el sombrero comprado no borra el retrato: se queda de chapa', () => {
  /* Un premio que deja de verse deja de ser un premio, y un rol que se pierde
     al comprarse un gorro tampoco vale. Caben los dos. */
  const c = conRol('guardian');
  c.ev('S').inventory.gear_equipped.push('salacot');
  const html = c.ev('avatarDelExplorador')();
  assert.match(html, /img\/roles\/guardian\.png/);
  assert.match(html, /avatar-gorro/);
  assert.match(html, /🧑‍🌾/);
});

test('y sin rol, el sombrero sigue siendo el avatar, como siempre fue', () => {
  const c = conRol(null);
  c.ev('S').inventory.gear_equipped.push('sombrero_ala_ancha');
  assert.equal(c.ev('avatarDelExplorador')(), '🤠');
});

test('admite el nombre suelto y la ficha de la lista', () => {
  /* Media app pasa la ficha entera y la otra media solo el nombre. Con la
     ficha, cuadrillaDe devolvía null en silencio y el niño perdía su rol:
     ese era el fallo. */
  const c = conRol('guardian');
  const conFicha = c.ev('avatarDelExplorador')({ name: 'Izan', username: 'izan' });
  const conNombre = c.ev('avatarDelExplorador')('Izan');
  assert.match(conFicha, /guardian\.png/);
  assert.equal(conFicha, conNombre);
});

test('cuadrillaDe y rolDe aceptan las dos formas', () => {
  const c = conRol('guardian');
  const ficha = { name: 'Izan', username: 'izan' };
  assert.equal(c.ev('cuadrillaDe')(ficha).id, c.ev('cuadrillaDe')('Izan').id);
  assert.equal(c.ev('rolDe')(ficha).id, 'guardian');
  assert.equal(c.ev('rolDe')('  IZAN ').id, 'guardian', 'y siguen sin distinguir mayúsculas');
});

test('las cuatro pantallas pintan el mismo avatar', () => {
  /* Si una se quedara con el emoji, el retrato volvería a desaparecer justo
     ahí y costaría otra vez encontrar cuál. */
  const ui = leer('js/ui.js'), aula = leer('js/aula.js'), play = leer('js/play.js');
  assert.match(ui, /\$\('#hud-avatar'\)\.innerHTML = avatarDelExplorador\(\)/);
  assert.match(aula, /\$\('#aula-avatar'\)\.innerHTML = avatarDelExplorador\(aulaAlumno\)/);
  assert.match(aula, /\$\('#bolsa-avatar'\)\.innerHTML = avatarDelExplorador\(bolsaAlumno\)/);
  assert.match(play, /\$\('#camp-avatar'\)\.innerHTML = avatarDelExplorador\(\)/);
  assert.ok(!/avatarEmoji/.test(ui + aula + play), 'el emoji fijo ya no lo pinta nadie');
});

test('el retrato llena el medallón y la chapa cabe dentro', () => {
  const css = leer('css/styles.css');
  assert.match(css, /\.rol-medallon\.rol-img \{ width: 100%; height: 100%; \}/);
  assert.match(css, /\.avatar-gorro \{/);
  /* Sin position:relative en el medallón, la chapa se iría a la esquina de la
     pantalla. */
  for (const clase of ['.hud-avatar', '.camp-avatar', '.aula-alumno-avatar']) {
    const i = css.indexOf(clase + ' {');
    assert.match(css.slice(i, i + 120), /position: relative/, `${clase} sin position:relative`);
  }
});

test('lo que llega al avatar se escapa', () => {
  const ui = leer('js/ui.js');
  const i = ui.indexOf('function avatarDelExplorador');
  const cuerpo = ui.slice(i, ui.indexOf('\n}', i));
  assert.match(cuerpo, /esc\(gorro \|\| '🧒'\)/);
  assert.match(cuerpo, /esc\(gorro\)/);
  /* La cara elegida sale de una lista cerrada del código, pero su ruta y su
     descripción entran igual en un atributo. */
  assert.match(cuerpo, /esc\(cara\.img\)/, 'la ruta del dibujo, sin escapar');
  assert.match(cuerpo, /esc\(cara\.alt\)/, 'la descripción, sin escapar');
});
