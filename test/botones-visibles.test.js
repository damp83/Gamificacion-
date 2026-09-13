/* Que se vea dónde se toca.

   El maestro lo dijo así: «Los botones para volver a las pantallas no se ven
   claramente, al igual que el pie de página». Y era verdad por la misma razón
   en los dos sitios: las dos cosas iban sin fondo propio encima de la mitad de
   abajo de la pantalla, que es donde el fondo deja de ser pergamino y pasa a
   ser la duna oscura y la pirámide del horizonte. Un «← Volver a la portada»
   en marrón claro justo encima de una pirámide marrón no se lee y, peor, no
   parece que se pueda tocar.

   Esto fija que ninguno de los dos vuelva a quedarse sin su papel debajo. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* Devuelve el cuerpo de una regla del CSS, por el selector exacto. */
function regla(css, selector) {
  const i = css.indexOf(selector + ' {');
  assert.ok(i >= 0, `no está la regla «${selector}»`);
  return css.slice(i, css.indexOf('}', i));
}

test('los botones de volver llevan papel y filete propios', () => {
  const cuerpo = regla(leer('css/styles.css'), '.btn-back, .btn-quit');
  assert.ok(!/background:\s*transparent/.test(cuerpo),
    'sin fondo se confunden con el paisaje del horizonte');
  assert.ok(/background:\s*var\(--surface\)/.test(cuerpo), 'les falta el papel');
  assert.ok(/border:\s*var\(--line-strong\)/.test(cuerpo), 'les falta el filete');
});

test('sobre la cabecera de cuero el mismo botón se dibuja en claro', () => {
  /* Si heredaran el papel blanco serían un parche encima del cuero. */
  const cuerpo = regla(leer('css/styles.css'), '.aula-alumno .btn-quit');
  assert.ok(/background:\s*rgba\(255,\s*255,\s*255/.test(cuerpo));
  assert.ok(/border-color:\s*rgba\(247,\s*234,\s*210/.test(cuerpo));
});

test('el pie de la portada se apoya en un panel de papel', () => {
  const html = leer('index.html');
  const i = html.indexOf('<footer class="home-pie">');
  assert.ok(i > 0, 'el pie y la autoría tienen que ir dentro del panel');
  const dentro = html.slice(i, html.indexOf('</footer>', i));
  assert.ok(dentro.includes('class="home-foot"'));
  assert.ok(dentro.includes('id="home-autor"'));

  const cuerpo = regla(leer('css/styles.css'), '.home-pie');
  assert.ok(/background:\s*rgba\(255,\s*253,\s*247/.test(cuerpo), 'el panel no tiene papel');
});

test('el pie ya no va en la tinta más clara ni al tamaño más pequeño', () => {
  const css = leer('css/styles.css');
  ['.home-foot', '.home-autor'].forEach(sel => {
    const cuerpo = regla(css, sel);
    assert.ok(!/--ink-faint/.test(cuerpo), `${sel} seguía en la tinta más clara`);
    assert.ok(!/font-size:\s*var\(--t-xs\)/.test(cuerpo), `${sel} seguía al tamaño más pequeño`);
  });
});

/* ── El hueco de las barras fijas ──
   Reservaba 46 px a ojo para una barra que mide 62, y los 16 que faltaban se
   comían el borde de arriba del botón de volver. Ahora se mide. */
test('el hueco de las barras de arriba sale medido, no adivinado', () => {
  const css = leer('css/styles.css');
  ['body.en-demo #main', 'body.en-consulta #main', 'body.en-demo.en-consulta #main'].forEach(sel => {
    assert.ok(/padding-top:\s*var\(--barras-fijas/.test(regla(css, sel)),
      `${sel} seguía con el hueco escrito a mano`);
  });
  ['body.en-demo #hud', 'body.en-consulta #hud', 'body.en-demo.en-consulta #hud'].forEach(sel => {
    assert.ok(/top:\s*var\(--barras-fijas/.test(regla(css, sel)));
  });
});

test('medirBarrasFijas suma solo las barras que están puestas', () => {
  const c = cargarApp();
  /* El DOM de mentira no maqueta nada, así que todo mide cero: lo que se fija
     aquí es que la función publique las dos variables y no reviente. */
  assert.strictEqual(c.ev('typeof medirBarrasFijas'), 'function');
  assert.strictEqual(c.ev('medirBarrasFijas()'), 0);
  assert.strictEqual(
    c.ev("document.documentElement.style.getPropertyValue('--barras-fijas')"), '0px');
  assert.strictEqual(
    c.ev("document.documentElement.style.getPropertyValue('--alto-demo')"), '0px');
});

test('la barra de la demostración vuelve a medirse al ponerla y al quitarla', () => {
  /* Si no se midiera al cambiarla, el hueco se quedaría con el alto de antes y
     recortaría lo primero que hubiera debajo: el botón de volver. */
  const demo = leer('js/demo.js');
  const i = demo.indexOf('function pintarBarraDemo');
  assert.ok(demo.slice(i, i + 260).includes('medirBarrasFijas()'));
  const aula = leer('js/aula.js');
  assert.ok(/#lectura-bar'\)\.classList\.remove\('hidden'\);\s*\n\s*medirBarrasFijas\(\);/.test(aula));
  assert.ok(/#lectura-bar'\)\.classList\.add\('hidden'\);\s*\n\s*medirBarrasFijas\(\);/.test(aula));
  assert.ok(leer('js/app.js').includes("addEventListener('resize', medirBarrasFijas)"),
    'al girar la tablet cambia el alto de la barra y hay que volver a medir');
});
