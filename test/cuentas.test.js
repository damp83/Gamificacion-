/* Dar de alta al alumnado. El panel dejaba escribir una contraseña de tres
   letras, la guardaba sin rechistar, y el fallo solo salía al intentar entrar
   —diciendo además «contraseña incorrecta», que manda a mirar donde no es. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const pega = ev('pegaDeLaCuenta');

test('una contraseña más corta de 8 se señala, y se dice por qué', () => {
  const r = pega({ name: 'Jan', username: 'jan', password: 'abc', account: true });
  assert.ok(r, 'tiene que devolver una pega');
  assert.match(r, /3 caracteres/, 'dice cuántos tiene');
  assert.match(r, /8/, 'y cuántos hacen falta');
});

test('escribir la contraseña no basta: hay que crear la cuenta', () => {
  /* Es el malentendido de fondo: la lista de clase vive en este equipo, y la
     cuenta hay que darla de alta en Appwrite a propósito. */
  const r = pega({ name: 'Jan', username: 'jan', password: 'brujula1234', account: false });
  assert.match(r, /Crear las cuentas/);
});

test('con todo en regla no hay ninguna pega', () => {
  assert.equal(pega({ name: 'Jan', username: 'jan', password: 'brujula1234', account: true }), null);
});

test('se señala lo que falte, uno por uno', () => {
  assert.match(pega({ account: true }), /Sin nombre/);
  assert.match(pega({ name: 'Jan', account: true }), /usuario/);
  assert.match(pega({ name: 'Jan', username: 'jan', account: true }), /contraseña/);
});

test('las contraseñas que genera el panel siempre valen para Appwrite', () => {
  const ctx = cargarApp();
  const minimo = ctx.ev('PASS_MINIMO');
  for (let i = 0; i < 300; i++) {
    const pw = ctx.ev('makePassword')();
    assert.ok(pw.length >= minimo, `«${pw}» tiene ${pw.length}`);
  }
});

test('el error al entrar no culpa solo a la contraseña', () => {
  /* Appwrite responde igual si la contraseña está mal Y si la cuenta no
     existe: lo hace a propósito para que no se pueda averiguar quién tiene
     cuenta probando. El mensaje tiene que cubrir las dos cosas. */
  const msg = ev('friendlyAuthError')(new Error('Invalid credentials'));
  assert.match(msg, /usuario/i);
  assert.match(msg, /cuenta/i, 'menciona que puede que no exista todavía');
});

test('los errores que sí tienen una causa concreta la siguen diciendo', () => {
  assert.match(ev('friendlyAuthError')(new Error('Password must be at least 8 characters')), /8/);
  /* El de red ya no culpa a la red: dice que no se ha hablado con el servidor
     y deja el porqué para el diagnóstico, que sí lo sabe. */
  assert.match(ev('friendlyAuthError')(new Error('Failed to fetch')), /Sociedad Geográfica/);
  assert.ok(!/revisa la red/i.test(ev('friendlyAuthError')(new Error('Failed to fetch'))));
  assert.match(ev('friendlyAuthError')(new Error('A user with the same id already exists')), /ya existe/i);
});

/* ══ La contraseña que se cambió después de crear la cuenta ══

   La trampa más cara de todas, porque no se parece a un error: se cambia la
   contraseña de una ficha que YA tiene cuenta, el panel enseña tan tranquilo la
   nueva, y Appwrite sigue con la de antes. El alumno la escribe bien y la app le
   dice que la compruebe. Se pasa la tarde probando. */

const { cargarApp: cargar2 } = require('./cargar.js');
const fs = require('node:fs');
const path = require('node:path');

/* El cuerpo de una función suelta, sin arrastrar la de al lado: las pruebas
   que leen el código a ojo se vuelven mentira en cuanto la siguiente función
   contiene la palabra que se busca. */
function cuerpoDe(fichero, firma) {
  const t = fs.readFileSync(path.join(__dirname, '..', fichero), 'utf8');
  const i = t.indexOf(firma);
  assert.ok(i > 0, `no se encuentra ${firma}`);
  const j = t.indexOf('\n}', i);
  assert.ok(j > i, `${firma} no parece cerrarse`);
  return t.slice(i, j + 2);
}

function conCuenta(c, cambios) {
  const r = Object.assign({
    name: 'Nadia Ruiz', username: 'nadia', password: 'sendero7788',
    account: true, authId: 'cta1', grade: 3
  }, cambios || {});
  c.ev('setTeacherConfig')('roster', [r]);
  return r;
}

test('cambiar la contraseña de una cuenta ya creada se avisa, y se dice que no la cambia', () => {
  const c = cargar2();
  const r = conCuenta(c);
  r.claveCreada = c.ev('huellaDeClave')('sendero7788');
  assert.equal(c.ev('pegaDeLaCuenta')(r), null, 'mientras sea la misma, nada que decir');

  r.password = 'otracosa99';
  const pega = c.ev('pegaDeLaCuenta')(r);
  assert.match(pega, /DESPUÉS de crear la cuenta/);
  assert.match(pega, /no es la que abre/);
  assert.match(pega, /Update password/, 'y dice dónde SÍ se puede cambiar');
  assert.match(pega, /nadia@/, 'con el correo exacto que hay que buscar');
});

test('sin huella guardada no se inventa un aviso: las cuentas viejas no la tienen', () => {
  const c = cargar2();
  const r = conCuenta(c);
  assert.equal(c.ev('pegaDeLaCuenta')(r), null);
});

test('la huella no es una segunda copia de la contraseña', () => {
  const c = cargar2();
  const h = c.ev('huellaDeClave')('sendero7788');
  assert.ok(h && !h.includes('sendero'), 'guardar el secreto dos veces es duplicar el riesgo por nada');
  assert.equal(h, c.ev('huellaDeClave')('sendero7788'), 'la misma cadena da la misma huella');
  assert.notEqual(h, c.ev('huellaDeClave')('sendero7789'));
  assert.equal(c.ev('huellaDeClave')(''), '');
});

test('la huella se guarda al crear la cuenta, que es el único momento en que se sabe', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'js/teacher.js'), 'utf8'),
    /l\[i\]\.claveCreada = huellaDeClave\(r\.password\)/);
});

test('toda ficha con cuenta creada avisa de que la contraseña de aquí no manda', () => {
  /* También las creadas antes de que se guardara la huella, que son justo las
     que no pueden detectar el desajuste. */
  const c = cargar2();
  conCuenta(c);
  const caja = c.ev('document').createElement('div');
  c.ev('cfgAlumnado')(caja);
  assert.match(caja.innerHTML, /cambiar la contraseña aquí no/i);
});

/* ── Probarla, que es la única forma de saberlo ── */

test('probar una contraseña dice cuál de las dos cosas pasa, sin fingir que las distingue', () => {
  /* Appwrite responde igual a «contraseña mala» y a «esa cuenta no existe»: lo
     hace a propósito. Decir solo una de las dos manda a mirar donde no es. */
  const trozo = cuerpoDe('js/cloud.js', 'async function probarClaveDeAlumno');
  assert.match(trozo, /o esa cuenta no existe/);
  assert.match(trozo, /a propósito/);
});

test('y cierra la sesión del niño al terminar, en los dos caminos', () => {
  const trozo = cuerpoDe('js/cloud.js', 'async function probarClaveDeAlumno');
  assert.equal((trozo.match(/CLOUD\.user = null/g) || []).length, 2,
    'dejar la cuenta de un alumno abierta en el equipo del docente es peor que no probar');
});

test('el botón avisa antes de cerrar la sesión del docente, no después', () => {
  const t = fs.readFileSync(path.join(__dirname, '..', 'js/teacher.js'), 'utf8');
  const i = t.indexOf("data-probar]");
  const trozo = t.slice(i, i + 900);
  assert.match(trozo, /askConfirm/);
  assert.match(trozo, /CIERRA tu sesión/);
  assert.ok(trozo.indexOf('askConfirm') < trozo.indexOf('probarClaveDeAlumno'));
});

test('probar no toca el diario del niño', () => {
  const trozo = cuerpoDe('js/cloud.js', 'async function probarClaveDeAlumno');
  assert.ok(!/cloudLoadState|getDocument|updateDocument/.test(trozo),
    'entrar como un alumno para comprobar algo no puede escribirle nada');
});
