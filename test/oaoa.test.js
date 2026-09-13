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
