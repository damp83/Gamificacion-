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
