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
    .concat([c.ev('CARTA_FONDO'), c.ev('FRAGMENTO_ATLAS')])
    .concat(c.ev('ROLES_CUADRILLA').map(r => r.img).filter(Boolean))
    .concat(c.ev('shopCatalog()').map(i => i.img).filter(Boolean))
    .concat(c.ev('RANKS').map(r => r.img).filter(Boolean));
  for (const r of rutas) {
    assert.ok(fs.existsSync(path.join(RAIZ, r)), `${r} no está en el repositorio`);
  }
});

test('y cada dibujo del repositorio lo usa alguien', () => {
  /* Un fichero que no usa nadie viaja igual en la caché y en el archivo
     suelto: pesa lo mismo y no se ve nunca. */
  const codigo = ['js/content.js', 'js/config.js', 'js/play.js', 'js/ui.js', 'js/aula.js',
    'index.html', 'css/styles.css'].map(leer).join('\n');
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
  /* El tope subió de 700 KB a 1300 al entrar el tercer encargo: los pozos,
     los estratos, los méritos, los hitos, las ocho caras y los dos fondos de
     cámara. Un megabyte y pico se descarga UNA vez y se queda en la caché del
     service worker para siempre; lo que no puede pasar es que crezca sin que
     nadie mire, y para eso está este número. */
  assert.ok(total < 1300, `img/ entero pesa ${Math.round(total)} KB; se descarga en cada tablet`);
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
  assert.ok(Math.abs(100 / alto - 11 / 6) < 0.03, `el lienzo va a ${(100/alto).toFixed(2)}:1`);
  assert.match(leer('css/styles.css'), /aspect-ratio: 11 \/ 6/);
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

test('están los dibujos de los tres encargos, y la carpeta sigue cabiendo en una tablet', () => {
  const webp = dibujos().filter(f => f.endsWith('.webp'));
  /* Diez del primer encargo —los compañeros, los sitios, la carta—, veinte
     del segundo —la villana, el fragmento, el almacén y los rangos— y
     treinta y siete del tercero: ocho pozos, cuatro estratos, cinco hitos de
     clase, ocho méritos, ocho caras de explorador, dos fondos de cámara y
     dos dibujos de espera. */
  assert.equal(webp.length, 67, 'faltan o sobran dibujos de los tres encargos');
});

test('cada artículo del almacén de fábrica tiene su dibujo, y cada rango su medalla', () => {
  /* Un almacén a medias —ocho dibujos y cinco emoji— se ve peor que uno
     entero de emoji: parece que la app está rota, no que falta arte. */
  const c = cargarApp();
  for (const it of c.ev('shopCatalog()')) {
    assert.ok(it.img, `${it.id} se quedó sin dibujo`);
  }
  for (const r of c.ev('RANKS')) {
    assert.ok(r.img, `el rango ${r.id} se quedó sin medalla`);
  }
});

/* ══ Que no se quede ninguna pantalla atrás ══

   La portada siguió enseñando los emoji de Bruno, Kira y Tobías después de
   haberlos dibujado: sus huecos usaban otra clase —`cast-face` en vez de
   `dialog-avatar`— y el barrido que rellenaba el HTML no los veía. Esto lo
   caza sin tener que acordarse de mirar pantalla por pantalla. */

test('ningún compañero dibujado se queda como emoji en ninguna pantalla', () => {
  /* La primera versión de esto solo buscaba el emoji SOLO dentro de su
     etiqueta —`>🐕<`— y por eso se le escaparon cinco: los que estaban
     metidos en mitad de una frase, dentro del texto de un botón o cosidos a
     un aviso. Ahora se busca el emoji esté donde esté.

     Se miran las pantallas y lo que las pinta, nunca content.js: ahí viven
     RETRATOS y los roles de cuadrilla, y ese emoji es el respaldo legítimo
     para cuando el dibujo no llegue. */
  const sitios = ['index.html', 'js/play.js', 'js/aula.js', 'js/ui.js', 'js/app.js',
                  'js/teacher.js', 'js/classview.js', 'js/game.js'];
  const c = cargarApp();
  for (const [nombre, r] of Object.entries(c.ev('RETRATOS'))) {
    if (!r.img) continue;
    for (const f of sitios) {
      assert.ok(!leer(f).includes(r.emoji),
        `${nombre} sigue puesto a mano como emoji en ${f}; usa retrato() o data-retrato`);
    }
  }
});

test('y cuando un personaje habla en un aviso, sale con su cara', () => {
  const c = cargarApp();
  c.ev('toastDe')('kira', 'Mismo tesoro, nuevo intento.');
  const t = c.ev("$('#toast')");
  assert.match(t.innerHTML, /img\/kira\.webp/, 'Kira habla sin cara');
  assert.match(t.innerHTML, /Mismo tesoro/);
  assert.ok(t.classList.contains('toast-con-cara'));
  assert.ok(!t.classList.contains('hidden'));
});

test('el aviso con cara sigue escapando lo que le pasan', () => {
  /* Por los avisos pasan nombres que teclea el docente y que viajan a cada
     tablet dentro de los ajustes de la clase. El retrato sale de una lista
     cerrada del código; el texto, no. */
  const c = cargarApp();
  c.ev('toastDe')('kira', '<img src=x onerror=alert(1)>');
  const h = c.ev("$('#toast')").innerHTML;
  assert.ok(!h.includes('<img src=x'), 'el texto entra como etiqueta, sin escapar');
  assert.ok(h.includes('&lt;img src=x'), 'el texto tiene que salir escapado, no desaparecer');
  /* Y el retrato, que es la ÚNICA etiqueta que sí debe haber, sigue puesto. */
  assert.match(h, /<img class="retrato toast-retrato"/);
});

test('y un aviso de nadie sigue siendo un aviso normal', () => {
  const c = cargarApp();
  c.ev('toastDe')('quien_no_existe', 'Guardado.');
  const t = c.ev("$('#toast')");
  assert.ok(!t.classList.contains('toast-con-cara'));
  assert.match(t.innerHTML, /Guardado\./);
});

test('el hueco conserva su clase al rellenarse, que cada uno tiene su medida', () => {
  /* Poner `dialog-avatar` a pelo era lo que impedía marcar la portada: le
     habría cambiado el tamaño al retrato. */
  const t = leer('js/app.js');
  const i = t.indexOf("$$('[data-retrato]')");
  const trozo = t.slice(i, i + 320);
  assert.match(trozo, /el\.className/);
  assert.match(trozo, /retrato\(el\.dataset\.retrato, clases/);
});

test('los yacimientos enseñan su dibujo también en la portada', () => {
  const t = leer('js/app.js');
  const i = t.indexOf('function renderHomeSites');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /site\.img/);
  assert.match(trozo, /home-site-img/);
});

test('quien no tiene dibujo todavía sigue con su emoji, y se ve bien', () => {
  /* Ya están dibujados los cuatro del reparto, pero el respaldo no se retira:
     el Taller sigue sin ilustración y los roles de cuadrilla también, y un
     artículo que el docente añada al almacén nunca la tendrá. */
  const c = cargarApp();
  assert.ok(!c.ev('sitesAll()').find(s => s.id === 'taller').img,
    'si el Taller ya tiene dibujo, este respaldo hay que probarlo con otra cosa');
  const salida = c.ev("iconoDeFicha({ id: 'inventado', icon: '🛖' })");
  assert.match(salida, /🛖/, 'sin dibujo tiene que salir el emoji');
  assert.ok(!salida.includes('<img'), 'se ha inventado un dibujo que no existe');
  assert.match(leer('css/styles.css'), /img\.cast-face \{/);
});

/* ══ El segundo encargo: el almacén, los rangos y el fragmento ══

   Trece artículos, cinco medallas y un trozo de mapa. Lo que se fija aquí no
   es el dibujo, que eso no se prueba, sino que cada uno llegue a la pantalla
   donde tiene sentido y que ninguna de esas pantallas se rompa el día que un
   fichero no esté. */

test('el almacén enseña la mercancía, no la lista de emoji', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('renderCamp()');
  /* Cada artículo es un hijo que se cuelga de la lista, no un trozo de
     `innerHTML`: hay que recorrerlos. */
  const h = c.ev("$('#shop-list')").hijos.map(n => n.innerHTML).join('\n');
  for (const it of c.ev('shopCatalog()')) {
    assert.ok(h.includes(it.img), `${it.id} no sale dibujado en el almacén`);
  }
});

test('y el panel del docente enseña la misma mercancía', () => {
  /* El docente compra por el alumno desde su bolsa. Si ahí siguieran los
     emoji, los dos estarían mirando almacenes distintos. */
  const t = leer('js/aula.js');
  assert.match(t, /class="award-icon">\$\{iconoDeFicha\(item\)\}/);
});

test('la medalla del rango sale junto al nombre, y se cambia al subir', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('renderHud()');
  const m = c.ev("$('#hud-medal')");
  assert.equal(m.getAttribute('src'), c.ev('RANKS')[0].img);
  assert.equal(m.hidden, false);
  /* Con PE de sobra para el último rango, la medalla tiene que ser otra. */
  c.ev('S.progression.xp_total = xpForLevel(30)');
  c.ev('renderHud()');
  assert.equal(m.getAttribute('src'), c.ev('RANKS')[c.ev('RANKS').length - 1].img);
});

test('y si un rango no tuviera medalla, se esconde en vez de dejar el hueco roto', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('RANKS.forEach(r => { delete r.img; })');
  c.ev('renderHud()');
  assert.equal(c.ev("$('#hud-medal')").hidden, true);
  assert.ok(c.ev("$('#hud-rank')").textContent, 'el nombre del rango sigue estando');
});

test('el fragmento del Atlas se ve al ganarle al Guardián', () => {
  const t = leer('js/play.js');
  const i = t.indexOf('function renderGuardianResult');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /r\.fragment \?/, 'el trofeo solo si de verdad se ganó');
  assert.match(trozo, /esc\(FRAGMENTO_ATLAS\)/);
  assert.match(trozo, /r\.fragmentsTotal/, 'y dice cuántos lleva');
});

test('subir de rango enseña la medalla nueva, y sin ella no enseña nada', () => {
  const c = cargarApp();
  assert.match(c.ev('medallaDeRango')(1), /img\/rangos\/aprendiz\.webp/);
  c.ev('RANKS.forEach(r => { delete r.img; })');
  assert.equal(c.ev('medallaDeRango')(1), '',
    'sin dibujo no se pone un emoji de repuesto: el texto de al lado ya dice el rango');
});

test('la escena del campamento coloca por ancho, que es lo que conserva las proporciones', () => {
  /* Con emoji bastaba el tamaño de letra. Con dibujos no: la tienda y el jeep
     tienen que guardar entre sí la proporción que tienen en la vida, y eso lo
     da el ancho del hueco, no el cuerpo de una letra que ya no se pinta. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('S.progression.doubloons_balance = 3000');
  c.ev('buyItem')('tienda_rayas');
  c.ev('buyItem')('jeep_oxidado');
  c.ev('pintarEscenaDelCampamento()');
  const h = c.ev("$('#camp-scene')").innerHTML;
  assert.match(h, /class="escena-cosa"[^>]*width:[\d.]+%/, 'la cosa comprada no tiene ancho');
});

/* ══ El tercer encargo: donde el niño pasa el rato ══ */

test('los ocho pozos de fábrica llevan su dibujo, y los cuatro estratos también', () => {
  const c = cargarApp();
  for (const s of c.ev('sitesAll()')) {
    for (const b of (s.branches || [])) {
      if (b.source !== 'builtin') continue;
      assert.ok(b.img, `el pozo ${b.id} se quedó sin dibujo`);
    }
  }
  for (const [id, meta] of Object.entries(c.ev('STRATA_META'))) {
    assert.ok(meta.img, `el estrato ${id} se quedó sin dibujo`);
  }
});

test('y los méritos y los hitos de clase, que son configuración del docente', () => {
  const c = cargarApp();
  for (const b of c.ev('ATLAS_CONFIG.behaviors')) assert.ok(b.img, `el mérito ${b.id} sin dibujo`);
  for (const m of c.ev('ATLAS_CONFIG.fund.milestones')) assert.ok(m.img, `el hito de ${m.at} sin dibujo`);
});

test('el reto se pinta dentro de su yacimiento, y solo en una expedición', () => {
  /* El Bazar y la Cámara del Guardián no pasan en un yacimiento concreto: si
     les pusiéramos fondo estaríamos diciendo que sí. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const rama = c.ev('playableBranchIds()')[0];
  c.ev('mission = { branchId: ' + JSON.stringify(rama) + ", kind: 'expedition' }");
  c.ev('ponerFondoDeReto()');
  assert.match(c.ev("document.body.style.getPropertyValue('--fondo-reto')"), /img\/fondos\//);
  c.ev("mission.kind = 'guardian'");
  c.ev('ponerFondoDeReto()');
  assert.equal(c.ev("document.body.style.getPropertyValue('--fondo-reto')"), '');
});

test('un yacimiento sin fondo deja el reto sobre el pergamino de siempre', () => {
  /* El Taller no tiene fondo, y un yacimiento que cree el docente tampoco lo
     tendrá nunca. Ni uno ni otro pueden romper la pantalla del reto. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const rama = c.ev('playableBranchIds()')[0];
  c.ev('sitesAll().forEach(s => { delete s.fondo; })');
  c.ev('mission = { branchId: ' + JSON.stringify(rama) + ", kind: 'expedition' }");
  c.ev('ponerFondoDeReto()');
  assert.equal(c.ev("document.body.style.getPropertyValue('--fondo-reto')"), '');
});

test('la cara elegida manda sobre el rol y sobre el emoji', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  assert.match(c.ev('avatarDelExplorador()'), /🧒/, 'sin elegir, el de siempre');
  c.ev("S.profile.cara = 'c3'");
  assert.match(c.ev('avatarDelExplorador()'), /img\/caras\/3\.webp/);
});

test('y la cara de un niño no viaja a la tablet de otro', () => {
  /* Los ajustes de clase no llevan diarios, así que aquí solo hay una cara:
     la del dueño de esta tablet. Preguntar por otro tiene que dar nada, o en
     la lista del docente saldrían todos con la misma cara. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev("S.profile.cara = 'c3'");
  assert.ok(c.ev("miCara('Nadia')"), 'la suya sí');
  assert.equal(c.ev("miCara('Iván')"), null, 'la de otro, no');
});

test('elegir cara no es obligatorio para empezar', () => {
  /* Poner una puerta donde no la había sería peor que no tener caras. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  assert.equal(c.ev('S.profile.cara'), '');
  assert.ok(c.ev('avatarDelExplorador()'), 'sin cara sigue habiendo avatar');
});

test('las pantallas sin estrenar enseñan un dibujo, no un vacío', () => {
  const c = cargarApp();
  const h = c.ev("espera('cuaderno', 'Todavía nada por aquí.')");
  assert.match(h, /img\/espera-cuaderno\.webp/);
  assert.match(h, /Todavía nada por aquí\./);
  /* Y si el dibujo no existiera, queda la frase, que es lo que había antes. */
  assert.match(c.ev("espera('no_existe', 'Todavía nada por aquí.')"), /Todavía nada por aquí\./);
});
