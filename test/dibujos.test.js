/* Los dibujos.

   Bruno, Kira y Tobías salían NOMBRADOS en los textos —«Tobías te mira con
   cara de yo también me equivoco»— y no aparecían por ninguna parte: eran tres
   emoji. Y la pantalla se llamaba «El Mapa del Atlas» sin mapa. Esto fija que
   los dibujos estén donde tienen que estar, que lleguen a un aula sin wifi, y
   que el día que falte uno la pantalla no se rompa. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* ── Los ficheros ── */

test('cada dibujo que el código nombra existe de verdad', () => {
  const c = cargarApp();
  const rutas = Object.values(c.ev('RETRATOS')).map(r => r.img)
    .concat([c.ev('CARTA_FONDO')])
    .concat(c.ev('ROLES_CUADRILLA').map(r => r.img).filter(Boolean));
  for (const r of rutas) {
    assert.ok(fs.existsSync(path.join(RAIZ, r)), `${r} no está en el repositorio`);
  }
});

test('y cada dibujo del repositorio lo usa alguien', () => {
  /* Un fichero que no usa nadie viaja igual en la caché y en el archivo
     suelto: pesa lo mismo y no se ve nunca. */
  const codigo = ['js/content.js', 'js/play.js', 'js/ui.js', 'js/aula.js', 'index.html', 'css/styles.css']
    .map(leer).join('\n');
  const paseo = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? paseo(dir + '/' + e.name) : [dir + '/' + e.name]);
  for (const f of paseo('img')) {
    assert.ok(codigo.includes(f), `${f} está en img/ y no lo usa nadie`);
  }
});

test('ninguno pesa más de lo que aguanta una tablet de aula', () => {
  const paseo = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? paseo(dir + '/' + e.name) : [dir + '/' + e.name]);
  let total = 0;
  for (const f of paseo('img')) {
    const kb = fs.statSync(path.join(RAIZ, f)).size / 1024;
    total += kb;
    assert.ok(kb < 120, `${f} pesa ${Math.round(kb)} KB y el tope son 120`);
  }
  assert.ok(total < 700, `img/ entero pesa ${Math.round(total)} KB; se descarga en cada tablet`);
});

/* ── Sin wifi ── */

test('todos los dibujos están en la caché del service worker', () => {
  /* Sin esto, en un aula sin red el niño ve el hueco de una imagen rota donde
     va Tobías. */
  const sw = leer('sw.js');
  const c = cargarApp();
  const rutas = Object.values(c.ev('RETRATOS')).map(r => r.img)
    .concat([c.ev('CARTA_FONDO')])
    .concat(c.ev('ROLES_CUADRILLA').map(r => r.img).filter(Boolean));
  for (const r of rutas) {
    assert.ok(sw.includes(`'./${r}'`), `${r} no está en ASSETS de sw.js`);
  }
});

test('el archivo suelto se los lleva dentro, sea cual sea su formato', () => {
  const t = leer('tools/build-standalone.py');
  assert.match(t, /rglob\('\*'\)/, 'recorre img/ entero, no solo una subcarpeta');
  assert.match(t, /'\.webp': 'image\/webp'/, 'un webp incrustado como png no se ve');
  assert.match(t, /está en la carpeta pero no lo usa nadie/, 'el guion sigue avisando de lo que sobra');
});

/* ── Que no se rompa nada si falta un dibujo ── */

test('sin dibujo, sale el emoji y la pantalla sigue entera', () => {
  const c = cargarApp();
  c.ev("RETRATOS.tobias.img = ''");
  const h = c.ev('retrato')('tobias');
  assert.match(h, /retrato-emoji/);
  assert.match(h, /🐕/);
});

test('un nombre que no existe no revienta: devuelve nada', () => {
  const c = cargarApp();
  assert.equal(c.ev('retrato')('nadie'), '');
});

test('cada retrato dice quién es para quien usa lector', () => {
  const c = cargarApp();
  for (const k of Object.keys(c.ev('RETRATOS'))) {
    const h = c.ev('retrato')(k);
    assert.match(h, /alt="[^"]{6,}"/, `${k} sin texto alternativo`);
  }
});

/* ── Dónde sale cada uno ── */

test('los avatares de diálogo salen del mismo sitio, no copiados a mano', () => {
  /* El día que cambie un dibujo tiene que cambiar en todos a la vez. */
  for (const f of ['js/play.js', 'js/aula.js']) {
    assert.ok(!/<span class="dialog-avatar">[^<]/.test(leer(f)), `${f} conserva un emoji a mano`);
  }
  assert.match(leer('js/app.js'), /\[data-retrato\]/, 'los del HTML se rellenan al arrancar');
});

test('Tobías tiene dos caras, y la de fallar acompaña en vez de celebrar', () => {
  const c = cargarApp();
  assert.ok(c.ev('RETRATOS').tobias.img !== c.ev('RETRATOS').tobiasFiesta.img);
  const mal = c.ev('ANIMOS_MAL').map(a => a.quien);
  assert.ok(!mal.includes('tobiasFiesta'), 'nadie celebra cuando el niño se equivoca');
  assert.ok(c.ev('ANIMOS_BIEN').map(a => a.quien).includes('tobiasFiesta'));
});

test('en el campamento, Tobías cambia de cara con las golosinas', () => {
  const c = cargarApp();
  assert.equal(c.ev('estadoDeTobias')(0).quien, 'tobias');
  assert.equal(c.ev('estadoDeTobias')(2).quien, 'tobiasFiesta');
});

/* ── La carta ── */

test('el mapa se dibuja dos veces: enterrado y limpio', () => {
  /* La excavación no descubre otro mundo, quita la arena de este. */
  const t = leer('js/play.js');
  const i = t.indexOf('function pintarCartaDeExpedicion');
  const trozo = t.slice(i, i + 5000);
  assert.equal((trozo.match(/<image href="\$\{CARTA_FONDO\}"/g) || []).length, 2);
  assert.match(trozo, /<g mask="url\(#atlas-claros\)">\s*<image/);
});

test('el lienzo tiene la proporción del dibujo, no una inventada', () => {
  /* Estirar una ilustración se nota siempre, y recortarla se llevaría los
     bordes rotos del pergamino. */
  const c = cargarApp();
  const png = fs.readFileSync(path.join(RAIZ, c.ev('CARTA_FONDO')));
  /* WebP: el tamaño va en la cabecera VP8L/VP8X; basta con que exista. */
  assert.ok(png.length > 1000);
  const alto = c.ev('CARTA_ALTO');
  assert.ok(Math.abs(100 / alto - 499 / 272) < 0.05, `el lienzo va a ${(100/alto).toFixed(2)}:1`);
  assert.match(leer('css/styles.css'), /aspect-ratio: 499 \/ 272/);
});

/* ── El fallo que costó una pantalla ── */

test('la clase del retrato no manda sobre el tamaño de cada sitio', () => {
  /* `.retrato` declaraba un ancho y, por ir después en la hoja, ganaba a la
     clase del sitio: Bruno salía a pantalla completa en la ficha de resultado. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.retrato { object-fit');
  assert.ok(i > 0, '.retrato tiene que declarar solo el encaje');
  const trozo = css.slice(i, css.indexOf('}', i));
  assert.ok(!/width|height/.test(trozo), '.retrato vuelve a declarar tamaño');
  assert.match(css, /img\.dialog-avatar \{[\s\S]{0,120}width: 2\.7rem/);
  assert.match(css, /img\.feedback-quien \{[\s\S]{0,120}width: 3rem/);
});
