/* OAOA — Otros Algoritmos para las Operaciones Aritméticas.

   El centro para el que está hecha esta app enseña matemáticas con OAOA. Lo
   que se fija aquí no es una preferencia de estilo: si el niño oye
   «descompón» en clase y lee «coloca en columnas y no olvides la llevada» en
   la tablet, la tablet le está enseñando a desconfiar de su maestro.

   Cuando esto se escribió, en los generadores de fábrica convivían los dos
   métodos —tres ayudas en columnas y llevadas, y una que ya descomponía—, así
   que un niño recibía un método u otro según qué reto le tocara. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* ── El reglamento ── */

test('el vocabulario de ATOA se detecta esté donde esté', () => {
  const c = cargarApp();
  const pegas = t => c.ev('pegasOAOA')(t);
  [
    'Hay llevada cuando las unidades suman 10 o más.',
    'Coloca 245 + 178 en columnas y no olvides las llevadas.',
    'Suma 245 + 178, colocando bien las columnas.',
    'Recuerda que me llevo una.',
    'Ahora bajamos la cifra siguiente.',
    '«En total» y «más» son señales de que hay que sumar.'
  ].forEach(t => assert.ok(pegas(t).length, `se coló: ${t}`));

  /* Y lo que SÍ es OAOA pasa limpio. */
  [
    'Busca el 10: 98 + 8 es 98 + 2 + 6.',
    'Descompón por valores: 400 + 600, luego 50 + 70.',
    '¿Te dan las dos partes y buscas el todo?',
    '439 entre 8: quita 400, que son 50 veces.',
    'Antes de calcular, estima: 481 × 19 anda por 500 × 20.'
  ].forEach(t => assert.deepStrictEqual(pegas(t).length, 0, `falso positivo: ${t}`));
});

test('cada pega dice qué poner en su lugar', () => {
  /* Un aviso que solo prohíbe deja al docente sin saber cómo arreglarlo. */
  const c = cargarApp();
  c.ev('OAOA_VETADO').forEach((v, i) => {
    assert.ok(c.ev(`OAOA_VETADO[${i}].en_vez`).length > 15,
      'cada palabra vetada necesita su alternativa');
  });
});

test('las estrategias entran cuando toca y no antes', () => {
  /* Ofrecerle a un niño de 2.º el modelo de área es ofrecerle algo que no ha
     tocado con las manos, y en OAOA la fase manipulativa va primero. */
  const c = cargarApp();
  const nombres = (op, g) => c.ev('estrategiasOAOA')(op, g).map(e => e.nombre);
  assert.ok(nombres('suma', 1).includes('Buscar el 10'));
  assert.ok(!nombres('suma', 1).includes('El Árbol'), 'El Árbol es de 3.º');
  assert.ok(nombres('suma', 3).includes('El Árbol'));
  assert.ok(!nombres('division', 3).includes('Cocientes parciales'), 'la división larga es de 4.º');
  assert.ok(nombres('division', 4).includes('Cocientes parciales'));
  /* Y lo que entra, se queda. */
  assert.ok(nombres('suma', 6).length >= nombres('suma', 3).length);
});

/* ── Lo que de verdad importa: que no quede ni una en el código ── */

test('ninguna ayuda de matemáticas de fábrica habla en ATOA', () => {
  /* Esta es la prueba que impide que esto se deshaga dentro de un año. Barre
     TODOS los generadores de matemáticas, no una lista escrita a mano. */
  const c = cargarApp();
  const s = leer('js/content.js');
  const MATES = ['numeracion', 'sumas_llevando', 'fracciones', 'sendero', 'decimales'];
  const malas = [];
  MATES.forEach(gen => {
    const m = new RegExp('^const ' + gen + ' = \\{', 'm').exec(s);
    assert.ok(m, `no está el generador ${gen}`);
    const ini = m.index;
    const fin = s.indexOf('\nconst ', ini + 10);
    const bloque = s.slice(ini, fin > 0 ? fin : s.length);
    const textos = [...bloque.matchAll(/(?:hint[12]|explanation|question): (['"`])([\s\S]*?)\1/g)];
    textos.forEach(t => {
      c.ev('pegasOAOA')(t[2]).forEach(p => malas.push(`[${gen}] ${p}`));
    });
  });
  assert.strictEqual(malas.length, 0, 'quedan ayudas en ATOA: ' + malas.join(' · '));
});

test('ni las etiquetas ni el consejo que llega a las familias', () => {
  /* El consejo de casa de «suma con llevada» mandaba a los padres a decir en
     alto «me llevo una»: ATOA saliendo del colegio hacia el salón. */
  const c = cargarApp();
  const conceptos = c.ev('JSON.parse(JSON.stringify(CONCEPTOS))');
  const malas = [];
  Object.entries(conceptos).forEach(([id, x]) => {
    if (x.area !== 'Cálculo' && x.area !== 'Numeración') return;
    c.ev('pegasOAOA')(x.label).forEach(p => malas.push(`etiqueta de ${id}: ${p}`));
    c.ev('pegasOAOA')(x.casa).forEach(p => malas.push(`consejo de casa de ${id}: ${p}`));
  });
  assert.strictEqual(malas.length, 0, malas.join(' · '));
});

/* ── El validador ── */

test('el validador rechaza un reto de mates escrito en ATOA', () => {
  const c = cargarApp();
  const reto = {
    question: '¿Cuánto es 47 + 25?',
    options: ['62', '72', '82', '75'], answer: 1,
    hint1: 'Hay llevada cuando las unidades suman 10 o más.',
    hint2: 'Coloca los números en columnas.',
    explanation: 'Sumas y te llevas una.',
    skill: 'suma_llevada', criterio: 'x'
  };
  const r = c.ev('validarRetoIA')(reto, { materia: 'matematicas' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.motivos.some(m => /pista 1/.test(m)));
  assert.ok(r.motivos.some(m => /pista 2/.test(m)));
  assert.ok(r.motivos.some(m => /explicación/.test(m)));
});

test('pero el mismo reto en OAOA pasa', () => {
  const c = cargarApp();
  const reto = {
    question: '¿Cuánto es 47 + 25?',
    options: ['62', '72', '82', '75'], answer: 1,
    hint1: '¿Cuánto le falta a 47 para llegar a 50?',
    hint2: '47 + 3 son 50, y quedan 22 por añadir: 50 + 22.',
    explanation: 'Se completa la decena y el resto se añade entero.',
    skill: 'suma_llevada', criterio: 'x'
  };
  const r = c.ev('validarRetoIA')(reto, { materia: 'matematicas' });
  assert.strictEqual(r.motivos.length, 0, r.motivos.join(' · '));
});

test('en Lengua, buscar la palabra clave sigue siendo legítimo', () => {
  /* La regla es de matemáticas. En Lengua, «mira la última sílaba» es
     exactamente lo que hay que hacer, y vetarlo sería un estorbo. */
  const c = cargarApp();
  const reto = {
    question: '¿Cuál es sinónimo de «veloz»?',
    options: ['rápido', 'lento', 'alto', 'viejo'], answer: 0,
    hint1: 'Busca la palabra clave que significa lo mismo.',
    hint2: 'Piensa en algo que corre mucho.',
    explanation: 'Veloz y rápido significan casi lo mismo.',
    skill: 'sinonimos', criterio: 'x'
  };
  const r = c.ev('validarRetoIA')(reto, { materia: 'lengua' });
  assert.ok(!r.motivos.some(m => /ATOA/.test(m)), 'la regla de mates se coló en Lengua');
});

/* ── El encargo al modelo ── */

test('el encargo impone OAOA y solo en matemáticas', () => {
  const c = cargarApp();
  const mates = c.ev('promptGenerador')({ materia: 'matematicas', curso: 4, n: 5 });
  const texto = JSON.stringify(mates);
  assert.match(texto, /OAOA/);
  assert.match(texto, /PROHIBIDO/);
  assert.match(texto, /llevada/, 'tiene que decir qué palabra no usar');
  const lengua = c.ev('promptGenerador')({ materia: 'lengua', curso: 4, n: 5 });
  assert.ok(!/OAOA/.test(JSON.stringify(lengua)), 'OAOA no pinta nada en Lengua');
});

test('el encargo solo ofrece estrategias que ese curso ha trabajado', () => {
  const c = cargarApp();
  const seg = JSON.stringify(c.ev('promptGenerador')({ materia: 'matematicas', curso: 2, n: 5 }));
  assert.ok(!/Cocientes parciales/.test(seg), 'la división larga no es de 2.º');
  assert.ok(!/El Árbol/.test(seg), 'El Árbol es de 3.º en adelante');
  assert.match(seg, /Buscar el 10/);
  const quinto = JSON.stringify(c.ev('promptGenerador')({ materia: 'matematicas', curso: 5, n: 5 }));
  assert.match(quinto, /Cocientes parciales/);
  assert.match(quinto, /El Árbol/);
});

test('el reglamento viaja también al servidor', () => {
  /* El validador de la función tiene que rechazar exactamente lo mismo que el
     de la tablet. Si se separan, la función acepta lo que el panel rechaza. */
  const catalogo = leer('functions/generador/src/catalogo.js');
  assert.match(catalogo, /export const OAOA_VETADO/);
  assert.match(catalogo, /export function pegasOAOA/);
  assert.match(catalogo, /export const OAOA_ESTRATEGIAS/);
  assert.match(catalogo, /export function estrategiasOAOA/);
});

test('la descomposición canónica se escribe bien a cualquier tamaño', () => {
  /* Se escribía a mano en cada pista y por eso salía mal: en un problema de
     cuatro cifras la ayuda decía «3449 + 1558 es 4900 y 49 + 58», que es
     cierto y no se entiende. Y los ceros no se escriben: 605 es 600 + 5. */
  const c = cargarApp();
  const v = n => c.ev('porValores')(n);
  assert.strictEqual(v(7), '7');
  assert.strictEqual(v(40), '40');
  assert.strictEqual(v(613), '600 + 10 + 3');
  assert.strictEqual(v(605), '600 + 5', 'un cero no se escribe como sumando');
  assert.strictEqual(v(3449), '3000 + 400 + 40 + 9');
  /* Y lo que dice tiene que ser verdad. */
  for (const n of [8, 19, 250, 909, 5007, 12345]) {
    const suma = v(n).split(' + ').reduce((a, x) => a + Number(x), 0);
    assert.strictEqual(suma, n, `${v(n)} no suma ${n}`);
  }
});

test('ninguna ayuda de fábrica impone un único camino', () => {
  /* El Pilar 3 de la formación: ante 5+4 valen «cuento desde el 5», «5+5 son
     10, uno menos» y «4+4 y uno más». Las tres. Una primera pista que ordena
     un solo procedimiento —«suma primero las unidades y luego las decenas»—
     va contra eso, aunque no diga ni una palabra prohibida. */
  const c = cargarApp();
  const s = leer('js/content.js');
  const ORDENA = /suma primero las unidades|primero las unidades y luego|empieza siempre por/i;
  const MATES = ['numeracion', 'sumas_llevando', 'fracciones', 'sendero', 'decimales'];
  MATES.forEach(gen => {
    const m = new RegExp('^const ' + gen + ' = \\{', 'm').exec(s);
    const ini = m.index;
    const fin = s.indexOf('\nconst ', ini + 10);
    const bloque = s.slice(ini, fin > 0 ? fin : s.length);
    [...bloque.matchAll(/hint1: (['"`])([\s\S]*?)\1/g)].forEach(t => {
      assert.ok(!ORDENA.test(t[2]), `[${gen}] la pista impone un camino: ${t[2]}`);
    });
  });
});

/* ── Estimar antes de calcular ── */

test('el reto de estimación no se puede resolver calculando', () => {
  /* Es el punto entero: «en la vida real necesitamos magnitud, no precisión
     decimal inmediata». Si la estimación y el resultado exacto quedan cerca,
     el que calcula acierta más que el que estima y el reto enseña justo lo
     contrario de lo que pretende. Pasó: salió «la mejor estimación de
     405 + 394» con 800 de respuesta y 799 entre las opciones. */
  const c = cargarApp();
  let vistos = 0;
  for (let i = 0; i < 400 && vistos < 60; i++) {
    const r = c.ev('BUILTIN_GENERATORS').sumas_llevando.comprender(3, 4);
    if (r.skill !== 'estimacion') continue;
    vistos++;
    const nums = r.explanation.match(/= ([\d.]+)\. Estimar[\s\S]*?\(([\d.]+)\)/);
    assert.ok(nums, 'la explicación tiene que decir la estimación y el exacto');
    const aprox = Number(nums[1].replace(/\./g, ''));
    const exacto = Number(nums[2].replace(/\./g, ''));
    assert.ok(Math.abs(exacto - aprox) >= 30,
      `estimación ${aprox} y exacto ${exacto} están demasiado cerca`);
    /* Y la respuesta correcta es la estimación, no el exacto. */
    assert.strictEqual(r.options[r.answer], c.ev('fmtNum')(aprox));
  }
  assert.ok(vistos > 10, 'apenas salen retos de estimación');
});

test('estimar es un concepto del catálogo, no un reto suelto', () => {
  /* «¿Sabe estimar antes de operar?» es criterio de evaluación en la
     formación: tiene que poder diagnosticarse como cualquier otro concepto. */
  const c = cargarApp();
  const con = c.ev('JSON.parse(JSON.stringify(CONCEPTOS.estimacion))');
  assert.ok(con && con.label, 'falta el concepto de estimación');
  assert.ok(con.casa.length > 20, 'y su consejo para casa');
  assert.ok(c.ev("conceptosDe('matematicas')").includes('estimacion'));
});

/* ── El interruptor ── */

test('se puede desactivar, y entonces la IA deja de ser filtrada', () => {
  /* Esta app la puede abrir un maestro que enseñe en columnas. Imponerle OAOA
     sería tirarle retos correctos para su aula. */
  const c = cargarApp();
  const reto = {
    question: '¿Cuánto es 47 + 25?', options: ['62', '72', '82', '75'], answer: 1,
    hint1: 'Hay llevada cuando las unidades suman 10 o más.',
    hint2: 'Coloca los números en columnas.',
    explanation: 'Se suma y se lleva una.',
    skill: 'suma_llevada', criterio: 'x'
  };
  assert.strictEqual(c.ev('validarRetoIA')(reto, { materia: 'matematicas' }).ok, false);
  c.ev("cfgSave('oaoaEstricto', false)");
  assert.strictEqual(c.ev('validarRetoIA')(reto, { materia: 'matematicas' }).ok, true,
    'apagado, el filtro no puede seguir rechazando');
  /* Y el encargo al modelo tampoco lo impone. */
  assert.ok(!/PROHIBIDO escribir/.test(JSON.stringify(
    c.ev('promptGenerador')({ materia: 'matematicas', curso: 4, n: 5 }))));
});

test('pero los retos de fábrica siguen en OAOA aunque se apague', () => {
  /* Lo que el panel promete: apagarlo afecta a lo que escriba la IA, no a lo
     que ya viene hecho. Dos métodos a la vez es lo que había que arreglar. */
  const c = cargarApp();
  c.ev("cfgSave('oaoaEstricto', false)");
  for (let i = 0; i < 40; i++) {
    const r = c.ev('BUILTIN_GENERATORS').sumas_llevando.aplicar(3, 4);
    assert.strictEqual(c.ev('pegasOAOA')(r.hint1).length + c.ev('pegasOAOA')(r.hint2).length, 0);
  }
});

test('el panel dice qué hace el interruptor y qué no', () => {
  /* Un interruptor que promete más de lo que cumple es peor que no tenerlo. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('ia-oaoa');
  assert.ok(i > 0, 'no está el interruptor en el panel');
  const trozo = t.slice(i, i + 900);
  assert.match(trozo, /los retos de fábrica/i, 'tiene que avisar de lo que NO cambia');
});

/* ── Los cuatro criterios de evaluación ── */

test('los criterios de OAOA no se disfrazan de oficiales', () => {
  /* Lo más importante de este bloque. Van redactados en registro de criterio
     para que entren en una programación sin reescribirlos, pero NO son del
     Real Decreto 157/2022 ni de ninguna comunidad: son los de OAOA vestidos
     de oficial. Quien los vea en una programación tiene que distinguirlos de
     los del BOE de un vistazo, y por eso el código empieza por «OAOA» en vez
     de por un número de competencia específica. */
  const c = cargarApp();
  const lista = c.ev('JSON.parse(JSON.stringify(CRITERIOS_OAOA))');
  assert.strictEqual(lista.length, 4);
  lista.forEach(x => {
    assert.match(x.codigo, /^OAOA\.\d$/, `${x.codigo} puede confundirse con uno del currículo`);
    assert.ok(!/^\d+\.\d+$/.test(x.codigo), 'un código «3.2» se lee como del Real Decreto');
  });
});

test('están redactados como un criterio, no como una pregunta', () => {
  /* En la formación son preguntas —«¿sabe estimar antes de operar?»— y así no
     entran en una programación. Un criterio empieza por un verbo en
     infinitivo y dice para qué. */
  const c = cargarApp();
  c.ev('JSON.parse(JSON.stringify(CRITERIOS_OAOA))').forEach(x => {
    assert.ok(!x.texto.includes('¿'), `${x.codigo} sigue siendo una pregunta`);
    assert.match(x.texto, /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+(ar|er|ir)\b/,
      `${x.codigo} no empieza por un verbo en infinitivo`);
    assert.match(x.texto, /\bpara\b/, `${x.codigo} no dice para qué`);
    assert.ok(x.saberes.length >= 1, `${x.codigo} no dice qué saberes toca`);
  });
});

test('cada concepto que citan existe de verdad', () => {
  /* Un criterio que apunta a un concepto inventado sale en la tabla con cero
     intentos para siempre, y el docente no sabe si es que nadie lo ha
     trabajado o que el enganche está roto. */
  const c = cargarApp();
  const catalogo = c.ev('JSON.parse(JSON.stringify(CONCEPTOS))');
  c.ev('JSON.parse(JSON.stringify(CRITERIOS_OAOA))').forEach(x => {
    x.conceptos.forEach(k => assert.ok(catalogo[k], `${x.codigo} cita «${k}», que no existe`));
  });
});

test('los dos que la app no mide lo dicen, en vez de fingir', () => {
  /* Explicar en voz alta por qué funciona una estrategia no cabe en un test
     de cuatro opciones, y usar la calculadora para comprobar tampoco se ve
     desde aquí. Enchufarles conceptos para que la tabla no salga vacía sería
     mentir sobre lo que se ha medido. */
  const c = cargarApp();
  const lista = c.ev('JSON.parse(JSON.stringify(CRITERIOS_OAOA))');
  const sinMedir = lista.filter(x => !x.conceptos.length);
  assert.strictEqual(sinMedir.length, 2);
  sinMedir.forEach(x => assert.ok(x.nota && x.nota.length > 20,
    `${x.codigo} no explica por qué no se mide`));
  /* Y los que sí se miden, apuntan a algo. */
  lista.filter(x => x.conceptos.length).forEach(x => {
    assert.ok(x.conceptos.length >= 2, `${x.codigo} se apoya en un solo concepto`);
  });
});

test('el panel los ofrece, avisando de lo que son', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /id="cr-oaoa"/, 'no está el botón en el panel');
  const i = t.indexOf("$('#cr-oaoa')");
  const trozo = t.slice(i, i + 1200);
  assert.match(trozo, /NO son del Real Decreto/, 'el aviso tiene que estar donde se pulsa');
  assert.match(trozo, /no los mide/, 'y decir que dos no se miden');
  /* Y no se duplican si se pulsa dos veces. */
  assert.match(trozo, /ya\.has|filter\(c => !ya/, 'pulsarlo dos veces duplicaría la lista');
});

/* ── «¿Cómo lo ha hecho?», el repertorio de estrategias ──

   OAOA.1 —explicar el procedimiento elegido— no se puede medir con un test de
   cuatro opciones: solo ve el resultado. Pero el docente que dirige la clase
   acaba de oír el camino, así que se anota de un toque ahí, y solo ahí. Lo que
   se comprueba aquí es que lo que se ofrece es lo que ese niño ya ha tocado
   con las manos, que en Lengua no se ofrece nada, y que lo anotado llega al
   informe. */

test('a cada concepto se le ofrecen las estrategias de SU operación', () => {
  const c = cargarApp();
  const para = (skill, curso) => c.ev('estrategiasParaConcepto')(skill, curso)
    .map(e => e.nombre);

  /* Una suma ofrece caminos de suma, no de división. */
  const suma = para('suma_llevada', 4);
  assert.ok(suma.includes('Buscar el 10'), 'falta el camino de siempre de la suma');
  assert.ok(!suma.includes('Cocientes parciales'), 'le ofrece un camino de división');

  /* Y un problema ofrece los de problemas, que no son una operación. */
  assert.ok(para('problema_suma', 4).includes('Partes y todo'));
});

test('no se le ofrece a un niño un camino que su curso aún no ha tocado', () => {
  /* La fase manipulativa es obligatoria en OAOA: «saltarse la fase 1 está
     prohibido». Ofrecer el Árbol en 2.º es ofrecer un símbolo sin la mano
     detrás. */
  const c = cargarApp();
  const n = (skill, curso) => c.ev('estrategiasParaConcepto')(skill, curso).map(e => e.nombre);

  assert.ok(!n('suma_llevada', 2).includes('El Árbol'), 'el Árbol no es de 2.º');
  assert.ok(n('suma_llevada', 4).includes('El Árbol'), 'en 4.º sí');
  /* Lo de 1.º está disponible desde el primer día, que es el punto. */
  assert.ok(n('suma_llevada', 1).includes('Buscar el 10'));
  /* Y nunca se queda a cero por un curso raro: sin curso se asume el de enmedio. */
  assert.ok(c.ev('estrategiasParaConcepto')('suma_llevada', null).length > 0);
});

test('en Lengua no se ofrece nada, en vez de ofrecer matemáticas', () => {
  const c = cargarApp();
  const conceptos = c.ev('JSON.parse(JSON.stringify(CONCEPTOS))');
  const lengua = Object.keys(conceptos).filter(k => !conceptos[k].oaoa);
  assert.ok(lengua.length, 'algo va mal: todos los conceptos declaran operación');
  lengua.forEach(k => {
    assert.strictEqual(c.ev('estrategiasParaConcepto')(k, 4).length, 0,
      `${k} no es de matemáticas y se le ofrecen estrategias`);
  });
});

test('marcar un camino lo apunta, y marcarlo otra vez no inventa otro día', () => {
  const c = cargarApp();
  c.ev('S = defaultState("Vega")');
  c.ev('recordEstrategia')('Buscar el 10', 'suma_llevada');
  c.ev('recordEstrategia')('Buscar el 10', 'resta_llevada');
  c.ev('recordEstrategia')('El Árbol', 'suma_llevada');

  const rep = c.ev('JSON.parse(JSON.stringify(repertorioDe(S)))');
  assert.strictEqual(rep.length, 2);
  /* Ordenado por uso: el más contado primero. */
  assert.strictEqual(rep[0].nombre, 'Buscar el 10');
  assert.strictEqual(rep[0].veces, 2);
  /* Dos veces el mismo día es un día, no dos: la constancia no se infla. */
  assert.strictEqual(rep[0].dias, 1);
  /* El repertorio es de la persona, pero se ve dónde lo usa. */
  assert.strictEqual(rep[0].conceptos.length, 2);
  assert.strictEqual(rep[1].veces, 1);
});

test('un nombre vacío no ensucia el repertorio', () => {
  const c = cargarApp();
  c.ev('S = defaultState("Vega")');
  c.ev('recordEstrategia')('', 'suma_llevada');
  c.ev('recordEstrategia')('   ', 'suma_llevada');
  assert.strictEqual(c.ev('repertorioDe(S)').length, 0);
});

test('el informe cuenta cómo resuelve, y del alumno de la hoja, no del que mire', () => {
  const c = cargarApp();
  const texto = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  /* El diario abierto en el dispositivo es el del maestro mirando; el informe
     es de Vega. Si se colara el global, el maestro imprimiría su repertorio en
     la hoja de la niña. */
  c.ev('S = defaultState("Maestro")');
  c.ev('recordEstrategia')('Doble y mitad', 'tabla_multiplicar');

  const vega = c.ev('defaultState')('Vega');
  vega.metrics.questions_answered = 12;
  vega.metrics.estrategias = { 'Buscar el 10': { veces: 3, dias: 2, ultimo: '2026-03-02',
                                                 conceptos: { suma_llevada: 3 } } };
  const t = texto(c.ev('informeFamilia')(vega, {}));
  assert.match(t, /Cómo resuelve/, 'la sección no sale en el informe');
  assert.match(t, /Buscar el 10/);
  assert.ok(!/Doble y mitad/.test(t), 'se ha colado el repertorio de quien imprime');
});

test('sin nada anotado no se pinta una tabla vacía', () => {
  const c = cargarApp();
  c.ev('S = defaultState("Maestro")');
  const vega = c.ev('defaultState')('Vega');
  vega.metrics.questions_answered = 12;
  const t = String(c.ev('informeFamilia')(vega, {}));
  assert.ok(!/Cómo resuelve/.test(t), 'pinta la sección sin tener nada que contar');
});

test('el turno dirigido ofrece marcarlo, y es opcional', () => {
  const a = leer('js/aula.js');
  const h = leer('index.html');
  assert.match(h, /id="aula-como"/, 'no está el sitio donde se marca');
  assert.match(h, /id="aula-como-chips"/);
  /* Se pinta al dar el feedback, que es cuando el niño acaba de explicarse. */
  assert.match(a, /pintarComoLoHaHecho\(\)/);
  /* Un toque, sin diálogo: si esto pidiera confirmación nadie lo usaría con
     veintidós niños esperando. */
  const i = a.indexOf('function pintarComoLoHaHecho');
  const trozo = a.slice(i, i + 1600);
  assert.ok(!/confirm\(/.test(trozo), 'un diálogo por reto no se usa en un aula');
  assert.match(trozo, /recordEstrategia\(/);
  /* Y sin estrategias que ofrecer se esconde, no se queda una fila vacía. */
  assert.match(trozo, /if \(!lista\.length\)[\s\S]{0,80}hidden/);
});

test('OAOA.1 dice dónde se anota ahora, en vez de decir que no se mide', () => {
  const c = cargarApp();
  const uno = c.ev('JSON.parse(JSON.stringify(CRITERIOS_OAOA))')
    .find(x => x.codigo === 'OAOA.1');
  assert.match(uno.nota, /Dirigir la clase/);
  assert.ok(!/no lo mide/.test(uno.nota), 'la nota se quedó vieja: ya se mide');
});
