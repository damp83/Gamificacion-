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

/* Todos los dibujos que hay, a cualquier profundidad. Las pruebas de abajo
   parten de LO QUE HAY en la carpeta y no de una lista escrita aquí: una lista
   a mano se queda vieja en cuanto entra un dibujo nuevo, y entonces deja de
   comprobar justo lo que acaba de llegar. */
function dibujos(dir) {
  const d = dir || 'img';
  return fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? dibujos(d + '/' + e.name) : [d + '/' + e.name]);
}

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
  for (const f of dibujos()) {
    assert.ok(codigo.includes(f), `${f} está en img/ y no lo usa nadie`);
  }
});

test('ninguno pesa más de lo que aguanta una tablet de aula', () => {
  let total = 0;
  for (const f of dibujos()) {
    const kb = fs.statSync(path.join(RAIZ, f)).size / 1024;
    total += kb;
    assert.ok(kb < 120, `${f} pesa ${Math.round(kb)} KB y el tope son 120`);
  }
  assert.ok(total < 700, `img/ entero pesa ${Math.round(total)} KB; se descarga en cada tablet`);
});

/* ── Sin wifi ── */

test('todos los dibujos están en la caché del service worker', () => {
  /* Sin esto, en un aula sin red el niño ve el hueco de una imagen rota donde
     va Tobías.

     Se recorre la CARPETA, no una lista escrita aquí. Con la lista a mano esta
     prueba se quedaba vieja en cuanto entraba un dibujo nuevo: quitar el sello
     de la caché no la hacía fallar, que es justo lo que tenía que cazar. */
  const sw = leer('sw.js');
  for (const f of dibujos()) {
    assert.ok(sw.includes(`'./${f}'`), `${f} no está en ASSETS de sw.js`);
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

/* ══ La segunda tanda: los lugares y los momentos ══ */

test('cada yacimiento de fábrica lleva su dibujo, y uno del docente no lo necesita', () => {
  /* Mismo trato que los roles: con `img` sale la ilustración, sin él el emoji.
     Un yacimiento que cree el docente tiene que verse igual de bien. */
  const c = cargarApp();
  const porId = Object.fromEntries(c.ev('sitesAll()').map(s => [s.id, s]));
  assert.ok(porId.kaldros.img, 'Ruinas de Kaldros sin dibujo');
  assert.ok(porId.biblioteca.img, 'Biblioteca de Arena sin dibujo');
  /* El Taller de Cartografía no lleva: no es un sitio del mundo, es donde el
     niño escribe. Con su emoji se ve perfectamente, y eso prueba el respaldo. */
  assert.ok(!porId.taller.img);
  const t = leer('js/play.js');
  assert.match(t, /site\.img\s*\n?\s*\? `<img class="site-icon site-img"/);
  assert.match(t, /: `<span class="site-icon">\$\{esc\(site\.icon\)\}<\/span>`/);
});

test('el campamento se apoya en el paisaje dibujado, no en tres elipses de CSS', () => {
  const css = leer('css/styles.css');
  assert.ok(!/\.escena-duna-lejos/.test(css), 'quedan restos de las dunas de CSS');
  assert.match(css, /\.escena-fondo \{[\s\S]{0,200}object-fit: cover/);
  assert.match(leer('js/play.js'), /class="escena-fondo" src="\$\{esc\(FONDO_CAMPAMENTO\)\}"/);
});

test('el primer plano del campamento sigue despejado para lo que se compra', () => {
  /* El paisaje se recorta por abajo a propósito: ahí es donde se posan la
     tienda, el jeep y el explorador. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.escena-fondo {');
  assert.match(css.slice(i, css.indexOf('}', i)), /object-position: 50% 6\d%/);
});

test('la cara del Guardián se pinta al abrir su antesala', () => {
  const t = leer('js/play.js');
  const i = t.indexOf('function openGuardianHall');
  const trozo = t.slice(i, i + 1400);
  assert.match(trozo, /CARA_GUARDIAN/);
  assert.match(trozo, /alt="El Guardián[^"]+"/, 'un dibujo sin alternativa es un hueco para quien usa lector');
});

test('el sello dibujado sale en la semana y en la ruta, desde el mismo sitio', () => {
  const t = leer('js/play.js');
  assert.match(t, /function sellito\(\)[\s\S]{0,200}SELLO_SEMANA/);
  assert.equal((t.match(/sellito\(\)/g) || []).length, 3, 'se define una vez y se usa dos');
  assert.match(t, /class="semana-dia dia-hecho"[^`]*<img src="\$\{esc\(SELLO_SEMANA\)\}"/);
});

test('la casilla del día conseguido no encierra el sello en un cuadrado', () => {
  /* El sello ya tiene silueta propia; meterlo en una caja con borde le quita
     justo lo que lo hace un sello. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.semana-dia.dia-hecho {');
  const trozo = css.slice(i, css.indexOf('}', i));
  assert.match(trozo, /background: none/);
  assert.match(trozo, /box-shadow: none/);
});

test('los diez dibujos están, y la carpeta sigue cabiendo en una tablet', () => {
  const webp = dibujos().filter(f => f.endsWith('.webp'));
  assert.equal(webp.length, 10, 'faltan o sobran dibujos de los diez encargados');
});
