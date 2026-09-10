/* Lo que hace que un niño de ocho años mire la pantalla.

   La app era correcta y era gris: seis tarjetas idénticas donde ninguna decía
   «aquí», el momento del premio como un recibo ya impreso, y unos personajes
   —Kira, Tobías, el profesor Ocaña— que salían nombrados en los textos y no
   aparecían por ninguna parte.

   Lo que se fija aquí no es que sea bonito, que eso no se prueba, sino las
   decisiones que hay debajo: que la app diga por dónde seguir en vez de dejar
   elegir a ciegas, que la racha empiece donde hay algo que perder, y que nada
   de esto castigue el error ni se le imponga a quien ha pedido menos
   movimiento. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* ══ Por dónde seguir ══ */

test('con todo por empezar, propone el primer estrato abierto', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const d = c.ev('dondeSeguir()');
  assert.ok(d, 'sin propuesta, el mapa vuelve a ser seis tarjetas iguales');
  assert.equal(d.stratumId, c.ev('STRATA_ORDER')[0]);
});

test('con algo a medias, manda ahí: volver donde estabas es lo que menos cuesta', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const ramas = c.ev('playableBranchIds()');
  const orden = c.ev('STRATA_ORDER');
  /* Se empieza el primer estrato de la SEGUNDA rama: si propusiera el primero
     de la primera, estaría proponiendo por orden de lista y no por historia. */
  c.ev('updateMastery')(ramas[1], orden[0], 0.6);
  const d = c.ev('dondeSeguir()');
  assert.equal(d.branchId, ramas[1]);
  assert.equal(d.stratumId, orden[0]);
  assert.ok(d.mastery > 0);
});

test('no propone lo que ya está dominado: para repasar está el Bazar', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const rama = c.ev('playableBranchIds()')[0];
  const orden = c.ev('STRATA_ORDER');
  for (let i = 0; i < 4; i++) c.ev('updateMastery')(rama, orden[0], 1);
  const d = c.ev('dondeSeguir()');
  assert.ok(!(d.branchId === rama && d.stratumId === orden[0]),
    'mandarle a repetir lo que ya domina es llamarlo avanzar');
});

test('entre dos a medias del mismo día, el más avanzado: es donde menos falta', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const ramas = c.ev('playableBranchIds()');
  const orden = c.ev('STRATA_ORDER');
  c.ev('updateMastery')(ramas[0], orden[0], 0.4);
  c.ev('updateMastery')(ramas[1], orden[0], 0.7);
  assert.equal(c.ev('dondeSeguir()').branchId, ramas[1]);
});

test('nunca propone un estrato cerrado', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const d = c.ev('dondeSeguir()');
  assert.notEqual(c.ev('getStratum')(d.branchId, d.stratumId).status, 'locked');
});

test('sin nada que proponer, la tarjeta no se pinta en vez de inventar un destino', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarSeguir')(null);
  const caja = c.ev("$('#seguir-card')");
  assert.equal(caja.innerHTML, '');
  assert.ok(caja.classList.contains('hidden'));
});

test('la tarjeta dice el sitio, el estrato y cuánto lleva', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const rama = c.ev('playableBranchIds()')[0];
  c.ev('updateMastery')(rama, c.ev('STRATA_ORDER')[0], 0.6);
  c.ev('pintarSeguir')(c.ev('dondeSeguir()'));
  const h = c.ev("$('#seguir-card')").innerHTML;
  assert.match(h, /Sigue por aquí/);
  assert.match(h, /de este estrato/, '«te falta poco» mueve más que «empieza algo»');
  assert.match(h, /Seguir excavando/);
});

test('y cambia de verbo cuando no se ha empezado', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarSeguir')(c.ev('dondeSeguir()'));
  const h = c.ev("$('#seguir-card')").innerHTML;
  assert.match(h, /Empieza por aquí/);
  assert.match(h, /Sin empezar todavía/);
});

/* ══ El color de cada yacimiento ══ */

test('cada yacimiento tiene su color, y siempre el mismo', () => {
  const c = cargarApp();
  const a = c.ev('colorDeYacimiento')('kaldros');
  assert.equal(a.id, c.ev('colorDeYacimiento')('kaldros').id,
    'un color que cambia de un día para otro no identifica nada');
  /* Y los yacimientos que trae la app de fábrica salen distintos entre sí,
     que es donde se nota. Con seis colores, dos ids cualesquiera pueden
     coincidir: eso no es un fallo, es aritmética. */
  const suyos = c.ev('sitesAll()').map(x => c.ev('colorDeYacimiento')(x.id).id);
  assert.equal(new Set(suyos).size, suyos.length, 'los de fábrica tienen que distinguirse');
});

test('el color de partida sale del id, no de la posición en la lista', () => {
  /* Si saliera solo del orden, añadir un yacimiento delante repintaría todos
     los demás y el niño perdería la referencia que ya tenía. */
  assert.match(leer('js/state.js'), /function huellaDeId[\s\S]{0,200}charCodeAt\(i\)/);
  assert.match(leer('js/state.js'), /huellaDeId\(s\.id\) % n/);
});

test('y dos yacimientos nunca acaban del mismo color', () => {
  /* Con seis tintas y tres sitios, dejarlo al azar del hash es jugársela: el
     día que salgan dos iguales se pierde justo lo que esto venía a dar. */
  const c = cargarApp();
  const inventado = [{ id: 'aa' }, { id: 'ab' }, { id: 'ac' }, { id: 'ad' }, { id: 'ae' }, { id: 'af' }];
  c.ev('sitesAll = () => ' + JSON.stringify(inventado));
  const cols = inventado.map(x => c.ev('colorDeYacimiento')(x.id).id);
  assert.equal(new Set(cols).size, 6, 'seis sitios, seis colores');
});

test('son seis y ninguno se sale de la paleta del pergamino', () => {
  const c = cargarApp();
  const lista = c.ev('COLORES_YACIMIENTO');
  assert.equal(lista.length, 6);
  for (const col of lista) {
    assert.match(col.tinta, /^#[0-9a-f]{6}$/i);
    assert.match(col.fondo, /^#[0-9a-f]{6}$/i);
  }
});

/* ══ La racha ══ */

test('la racha no aparece hasta el tercer acierto seguido', () => {
  /* Felicitar por uno convierte el aviso en ruido, y a los dos días no lo
     mira nadie. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('mission = { resolved: [true, true] }');
  assert.equal(c.ev('rachaActual()'), 2);
  assert.ok(c.ev('RACHA_MINIMA') > 2);
});

test('cuenta solo los seguidos, desde el final', () => {
  const c = cargarApp();
  c.ev('mission = { resolved: [true, true, true, false, true, true] }');
  assert.equal(c.ev('rachaActual()'), 2);
  c.ev('mission = { resolved: [false, true, true, true, true] }');
  assert.equal(c.ev('rachaActual()'), 4);
  c.ev('mission = { resolved: [] }');
  assert.equal(c.ev('rachaActual()'), 0);
});

test('al fallar se va sin ruido: aquí el error no penaliza, tampoco en la racha', () => {
  const c = cargarApp();
  c.ev('mission = { resolved: [true, true, true] }');
  c.ev('pintarRacha()');
  const el = c.ev("$('#mission-racha')");
  assert.ok(!el.classList.contains('hidden'));
  assert.match(el.innerHTML, /3/);
  c.ev('mission = { resolved: [true, true, true, false] }');
  c.ev('pintarRacha()');
  assert.ok(el.classList.contains('hidden'), 'se esconde');
  const css = leer('css/styles.css');
  const i = css.indexOf('.mission-racha {');
  assert.ok(!/shake|tiembla|rompe/i.test(css.slice(i, i + 700)),
    'una racha que se rompe con estruendo es justo lo contrario de «el error no penaliza»');
});

/* ══ Que nada de esto se le imponga a quien no lo quiere ══ */

test('con «menos movimiento» los números se ponen y ya', () => {
  const c = cargarApp();
  c.ev("window.matchMedia = () => ({ matches: true })");
  assert.equal(c.ev('menosMovimiento()'), true);
  const el = c.ev('document').createElement('span');
  c.ev('contarHasta')(el, 37, '+');
  assert.equal(el.textContent, '+37', 'el premio se ve entero, solo que sin animar');
});

test('sin requestAnimationFrame tampoco se queda a medias', () => {
  /* Un premio a medio contar es peor que uno sin animar. */
  const c = cargarApp();
  c.ev("window.matchMedia = () => ({ matches: false })");
  c.ev('delete window.requestAnimationFrame');
  const el = c.ev('document').createElement('span');
  c.ev('contarHasta')(el, 37, '+');
  assert.equal(el.textContent, '+37');
});

test('y las filas del premio no se escalonan si se ha pedido menos movimiento', () => {
  const c = cargarApp();
  c.ev("window.matchMedia = () => ({ matches: true })");
  const a = c.ev('document').createElement('div');
  c.ev('escalonar')([a]);
  assert.ok(!a.style.animation, 'lo que se pide en el sistema se respeta en la app');
});

test('cada animación nueva tiene su salida por «prefers-reduced-motion»', () => {
  const css = leer('css/styles.css');
  const i = css.indexOf('@keyframes racha-sube');
  assert.ok(i > 0);
  assert.match(css.slice(i, i + 400), /prefers-reduced-motion/);
});

/* ══ Los personajes ══ */

test('quien habla en el aviso se ve, no solo se nombra', () => {
  const c = cargarApp();
  for (const a of c.ev('ANIMOS_MAL').concat(c.ev('ANIMOS_BIEN'))) {
    assert.ok(a.quien, `«${a.texto}» sale sin cara`);
    c.ev('ponerTitulo')(a);
    assert.match(c.ev("$('#feedback-title')").innerHTML, /feedback-quien/);
  }
});

test('el que sale al fallar acompaña, no celebra', () => {
  const c = cargarApp();
  const caras = c.ev('ANIMOS_MAL').map(a => a.quien);
  assert.ok(!caras.includes('⛏️'));
  for (const a of c.ev('ANIMOS_MAL')) {
    assert.ok(!/perfecta|aplaude|alegría/i.test(a.texto),
      'un niño que se equivoca no necesita un aspaviento');
  }
});

test('al fallar, la explicación pesa más que el titular', () => {
  /* Era el texto más pequeño y más gris de la pantalla, justo al revés de lo
     que hace falta: el titular consuela, la explicación enseña. */
  const css = leer('css/styles.css');
  assert.match(css, /\.feedback-card\.feedback-ensena \.feedback-explain \{[\s\S]{0,200}font-size: var\(--t-lg\)/);
  assert.match(leer('js/play.js'), /feedback-ensena', !res\.correct/);
});

/* ══ El campamento que se ve ══

   Un niño ahorraba noventa doblones, se compraba las botas todoterreno, y no
   las veía nunca. Ni la tienda, ni el jeep, ni la hoguera. Excavar daba
   doblones, los doblones compraban cosas, y las cosas no cambiaban nada de lo
   que el niño veía: el circuito no cerraba por ninguna parte. */

function conCampamento(c, cosas) {
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('S.progression.doubloons_balance = 3000');
  c.ev('saveState()');
  for (const id of (cosas || [])) c.ev('buyItem')(id);
  return c;
}

test('cada cosa comprada aparece en la escena, en su sitio', () => {
  const c = conCampamento(cargarApp(), ['tienda_rayas', 'hoguera_grande', 'jeep_oxidado']);
  c.ev('pintarEscenaDelCampamento()');
  const h = c.ev("$('#camp-scene')").innerHTML;
  for (const icono of ['⛺', '🔥', '🚙']) {
    assert.ok(h.includes(icono), `${icono} no está en la escena`);
  }
});

test('los sitios están escritos, no repartidos al azar', () => {
  /* Un campamento cuya tienda cambia de sitio cada vez que entras no es un
     sitio, es un collage. */
  const c = conCampamento(cargarApp(), ['tienda_rayas', 'hoguera_grande']);
  c.ev('pintarEscenaDelCampamento()');
  const a = c.ev("$('#camp-scene')").innerHTML;
  c.ev('pintarEscenaDelCampamento()');
  assert.equal(c.ev("$('#camp-scene')").innerHTML, a);
});

test('nada flota en el cielo: todo se posa por debajo del horizonte', () => {
  const c = cargarApp();
  const sitios = Object.values(c.ev('SITIOS_CAMPAMENTO')).concat(c.ev('HUECOS_LIBRES'));
  for (const s of sitios) {
    assert.ok(s.y >= 10 && s.y <= 60, `un sitio en y=${s.y} sale flotando o se cae del borde`);
    assert.ok(s.x >= 5 && s.x <= 95, `un sitio en x=${s.x} se sale por el lado`);
  }
});

test('lo que el docente añada al almacén también se ve, sin tocar código', () => {
  /* Los iconos de la tienda los teclea él y viajan con los ajustes de la
     clase: un artículo nuevo tiene que verse desde el primer día. */
  const c = cargarApp();
  const tienda = c.ev('deepClone')(c.ev('ATLAS_CONFIG.shop'));
  tienda.push({ id: 'farol_kaldros', name: 'Farol de Kaldros', icon: '🏮', cost: 40, type: 'camp' });
  c.ev('setTeacherConfig')('shop', tienda);
  conCampamento(c, ['farol_kaldros']);
  c.ev('pintarEscenaDelCampamento()');
  assert.ok(c.ev("$('#camp-scene')").innerHTML.includes('🏮'));
});

test('el campamento vacío mira hacia delante, no le dice que no tiene nada', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarEscenaDelCampamento()');
  const h = c.ev("$('#camp-scene')").innerHTML;
  assert.match(h, /por montar/);
  assert.match(h, /Golosina para Tobías/, 'dice lo más barato: es lo que está a menos excavaciones');
  assert.match(h, /30/);
});

test('lo siguiente es siempre lo más barato que le falte', () => {
  const c = conCampamento(cargarApp(), ['golosina_tobias']);
  /* Las golosinas se pueden comprar más de una vez, así que siguen contando. */
  assert.equal(c.ev('loSiguienteDelAlmacen()').id, 'golosina_tobias');
  const c2 = cargarApp();
  const tienda = c2.ev('deepClone')(c2.ev('ATLAS_CONFIG.shop')).filter(i => i.type !== 'treat');
  c2.ev('setTeacherConfig')('shop', tienda);
  conCampamento(c2, []);
  assert.equal(c2.ev('loSiguienteDelAlmacen()').id, 'cantimplora', 'el de 50, que es el más barato que queda');
});

test('Tobías cambia según lo que le hayan dado', () => {
  const c = cargarApp();
  assert.match(c.ev('estadoDeTobias')(0).dice, /husmea/);
  assert.match(c.ev('estadoDeTobias')(1).dice, /feliz/);
  assert.match(c.ev('estadoDeTobias')(5).dice, /no se mueve/);
});

test('la escena se cuenta también para quien no la ve', () => {
  /* Un dibujo sin texto alternativo es una pantalla en blanco para quien usa
     lector. Los emoji sueltos van marcados como decorativos y el nombre de
     cada cosa viaja en la etiqueta de la escena entera. */
  const c = conCampamento(cargarApp(), ['tienda_rayas']);
  c.ev('pintarEscenaDelCampamento()');
  const h = c.ev("$('#camp-scene')").innerHTML;
  assert.match(h, /role="img"/);
  assert.match(h, /aria-label="Tu campamento con Tienda a rayas"/);
  assert.match(h, /escena-cosa[^>]*aria-hidden="true"/);
});

test('y sin nada comprado también se dice qué es', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarEscenaDelCampamento()');
  assert.match(c.ev("$('#camp-scene')").innerHTML, /aria-label="Tu campamento todavía vacío"/);
});

test('comprar cambia la escena, que es de lo que iba todo esto', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('S.progression.doubloons_balance = 3000');
  c.ev('saveState()');
  c.ev('pintarEscenaDelCampamento()');
  const antes = c.ev("$('#camp-scene')").innerHTML;
  c.ev('buyItem')('tienda_rayas');
  c.ev('pintarEscenaDelCampamento()');
  assert.notEqual(c.ev("$('#camp-scene')").innerHTML, antes);
});

test('nada de lo que se compra da ventaja: sigue siendo todo decorativo', () => {
  /* La escena hace visible la recompensa; no puede convertirla en una mejora
     de juego por la puerta de atrás. */
  const t = leer('js/play.js');
  const i = t.indexOf('function pintarEscenaDelCampamento');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.ok(!/S\.progression|S\.adaptive|updateMastery|addXp|addDoubloons/.test(trozo),
    'la escena solo dibuja: no toca nada del progreso');
});

/* ══ La carta de expedición ══

   La pantalla se llamaba «El Mapa del Atlas», decía «4 % del mundo dibujado», y
   lo que había era una lista con una barra encima. La promesa más fuerte de la
   app —dibujar un mundo excavando— no se cumplía en ninguna pantalla, y el 4 %
   no estaba en ninguna parte: era un número sobre una barra. */

test('el terreno se abre alrededor de cada yacimiento, no por un porcentaje global', () => {
  /* Es lo que hace que la carta diga algo que la barra no podía decir: dónde
     has estado y dónde no. Un niño que solo ha tocado matemáticas ve un claro
     en Kaldros y arena en todo lo demás, que es exactamente la verdad. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const sites = c.ev('sitesEnabled()');
  const rama = c.ev('branchesEnabledOf')(sites[0])[0];
  for (const est of c.ev('STRATA_ORDER')) for (let i = 0; i < 4; i++) c.ev('updateMastery')(rama.id, est, 1);

  const a = c.ev('progresoDeYacimiento')(sites[0]);
  const b = c.ev('progresoDeYacimiento')(sites[1]);
  assert.ok(a.hechos > 0);
  assert.equal(b.hechos, 0, 'el otro yacimiento no se abre por excavar en este');
  assert.ok(c.ev('claroDeYacimiento')(a.parte) > c.ev('claroDeYacimiento')(b.parte));
});

test('un yacimiento sin tocar ya se ve, pero apenas', () => {
  /* Saber que existe es parte de querer llegar; verlo entero sin haber
     excavado sería regalar el mapa. */
  const c = cargarApp();
  const cero = c.ev('claroDeYacimiento')(0);
  const todo = c.ev('claroDeYacimiento')(1);
  assert.ok(cero > 0, 'un sitio invisible no se puede desear');
  assert.ok(todo > cero * 2);
  assert.ok(todo < 50, 'al 100 % sigue habiendo mundo fuera del claro');
});

test('el claro nunca se sale de la escala aunque el progreso venga roto', () => {
  const c = cargarApp();
  for (const v of [-3, 2.5, NaN, null, 'mucho']) {
    const r = c.ev('claroDeYacimiento')(v);
    assert.ok(r >= c.ev('CLARO_MINIMO') && r <= c.ev('CLARO_MAXIMO'), `con ${v} sale ${r}`);
  }
});

test('los claros se SUMAN: dos sitios cercanos no se tapan el uno al otro', () => {
  /* Se enmascara el terreno, no la arena. Al revés, el borde de un claro
     volvería a enterrar el de al lado. */
  const t = leer('js/play.js');
  const i = t.indexOf('function pintarCartaDeExpedicion');
  const trozo = t.slice(i, i + 4200);
  assert.match(trozo, /<g mask="url\(#atlas-claros\)">/);
  assert.match(trozo, /mask id="atlas-claros"[\s\S]{0,120}fill="#000"/);
});

test('cada yacimiento se coloca en su sitio y nunca dos en el mismo', () => {
  const c = cargarApp();
  const p = c.ev('PUNTOS_CARTA');
  assert.ok(p.length >= 6);
  assert.equal(new Set(p.map(x => x.x + ',' + x.y)).size, p.length);
  /* El lienzo tiene la forma del dibujo del mapa, no un cuadrado. */
  const alto = c.ev('CARTA_ALTO');
  for (const x of p) {
    assert.ok(x.x >= 10 && x.x <= 90, `un punto en x=${x.x} se sale por el lado`);
    assert.ok(x.y >= 10 && x.y <= alto - 5, `un punto en y=${x.y} se sale por arriba o abajo`);
  }
});

test('el orden de la carta es el de la lista de abajo, no el de una huella', () => {
  /* Al revés que el color: el color identifica y tiene que aguantar, pero la
     carta y la lista cuentan la misma historia y tienen que contarla en el
     mismo orden. Si no, el docente reordena y el mapa deja de coincidir. */
  const t = leer('js/play.js');
  const i = t.indexOf('function pintarCartaDeExpedicion');
  const trozo = t.slice(i, i + 1200);
  assert.match(trozo, /lista\.map\(\(site, i\) => \{[\s\S]{0,80}PUNTOS_CARTA\[i\]/);
  assert.ok(!/huellaDeId/.test(trozo));
});

test('la carta se cuenta entera para quien no la ve', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarCartaDeExpedicion')(c.ev('sitesEnabled()'));
  const h = c.ev("$('#map-carta')").innerHTML;
  assert.match(h, /role="img"/);
  assert.match(h, /aria-label="Carta de la expedición: [^"]*estratos/);
  assert.match(h, /role="button"/, 'cada sitio es un botón, aunque esté dibujado');
  assert.match(h, /tabindex="0"/, 'y se alcanza con el teclado');
});

test('la leyenda dice cuántos estratos lleva de cada sitio', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarCartaDeExpedicion')(c.ev('sitesEnabled()'));
  const h = c.ev("$('#map-carta')").innerHTML;
  assert.match(h, /carta-chip/);
  assert.match(h, /<b>0\/\d+<\/b>/);
});

test('sin yacimientos no se dibuja una carta vacía', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarCartaDeExpedicion')([]);
  const caja = c.ev("$('#map-carta')");
  assert.equal(caja.innerHTML, '');
  assert.ok(caja.classList.contains('hidden'));
});

test('con más yacimientos que puntos, no se pintan dos en el mismo sitio', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const muchos = Array.from({ length: 12 }, (_, i) => ({ id: 's' + i, name: 'Sitio ' + i, branches: [] }));
  c.ev('pintarCartaDeExpedicion')(muchos);
  const h = c.ev("$('#map-carta')").innerHTML;
  const n = (h.match(/class="carta-sitio"/g) || []).length;
  assert.equal(n, c.ev('PUNTOS_CARTA').length, 'se pintan los que caben, no doce encima');
});

test('el nombre de un yacimiento se escapa al pintarlo', () => {
  /* El docente teclea el nombre y viaja con los ajustes de la clase. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('pintarCartaDeExpedicion')([{ id: 'x', name: '<img src=x onerror=alert(1)>', branches: [] }]);
  const h = c.ev("$('#map-carta')").innerHTML;
  assert.ok(!h.includes('<img src=x'), 'el nombre entra crudo en la carta');
  assert.ok(h.includes('&lt;img'));
});

test('tocar un sitio lleva a su parte de la lista, no abre un pozo al azar', () => {
  /* Dos caminos distintos para lo mismo se pisan, y en una tablet el dedo
     acierta más en una tarjeta grande que en un punto de doce píxeles. */
  const t = leer('js/play.js');
  const i = t.indexOf('function pintarCartaDeExpedicion');
  const trozo = t.slice(i, i + 5200);
  assert.match(trozo, /scrollIntoView/);
  assert.ok(!/startMission|openBranch/.test(trozo));
  assert.match(leer('js/play.js'), /header\.dataset\.site = site\.id/, 'la lista tiene que dejarse apuntar');
});

/* ══ El pozo, visto como un pozo ══

   La pantalla del pozo ya era la mejor de las ocho: cuatro estratos apilados,
   los cerrados con trama y candado, la cota a la izquierda. Y aun así la
   metáfora vivía solo en el texto: cuatro filas de una lista con la palabra
   «estrato» delante, cuatro blancos casi iguales, y ninguna pista de por dónde
   entrar cuando había dos capas abiertas. */

test('el frente de excavación es el mismo destino que propone el mapa', () => {
  /* Decirlo dos veces distinto sería peor que no decirlo: el niño no sabría a
     cuál hacer caso. */
  const t = leer('js/play.js');
  const i = t.indexOf('function openBranch');
  const trozo = t.slice(i, i + 1400);
  assert.match(trozo, /const frente = dondeSeguir\(\)/);
  assert.match(trozo, /frente\.branchId === branchId && frente\.stratumId === sId \? ' frente' : ''/);
});

test('solo se marca una capa, y solo en el pozo al que apunta', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  const ramas = c.ev('playableBranchIds()');
  const orden = c.ev('STRATA_ORDER');
  for (let i = 0; i < 4; i++) c.ev('updateMastery')(ramas[0], orden[0], 1);
  c.ev('updateMastery')(ramas[0], orden[1], 0.5);
  const d = c.ev('dondeSeguir()');
  assert.equal(d.branchId, ramas[0]);
  assert.equal(d.stratumId, orden[1], 'el frente es la capa a medias, no la dominada');
});

test('las capas bajan de tono con la profundidad, y con recorrido de sobra', () => {
  /* Eran cuatro blancos casi iguales: la palabra «estrato» hacía todo el
     trabajo y el dibujo no decía nada. */
  const css = leer('css/styles.css');
  const tonos = [1, 2, 3, 4].map(n => {
    const m = css.match(new RegExp(`\\.stratum-row:nth-child\\(${n}\\) \\{\\s*background-color: (#[0-9a-f]{6})`, 'i'));
    assert.ok(m, `el estrato ${n} no declara su tierra`);
    return parseInt(m[1].slice(1, 3), 16);
  });
  for (let i = 1; i < 4; i++) {
    assert.ok(tonos[i] < tonos[i - 1], `el estrato ${i + 1} no es más profundo que el ${i}`);
  }
  assert.ok(tonos[0] - tonos[3] > 25, 'la caída es tan corta que no se ve');
});

test('y ninguna se oscurece tanto que deje de leerse', () => {
  /* La legibilidad manda sobre el efecto: el más profundo tiene que aguantar
     la tinta encima. */
  const css = leer('css/styles.css');
  const m = css.match(/\.stratum-row:nth-child\(4\) \{\s*background-color: (#[0-9a-f]{6})/i);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const lin = x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  /* Contra la tinta de siempre (#33240f). */
  const Lt = 0.2126 * lin(0x33 / 255) + 0.7152 * lin(0x24 / 255) + 0.0722 * lin(0x0f / 255);
  const ratio = (Math.max(L, Lt) + 0.05) / (Math.min(L, Lt) + 0.05);
  assert.ok(ratio >= 7, `la capa más honda queda en ${ratio.toFixed(1)}:1 y hace falta 7`);
});

test('cada capa tiene su grano, no solo su tono', () => {
  /* Cuatro materiales distintos es lo que hace que una pared de excavación se
     lea como capas y no como rayas de colores. */
  const css = leer('css/styles.css');
  const granos = [1, 2, 3, 4].map(n => {
    const i = css.indexOf(`.stratum-row:nth-child(${n}) {`);
    const trozo = css.slice(i, css.indexOf('}', i));
    const m = trozo.match(/background-image:([\s\S]*?);/);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  });
  for (const g of granos) assert.ok(g, 'una capa sin grano');
  assert.equal(new Set(granos).size, 4, 'dos capas del mismo material');
});

test('el pozo tiene boca: sin ella la capa de arriba flota', () => {
  assert.match(leer('index.html'), /class="strata-boca"[^>]*><i>Superficie<\/i>/);
  assert.match(leer('css/styles.css'), /\.strata-boca \{/);
});

test('la veladura de lo enterrado no pisa el filo de lo excavado', () => {
  /* Las dos eran `box-shadow` y la segunda ganaba: una capa dominada que se
     quedara sin retos perdía su marca de latón. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.stratum-row.locked {');
  const trozo = css.slice(i, css.indexOf('}', i));
  assert.ok(!/box-shadow/.test(trozo), 'la veladura sigue en box-shadow');
  assert.match(css, /\.stratum-row\.locked::after \{[\s\S]{0,200}background: rgba/);
});

test('la chapa del frente no se come el título', () => {
  assert.match(leer('css/styles.css'),
    /\.stratum-row\.frente \.stratum-info strong \{ padding-right/);
});

test('un estrato ya dominado no se marca como frente', () => {
  /* Sería mandarle a repetir lo que ya sabe llamándolo avanzar. */
  const css = leer('css/styles.css');
  assert.match(css, /\.stratum-row\.frente\.excavado::after \{ display: none; \}/);
  assert.match(css, /\.stratum-row\.frente\.excavado \{ box-shadow: inset 5px 0 0 var\(--gold\)/);
});

/* ══ El reto, que es donde se pasa el tiempo ══ */

test('el enunciado empieza arriba y siempre a la misma altura', () => {
  /* Estaba centrado dentro de una banda fija de 42 rem: en una tablet eso
     dejaba 160 px de nada arriba y 440 px abajo. Y lo que más costaba no era
     el hueco: un enunciado que sube y baja de un reto a otro hay que BUSCARLO
     cada vez, seis veces por expedición. */
  const css = leer('css/styles.css');
  const i = css.indexOf('#screen-mission {');
  const trozo = css.slice(i, css.indexOf('}', i));
  assert.match(trozo, /justify-content: flex-start/);
  assert.ok(!/justify-content: center/.test(trozo));
  assert.ok(!/42rem/.test(trozo), 'la banda fija era la causa del hueco');
  assert.match(trozo, /100svh/, 'en un móvil la barra del navegador aparece y se va');
});

test('las cuatro opciones llevan la MISMA tinta', () => {
  /* Una letra de otro color diría cuál es la buena. Por eso la tinta va en el
     contenedor y no en cada opción: no hay forma de que se separen. */
  const t = leer('js/play.js');
  const i = t.indexOf('function renderQuestion');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /optionsEl\.style\.setProperty\('--acento'/);
  assert.ok(!/btn\.style\.setProperty\('--acento'/.test(trozo));
  const css = leer('css/styles.css');
  assert.ok(!/\.option:nth-child\([^)]*\)[^{]*\{[^}]*--acento/.test(css),
    'ninguna opción puede tener su propio color');
});

test('la tinta es la del yacimiento donde se está excavando', () => {
  const t = leer('js/play.js');
  const i = t.indexOf('function renderQuestion');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /siteOfBranch\(mission\.branchId\)/);
  assert.match(trozo, /colorDeYacimiento\(sitio \? sitio\.id : ''\)/);
});

test('sin yacimiento reconocible, la letra se queda con el latón de siempre', () => {
  /* Un pozo suelto, o un fallo al buscar su sitio, no puede dejar la letra
     sin fondo: se cae al valor por defecto y se ve igual de bien. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.option::before {');
  const trozo = css.slice(i, css.indexOf('}', i));
  assert.match(trozo, /var\(--acento-suave, var\(--brass-tint\)\)/);
  assert.match(trozo, /var\(--acento, var\(--leather-dark\)\)/);
});

test('las opciones entran escalonadas, y no si se ha pedido menos movimiento', () => {
  const t = leer('js/play.js');
  const i = t.indexOf('function renderQuestion');
  assert.match(t.slice(i, t.indexOf('\n}', i)), /escalonar\(\[\.\.\.optionsEl\.children\]\)/);
  /* `escalonar` ya se calla con prefers-reduced-motion; se comprueba arriba. */
});

/* ══ La bitácora que mira hacia delante ══

   Recibía a todo el mundo con cinco tarjetas: 0 sellos, 0 semanas, 0/3 días, 0
   fragmentos. Para quien acaba de empezar —que es la clase entera en
   septiembre— la primera visita a su bitácora era una pantalla que le decía
   cinco veces que no ha hecho nada. Y es el sitio equivocado para decirlo: la
   bitácora existe para sostener el hábito, no para auditarlo. */

function bitacora(c, cambios) {
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('S.logbook = ' + JSON.stringify(Object.assign({
    week_id: 'x', active_days_this_week: [], current_weeks: 0,
    stamps_lifetime: 0, history: [], free_rope_used_this_week: false, rescue_ropes: 0
  }, cambios || {})));
  c.ev('saveState()');
  return c;
}

test('a quien empieza no se le enseñan cinco ceros', () => {
  const c = bitacora(cargarApp());
  const cifras = c.ev('cifrasDeLaBitacora')(c.ev('S'));
  assert.ok(cifras.every(x => x.valor > 0 || x.siempre), 'un cero no es información');
  assert.ok(cifras.length <= 1, 'el primer día solo hay una cosa que contar');
});

test('la cuerda de rescate se enseña desde el primer día, aunque no sea un logro', () => {
  /* Es algo que YA se tiene, y saber que está ahí es lo que evita el disgusto
     de perder una racha. */
  const c = bitacora(cargarApp());
  const cuerda = c.ev('cifrasDeLaBitacora')(c.ev('S')).find(x => /cuerdas/.test(x.etiqueta));
  assert.ok(cuerda);
  assert.equal(cuerda.valor, 1);
});

test('y las cifras van apareciendo según hay algo que contar', () => {
  const c = bitacora(cargarApp(), { stamps_lifetime: 4, current_weeks: 2 });
  const et = c.ev('cifrasDeLaBitacora')(c.ev('S')).map(x => x.etiqueta);
  assert.ok(et.includes('sellos ganados'));
  assert.ok(et.includes('semanas seguidas'));
  assert.ok(!et.includes('fragmentos del Atlas'), 'lo que sigue a cero no ocupa sitio');
});

test('la semana en curso va la primera: es lo único que puede cambiar hoy', () => {
  const html = leer('index.html');
  const i = html.indexOf('id="screen-logbook"');
  const trozo = html.slice(i, i + 1200);
  assert.ok(trozo.indexOf('logbook-semana') < trozo.indexOf('logbook-summary'));
});

test('«0 sellos» pasa a ser «te falta un día»', () => {
  const c = bitacora(cargarApp(), { active_days_this_week: ['a', 'b'] });
  const s = c.ev('semanaDeLaBitacora')(c.ev('S'));
  assert.equal(s.faltan, 1);
  assert.match(s.dice, /Te falta un día/);
  assert.match(s.titulo, /primer sello/, 'sin sellos todavía, el que viene es el primero');
});

test('y en plural cuando toca', () => {
  const c = bitacora(cargarApp());
  assert.match(c.ev('semanaDeLaBitacora')(c.ev('S')).dice, /Te faltan 3 días/);
});

test('con la semana hecha lo dice, y no promete lo que no toca', () => {
  const c = bitacora(cargarApp(), { active_days_this_week: ['a', 'b', 'c'] });
  const s = c.ev('semanaDeLaBitacora')(c.ev('S'));
  assert.equal(s.logrado, true);
  assert.match(s.titulo, /primer sello es tuyo/);
  assert.match(s.dice, /al cerrar la semana/, 'el sello se estampa al cerrar, no ahora');
});

test('quien ya tiene sellos no lee «tu primer sello»', () => {
  const c = bitacora(cargarApp(), { stamps_lifetime: 4, active_days_this_week: ['a'] });
  const s = c.ev('semanaDeLaBitacora')(c.ev('S'));
  assert.ok(!/primer/.test(s.titulo));
  assert.match(s.titulo, /esta semana/);
});

test('los días de más no desbordan las tres casillas', () => {
  const c = bitacora(cargarApp(), { active_days_this_week: ['a', 'b', 'c', 'd', 'e'] });
  const s = c.ev('semanaDeLaBitacora')(c.ev('S'));
  assert.equal(s.hechos, 3);
  assert.equal(s.faltan, 0);
});

test('se dibujan tres casillas, y el hueco es del tamaño de la marca', () => {
  /* Para que se vea CUÁNTO falta y no solo que falta algo. */
  const c = bitacora(cargarApp(), { active_days_this_week: ['a'] });
  c.ev('pintarSemanaDeLaBitacora()');
  const h = c.ev("$('#logbook-semana')").innerHTML;
  assert.equal((h.match(/class="semana-dia[ "]/g) || []).length, 3);
  assert.equal((h.match(/dia-hecho/g) || []).length, 1);
  const css = leer('css/styles.css');
  const i = css.indexOf('.semana-dia {');
  assert.match(css.slice(i, css.indexOf('}', i)), /width: 2\.3rem; height: 2\.3rem/);
});

test('la semana se cuenta también para quien no la ve', () => {
  const c = bitacora(cargarApp(), { active_days_this_week: ['a', 'b'] });
  c.ev('pintarSemanaDeLaBitacora()');
  const h = c.ev("$('#logbook-semana')").innerHTML;
  assert.match(h, /aria-label="2 de 3 días de expedición esta semana"/);
  assert.match(h, /semana-dia[^>]*aria-hidden="true"/);
});

test('la ruta vacía dice qué va a ser, y sustituye a la regla en vez de sumarse', () => {
  /* Quien todavía no tiene ninguna semana no necesita el detalle de qué pasa
     cuando se falla una. */
  const t = leer('js/play.js');
  const i = t.indexOf('function renderLogbook');
  const trozo = t.slice(i, t.indexOf('\n}', i));
  assert.match(trozo, /pie\.classList\.toggle\('hidden', !vacia\)/);
  assert.match(trozo, /regla\.classList\.toggle\('hidden', vacia\)/);
});

test('una sola tarjeta no se estira de lado a lado', () => {
  const css = leer('css/styles.css');
  const i = css.indexOf('.logbook-summary {');
  assert.match(css.slice(i, css.indexOf('}', i)), /auto-fill/);
});
