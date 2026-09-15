/* La licencia.

   Publicar una licencia en el pie es una cesión de derechos: dice qué puede
   hacer con esto el maestro que se la encuentre. Lo que se fija aquí es que
   lo que se enseña en pantalla y lo que dice el repositorio no se separen —si
   se separan, una de las dos miente— y que la ficha esté escrita una sola
   vez. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('la licencia está declarada y completa', () => {
  const c = cargarApp();
  const l = c.ev('JSON.parse(JSON.stringify(AUTOR_ATLAS.licencia))');
  assert.equal(l.nombre, 'CC BY-NC-SA 4.0');
  assert.match(l.largo, /NoComercial/);
  assert.match(l.largo, /CompartirIgual/);
  assert.match(l.url, /^https:\/\/creativecommons\.org\/licenses\/by-nc-sa\/4\.0\//);
  assert.ok(Number(l.desde) >= 2026, 'el año del copyright');
});

test('el pie de la portada la enseña, con enlace a la licencia de verdad', () => {
  const c = cargarApp();
  c.ev('renderLicencia()');
  const h = String(c.ev("$('#home-licencia')").innerHTML);
  const l = c.ev('JSON.parse(JSON.stringify(AUTOR_ATLAS.licencia))');
  assert.ok(h.includes(l.nombre), 'falta el nombre de la licencia');
  assert.ok(h.includes(l.url), 'falta el enlace');
  assert.ok(h.includes(c.ev('AUTOR_ATLAS').nombre), 'falta a quién pertenece');
  assert.match(h, /©/);
  /* Y en castellano llano, que es a quien va dirigido. */
  assert.match(h, /citando la autoría/i);
  assert.match(h, /no se puede vender/i);
});

test('el enlace sale fuera sin dejar la puerta abierta', () => {
  /* `noopener` porque es una pestaña que no controlamos, y `license` para que
     se entienda de qué va el enlace. */
  const c = cargarApp();
  c.ev('renderLicencia()');
  const h = String(c.ev("$('#home-licencia')").innerHTML);
  assert.match(h, /rel="license noopener noreferrer"/);
  assert.match(h, /target="_blank"/);
});

test('la autoría y la licencia se pintan por separado', () => {
  /* Una función, una cosa: así cada una escribe en un solo elemento y ninguna
     pisa a la otra. Aquí ya se cayó una vez. */
  const c = cargarApp();
  c.ev('renderAutor()');
  const autor = String(c.ev("$('#home-autor')").innerHTML);
  assert.ok(autor.includes(c.ev('AUTOR_ATLAS').oficio), 'renderAutor ha pisado su propio texto');
  assert.ok(!/creativecommons/.test(autor), 'la licencia no se pinta desde renderAutor');
  const a = leer('js/app.js');
  assert.match(a, /function renderLicencia\(\)/);
  assert.match(a, /renderAutor\(\);\s*\n\s*renderLicencia\(\);/, 'hay que llamar a las dos');
});

test('el panel del docente dice la misma licencia que el pie', () => {
  /* Escrita dos veces a mano, un día dejan de coincidir. Las dos salen de la
     misma ficha. */
  const t = leer('js/teacher.js');
  assert.match(t, /AUTOR_ATLAS\.licencia\.nombre/);
  assert.match(t, /AUTOR_ATLAS\.licencia\.url/);
  /* Y nadie escribe el nombre de la licencia a pelo en ningún sitio. */
  ['js/app.js', 'js/teacher.js', 'index.html'].forEach(f => {
    assert.ok(!/CC BY-NC-SA/.test(leer(f)), `${f} escribe la licencia a mano`);
  });
});

test('el repositorio dice lo mismo que la pantalla', () => {
  const c = cargarApp();
  const l = c.ev('JSON.parse(JSON.stringify(AUTOR_ATLAS.licencia))');

  const lic = leer('LICENSE.md');
  assert.ok(lic.includes(l.nombre), 'LICENSE.md no nombra la licencia');
  assert.ok(lic.includes(c.ev('AUTOR_ATLAS').nombre), 'LICENSE.md no dice de quién es');
  assert.match(lic, /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/);

  const pkg = JSON.parse(leer('package.json'));
  assert.equal(pkg.license, 'CC-BY-NC-SA-4.0', 'package.json no la declara');
});

test('lo que NO cubre la licencia se dice, en vez de darse por hecho', () => {
  /* Las tipografías tienen su propia licencia y es una obligación de terceros:
     callarla sería incumplirla. Y los datos del alumnado no son parte de la
     obra ni viajan con ella. */
  const lic = leer('LICENSE.md');
  assert.match(lic, /SIL Open Font License/);
  assert.match(lic, /fonts\/LICENCIA\.md/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'fonts', 'LICENCIA.md')),
    'se cita un fichero de licencia que no existe');
  assert.match(lic, /datos del alumnado/i);
  assert.match(lic, /claves de API/i);
});

test('dar clase no es un uso comercial, y se dice', () => {
  /* Es la duda que va a tener cualquiera que la lea, y una licencia que deja
     esa duda abierta no la usa nadie. */
  const lic = leer('LICENSE.md');
  assert.match(lic, /no es un fin\s*\n?\s*comercial/i);
});
