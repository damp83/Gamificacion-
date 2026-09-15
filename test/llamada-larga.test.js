/* Las llamadas que NO se pueden trocear.

   Appwrite corta toda ejecución síncrona a los 30 segundos y ese tope no se
   puede subir. Los retos se piden de uno en uno para caber, y desde hace poco
   un corte suelto ya no rompe la tanda: se salta ese reto y sigue.

   Pero el yacimiento propuesto y la extracción de criterios son UNA llamada
   larga cada uno. Ahí no hay nada que trocear ni que saltarse: o entra en
   treinta segundos o no entra, y el docente se queda mirando un aviso que
   encima le hablaba de «dos seguidas» cuando él solo había hecho una. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');
const leer = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

/* Una app con la nube lista y Appwrite contestando siempre que se agotó el
   tiempo, que es lo que pasa de verdad al pasarse de los 30 s. */
function conCorte() {
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.user = { $id: 'd1' };
        CLOUD.functions = { createExecution: async () => { throw new Error('Execution timed out.'); } }`);
  return c;
}

test('el consejo del corte cambia según si había algo que saltarse', async () => {
  const c = conCorte();
  const tanda = await c.ev(`ejecutarGenerador('fn1', { paso: 'generar' })`);
  const suelta = await c.ev(`ejecutarGenerador('fn1', { paso: 'yacimiento' })`);

  /* El tope y su explicación son los mismos en las dos: lo que cambia es qué
     puede hacer el docente. */
  for (const r of [tanda, suelta]) {
    assert.equal(r.reason, 'tope');
    assert.match(r.texto, /30 segundos/);
    assert.match(r.texto, /«Timeout» de la función es otra cosa/);
  }
  /* En la tanda sí hay algo que saltarse, y por eso se habla de dos seguidas. */
  assert.match(tanda.texto, /Dos seguidas/);
  /* En una llamada suelta, decirle eso lo deja sin saber qué hacer. */
  assert.ok(!/Dos seguidas/.test(suelta.texto),
    `a una llamada suelta se le sigue hablando de dos seguidas: ${suelta.texto}`);
  assert.match(suelta.texto, /una sola llamada/);
  assert.match(suelta.texto, /la mitad de pozos/, 'y dice qué puede hacer él');
});

test('los criterios también son una llamada suelta', async () => {
  const c = conCorte();
  const r = await c.ev(`ejecutarGenerador('fn1', { paso: 'criterios' })`);
  assert.ok(!/Dos seguidas/.test(r.texto), r.texto);
  assert.match(r.texto, /una sola llamada/);
});

/* ══════════ El modo rápido, donde compensa ══════════ */

test('las dos llamadas sueltas corren en modo rápido; el bucle de retos no', () => {
  const main = leer('functions/generador/src/main.js');
  /* Cuesta el doble por token. En una llamada suelta y rara eso son céntimos a
     cambio de que termine; en el bucle de retos el coste se multiplica por
     veinte, y además cambiar de velocidad invalida el caché del encargo, que
     es justo lo que abarata la tanda. */
  const i = main.indexOf('const gen = await ');
  const generacion = main.slice(i, main.indexOf('});', i));
  assert.ok(!/deprisa/.test(generacion),
    'el bucle de retos no puede ir en modo rápido: multiplicaría el coste y tiraría el caché');
  assert.match(generacion, /client\.messages\.create/);

  /* Y las dos sueltas sí. */
  assert.match(main, /const y = await deprisa\(cli3,/, 'el yacimiento');
  assert.match(main, /const c = await deprisa\(cli4,/, 'los criterios');
});

test('si el modo rápido no está, se repite a velocidad normal en vez de fallar', () => {
  const main = leer('functions/generador/src/main.js');
  const i = main.indexOf('async function deprisa(');
  assert.ok(i > 0, 'no encuentro deprisa()');
  const cuerpo = main.slice(i, main.indexOf('\n}', i));
  assert.match(cuerpo, /betas: \['fast-mode-2026-02-01'\], speed: 'fast'/);
  /* La vuelta atrás: la cuenta puede no tener el modo rápido, o tener lleno su
     límite aparte. Quedarse sin propuesta por eso sería peor que esperar. */
  assert.match(cuerpo, /return await cli\.messages\.create\(peticion\);/);
  assert.match(cuerpo, /codigo !== 429 && codigo !== 400 && codigo !== 404/,
    'un límite lleno o un parámetro no reconocido vuelven atrás');
  /* Y lo que NO puede pasar: tragarse un error de verdad y repetirlo, que
     haría esperar el doble para el mismo fallo. */
  assert.match(cuerpo, /throw e;/);
  /* Ni mirar el texto del error para decidir: puede traer la clave dentro, y
     aquí no hay con qué taparla. Lo fija también la prueba de la clave en
     `test/generador.test.js`, y está aquí porque es el motivo del diseño. */
  assert.ok(!/e\.message/.test(cuerpo), 'decide por el código, no por el texto');
});
