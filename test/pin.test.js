/* El PIN del docente y por dónde se entra a su portal.

   El PIN es una barrera de aula, no seguridad: el código se ejecuta en la
   tablet del niño y ahí no hay secreto que valga. Precisamente por eso importa
   dónde se pide y qué abre, porque lo único que lo sostiene es que un niño no
   lo vea teclear.

   Había un portillo dentro de la pantalla de méritos del propio alumno: metías
   el PIN y concedías méritos ahí mismo. Dos problemas. El niño que veía las
   cuatro cifras podía concederse méritos a sí mismo cuando quisiera. Y, mucho
   peor, ese portillo marcaba la sesión como desbloqueada, así que desde la
   portada se entraba al portal del docente ENTERO —lista de clase, contraseñas
   de sus compañeros, ajustes— sin volver a pedir nada. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* ── El portillo ya no existe ── */

test('la pantalla del alumno no tiene ningún sitio donde teclear el PIN', () => {
  const html = leer('index.html');
  const seccion = html.slice(html.indexOf('id="screen-merits"'), html.indexOf('id="screen-team"'));
  assert.ok(!/pin-input|pin-form|btn-teacher-panel/.test(seccion),
    'un PIN en la pantalla del niño es un PIN que el niño ve teclear');
  assert.ok(!/id="award-list"/.test(seccion), 'ni la lista para concederse méritos');
});

test('en toda la app queda un único sitio donde se teclea el PIN', () => {
  /* El de la portada, que es la puerta del portal. Dos puertas con la misma
     llave es una puerta más de la que hace falta vigilar. */
  const html = leer('index.html');
  assert.equal((html.match(/inputmode="numeric"[^>]*placeholder="PIN"/g) || []).length, 0,
    'el PIN se pide en un diálogo, no en un campo suelto de una pantalla');
});

test('y no queda código de aquel panel colgando', () => {
  for (const f of ['js/app.js', 'js/play.js']) {
    const t = leer(f);
    assert.ok(!/renderAwardList|showTeacherPanel|#pin-input|#pin-form/.test(t), `${f} conserva restos`);
  }
});

/* ── La única puerta ── */

test('al portal se entra por la portada, y pidiendo el PIN', () => {
  const t = leer('js/app.js');
  assert.match(t, /\$\('#home-teacher'\)\.addEventListener\('click', async \(\) => \{\s*if \(!teacherUnlocked && !\(await askPin\(\)\)\) return;/);
});

test('salir del portal lo vuelve a cerrar con llave', () => {
  /* El PIN valía para toda la sesión: un docente que salía y le pasaba la
     tablet a un niño se la pasaba con el portal abierto. */
  const t = leer('js/app.js');
  assert.match(t, /\$\('#teacher-exit'\)\.addEventListener\('click', \(\) => \{ teacherUnlocked = false; showHome\(\); \}\)/);
});

test('cerrar sesión también lo cierra', () => {
  const t = leer('js/app.js');
  const i = t.indexOf("$('#btn-logout').addEventListener");
  assert.ok(i > 0);
  assert.match(t.slice(i, i + 700), /teacherUnlocked = false/);
});

test('nada más en la app pone teacherUnlocked a true', () => {
  const t = leer('js/app.js') + leer('js/play.js') + leer('js/teacher.js') + leer('js/aula.js');
  const puestas = (t.match(/teacherUnlocked\s*=\s*true/g) || []).length;
  assert.equal(puestas, 1, 'cada sitio que lo pone a true es otra forma de entrar sin PIN');
});

/* ── Dónde se conceden ahora los méritos ── */

test('los méritos se conceden desde el equipo del docente, no desde la tablet del niño', () => {
  const t = leer('js/aula.js');
  assert.match(t, /function panelDeMeritoGrupo/);
  assert.match(t, /function botonDeMeritoGrupo/);
});

test('y «Dirigir la clase» no necesita nube: funciona con la lista y los diarios de aquí', () => {
  /* Si hiciera falta clase abierta en la nube, quitar el portillo dejaría sin
     méritos a quien trabaja en local, que es medio curso de cualquiera. */
  const t = leer('js/aula.js');
  const i = t.indexOf('function aulaAlumnos');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /ATLAS_CONFIG\.roster/);
  assert.match(trozo, /allDiaries\(\)/);
  assert.ok(!/aulaActiva|cloudEnabled/.test(trozo));
});

/* ── Lo que el PIN nunca ha sido ── */

test('el PIN no viaja a las tablets del alumnado', () => {
  const c = leer('js/config.js');
  assert.match(c, /NO_SE_COMPARTE = \[[^\]]*'teacherPin'/,
    'si viajara, estaría escrito en el almacenamiento de cada tablet de la clase');
});

test('y el panel lo dice: es una barrera de aula, no seguridad', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf('PIN del panel');
  assert.match(t.slice(i, i + 400), /no seguridad real/);
});
