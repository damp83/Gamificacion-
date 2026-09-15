/* Lo que hace que una tanda no cueste veinte veces lo que debe.

   Los retos se piden DE UNO EN UNO —el tope de 30 s de Appwrite—, así que una
   tanda de veinte son veinte llamadas con casi el mismo encargo. El mensaje de
   sistema lleva un punto de caché: lo que va ahí se paga entero la primera vez
   y a una décima parte las diecinueve siguientes.

   Durante mucho tiempo el currículo viajó en el mensaje de USUARIO, que no se
   cachea, y es con diferencia lo más largo que se manda: hasta 20.000
   caracteres reenviados a precio completo veinte veces. El comentario del
   código decía que iba cacheado. No era verdad, y no lo dijo ningún error: se
   vio en la factura, con solo el 30 % de la entrada leída de caché.

   Por eso estas pruebas existen. Un fallo de caché no se cae, no da error y no
   cambia ni un reto: solo cuesta dinero, en silencio, hasta que alguien mira
   el desglose de tokens un mes después. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');
const leer = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

const CURRICULO = ('Sentido numérico: conteo, cardinalidad, comparación y ordenación de '
  + 'números naturales. Estrategias de cálculo mental. Resolución de problemas. ').repeat(40);
const POZO = { name: 'La Bóveda de los Números', contenido: 'Sumas llevando', yacimiento: 'Atlas' };

const encargo = (c, extra) => c.ev('promptGenerador')(Object.assign({
  materia: 'matematicas', curso: 4, estrato: 'recordar', curriculo: CURRICULO, pozo: POZO
}, extra || {}));

test('el currículo va en el mensaje CACHEADO, no en el de usuario', () => {
  const c = cargarApp();
  const p = encargo(c, { nivel: 3 });
  /* Es lo más largo que se manda y lo que más se repite: si está en el sitio
     equivocado, es el 70 % de la entrada de una tanda pagada a precio entero. */
  assert.ok(p.sistema.includes('Sentido numérico'), 'el currículo no está en el sistema');
  assert.ok(!p.usuario.includes('Sentido numérico'), 'el currículo sigue en el usuario, sin cachear');
  /* Y el mensaje sin cachear tiene que ser lo pequeño que puede ser. */
  assert.ok(p.usuario.length < p.sistema.length / 4,
    `el usuario son ${p.usuario.length} caracteres contra ${p.sistema.length} del sistema`);
});

test('el prefijo cacheado es idéntico en las veinte llamadas de una tanda', () => {
  const c = cargarApp();
  /* LA prueba. El caché es un acierto de PREFIJO: un solo carácter distinto
     entre una llamada y la siguiente y no se cachea nada. Se simula la tanda
     entera tal como la manda cloud.js: el nivel rotando del 1 al 5 y las dos
     listas de «ya escrito» creciendo. */
  const evitar = [], evitarConceptos = [];
  const sistemas = new Set(), usuarios = new Set();
  for (let i = 0; i < 20; i++) {
    const p = encargo(c, {
      nivel: (i % 5) + 1, evitar: evitar.slice(), evitarConceptos: evitarConceptos.slice()
    });
    sistemas.add(p.sistema);
    usuarios.add(p.usuario);
    evitar.push('¿Cuánto es ' + (100 + i) + ' + ' + (200 + i) + '?');
    if (i % 3 === 0) evitarConceptos.push('suma_llevada');
  }
  assert.equal(sistemas.size, 1,
    `el prefijo cambia ${sistemas.size} veces en una tanda: no se cachea nada`);
  /* Y lo contrario también importa: si el mensaje de usuario NO cambiara,
     sería que el nivel o la lista de evitados no están llegando, y entonces
     salen veinte retos iguales. */
  assert.equal(usuarios.size, 20, 'el mensaje de usuario tendría que cambiar en cada llamada');
});

test('lo que cambia entre llamadas NO puede estar en el prefijo', () => {
  const c = cargarApp();
  /* Los tres que rompen el caché si alguien los mueve al sistema «para que se
     lea mejor». Cada uno cambia dentro de la tanda. */
  const a = encargo(c, { nivel: 1, evitar: [], evitarConceptos: [] });
  const b = encargo(c, { nivel: 5, evitar: ['¿Cuánto es 2 + 2?'], evitarConceptos: ['suma_llevada'] });
  assert.equal(a.sistema, b.sistema, 'el nivel o los evitados se han colado en el prefijo');
  assert.notEqual(a.usuario, b.usuario);
  /* Y que de verdad llegan, en el otro mensaje. */
  assert.match(b.usuario, /NIVEL DE DIFICULTAD: 5 de 5/);
  assert.match(b.usuario, /¿Cuánto es 2 \+ 2\?/);
  assert.match(b.usuario, /suma_llevada/);
});

test('lo que NO cambia dentro de una tanda sí va en el prefijo', () => {
  const c = cargarApp();
  const p = encargo(c, { nivel: 2, concepto: 'suma_llevada', foco: 'la resta llevando' });
  /* Curso, estrato, pozo, concepto y foco son los mismos en las veinte
     llamadas. Dejarlos fuera del prefijo no rompe nada, solo cuesta. */
  for (const [que, re] of [
    ['el curso', /Curso: 4\.º/],
    ['el estrato', /Nivel cognitivo: Recordar/],
    ['el pozo', /La Bóveda de los Números/],
    ['el concepto pedido', /Concepto pedido: suma_llevada/],
    ['el foco', /la resta llevando/]
  ]) assert.match(p.sistema, re, `${que} tendría que ir en el prefijo cacheado`);
});

test('el punto de caché sigue puesto en el sistema de la generación', () => {
  const main = leer('functions/generador/src/main.js');
  /* Si alguien quita el `cache_control`, todo lo de arriba deja de servir y
     nada falla: solo se multiplica la factura por diez. */
  const i = main.indexOf('const gen = await client.messages.create(');
  assert.ok(i > 0, 'no encuentro la llamada de generación');
  const cuerpo = main.slice(i, main.indexOf('});', i));
  assert.match(cuerpo, /cache_control: \{ type: 'ephemeral' \}/, 'se ha quedado sin punto de caché');
  assert.match(cuerpo, /system: \[\{ type: 'text', text: enc\.sistema/);
});

test('la comprobación va a esfuerzo bajo, que resolver cuesta menos que escribir', () => {
  const main = leer('functions/generador/src/main.js');
  /* La segunda pasada resuelve retos ya escritos: es lo que impide que uno con
     la respuesta mal marcada llegue a un niño, pero no necesita el esfuerzo de
     redactarlos. Subirlo a «high» doblaría el coste de la tanda sin que nadie
     lo notara en pantalla. */
  const i = main.indexOf('const chk = await cli2.messages.create(');
  const cuerpo = main.slice(i, main.indexOf('});', i));
  assert.match(cuerpo, /effort: 'low'/);
});
