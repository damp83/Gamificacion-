/* El diagnóstico por concepto. Sin esto, lo más fino que el docente sabía era
   «Numeración · Aplicar: 62 %», y con eso no se prepara una clase. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const CONCEPTOS = ev('CONCEPTOS');
const G = ev('BUILTIN_GENERATORS');
const STRATA = ev('STRATA_ORDER');

test('todo reto de fábrica declara un concepto que existe en el catálogo', () => {
  let n = 0;
  for (const [pozo, gen] of Object.entries(G)) {
    for (const s of STRATA) {
      for (let grade = 1; grade <= 6; grade++) {
        for (let tier = 1; tier <= 5; tier++) {
          for (let i = 0; i < 25; i++) {   /* 8 pozos × 4 estratos × 6 cursos × 5 tiers × 25 = 24 000 */
            const q = gen[s](tier, grade);
            n++;
            assert.ok(q.skill, `${pozo}/${s} (curso ${grade}, tier ${tier}) sin concepto`);
            assert.ok(CONCEPTOS[q.skill], `${pozo}/${s} declara «${q.skill}», que no está en el catálogo`);
          }
        }
      }
    }
  }
  assert.ok(n > 20000);
});

test('ningún concepto del catálogo se queda sin usar', () => {
  const vistos = new Set();
  for (const gen of Object.values(G))
    for (const s of STRATA)
      for (let grade = 1; grade <= 6; grade++)
        for (let tier = 1; tier <= 5; tier++)
          for (let i = 0; i < 25; i++) vistos.add(gen[s](tier, grade).skill);
  const huerfanos = Object.keys(CONCEPTOS).filter(k => !vistos.has(k));
  assert.deepEqual(huerfanos, [], 'conceptos declarados que ningún reto genera');
});

test('el cálculo y el enunciado son conceptos distintos', () => {
  /* Un niño que resuelve 4856 + 30 y falla el mismo cálculo dentro de un
     problema no tiene un problema de matemáticas, lo tiene de lectura.
     Mezclarlos en un solo concepto escondía justo eso. */
  const calculo = new Set(), problema = new Set();
  for (let i = 0; i < 200; i++) {
    calculo.add(G.sumas_llevando.recordar(3, 4).skill);
    problema.add(G.sumas_llevando.aplicar(3, 4).skill);
  }
  assert.deepEqual([...calculo], ['suma_llevada']);
  assert.deepEqual([...problema], ['problema_suma']);
});

test('la ortografía se clasifica por regla, no por estrato', () => {
  /* «Falla ortografía» no se puede enseñar; «falla B/V» sí. */
  const vistos = new Set();
  for (const s of STRATA)
    for (let i = 0; i < 300; i++) vistos.add(G.ortografia[s](3, 4).skill);
  assert.ok(vistos.size >= 4, `solo salieron ${vistos.size} reglas distintas`);
  for (const v of vistos) assert.match(v, /^orto_/);
});

test('un concepto con pocos intentos no se declara flojo', () => {
  /* Con dos respuestas no se sabe nada: un solo fallo daría 100 % de error y
     mandaría al docente a repasar algo que quizá no toca. */
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  ctx.ev('recordConcepto')('suma_llevada', false);
  ctx.ev('recordConcepto')('suma_llevada', false);
  assert.deepEqual(ctx.ev('conceptosFlojos')(), []);
  ctx.ev('recordConcepto')('suma_llevada', false);
  assert.equal(ctx.ev('conceptosFlojos')().length, 1);
});

test('«falla una de cada tres» SÍ se marca', () => {
  /* Es el patrón más común de un concepto que se atraganta, y el umbral
     estaba en 0,34: una de cada tres da 0,333 exacto y se quedaba justo por
     debajo. Medido en su día sobre ocho turnos seguidos fallando un tercio de
     las respuestas, el diagnóstico no marcaba ni un concepto. */
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  for (let i = 0; i < 6; i++) ctx.ev('recordConcepto')('suma_llevada', i >= 2);  // 2 de 6
  const flojos = ctx.ev('conceptosFlojos')();
  assert.equal(flojos.length, 1);
  assert.ok(Math.abs(flojos[0].tasa - 1 / 3) < 0.001);
});

test('un fallo suelto nunca marca un concepto, por muy alta que salga la tasa', () => {
  /* Con el mínimo de tres intentos, un único error da 33 % y mandaría al
     docente a repasar lo que a lo mejor fue un despiste. */
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  for (let i = 0; i < 3; i++) ctx.ev('recordConcepto')('sinonimos', i >= 1);   // 1 de 3
  assert.deepEqual(ctx.ev('conceptosFlojos')(), []);
});

test('un concepto que se acierta casi siempre no sale como flojo', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  for (let i = 0; i < 9; i++) ctx.ev('recordConcepto')('sinonimos', true);
  ctx.ev('recordConcepto')('sinonimos', false);
  assert.deepEqual(ctx.ev('conceptosFlojos')(), [], '10 % de fallo no es un problema');
});

test('la clase se agrega por concepto, ordenada por a cuántos les pasa', () => {
  const alumno = (nombre, conceptos) => ({
    id: nombre, name: nombre,
    summary: { v: 1, xp: 300, mastered: 1, totalStrata: 4, conceptos }
  });
  /* «resta_llevada» la fallan tres; «porcentaje», uno solo con peor tasa.
     Debe mandar el número de alumnos: lo que decide si algo va a la pizarra
     es a cuánta gente le sirve, no cuánto falla quien lo falla. */
  const d = ev('buildClassOverview')([
    alumno('Vega', [['resta_llevada', 4, 9], ['porcentaje', 9, 9]]),
    alumno('Nilo', [['resta_llevada', 5, 10]]),
    alumno('Mara', [['resta_llevada', 6, 10]])
  ], '2026-08-28');

  assert.equal(d.repasar[0].id, 'resta_llevada');
  assert.equal(d.repasar[0].alumnos.length, 3);
  assert.deepEqual(d.repasar[0].alumnos.sort(), ['Mara', 'Nilo', 'Vega']);
  assert.equal(d.repasar[0].label, 'Resta llevando', 'la etiqueta es la que lee el docente');
  assert.equal(d.repasar[0].area, 'Cálculo');
  assert.equal(d.repasar[1].id, 'porcentaje');
  assert.equal(d.repasar[1].alumnos.length, 1);
});

test('un resumen hostil no envenena el agregado de la clase', () => {
  /* Los conceptos los sube el cliente del alumno, como todo el resumen. */
  const d = ev('buildClassOverview')([{
    id: 'x', name: 'Trasto',
    summary: { v: 1, xp: 1, conceptos: [
      ['<img src=x onerror=1>', 5, 10],   /* id con marcado */
      ['suma_llevada', 999, 3],           /* más fallos que intentos */
      ['suma_llevada', 'a', 'b'],         /* no son números */
      'ni siquiera es una terna'
    ] }
  }], '2026-08-28');
  const ficha = d.students[0];

  /* Sobrevive solo la primera: las otras tres son incoherentes y se tiran.
     La que queda lleva marcado en el id, y eso está BIEN: el id es un dato,
     no una orden. Lo que no puede es llegar ejecutable a la pantalla del
     docente, y de eso se encarga esc() al pintarlo. */
  assert.equal(ficha.conceptos.length, 1);
  const c = ficha.conceptos[0];
  assert.ok(c.errors <= c.attempts, 'no puede haber más fallos que intentos');
  assert.equal(typeof c.attempts, 'number');
  assert.doesNotMatch(ev('esc')(c.id), /<[a-zA-Z/]/, 'escapado, el id no abre etiqueta');

  /* Y el agregado de clase tampoco se rompe por ello */
  assert.equal(d.repasar.length, 1);
  assert.equal(d.repasar[0].alumnos.length, 1);
});
