/* La parte de arriba del dial de dificultad.

   El motor adaptativo sube a un alumno hasta el nivel 5, pero durante mucho
   tiempo ahí no había nada: la rampa numérica valía `0,4 + 0,15 × nivel`, que
   llega a 1,00 en el nivel 4, así que el 5 daba EXACTAMENTE lo mismo. Y de los
   usos del nivel en los generadores, la mayoría eran `tier <= 2`: un
   interruptor fácil/no-fácil.

   O sea: el sistema sabía bajar y no sabía subir, que es justo al revés de lo
   que necesita un aula. Lo que se fija aquí es que los cinco niveles sean
   distintos, que el techo del CURSO siga siendo infranqueable, y que lo que
   cambia arriba sea la estructura de la tarea y no solo el tamaño del número:
   8.500 y 10.000 son la misma operación. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const gen = c => c.ev('BUILTIN_GENERATORS');
/* Los generadores llevan azar: se tira varias veces y se mira el conjunto. */
const tirar = (c, pozo, estrato, tier, grade, n) =>
  Array.from({ length: n || 40 }, () => gen(c)[pozo][estrato](tier, grade));

test('los cinco niveles dan cinco techos distintos', () => {
  const c = cargarApp();
  for (const [fn, curso] of [['numTop', 4], ['sumTop', 4], ['sumTop', 6]]) {
    const v = [1, 2, 3, 4, 5].map(t => c.ev(fn)(curso, t));
    assert.equal(new Set(v).size, 5, `${fn}(${curso}) satura: ${v.join(', ')}`);
    /* Y en orden, que si no la rampa no es una rampa. */
    for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1], `${fn} no sube del ${i} al ${i + 1}`);
  }
});

test('el nivel 5 llega al techo del curso y no lo rebasa NUNCA', () => {
  /* El curso lo decide el currículo, no una racha de aciertos: un alumno de
     4.º no puede ver números de 5.º por muy sobrado que vaya. */
  const c = cargarApp();
  const techoSuma = { 1: 20, 2: 100, 3: 1000, 4: 1000, 5: 10000, 6: 100000 };
  for (const g of [1, 2, 3, 4, 5, 6]) {
    assert.equal(c.ev('sumTop')(g, 5), techoSuma[g], `en ${g}.º el nivel 5 no llega al techo`);
    /* Ni con un nivel imposible. */
    assert.ok(c.ev('sumTop')(g, 99) <= techoSuma[g], `en ${g}.º se rebasa el techo`);
  }
});

test('arriba se pregunta cuánto VALE la cifra, no qué cifra es', () => {
  /* Señalar la cifra de las centenas se resuelve contando posiciones con el
     dedo. Preguntar cuánto vale obliga a leer la cantidad, que es lo que pide
     OAOA: operar con cantidades y no con cifras. */
  const c = cargarApp();
  const bajo = tirar(c, 'numeracion', 'recordar', 2, 4).map(q => q.question);
  const alto = tirar(c, 'numeracion', 'recordar', 5, 4).map(q => q.question);
  assert.ok(!bajo.some(q => /VALE/.test(q)), 'en los niveles bajos no toca');
  assert.ok(alto.some(q => /VALE/.test(q)), 'en el nivel 5 tiene que aparecer');
});

test('y la cifra suelta está entre las falsas, que es el error real', () => {
  /* Quien lee posiciones en vez de cantidades contesta «5» donde vale 500.
     Esa opción TIENE que estar, o el reto no distingue a quién lo entiende. */
  const c = cargarApp();
  const q = tirar(c, 'numeracion', 'recordar', 5, 4, 80).find(x => /VALE/.test(x.question));
  assert.ok(q, 'no ha salido ninguna de valor posicional');
  const cifra = Number(q.question.match(/la cifra (\d)/)[1]);
  const ops = JSON.parse(JSON.stringify(q.options)).map(o => Number(String(o).replace(/\./g, '')));
  assert.ok(ops.includes(cifra), `la cifra suelta (${cifra}) no está entre las opciones`);
  assert.ok(ops[q.answer] > cifra, 'la respuesta buena tiene que ser la cantidad, no la cifra');
});

test('arriba se pide el sumando que falta, no el resultado', () => {
  /* Sumar con números más grandes es la misma tarea con más cifras. Buscar la
     parte que falta obliga a pensar en partes y todo. */
  const c = cargarApp();
  const bajo = tirar(c, 'sumas_llevando', 'recordar', 2, 4);
  const alto = tirar(c, 'sumas_llevando', 'recordar', 5, 4);
  assert.ok(bajo.every(q => !/se ha borrado/.test(q.question)));
  assert.ok(alto.every(q => /se ha borrado/.test(q.question)), 'en el nivel 5 siempre');
  /* Y se resuelve como parte y todo, no como una suma más. */
  alto.slice(0, 5).forEach(q => {
    assert.match(q.hint1, /todo/);
    assert.match(q.hint1, /parte/);
  });
});

test('el problema del nivel 5 tiene dos pasos y de signos distintos', () => {
  /* Juntar tres cantidades es el mismo gesto tres veces. Juntar y luego quitar
     obliga a decidir qué operación pide cada trozo del enunciado. */
  const c = cargarApp();
  const q = tirar(c, 'sumas_llevando', 'aplicar', 5, 4, 20);
  assert.ok(q.every(x => /se les caen/.test(x.question)), 'el nivel 5 tiene que ser de dos pasos');
  assert.ok(q.every(x => /−/.test(x.explanation)), 'la explicación tiene que enseñar los dos pasos');
  /* Y sumarlo todo sin leer está entre las falsas: es el error de verdad. */
  const uno = q[0];
  const n = uno.explanation.match(/([\d.]+) \+ ([\d.]+) = ([\d.]+)/);
  const suma = Number(n[3].replace(/\./g, ''));
  const ops = JSON.parse(JSON.stringify(uno.options)).map(o => Number(String(o).replace(/\./g, '')));
  assert.ok(ops.includes(suma), 'falta la opción de quien suma sin leer el final');

  /* Los niveles 3 y 4 siguen siendo de juntar. */
  assert.ok(tirar(c, 'sumas_llevando', 'aplicar', 3, 4, 10).every(x => !/se les caen/.test(x.question)));
});

test('lo que se añade arriba sigue hablando OAOA', () => {
  /* Un reto más difícil no es excusa para explicarlo con llevadas y columnas:
     eso le enseñaría al niño a desconfiar de su maestro justo cuando más
     atención le está prestando. */
  const c = cargarApp();
  const pegas = c.ev('pegasOAOA');
  const sucios = [];
  for (const [pozo, estrato] of [['numeracion', 'recordar'], ['sumas_llevando', 'recordar'],
                                 ['sumas_llevando', 'aplicar']]) {
    for (let g = 3; g <= 6; g++) tirar(c, pozo, estrato, 5, g, 20).forEach(q => {
      [q.hint1, q.hint2, q.explanation].forEach(x => {
        pegas(x || '').forEach(p => sucios.push(`${pozo}/${estrato} ${g}.º: ${p}`));
      });
    });
  }
  assert.deepStrictEqual(sucios.length, 0, sucios.slice(0, 3).join(' · '));
});

test('los tesoros concuerdan en género', () => {
  /* «¿Cuántas mapas antiguos?» era lo que salía antes: la lista mezcla
     masculinos y femeninos y el enunciado decía «Cuántas» siempre. */
  const c = cargarApp();
  const lista = c.ev('JSON.parse(JSON.stringify(TREASURES))');
  assert.ok(lista.length >= 4);
  lista.forEach(t => {
    assert.ok(typeof t.n === 'string' && t.n.length, 'cada tesoro necesita su nombre');
    assert.equal(typeof t.f, 'boolean', `${t.n} no declara género`);
    assert.equal(c.ev('cuantos')(t), t.f ? 'Cuántas' : 'Cuántos');
  });
  /* Y ningún enunciado generado se equivoca. */
  const malos = [];
  for (const [pozo, estrato] of [['sumas_llevando', 'aplicar'], ['sumas_llevando', 'comprender'],
                                 ['fracciones', 'aplicar']]) {
    tirar(c, pozo, estrato, 5, 4, 60).forEach(q => {
      lista.forEach(t => {
        const mal = t.f ? new RegExp('Cuántos ' + t.n) : new RegExp('Cuántas ' + t.n);
        if (mal.test(q.question)) malos.push(`${pozo}/${estrato}: ${t.n}`);
      });
    });
  }
  assert.deepStrictEqual(malos.length, 0, [...new Set(malos)].join(' · '));
});

test('ningún generador se rompe ni saca un reto mal formado', () => {
  /* Cambiar la rampa toca TODOS los pozos: lo que hay que comprobar es que
     nada se queda sin cuatro opciones distintas en ningún curso ni nivel. */
  const c = cargarApp();
  const G = gen(c);
  let n = 0;
  for (const pozo of ['numeracion', 'sumas_llevando', 'fracciones', 'sendero', 'decimales']) {
    for (const estrato of ['recordar', 'comprender', 'aplicar', 'analizar']) {
      for (let g = 1; g <= 6; g++) for (let t = 1; t <= 5; t++) for (let i = 0; i < 8; i++) {
        const q = G[pozo][estrato](t, g);
        const o = JSON.parse(JSON.stringify(q.options));
        assert.ok(q.question && q.skill, `${pozo}/${estrato} sin enunciado o concepto`);
        assert.equal(o.length, 4, `${pozo}/${estrato} ${g}.º nivel ${t}: ${o.length} opciones`);
        assert.equal(new Set(o.map(String)).size, 4, `${pozo}/${estrato} ${g}.º nivel ${t}: repetidas`);
        assert.ok(q.answer >= 0 && q.answer < 4, `${pozo}/${estrato}: índice fuera de rango`);
        n++;
      }
    }
  }
  assert.ok(n > 4000, 'la barrida tiene que cubrir de verdad');
});

test('nadie sale dos veces en el mismo enunciado', () => {
  /* «Bruno guarda 581 brújulas y Bruno desentierra 311 más» le cuesta a un
     niño de ocho años más que la propia suma: parece que se contradice. */
  const c = cargarApp();
  const nombres = c.ev('JSON.parse(JSON.stringify(NAMES))');
  const malos = [];
  for (const tier of [3, 4, 5]) {
    tirar(c, 'sumas_llevando', 'aplicar', tier, 4, 80).forEach(q => {
      nombres.forEach(n => {
        if ((q.question.match(new RegExp(n, 'g')) || []).length > 1) malos.push(`nivel ${tier}: ${n}`);
      });
    });
  }
  assert.deepStrictEqual(malos.length, 0, [...new Set(malos)].join(' · '));
  /* Y el ayudante sabe a quién no puede elegir. */
  for (let i = 0; i < 40; i++) {
    assert.notEqual(c.ev('otroNombre')('Bruno'), 'Bruno');
  }
});
