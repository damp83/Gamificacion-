/* Qué pasa con una tanda cuando una llamada se pasa de los 30 segundos.

   Appwrite corta toda ejecución síncrona a los 30 s y ese tope no se puede
   subir; por eso los retos se piden de uno en uno. Lo que tarda el modelo en
   escribir un reto varía de una llamada a la siguiente, así que un corte
   suelto es normal.

   Y la tanda entera se abortaba en cuanto pasaba: `ejecutarConReintento` solo
   reintenta lo que viene marcado como `reintentable`, el corte no lo está, y
   el bucle hacía `break`. Se pedían veinte retos, la cuarta llamada tardaba de
   más y el docente se quedaba con TRES, sin que las dieciséis siguientes
   llegaran siquiera a intentarse.

   Lo que se fija aquí: un corte suelto se salta y la tanda sigue; dos seguidos
   la paran, porque entonces no es mala suerte sino que el encargo no cabe en
   treinta segundos, y seguir solo gastaría dinero —un corte se paga igual: el
   modelo terminó, lo que no llegó fue la respuesta—. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Una app con la nube lista y la llamada al generador sustituida por un guion:
   `plan` dice qué contesta cada llamada, 'ok' o 'tope'. */
function conPlan(plan) {
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.functions = {}; CLOUD.user = { $id: 'd1' }`);
  c.ev(`globalThis.__plan = ${JSON.stringify(plan)}; globalThis.__llamadas = []`);
  /* Se sustituye el único punto que toca la red. El resto del bucle —el
     reparto de niveles, la lista de evitados, el corte— es el de verdad. */
  c.ev(`ejecutarGenerador = async function (id, cuerpo) {
    __llamadas.push({ paso: cuerpo.paso, nivel: cuerpo.nivel });
    if (cuerpo.paso === 'verificar') {
      /* La segunda pasada devuelve los mismos: aquí no se prueba eso. */
      return { ok: true, retos: cuerpo.retos, descartados: [], usados: { entrada: 1, cacheados: 0, salida: 1 } };
    }
    const q = __plan.shift();
    if (q === 'tope') return { ok: false, reason: 'tope', texto: 'Appwrite ha cortado la llamada.' };
    return { ok: true, usados: { entrada: 10, cacheados: 90, salida: 20 },
             retos: [{ question: 'reto nivel ' + cuerpo.nivel, options: ['a','b','c','d'],
                       answer: 0, skill: 'suma_llevada' }], descartados: [] };
  }`);
  return c;
}

const generar = (c, porNivel) => c.ev(`cloudGenerarRetos({
  materia: 'matematicas', curso: 4, estrato: 'recordar',
  n: ${porNivel}, porNivel: true, curriculo: 'x'.repeat(200) })`);

test('un corte suelto se salta, y la tanda sigue hasta el final', async () => {
  /* Justo el caso real: tanda de 20 y la cuarta llamada se pasa de tiempo. */
  const plan = Array(20).fill('ok');
  plan[3] = 'tope';
  const c = conPlan(plan);
  const r = await generar(c, 4);
  assert.equal(r.ok, true);
  assert.equal(r.retos.length, 19, `se han quedado ${r.retos.length} en vez de 19`);
  assert.equal(r.cortados, 1);
  assert.equal(r.parado, false, 'un corte suelto no puede parar la tanda');
});

test('dos cortes seguidos sí la paran, en vez de gastar veinte', async () => {
  /* Un corte se paga igual que un reto: el modelo terminó su trabajo y lo que
     no llegó fue la respuesta. Si no cabe en treinta segundos, insistir
     dieciocho veces más es tirar el dinero del docente. */
  const plan = ['ok', 'ok', 'tope', 'tope', 'ok', 'ok', 'ok', 'ok'];
  const c = conPlan(plan.concat(Array(12).fill('ok')));
  const r = await generar(c, 4);
  assert.equal(r.parado, true, 'dos seguidos tendrían que pararla');
  assert.equal(r.retos.length, 2, 'se queda con los dos buenos');
  const gen = c.ev('__llamadas').filter(x => x.paso === 'generar').length;
  assert.equal(gen, 4, `ha seguido llamando: ${gen} llamadas de generación`);
});

test('y los cortes sueltos no se acumulan entre retos buenos', async () => {
  /* Tres cortes repartidos no son «tres seguidos». El contador se pone a cero
     con cada reto que entra: si no, una tanda larga se pararía sola por mala
     suerte repartida. */
  const plan = ['ok', 'tope', 'ok', 'tope', 'ok', 'tope', 'ok', 'ok', 'ok', 'ok'];
  const c = conPlan(plan.concat(Array(10).fill('ok')));
  const r = await generar(c, 4);
  assert.equal(r.parado, false, 'no eran seguidos');
  assert.equal(r.cortados, 3);
  assert.equal(r.retos.length, 17);
});

test('si TODO se corta desde el principio, se para a la segunda', async () => {
  /* El caso del currículo demasiado grande: no hay ni un reto bueno y no se
     puede devolver «ok» a secas, pero tampoco gastar veinte llamadas. */
  const c = conPlan(Array(20).fill('tope'));
  const r = await generar(c, 4);
  assert.equal(r.parado, true);
  assert.equal(r.retos.length, 0);
  assert.equal(c.ev('__llamadas').length, 2, 'dos intentos y para');
});

test('y el mensaje del corte dice qué hacer, no solo qué pasó', async () => {
  /* Esto se comprueba contra el código de verdad, no contra el doble de la
     prueba de arriba: lo que se enseña en pantalla sale de `ejecutarGenerador`
     al traducir el fallo de Appwrite. */
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.user = { $id: 'd1' };
        CLOUD.functions = { createExecution: async () => { throw new Error('Execution timed out.'); } }`);
  const r = await c.ev(`ejecutarGenerador('fn1', { paso: 'generar' })`);
  assert.equal(r.reason, 'tope');
  assert.match(r.texto, /30 segundos/);
  /* El ajuste «Timeout» de la función es OTRA cosa, y confundirlos manda al
     docente a cambiar un número que no arregla nada. */
  assert.match(r.texto, /no se puede subir/);
  assert.match(r.texto, /«Timeout» de la función es otra cosa/);
  /* Y lo que sí puede hacer él. */
  assert.match(r.texto, /bloque del área/);
});

test('un error que no es de tiempo sigue parando en seco', async () => {
  /* Sin saldo, clave caducada, permisos: eso no se arregla saltándose un reto,
     y seguir intentándolo veinte veces no lleva a ninguna parte. */
  const c = conPlan([]);
  c.ev(`ejecutarGenerador = async function () {
    __llamadas.push({ paso: 'generar' });
    return { ok: false, reason: 'sin-saldo', texto: 'La cuenta no tiene saldo.' };
  }`);
  const r = await generar(c, 4);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sin-saldo');
  assert.equal(c.ev('__llamadas').length, 1, 'no puede insistir con un error así');
});

test('la tanda reparte los cinco niveles aunque se corte alguna', async () => {
  /* El reparto rotando existe para que una tanda cortada cubra el dial
     entero. Saltarse un reto no puede romper esa rotación. */
  const plan = Array(20).fill('ok');
  plan[2] = 'tope';
  const c = conPlan(plan);
  await generar(c, 4);
  const niveles = c.ev('__llamadas').filter(x => x.paso === 'generar').map(x => x.nivel);
  assert.deepEqual(niveles.slice(0, 6), [1, 2, 3, 4, 5, 1], 'la rotación no es la de siempre');
  assert.equal(new Set(niveles).size, 5, 'tendría que tocar los cinco niveles');
});

/* ══════════ Completar una tanda cortada ══════════ */

test('la tanda pide primero los niveles que faltan, no siempre el 1', () => {
  const c = cargarApp();
  const orden = c.ev('ordenDeNiveles');
  /* El caso que lo motiva: una tanda de 20 se cortó y dejó el estrato con
     cuatro retos en los niveles 1-3, tres en el 4 y NINGUNO en el 5. Volver a
     darle a Generar repetía 1,2,3,4,5 desde el principio y amontonaba más
     retos fáciles encima de los que ya sobraban, dejando el hueco donde
     estaba. */
  const o = orden(5, [4, 4, 4, 3, 0]);
  assert.equal(o[0], 5, 'el primero tiene que ser el que no tiene ninguno');
  assert.deepEqual(o.slice(0, 4), [5, 5, 5, 4], 'rellena el hueco antes de tocar nada más');
});

test('con el estrato vacío se comporta EXACTAMENTE como la rotación de antes', () => {
  const c = cargarApp();
  const orden = c.ev('ordenDeNiveles');
  /* El reparto rotando existe para que una tanda cortada cubra el dial entero.
     Priorizar lo que falta no puede romper eso cuando no falta nada. */
  assert.deepEqual(orden(10, [0, 0, 0, 0, 0]), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  assert.deepEqual(orden(10, null), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5], 'sin recuento, igual');
  assert.deepEqual(orden(7, undefined).slice(0, 5), [1, 2, 3, 4, 5]);
});

test('a igualdad de retos manda el nivel más bajo', () => {
  const c = cargarApp();
  /* Un pozo sin retos fáciles deja fuera al alumno que va justo, que es el que
     menos aguanta quedarse sin nada que pueda hacer. */
  assert.deepEqual(c.ev('ordenDeNiveles')(5, [2, 2, 2, 2, 2]), [1, 2, 3, 4, 5]);
});

test('una segunda tanda completa el estrato en vez de desnivelarlo', async () => {
  const c = conPlan(Array(30).fill('ok'));
  /* Los cinco que faltan tras el corte del caso real. */
  await c.ev(`cloudGenerarRetos({ materia: 'matematicas', curso: 4, estrato: 'recordar',
    n: 1, porNivel: true, yaPorNivel: [4, 4, 4, 3, 0], curriculo: 'x'.repeat(200) })`);
  const niveles = c.ev('__llamadas').filter(x => x.paso === 'generar').map(x => x.nivel);
  /* Tras la segunda tanda, ningún nivel puede quedar a cero. */
  const total = [4, 4, 4, 3, 0].slice();
  niveles.forEach(n => total[n - 1]++);
  assert.ok(Math.min(...total) > 0, `sigue habiendo un nivel vacío: ${total.join(',')}`);
  assert.ok(Math.max(...total) - Math.min(...total) <= 1,
    `el estrato queda desnivelado: ${total.join(',')}`);
});

/* ══════════ Lo que cuesta, dicho en dinero ══════════ */

test('la tanda dice lo que ha costado, no cuántos tokens', () => {
  const c = cargarApp();
  /* «12.684 tokens de entrada» no le dice nada a nadie, y el panel llegó a
     prometer 0,6 céntimos por reto cuando la realidad son entre 4 y 7. Un
     docente que presupueste con ese número se lleva un susto. */
  const t = c.ev('gastoDeLaTanda')({ entrada: 9000, cacheados: 81000, salida: 22383 }, 15);
  assert.match(t, /céntimos/);
  assert.match(t, /por reto/);
  /* 9000×5 + 81.000×0,5 + 22.383×25, por millón = 0,645 $ ≈ 65 céntimos, y
     entre quince retos salen a 4,3. */
  assert.match(t, /^\(65 céntimos, 4\.3 por reto/, `dice: ${t}`);
});

test('y separa la entrada nueva de la leída de caché', () => {
  const c = cargarApp();
  /* Sumarlas es lo que escondió durante meses que el currículo no se estaba
     cacheando: el total se veía igual de grande con caché y sin él. Si «de
     caché» no es la mayor con diferencia, algo se ha roto en el prompt. */
  const t = c.ev('gastoDeLaTanda')({ entrada: 9000, cacheados: 81000, salida: 22383 }, 15);
  /* Sin separador en cuatro cifras, que es lo que toca en español. */
  assert.match(t, /9000 nueva/);
  assert.match(t, /81\.000 de caché, el 90 %/);
  /* Y el caso enfermo, el de antes del arreglo: se tiene que ver. */
  const malo = c.ev('gastoDeLaTanda')({ entrada: 80000, cacheados: 10000, salida: 22383 }, 15);
  assert.match(malo, /el 11 %/, `un caché roto tendría que cantar: ${malo}`);
});
