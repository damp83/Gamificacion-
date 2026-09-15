/* El dial de dificultad dentro de un pozo escrito por el docente.

   El motor mide el nivel de cada alumno, lo actualiza tras cada reto y lo
   enseña en el panel… y con los pozos del docente no lo usaba para NADA:
   `makeQuestion` recibía el nivel y en la rama del banco no lo miraba. Diez
   retos escritos con la IA eran los mismos diez para el que va sobrado y para
   el que va justo.

   Aquí se fija la otra mitad: que el generador escriba los cinco niveles de
   una tanda, y que el banco sirva a cada alumno los suyos.

   Las dos decisiones que NO son obvias, y que se prueban de una en una:

     · Un reto SIN nivel vale para cualquiera (distancia 0), no es un «nivel
       3». Si no, el día que esto se estrena, los retos escritos a mano —que
       son los que el docente más quiere que salgan— se le esconderían a media
       clase sin que nadie lo hubiera pedido.

     · Pasarse hacia ARRIBA cuesta más que quedarse corto. Un reto fácil de
       más aburre un minuto; uno difícil de más, con el niño solo delante de
       la tablet, lo hunde. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');
const leer = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

/* Un pozo del docente con los retos que se le pasen: [nivel, nivel, …]. */
function pozoConNiveles(c, niveles) {
  return {
    id: 'p1', name: 'Pozo', source: 'docente',
    bank: {
      recordar: niveles.map((n, i) => ({
        question: 'reto ' + i + ' de nivel ' + n,
        options: ['a' + i, 'b' + i, 'c' + i, 'd' + i], answer: 0,
        nivel: n, skill: 'suma_llevada'
      }))
    }
  };
}

/* Qué niveles le salen a un alumno de nivel `tier` en una misión de `cuantos`,
   repetida `veces` para promediar el azar. */
function nivelesServidos(c, niveles, tier, cuantos, veces) {
  const pozo = pozoConNiveles(c, niveles);
  const fuera = [];
  for (let v = 0; v < (veces || 200); v++) {
    const usados = [];
    for (let i = 0; i < (cuantos || 1); i++) {
      const q = c.ev('makeQuestion')(pozo, 'recordar', tier, usados, 4);
      if (q) fuera.push(q.nivel);
    }
  }
  return fuera;
}

test('un pozo con los cinco niveles le da a cada alumno el suyo', () => {
  const c = cargarApp();
  const banco = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  /* Primer reto de la misión: el banco está entero, así que es donde mejor se
     ve a quién le sirve qué. */
  for (const tier of [1, 2, 3, 4, 5]) {
    const salidos = nivelesServidos(c, banco, tier, 1);
    const media = salidos.reduce((a, b) => a + b, 0) / salidos.length;
    assert.ok(Math.abs(media - tier) <= 1,
      `un alumno de nivel ${tier} recibe de media ${media.toFixed(2)}`);
  }
});

test('al de nivel 1 no se le cuela un reto de nivel 5', () => {
  const c = cargarApp();
  /* Lo que de verdad importa: el extremo de arriba no aparece abajo. Un niño
     que va justo y se encuentra el reto más difícil del pozo deja de jugar. */
  const salidos = nivelesServidos(c, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], 1, 1);
  assert.ok(!salidos.includes(5), 'le ha salido un nivel 5');
  assert.ok(!salidos.includes(4), 'le ha salido un nivel 4');
});

test('y al de nivel 5 no se le da el más fácil del pozo', () => {
  const c = cargarApp();
  const salidos = nivelesServidos(c, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], 5, 1);
  assert.ok(!salidos.includes(1), 'le ha salido un nivel 1');
  assert.ok(!salidos.includes(2), 'le ha salido un nivel 2');
});

test('pasarse hacia arriba cuesta más que quedarse corto', () => {
  const c = cargarApp();
  const d = c.ev('distanciaNivel');
  /* Un alumno de nivel 3: el reto de 2 le queda más cerca que el de 4, aunque
     los dos estén a un paso. Es la misma regla que ya decide el techo frente
     al suelo, y está aquí para que nadie la «simetrice» por parecer más
     limpia. */
  assert.ok(d(2, 3) < d(4, 3), 'el de abajo tiene que quedar más cerca');
  assert.ok(d(1, 3) < d(5, 3));
  assert.equal(d(3, 3), 0, 'el suyo, a distancia cero');
});

test('un reto sin nivel vale para cualquiera', () => {
  const c = cargarApp();
  const d = c.ev('distanciaNivel');
  for (const tier of [1, 2, 3, 4, 5]) {
    assert.equal(d(0, tier), 0, `sin nivel tendría que valer también al ${tier}`);
    assert.equal(d(undefined, tier), 0);
  }
});

test('un banco entero sin niveles se comporta EXACTAMENTE como antes', () => {
  const c = cargarApp();
  /* Todo lo que hay escrito hoy en el mundo está sin nivel. El día que esto
     se estrena, ni un solo pozo puede cambiar de comportamiento. */
  const banco = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const tier of [1, 3, 5]) {
    const salidos = nivelesServidos(c, banco, tier, 1, 60);
    assert.equal(new Set(salidos).size, 1, 'todos sin nivel');
  }
  /* Y los diez siguen pudiendo salir: nada queda escondido. */
  const pozo = pozoConNiveles(c, banco);
  const vistos = new Set();
  for (let v = 0; v < 300; v++) {
    const q = c.ev('makeQuestion')(pozo, 'recordar', 3, [], 4);
    vistos.add(q.question);
  }
  assert.equal(vistos.size, 10, `solo salen ${vistos.size} de los diez`);
});

test('los escritos a mano no se le esconden a nadie', () => {
  const c = cargarApp();
  /* El caso real de quien ya tenía retos y genera una tanda nueva: cuatro
     suyos sin nivel y diez de la IA repartidos. Los suyos tienen que seguir
     saliendo, a cualquier alumno. Son los que él ha decidido que salgan. */
  const banco = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  for (const tier of [1, 3, 5]) {
    const salidos = nivelesServidos(c, banco, tier, 1, 300);
    assert.ok(salidos.includes(0), `al alumno de nivel ${tier} no le salen los del docente`);
  }
});

/* Una expedición entera, devolviendo los niveles que salieron. */
function unaExpedicion(c, pozo, tier, cuantos) {
  const usados = [];
  const salidos = [];
  for (let i = 0; i < (cuantos || 6); i++) {
    const q = c.ev('makeQuestion')(pozo, 'recordar', tier, usados, 4);
    assert.ok(q && q.question, `el reto ${i + 1} ha salido vacío`);
    salidos.push(q.nivel);
  }
  assert.equal(new Set(usados).size, salidos.length, 'no repite dentro de la expedición');
  return salidos;
}

/* Un banco con `n` retos de cada nivel. */
function bancoDe(n) {
  const fuera = [];
  for (let niv = 1; niv <= 5; niv++) for (let k = 0; k < n; k++) fuera.push(niv);
  return fuera;
}

test('si se le acaban los suyos, la franja se abre sola y en orden', () => {
  const c = cargarApp();
  /* Un pozo pequeño: dos por nivel y una expedición de seis. El alumno de
     nivel 1 no puede quedarse sin retos porque solo haya dos de los suyos: la
     franja se ensancha. Lo que NO puede pasar es que salte al extremo: hasta
     con el banco casi agotado, el nivel 5 no le llega. */
  const pozo = pozoConNiveles(c, bancoDe(2));
  for (let v = 0; v < 400; v++) {
    const salidos = unaExpedicion(c, pozo, 1);
    assert.ok(!salidos.includes(5), `le ha salido un nivel 5: ${salidos.join(',')}`);
  }
});

test('en el nivel 1 la franja no se queda en un solo escalón', () => {
  const c = cargarApp();
  /* El borde de abajo tuvo un fallo de los que no se ven jugando: como subir
     cuesta más que bajar y en el nivel 1 no hay nada por debajo, la franja se
     quedaba en el nivel 1 a secas. Con seis retos de nivel 1 y una expedición
     de seis, el alumno veía EXACTAMENTE los mismos seis cada vez, y daba
     igual cuántos generara el docente: la reserva no crecía.

     Y era el peor sitio posible para que ocurriera: el que va justo es el que
     menos aguanta repetir. */
  const pozo = pozoConNiveles(c, bancoDe(6));
  const vistos = new Set();
  for (let v = 0; v < 60; v++) {
    for (const n of unaExpedicion(c, pozo, 1)) vistos.add(n);
  }
  assert.ok(vistos.has(1) && vistos.has(2),
    `el de nivel 1 solo ve los niveles ${[...vistos].join(',')}`);
  /* Dos escalones, no cinco: abrirse no es dejar de repartir. */
  assert.deepEqual([...vistos].sort(), [1, 2]);
});

test('un pozo bien surtido no estira el reparto hacia arriba', () => {
  const c = cargarApp();
  /* De aquí sale la recomendación que se le enseña al docente, y por eso está
     medida y no estimada. Cada alumno tira de DOS niveles, así que su reserva
     es el doble de lo que haya por nivel. Cuando esa reserva es igual que la
     expedición, se la gasta entera y el reparto se estira hacia arriba. */
  const desvioMaximo = (n, tier, veces) => {
    const pozo = pozoConNiveles(c, bancoDe(n));
    let peor = 0;
    for (let v = 0; v < veces; v++) {
      for (const niv of unaExpedicion(c, pozo, tier)) peor = Math.max(peor, niv - tier);
    }
    return peor;
  };
  /* Con 2 por nivel —reserva 4, expedición 6— al de nivel 1 le llegan retos
     dos y tres escalones por encima. */
  assert.ok(desvioMaximo(2, 1, 300) >= 2, 'con la reserva justa debería estirarse');
  /* Con el recomendado para una expedición de 6, que son 4 por nivel
     (reserva 8), se queda en el escalón de al lado. */
  assert.equal(c.ev('porNivelRecomendado')(6), 4);
  assert.ok(desvioMaximo(5, 3, 300) <= 1,
    'con el pozo surtido no debería salirse de su escalón');
});

test('la recomendación sale de la expedición, no de una cifra a ojo', () => {
  const c = cargarApp();
  const r = c.ev('porNivelRecomendado');
  /* La reserva de un alumno es el doble de lo que haya por nivel, y tiene que
     ser mayor que la expedición para que no se la gaste entera. */
  for (const mision of [4, 6, 8, 10]) {
    assert.ok(r(mision) * 2 >= mision + 2,
      `con expedición de ${mision} recomienda ${r(mision)}, que no da reserva`);
  }
  /* Un docente que acorte la expedición no necesita generar tanto. */
  assert.ok(r(4) < r(10), 'no puede recomendar lo mismo para 4 que para 10');
  assert.equal(r(1), 2, 'y nunca menos de dos, que si no no hay reparto');
  /* Sin dato, la expedición de fábrica: seis retos, cuatro por nivel. Caer a
     dos «por si acaso» sería recomendar el pozo que no adapta. */
  assert.equal(r(0), r(6));
  assert.equal(r(undefined), r(6));
});

test('el diagnóstico del banco mira el nivel PEOR servido', () => {
  const c = cargarApp();
  const rep = c.ev('repartoDelBanco');
  /* La media puede estar perfecta y haber un nivel vacío. En ese nivel hay un
     niño, y es el que se lleva el pozo mal repartido. */
  const cojo = rep([4, 4, 4, 4, 4, 4, 4, 4, 4, 1].map(n => ({ nivel: n })), 6);
  assert.equal(cojo.flojo, 0, 'hay niveles a cero y no lo ve');
  assert.ok(cojo.faltan >= 4);
  const bueno = rep([1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map(n => ({ nivel: n })), 6);
  assert.equal(bueno.flojo, 2);
  assert.equal(bueno.recomendado, 4);
  assert.equal(bueno.faltan, 2);
  /* Y un banco sin un solo nivel no es un banco mal repartido: es un pozo de
     los de siempre, y no hay nada que reprocharle. */
  const viejo = rep([{}, {}, {}], 6);
  assert.equal(viejo.reparte, false);
  assert.equal(viejo.cuenta[0], 3);
});

test('una misión nunca se queda sin retos por culpa del filtro', () => {
  const c = cargarApp();
  /* El riesgo evidente de filtrar: dejar al niño con la pantalla vacía. Se
     prueba el caso más hostil, un pozo donde NINGÚN reto es de su nivel. */
  const pozo = pozoConNiveles(c, [5, 5, 5, 5, 5, 5]);
  const usados = [];
  for (let i = 0; i < 6; i++) {
    const q = c.ev('makeQuestion')(pozo, 'recordar', 1, usados, 4);
    assert.ok(q && q.question, `el reto ${i + 1} ha salido vacío`);
  }
});

test('un pozo de fábrica con banco también reparte, y luego genera', () => {
  const c = cargarApp();
  /* Los de fábrica sirven el banco primero y el generador después. Que ahora
     el banco se filtre no puede romper eso: agotado el banco, sigue habiendo
     retos infinitos. */
  const pozo = {
    id: 'numeracion', name: 'Pozo', source: 'builtin',
    bank: { recordar: [1, 5].map((n, i) => ({
      question: 'del docente ' + i, options: ['a', 'b', 'c', 'd'], answer: 0, nivel: n
    })) }
  };
  const usados = [];
  const salidos = [];
  for (let i = 0; i < 6; i++) {
    const q = c.ev('makeQuestion')(pozo, 'recordar', 1, usados, 4);
    assert.ok(q && q.question, `el reto ${i + 1} ha salido vacío`);
    salidos.push(q.question);
  }
  assert.ok(salidos[0].startsWith('del docente'), 'el banco va primero');
  assert.equal(salidos.filter(q => q.startsWith('del docente')).length, 2,
    'los dos del docente, y luego el generador');
});

/* ══════════ Lo que se le pide al modelo ══════════ */

test('el encargo dice que un número más grande NO es más difícil', () => {
  const c = cargarApp();
  const p = c.ev('promptGenerador')({
    materia: 'matematicas', curso: 4, estrato: 'recordar', nivel: 5,
    curriculo: 'Sumas y restas hasta el millar. Numeración hasta 9.999.'
  });
  /* Sin esto el modelo hace lo único evidente: poner ceros. Y 8.500 y 10.000
     son la misma operación con el mismo esfuerzo. */
  assert.match(p.usuario, /NIVEL DE DIFICULTAD: 5 de 5/);
  assert.match(p.usuario, /no subas de nivel poniendo números más grandes/i);
  assert.match(p.usuario, /estructura de la tarea/i);
  /* Y que no se escape del estrato para subir de nivel, que es el error que
     convertiría un «recordar» difícil en un «analizar» mal clasificado. */
  assert.match(p.usuario, /SIGUE SIENDO recordar/);
});

test('cada nivel le pide una cosa distinta', () => {
  const c = cargarApp();
  const textos = [1, 2, 3, 4, 5].map(n => c.ev('nivelParaElPrompt')(n));
  assert.equal(new Set(textos).size, 5, 'hay niveles que piden lo mismo');
  /* El 4 cambia la FORMA de la pregunta y el 5 mete el segundo paso: es lo
     que separa este reparto de «los mismos retos con otras cifras». */
  assert.match(textos[3], /dato que falta|CUÁNTO VALE/);
  assert.match(textos[4], /dos pasos/i);
  /* Y sin nivel pedido, ni una palabra: las tandas de antes siguen igual. */
  assert.equal(c.ev('nivelParaElPrompt')(0), '');
});

test('el nivel que se guarda es el PEDIDO, no el que el modelo se cree', () => {
  const c = cargarApp();
  const reto = {
    question: '¿Cuánto vale la cifra 3 en 1.324?', options: ['300', '3', '30', '3.000'],
    answer: 0, hint1: 'Mira el lugar que ocupa.', hint2: 'Está en las centenas: cuenta de cien en cien.',
    explanation: 'Ocupa las centenas, así que vale trescientos.',
    skill: 'valor_posicional', criterio: 'Numeración hasta 9.999', nivel: 1
  };
  /* El modelo dice que escribió un nivel 1; la tanda pidió un 4. Manda el 4:
     su autoevaluación no es una medida, y un banco con niveles que nadie
     encargó no reparte nada. */
  const v = c.ev('validarRetoIA')(reto, { materia: 'matematicas', nivel: 4 });
  assert.ok(v.ok, v.motivos.join(' · '));
  assert.equal(v.reto.nivel, 4);
  /* Y si no se pidió ninguno, se respeta el que venga: así una tanda vieja
     no se queda sin nivel por haber pasado por aquí. */
  const sinPedir = c.ev('validarRetoIA')(reto, { materia: 'matematicas' });
  assert.equal(sinPedir.reto.nivel, 1);
});

test('fuera del 1-5 es «para todos», y no un reto tirado', () => {
  const c = cargarApp();
  const n = c.ev('nivelDeReto');
  assert.equal(n(0), 0);
  assert.equal(n(9), 0);
  assert.equal(n(-2), 0);
  assert.equal(n('hola'), 0);
  assert.equal(n(undefined), 0);
  /* Redondea en vez de rechazar: que escriba 3.0 no es motivo para tirar un
     reto bueno y pagado. */
  assert.equal(n(3.0), 3);
  assert.equal(n('4'), 4);
});

/* ══════════ La tanda de los cinco niveles ══════════ */

test('la tanda rota los niveles en vez de escribirlos en bloque', () => {
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudGenerarRetos(');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n/* Una llamada a la función', i));
  assert.match(cuerpo, /nivelDe = i => porNivel \? \(i % NIVELES\) \+ 1/,
    'rota 1,2,3,4,5,1,2… en vez de agrupar');
  /* Y el porqué, escrito donde se lee: una tanda se corta —se acabó el saldo,
     el iPad apagó la pantalla— y rotando, lo que quedó cubre el dial entero.
     Escribiendo los del nivel 1 primero, media tanda deja un pozo que solo
     sabe ponerse fácil. */
  assert.match(cuerpo, /se puede cortar/i);
  assert.match(cuerpo, /n: 1, nivel,/, 'y el nivel viaja en cada llamada');
});

test('el nivel se estampa en el cliente por si la función es vieja', () => {
  const cloud = leer('js/cloud.js');
  /* La función de Appwrite la despliega el docente a mano, así que puede ir
     por detrás de la app. Si va por detrás, devuelve retos sin nivel y la
     tanda entera saldría «para todos» sin que nadie se enterara. */
  assert.match(cloud, /if \(nivel\) x\.nivel = nivel;/);
});

test('sin la columna «nivel» los retos se guardan igual, y se avisa', () => {
  const cloud = leer('js/cloud.js');
  const teacher = leer('js/teacher.js');
  /* Quien creó la tabla antes de que esto existiera no tiene la columna.
     Perder por eso una tanda pagada sería convertir una mejora en una avería. */
  assert.match(cloud, /delete sinNivel\.nivel;/);
  assert.match(cloud, /faltaNivel/);
  /* Pero callárselo sería peor: el docente pagaría una tanda repartida en
     cinco niveles y se la encontraría entera «para todos» sin saber por qué. */
  assert.match(teacher, /guardado\.faltaNivel/);
  assert.match(teacher, /le falta la columna «nivel»/);
});

test('el nivel llega de la nube al banco sin perderse por el camino', () => {
  const c = cargarApp();
  /* Cuatro sitios por los que pasa un reto entre Appwrite y el motor. Que
     falte en uno solo basta para que el reparto no haga nada, y no se nota:
     el reto se juega igual. */
  const fila = c.ev('limpiarFila')({ $id: 'r1', nivel: 4, options: ['a'], skill: 's' });
  assert.equal(fila.nivel, 4, 'se pierde al limpiar la fila de Appwrite');
  const enBanco = c.ev('retoParaElBanco')({ $id: 'r1', nivel: 4, options: ['a', 'b', 'c', 'd'] });
  assert.equal(enBanco.nivel, 4, 'se pierde al mezclarlo en el pozo');
  const aGuardar = c.ev('filaDeReto')({ nivel: 4, options: ['a'], answer: 0 }, 'aula', 'cola');
  assert.equal(aGuardar.nivel, 4, 'se pierde al guardarlo');
});
