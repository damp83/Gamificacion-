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
const leerFuente = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

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

/* ── El suelo de dificultad ──
   Había techo y no había suelo: el motor podía bajarle el nivel a quien no lo
   necesitaba —una mala tarde, un día de fiebre— y dejarlo excavando por debajo
   de lo suyo hasta que remontara la media móvil. Para quien va sobrado, eso
   son varias sesiones aburridas por una racha que no dice nada de él. */

function conAdap(c, adap) {
  c.ev('createState')('Ana');
  c.ev('S.profile.grade = 4;');
  c.ev('S.profile.adaptacion = ' + JSON.stringify(adap) + ';');
  return c;
}
const machacar = (c, acierta, veces) => {
  c.ev('S.adaptive.last10 = [];');
  for (let i = 0; i < (veces || 25); i++) c.ev('recordFirstTry')(acierta, acierta ? 3000 : 9000);
  return c.ev('S.adaptive.tier');
};

test('sin suelo, una mala racha baja hasta el nivel 1', () => {
  const c = conAdap(cargarApp(), { activa: false });
  c.ev('S.adaptive.tier = 4;');
  assert.equal(machacar(c, false), 1);
});

test('con suelo, una mala racha no le quita la dificultad que necesita', () => {
  const c = conAdap(cargarApp(), { activa: true, suelo: 3 });
  c.ev('S.adaptive.tier = 4;');
  assert.equal(machacar(c, false), 3, 'el suelo tiene que frenar la bajada');
  assert.equal(machacar(c, true), 5, 'y subir sigue sin impedirse');
});

test('el suelo levanta también la entrada a un estrato nuevo', () => {
  /* La amortiguación de entrada protege de la ansiedad al estrenar un estrato.
     Un docente que pone suelo ha dicho que a ESTE niño esa protección le
     sobra: es una decisión sobre un alumno concreto y pesa más que un valor
     por defecto pensado para todos. */
  const c = conAdap(cargarApp(), { activa: true, suelo: 5 });
  const rama = c.ev('playableBranchIds()')[0];
  const orden = c.ev('STRATA_ORDER');
  c.ev('S.adaptive.tier = 5;');
  assert.equal(c.ev('entryTier')(rama, orden[0]), 5, 'la amortiguación no puede bajar del suelo');

  const d = conAdap(cargarApp(), { activa: false });
  d.ev('S.adaptive.tier = 5;');
  assert.equal(d.ev('entryTier')(rama, orden[0]), 3, 'sin suelo, la entrada sigue amortiguada');
});

test('si suelo y techo se contradicen, manda el techo', () => {
  /* Equivocarse hacia abajo deja a un niño aburrido; equivocarse hacia arriba
     lo deja hundido. Ante dos palancas que se pelean, gana la segura. */
  const c = conAdap(cargarApp(), { activa: true, suelo: 5, techo: 2 });
  c.ev('S.adaptive.tier = 3;');
  assert.equal(machacar(c, true), 2, 'no puede superar el techo ni con suelo alto');
  assert.equal(c.ev('nivelPermitido')(5), 2);
  assert.equal(c.ev('nivelPermitido')(1), 2, 'el suelo lo empuja, el techo lo frena, y queda en 2');
});

test('todo lo que fija la dificultad pasa por un único sitio', () => {
  /* Tres sitios decidiendo el nivel son tres sitios que un día dejan de
     coincidir. Aquí ya pasó: la Cámara del Guardián se saltaba el techo del
     alumno, así que su prueba era más dura que todo lo que había jugado. */
  const c = cargarApp();
  assert.equal(typeof c.ev('nivelPermitido'), 'function');
  const g = leerFuente('js/game.js');
  assert.match(g, /function entryTier[\s\S]{0,900}nivelPermitido\(/);
  assert.match(g, /const tier = nivelPermitido\(S\.adaptive\.tier \+/, 'la Cámara también');
  const s = leerFuente('js/state.js');
  assert.match(s, /S\.adaptive\.tier = nivelPermitido\(S\.adaptive\.tier\);/, 'y el motor');
});

test('la Cámara del Guardián no se salta el techo del alumno', () => {
  const c = conAdap(cargarApp(), { activa: true, techo: 2 });
  c.ev('S.adaptive.tier = 2;');
  /* El refuerzo de la Cámara sube un punto; el techo lo recorta igual. */
  assert.equal(c.ev('nivelPermitido')(c.ev('S.adaptive.tier') + 1), 2);
});

test('la tarjeta del estrato le dice SU puerta, no la de todos', () => {
  /* Si el docente se la ha movido, prometerle el 80 en la única pantalla
     donde mira cuánto le falta sería mentirle. */
  const p = leerFuente('js/play.js');
  assert.match(p, /dominioParaAbrir\(\)/, 'el porcentaje sale de su puerta');
  assert.ok(!/≥80%/.test(p), 'no puede quedar ningún 80 escrito a mano');
});

/* ══════════ Los pozos que faltaban ══════════ */

test('ningún pozo ignora el nivel de dificultad', () => {
  /* «decimales» recibía `tier` en sus cuatro estratos y no lo usaba en
     ninguno: los cinco niveles daban exactamente lo mismo. Y es el pozo de
     5.º y 6.º, que es donde la ampliación importa más. */
  const c = cargarApp();
  const G = gen(c);
  const planos = [];
  for (const pozo of Object.keys(JSON.parse(JSON.stringify(G)))) {
    for (const estrato of ['recordar', 'comprender', 'aplicar', 'analizar']) {
      const curso = pozo === 'sendero' ? 2 : pozo === 'decimales' ? 6 : 4;
      /* Se compara el enunciado Y la respuesta buena: en ortografía el
         enunciado es siempre «¿cuál está bien escrita?» y lo que cambia con el
         nivel son las palabras, así que mirar solo la pregunta daría plano un
         estrato que sí gradúa. */
      const junta = t => new Set(Array.from({ length: 160 }, () => {
        const q = G[pozo][estrato](t, curso);
        return q.question + ' ‖ ' + JSON.parse(JSON.stringify(q.options))[q.answer];
      }));
      const bajo = junta(1), alto = junta(5);
      /* Si los dos niveles producen exactamente el mismo repertorio, el nivel
         no está haciendo nada ahí. */
      const soloArriba = [...alto].filter(q => !bajo.has(q));
      if (!soloArriba.length) planos.push(`${pozo}/${estrato}`);
    }
  }
  assert.deepStrictEqual(planos.length, 0,
    `estos estratos dan lo mismo en el nivel 1 que en el 5: ${planos.join(', ')}`);
});

test('las fracciones ya no usan un interruptor de dos posiciones', () => {
  /* Era `tier <= 2 ? las 3 fáciles : todas`. Ahora es la misma rampa de cinco
     pasos que usa Lengua. */
  const c = cargarApp();
  const cuantas = t => {
    const v = new Set();
    for (let i = 0; i < 300; i++) v.add(gen(c).fracciones.recordar(t, 6).question.replace(/\d+/g, ''));
    return v.size;
  };
  const v = [1, 2, 3, 4, 5].map(cuantas);
  assert.ok(v[4] > v[0], `el nivel 5 tiene que abrir más que el 1: ${v.join(', ')}`);
  const f = leerFuente('js/content.js');
  assert.ok(!/tier <= 2 \? fractPool/.test(f), 'queda el interruptor binario');
  assert.match(f, /function hastaTier/, 'la rampa vive en un solo sitio');
});

test('en decimales el nivel decide cuántos lugares hay en juego', () => {
  const c = cargarApp();
  const lugares = t => {
    const v = new Set();
    for (let i = 0; i < 120; i++) {
      const m = gen(c).decimales.recordar(t).question.match(/(décimas|centésimas|milésimas)/g) || [];
      m.forEach(x => v.add(x));
    }
    return v;
  };
  assert.ok(!lugares(1).has('centésimas'), 'en el nivel 1 solo décimas');
  assert.ok(lugares(3).has('centésimas'), 'en el 3 ya hay centésimas');
  assert.ok(lugares(5).has('milésimas'), 'y en el 5, milésimas');
});

test('los porcentajes se ordenan por pasos de cabeza, no por tamaño', () => {
  /* La dificultad de un porcentaje no es el número: es si sale de un tirón
     (la mitad, dividir entre diez) o hay que componerlo con dos. Es la
     estrategia que OAOA llama porcentajes de cabeza. */
  const c = cargarApp();
  const vistos = t => {
    const v = new Set();
    for (let i = 0; i < 400; i++) {
      v.add(Number(gen(c).decimales.aplicar(t).question.match(/el (\d+) %/)[1]));
    }
    return v;
  };
  const bajo = vistos(1), alto = vistos(5);
  assert.ok(bajo.has(50) && bajo.has(10), 'los de un paso tienen que estar desde el principio');
  assert.ok(!bajo.has(35), 'el de cuatro pasos no puede salir en el nivel 1');
  assert.ok(alto.has(35) && alto.size > bajo.size, 'y en el 5 tienen que estar todos');
  /* Y la pista nombra la estrategia en vez de mandar dividir entre 100. */
  const q = gen(c).decimales.aplicar(3);
  assert.ok(!/entre 100/.test(q.hint1), 'la pista 1 nombra el camino de cabeza');
});

test('una serie hacia atrás nunca llega a números negativos', () => {
  /* Con paso 10 desde 30 la serie acababa en −5, y un niño de seis años
     contando monedas no tiene números negativos. */
  const c = cargarApp();
  const malos = [];
  for (const g of [1, 2]) for (const t of [4, 5]) {
    for (let i = 0; i < 400; i++) {
      const q = gen(c).sendero.comprender(t, g);
      const nums = (q.question.match(/-?\d+/g) || []).map(Number)
        .concat(JSON.parse(JSON.stringify(q.options)).map(o => Number(String(o).replace(/\./g, ''))));
      if (nums.some(n => n < 0)) malos.push(`${g}.º nivel ${t}: ${q.question.replace(/\n/g, ' ')}`);
    }
  }
  assert.deepStrictEqual(malos.length, 0, malos[0]);
  /* Y en el 4 y el 5 la serie baja, que es lo que la hace más difícil. */
  const atras = Array.from({ length: 30 }, () => gen(c).sendero.comprender(5, 2).hint1);
  assert.ok(atras.every(h => /baja/.test(h)), 'en el nivel 5 la serie va hacia atrás');
});

test('un reto de «busca la suma» tiene UNA sola respuesta válida', () => {
  /* Aquí había un fallo serio y viejo: las dos opciones de relleno se
     sorteaban al azar SIN comprobarlas contra lo que se preguntaba. Medido
     antes de arreglarlo: el 75 % de estas preguntas tenía dos, tres o cuatro
     opciones válidas y solo una marcada, así que un niño que razonaba bien y
     elegía otra recibía «has fallado». */
  const c = cargarApp();
  const completa = s => {
    const m = String(s).match(/(\d+) \+ (\d+)/);
    return m ? ((+m[1]) % 10 + (+m[2]) % 10) >= 10 : null;
  };
  let vistos = 0;
  for (let g = 3; g <= 6; g++) for (let t = 1; t <= 5; t++) {
    for (let i = 0; i < 60; i++) {
      const q = gen(c).sumas_llevando.comprender(t, g);
      if (!/engranaje correcto/.test(q.question)) continue;
      vistos++;
      const pide = /SÍ completan/.test(q.question);
      const ops = JSON.parse(JSON.stringify(q.options));
      const validas = ops.filter(o => completa(o) === pide);
      assert.equal(validas.length, 1,
        `${q.question} → válidas: ${validas.join(' · ')} de ${ops.join(' · ')}`);
      assert.equal(completa(ops[q.answer]), pide, 'y la marcada tiene que ser la válida');
    }
  }
  assert.ok(vistos > 200, 'la barrida tiene que ver bastantes');
});

test('la respuesta correcta nunca aparece dos veces', () => {
  /* Pasaba en el reparto de Vera: dos falsas coincidían, buildOptions
     rellenaba la cuarta repitiendo la BUENA con un «?» detrás, y quien la
     marcaba recibía «has fallado» habiendo acertado. */
  const c = cargarApp();
  const G = gen(c);
  const malos = [];
  for (const pozo of Object.keys(JSON.parse(JSON.stringify(G)))) {
    for (const estrato of ['recordar', 'comprender', 'aplicar', 'analizar']) {
      for (let g = 1; g <= 6; g++) for (let t = 1; t <= 5; t++) for (let i = 0; i < 6; i++) {
        const q = G[pozo][estrato](t, g);
        const ops = JSON.parse(JSON.stringify(q.options)).map(String);
        if (ops.some(o => /\?$/.test(o))) malos.push(`${pozo}/${estrato}: opción de relleno «${ops.find(o => /\?$/.test(o))}»`);
        if (new Set(ops).size !== 4) malos.push(`${pozo}/${estrato}: opciones repetidas`);
      }
    }
  }
  assert.deepStrictEqual(malos.length, 0, [...new Set(malos)].slice(0, 3).join(' · '));
});

test('cada ciclo tiene textos suficientes para que la rampa abra algo', () => {
  /* Con menos de cuatro, `hastaTier` devuelve la lista entera y los cinco
     niveles leen lo mismo. No es un fallo del código: es que faltaba
     contenido. */
  const c = cargarApp();
  const T = c.ev('JSON.parse(JSON.stringify(TEXTOS))');
  [1, 2, 3].forEach(ciclo => {
    assert.ok(T[ciclo].length >= 4, `el ciclo ${ciclo} solo tiene ${T[ciclo].length} textos`);
    /* Y cada texto, sus cuatro niveles de Bloom completos. */
    T[ciclo].forEach(x => ['literal', 'inferencia', 'idea', 'critica'].forEach(k => {
      assert.ok(x[k] && x[k].p && x[k].r && x[k].d.length >= 3,
        `un texto del ciclo ${ciclo} no tiene bien el nivel «${k}»`);
      assert.ok(!x[k].d.includes(x[k].r), 'la respuesta buena no puede estar entre las falsas');
    }));
  });
});
