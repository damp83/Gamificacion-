/* Retos que van de lo que dice el pozo.

   El generador no sabía a qué pozo iban: elegía concepto de todo el catálogo
   de la materia, con el currículo del curso como único límite. Se pedían diez
   retos para «La Balanza del Mercader» —fracciones— y salían de numeración:
   bien escritos, bien validados, y en el sitio equivocado. El docente los
   movía uno a uno con los desplegables, que es exactamente el trabajo que la
   generación venía a ahorrar. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const gen = () => cargarApp(['content', 'generador']);

test('el pozo viaja en el encargo, con lo que se trabaja dentro', () => {
  const c = gen();
  const p = c.ev('promptGenerador')({
    materia: 'matematicas', curso: 4, estrato: 'aplicar', n: 1,
    curriculo: 'Fracciones y numeración.',
    pozo: { name: 'La Balanza del Mercader', contenido: 'Fracciones: comparar y equivalentes.',
            yacimiento: 'Ruinas de Kaldros' }
  });
  assert.match(p.usuario, /La Balanza del Mercader/);
  assert.match(p.usuario, /Ruinas de Kaldros/);
  assert.match(p.usuario, /Fracciones: comparar y equivalentes/);
});

test('y la regla dice que el tema del pozo manda sobre la variedad', () => {
  /* Sin esto, la regla de variar conceptos empujaba justo a lo contrario. */
  const c = gen();
  const p = c.ev('promptGenerador')({ materia: 'matematicas', curso: 4, estrato: 'aplicar' });
  assert.match(p.sistema, /reto tiene que ser DE ESO/);
  assert.match(p.sistema, /Manda el\n?\s*tema del pozo sobre la variedad/);
});

test('un pozo sin «qué se trabaja» cae en su ambientación, no en nada', () => {
  /* Los pozos hechos a mano antes de esto no lo tienen. La ambientación es
     ficción, pero dice de qué va el pozo mejor que el silencio. */
  const c = gen();
  const p = c.ev('promptGenerador')({
    materia: 'lengua', curso: 3, estrato: 'recordar',
    pozo: { name: 'Las Tablillas Rotas', contenido: '', desc: 'Copias mal escritas de un texto.' }
  });
  assert.match(p.usuario, /Las Tablillas Rotas/);
  assert.match(p.usuario, /Copias mal escritas/);
});

test('sin pozo, el encargo sigue siendo válido', () => {
  /* La generación no puede depender de un campo nuevo: un ajuste viejo o una
     llamada desde otro sitio no traen pozo. */
  const c = gen();
  const p = c.ev('promptGenerador')({ materia: 'lengua', curso: 3, estrato: 'recordar', n: 2 });
  assert.match(p.usuario, /Materia: Lengua/);
  assert.ok(!/Pozo al que va/.test(p.usuario));
});

test('los ocho pozos de fábrica dicen de qué van', () => {
  /* Si no, el arreglo solo serviría en los pozos creados a partir de hoy y el
     docente no entendería por qué unos aciertan y otros no. */
  const c = cargarApp();
  const sitios = c.ev('defaultSites()');
  const generables = [];
  for (const s of sitios) for (const b of (s.branches || [])) {
    if (b.source === 'builtin') generables.push(b);
  }
  assert.equal(generables.length, 8);
  for (const b of generables) {
    assert.ok((b.contenido || '').length > 30, `«${b.name}» no dice qué se trabaja en él`);
  }
});

test('el contenido de un pozo de fábrica habla de su materia', () => {
  /* Una comprobación tonta que caza el copiar-pegar: el pozo de fracciones
     tiene que hablar de fracciones. */
  const c = cargarApp();
  const de = id => {
    for (const s of c.ev('defaultSites()')) {
      const b = (s.branches || []).find(x => x.id === id);
      if (b) return (b.contenido || '').toLowerCase();
    }
    return '';
  };
  assert.match(de('fracciones'), /fracc/);
  assert.match(de('decimales'), /decimal/);
  assert.match(de('ortografia'), /ortograf/);
  assert.match(de('comprension'), /compren/);
});

test('el panel manda el pozo elegido, no solo su id', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /pozo: temaDelPozo\(pozo\[0\], pozo\[1\]\)/);
  assert.match(t, /function temaDelPozo\(siteId, branchId\)/);
});

test('temaDelPozo saca el nombre, el contenido y el yacimiento', () => {
  const c = cargarApp();
  const t = c.ev('temaDelPozo')('kaldros', 'fracciones');
  assert.equal(t.name, 'La Balanza del Mercader');
  assert.equal(t.yacimiento, 'Ruinas de Kaldros');
  assert.match(t.contenido, /Fracciones/);
  assert.equal(c.ev('temaDelPozo')('no-existe', 'tampoco'), null);
});

test('el panel avisa antes de generar si el pozo no dice de qué va', () => {
  /* Gastar una tanda de diez para descubrir que salen de cualquier cosa es
     tarde: se dice al elegir el pozo, que es cuando se puede arreglar. */
  const t = leer('js/teacher.js');
  assert.match(t, /Se generarán retos de: \$\{esc\(tema\.contenido\)\}/);
  assert.match(t, /Este pozo no dice qué se trabaja en él/);
});

test('el docente puede escribir de qué va cualquier pozo suyo', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /class="cfg-b2-cont"/);
  assert.match(t, /wBranch\(\+e\.target\.dataset\.si, \+e\.target\.dataset\.bi, 'contenido', e\.target\.value\)/);
});

test('lo que escribe la asistente es el mismo campo que lee el generador', () => {
  /* Dos campos con el mismo significado acaban diciendo cosas distintas. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("$('#prop-ok')");
  assert.match(t.slice(i, i + 1400), /contenido: b\.contenido \|\| ''/);
});
