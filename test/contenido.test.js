/* Los generadores de retos. Un enunciado mal formado o una respuesta marcada
   donde no toca es el peor fallo posible aquí: el niño hace bien la cuenta y
   la plataforma le dice que se ha equivocado. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const G = ev('BUILTIN_GENERATORS');
const STRATA = ev('STRATA_ORDER');
const CURSOS = [1, 2, 3, 4, 5, 6];
const TIERS = [1, 2, 3, 4, 5];

test('los ocho pozos de fábrica cubren los cuatro estratos', () => {
  for (const [id, gen] of Object.entries(G)) {
    for (const s of STRATA) {
      assert.equal(typeof gen[s], 'function', `${id} no tiene ${s}`);
    }
  }
});

test('ningún reto sale malformado en 100 000 tiradas', () => {
  let n = 0;
  for (const [id, gen] of Object.entries(G)) {
    for (const s of STRATA) {
      for (const grade of CURSOS) {
        for (const tier of TIERS) {
          for (let i = 0; i < 105; i++) {   /* 8 pozos × 4 estratos × 6 cursos × 5 tiers × 105 = 100 800 */
            const q = gen[s](tier, grade);
            n++;
            const donde = `${id}/${s} curso ${grade} tier ${tier}`;
            assert.ok(q && q.question, `${donde}: sin enunciado`);
            assert.ok(Array.isArray(q.options) && q.options.length === 4, `${donde}: no son 4 opciones`);
            assert.ok(q.answer >= 0 && q.answer < q.options.length, `${donde}: answer fuera de rango`);
            assert.equal(new Set(q.options.map(String)).size, 4, `${donde}: opciones repetidas`);
            assert.ok(q.hint1 && q.hint2 && q.explanation, `${donde}: sin pistas o explicación`);
          }
        }
      }
    }
  }
  assert.ok(n >= 100000, `solo se generaron ${n}`);
});

test('el reto de decimales nunca le da la razón a Vera', () => {
  /* Es un reto de «encontrar el error»: Vera dice que un número es mayor
     «porque tiene más cifras». Antes los dos números se sorteaban por
     separado y la mitad de las veces Vera acertaba —por el motivo
     equivocado, pero acertaba—, así que el reto confirmaba justo la idea
     que venía a corregir. */
  const aComa = s => parseFloat(s.replace(',', '.'));
  for (let i = 0; i < 5000; i++) {
    const q = G.decimales.analizar(3, 5);
    const m = q.question.match(/Vera dice que ([\d,]+) es mayor que ([\d,]+)/);
    assert.ok(m, 'el enunciado cambió de forma');
    const [, senalado, otro] = m;

    const decSenalado = (senalado.split(',')[1] || '').length;
    const decOtro = (otro.split(',')[1] || '').length;
    assert.ok(decSenalado > decOtro, `${senalado} debería tener más cifras que ${otro}`);
    assert.ok(aComa(senalado) < aComa(otro), `${senalado} debería ser MENOR que ${otro}`);
    assert.equal(q.options[q.answer], `${otro} es mayor`);
  }
});

test('los distractores se escalan a la respuesta, sin negativos', () => {
  /* Con desplazamientos fijos, un alumno de 1.º con respuesta 14 veía
     opciones como 114 o −86: absurdos que delatan cuál es la correcta. */
  for (const s of STRATA) {
    for (let i = 0; i < 400; i++) {
      const q = G.numeracion[s](1, 1);
      for (const o of q.options) {
        const n = Number(String(o).replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(n)) assert.ok(n >= 0, `opción negativa: ${o} en «${q.question}»`);
      }
    }
  }
});

test('el techo numérico respeta el curso', () => {
  const numTop = ev('numTop');
  assert.ok(numTop(1, 5) <= 100, '1.º no pasa de 100');
  assert.ok(numTop(2, 5) <= 1000, '2.º no pasa de 1000');
  assert.ok(numTop(6, 5) <= 1000000, '6.º no pasa del millón');
  assert.ok(numTop(1, 5) < numTop(6, 5), 'un niño de 1.º ve números menores que uno de 6.º');
});
