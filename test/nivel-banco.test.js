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

test('si se le acaban los suyos, la franja se abre sola', () => {
  const c = cargarApp();
  /* Un pozo pequeño: dos retos por nivel y una expedición de seis. El alumno
     de nivel 1 no puede quedarse sin retos porque solo haya dos de los suyos:
     la franja se ensancha hacia el 2, luego al 3… pero EN ORDEN, sin saltar
     al 5 mientras queden más cercanos. */
  const pozo = pozoConNiveles(c, [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  const usados = [];
  const salidos = [];
  for (let i = 0; i < 6; i++) {
    const q = c.ev('makeQuestion')(pozo, 'recordar', 1, usados, 4);
    assert.ok(q, `el reto ${i + 1} ha salido vacío`);
    salidos.push(q.nivel);
  }
  /* Seis índices distintos del banco: dentro de una misión no se repite. Los
     NIVELES sí se repiten, claro, que hay dos retos de cada uno. */
  assert.equal(new Set(usados).size, 6, 'seis retos distintos del banco');
  assert.ok(Math.max(...salidos) <= 3,
    `ha llegado al nivel ${Math.max(...salidos)} teniendo más cerca`);
  assert.ok(salidos.filter(n => n === 1).length === 2, 'se gasta primero los suyos');
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
