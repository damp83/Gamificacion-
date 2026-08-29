/* Lo que salió de medir la interfaz, no de mirarla. Estas pruebas leen la
   hoja de estilos que se sirve: si alguien deshace uno de estos arreglos, se
   ponen rojas antes de que llegue a un aula. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
/* Las declaraciones de TODAS las reglas con ese selector, juntas: un mismo
   selector puede aparecer varias veces y quedarse uno con la primera es cómo
   una prueba dice que falta algo que sí está. */
function regla(selector) {
  const trozos = [];
  let i = CSS.indexOf(selector + ' {');
  while (i >= 0) {
    trozos.push(CSS.slice(i, CSS.indexOf('}', i)));
    i = CSS.indexOf(selector + ' {', i + 1);
  }
  return trozos.length ? trozos.join('\n') : null;
}

test('la letra grande escala la ESCALA, no solo el body', () => {
  /* Era el fallo de fondo: toda la tipografía va en `rem`, que se resuelve
     contra la raíz. Cambiar el `font-size` del body no movía ni un token, así
     que con el ajuste puesto la letra más pequeña seguía en 12,5 px: justo la
     que necesita el niño de seis años. */
  const b = regla('body.large-text');
  assert.ok(b, 'existe el modo de letra grande');
  for (const t of ['--t-xs', '--t-sm', '--t-base', '--t-md', '--t-lg']) {
    assert.match(b, new RegExp(t + ':\\s*[\\d.]+rem'), t + ' sin escalar');
  }
});

test('el paso más pequeño de la letra grande queda por encima de 14 px', () => {
  /* 14 px es el suelo para leer en una tablet a un palmo de la cara. */
  const b = regla('body.large-text');
  const xs = parseFloat(b.match(/--t-xs:\s*([\d.]+)rem/)[1]);
  assert.ok(xs * 16 >= 14, `--t-xs queda en ${xs * 16}px`);
});

test('los campos del Taller están vestidos y se pueden tocar', () => {
  /* Es el único sitio donde un niño teclea, y los estilos de formulario
     colgaban de `.cfg-body`, que es el panel del docente: aquí salían los del
     navegador, de 19 px de alto. */
  const i = CSS.indexOf('#taller-block input[type="text"]');
  assert.ok(i > 0, 'el Taller tiene estilos propios de campo');
  const bloque = CSS.slice(i, CSS.indexOf('}', i));
  assert.match(bloque, /min-height:\s*2\.75rem/, '44 px de alto mínimo');
  assert.match(bloque, /font-size:\s*var\(--t-md\)/, 'letra de tamaño de lectura');
});

test('la marca de la respuesta correcta es grande', () => {
  /* Es la decisión que más caro cuesta equivocar del formulario, y venía en
     el radio de 13 px que pinta el navegador. */
  const b = regla('.taller-opcion input[type="radio"]');
  assert.ok(b, 'la marca tiene tamaño propio');
  assert.match(b, /width:\s*1\.5rem/);
  assert.match(b, /height:\s*1\.5rem/);
});

test('los botones de la misión se envuelven en vez de salirse', () => {
  /* Tres botones —pista, escuchar y abandonar— no caben en una fila de 390 px
     con la letra grande de 1.º: «Abandonar» se salía 40 px de la pantalla. */
  assert.match(regla('.mission-tools'), /flex-wrap:\s*wrap/);
});

test('los dos ajustes de accesibilidad tienen fila de 44 px', () => {
  assert.match(regla('.camp-prefs .cfg-field-inline'), /min-height:\s*2\.75rem/);
});
