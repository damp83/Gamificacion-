/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — content.js
   Generadores procedurales de retos para las Ruinas de Kaldros
   (Matemáticas, 3º–5º primaria). Estratos 1–4 de Bloom:
   recordar · comprender · aplicar · analizar
   Cada generador recibe un tier de dificultad (1–5) y devuelve:
   { question, options[4], answer (índice), hint1, hint2, explanation }
   ═══════════════════════════════════════════════════════════ */

const STRATA_ORDER = ['recordar', 'comprender', 'aplicar', 'analizar'];

const STRATA_META = {
  recordar:   { label: 'Recordar',   icon: '🧱', name: 'Fragmentos de cerámica', peBase: 10 },
  comprender: { label: 'Comprender', icon: '🏺', name: 'Vasijas emparejadas',    peBase: 14 },
  aplicar:    { label: 'Aplicar',    icon: '⚖️', name: 'La balanza del mercader', peBase: 18 },
  analizar:   { label: 'Analizar',   icon: '🔍', name: 'El plano falsificado',   peBase: 25 }
};

/* ═══════════════ CONCEPTOS ═══════════════
   Cada reto declara QUÉ concepto trabaja. Sin esto, lo más fino que el docente
   podía saber de un alumno era «Numeración · Aplicar: 62 %», y con eso no se
   prepara una clase. Con esto, la vista de clase puede decir «17 de 24 fallan
   la resta llevando», que sí es una frase con la que se hace algo.

   Dos decisiones que conviene entender:

   · El id es ESTABLE porque queda guardado dentro de los diarios; la etiqueta
     se puede reescribir cuando se quiera sin romper nada.
   · Se separa el cálculo del enunciado —«Suma con llevada» y «Problema de
     sumar» son conceptos distintos— porque un niño que resuelve 4856 + 30 y
     falla el mismo cálculo dentro de un problema no tiene un problema de
     matemáticas, lo tiene de lectura. Mezclarlos escondía justo eso. */
const CONCEPTOS = {
  /* ── Numeración ── */
  serie_numerica:      { area: 'Numeración', label: 'Anterior y posterior' },
  valor_posicional:    { area: 'Numeración', label: 'Valor posicional' },
  comparar_numeros:    { area: 'Numeración', label: 'Comparar números' },
  redondeo:            { area: 'Numeración', label: 'Redondeo' },
  ordenar_numeros:     { area: 'Numeración', label: 'Ordenar de menor a mayor' },
  contar_agrupando:    { area: 'Numeración', label: 'Contar agrupando de diez' },
  series:              { area: 'Numeración', label: 'Continuar una serie' },
  par_impar:           { area: 'Numeración', label: 'Pares e impares' },

  /* ── Cálculo ── */
  suma_basica:         { area: 'Cálculo', label: 'Sumar sin llevada' },
  suma_llevada:        { area: 'Cálculo', label: 'Suma con llevada' },
  resta_llevada:       { area: 'Cálculo', label: 'Resta llevando' },
  detectar_llevada:    { area: 'Cálculo', label: 'Reconocer cuándo hay llevada' },
  error_suma:          { area: 'Cálculo', label: 'Encontrar el error en una suma' },
  problema_suma:       { area: 'Cálculo', label: 'Problema de sumar (enunciado)' },

  /* ── Fracciones ── */
  fraccion_leer:       { area: 'Fracciones', label: 'Leer una fracción' },
  fraccion_terminos:   { area: 'Fracciones', label: 'Numerador y denominador' },
  comparar_fracciones: { area: 'Fracciones', label: 'Comparar fracciones' },
  fraccion_significado:{ area: 'Fracciones', label: 'Qué representa una fracción' },
  fraccion_de_cantidad:{ area: 'Fracciones', label: 'Fracción de una cantidad' },
  error_fraccion:      { area: 'Fracciones', label: 'Encontrar el error en un reparto' },

  /* ── Decimales y porcentajes ── */
  decimal_posicion:    { area: 'Decimales', label: 'Décimas y centésimas' },
  decimal_fraccion:    { area: 'Decimales', label: 'Decimal y fracción equivalentes' },
  porcentaje:          { area: 'Decimales', label: 'Porcentaje de una cantidad' },
  comparar_decimales:  { area: 'Decimales', label: 'Comparar decimales' },

  /* ── Vocabulario ── */
  sinonimos:           { area: 'Vocabulario', label: 'Sinónimos' },
  antonimos:           { area: 'Vocabulario', label: 'Antónimos' },
  categorias:          { area: 'Vocabulario', label: 'Sustantivo, adjetivo y verbo' },
  familias_palabras:   { area: 'Vocabulario', label: 'Familias de palabras' },

  /* ── Ortografía ──
     Por regla y no por estrato: «falla ortografía» no se puede enseñar,
     «falla B/V» sí. El tipo lo declara cada palabra del banco. */
  orto_bv:             { area: 'Ortografía', label: 'B y V' },
  orto_h:              { area: 'Ortografía', label: 'La H' },
  orto_lly:            { area: 'Ortografía', label: 'LL e Y' },
  orto_gj:             { area: 'Ortografía', label: 'G y J' },
  orto_tilde:          { area: 'Ortografía', label: 'Tildes' },
  orto_zsc:            { area: 'Ortografía', label: 'Z, S y C' },
  orto_x:              { area: 'Ortografía', label: 'La X' },
  orto_homofonos:      { area: 'Ortografía', label: 'Palabras homófonas' },
  orto_mn:             { area: 'Ortografía', label: 'M antes de B y P' },
  orto_junto:          { area: 'Ortografía', label: 'Junto o separado' },
  orto_otras:          { area: 'Ortografía', label: 'Otras reglas' },

  /* ── Comprensión lectora ── */
  lectura_literal:     { area: 'Comprensión', label: 'Localizar un dato en el texto' },
  lectura_inferencia:  { area: 'Comprensión', label: 'Inferir lo que no está escrito' },
  lectura_idea:        { area: 'Comprensión', label: 'Idea principal' },
  lectura_critica:     { area: 'Comprensión', label: 'Valorar lo que dice el texto' }
};

/* Etiqueta legible de un concepto. Los pozos que crea el docente no tienen
   concepto declarado y se agrupan por su propio nombre, que es lo más útil
   que se puede decir de ellos sin pedirle que etiquete sus retos. */
function conceptoInfo(id) {
  if (CONCEPTOS[id]) return CONCEPTOS[id];
  if (String(id || '').startsWith('pozo:')) {
    const b = branchDef(String(id).slice(5));
    return { area: 'Del docente', label: b ? b.name : 'Pozo propio' };
  }
  return { area: '—', label: String(id || 'sin clasificar') };
}
function conceptoLabel(id) { return conceptoInfo(id).label; }

/* ── utilidades ── */
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[ri(0, arr.length - 1)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* Construye opciones únicas: respuesta correcta + distractores */
function buildOptions(correct, distractors, format) {
  const fmt = format || (x => String(x));
  const seen = new Set([fmt(correct)]);
  const opts = [correct];
  for (const d of distractors) {
    if (opts.length >= 4) break;
    if (!seen.has(fmt(d))) { seen.add(fmt(d)); opts.push(d); }
  }
  let guard = 0;
  while (opts.length < 4 && guard++ < 80) {
    let d;
    if (typeof correct === 'number') {
      /* el relleno también se escala: nada de saltos de 10 sobre un 6 */
      const mag = Math.max(1, Math.abs(correct));
      const paso = mag < 20 ? 1 : Math.max(1, Math.round(mag / 10));
      d = correct + ri(1, 4) * paso * (Math.random() < 0.5 ? -1 : 1);
      if (d < 0) d = correct + ri(1, 4) * paso;
    } else d = correct + '?';
    if ((typeof d !== 'number' || d >= 0) && !seen.has(fmt(d))) { seen.add(fmt(d)); opts.push(d); }
  }
  const shuffled = shuffle(opts);
  return { options: shuffled.map(fmt), answer: shuffled.indexOf(correct) };
}
function fmtNum(n) { return n.toLocaleString('es-ES'); }

/* Distractores del tamaño de la respuesta.
   Con desplazamientos fijos (±10, ±100) un alumno de 1.º con respuesta 14
   veía opciones como 114 o −86: números que no existen en su mundo y que
   delatan cuál es la correcta. Estos se escalan a la magnitud y nunca bajan
   de cero. */
function nearMisses(correct) {
  const mag = Math.max(1, Math.abs(correct));
  const paso = mag < 20 ? 1 : mag < 100 ? 10 : Math.pow(10, String(Math.round(mag)).length - 2);
  const cand = [correct + paso, correct - paso, correct + paso * 2, correct - paso * 2,
                correct + 1, correct - 1, correct + paso * 10];
  return cand.filter(x => x >= 0 && x !== correct);
}

/* ═══════════════ CURSOS Y CICLOS ═══════════════
   Primaria completa: 1.º a 6.º (6-12 años), agrupada en los tres ciclos
   habituales. El curso del alumno decide qué contenido ve y cuánto texto
   lleva cada reto: a los 6 años la lectura aún se está construyendo, así que
   un enunciado largo mide la lectura en vez de las matemáticas. */
const GRADES = [
  { n: 1, label: '1.º', age: '6-7 años',   band: 1 },
  { n: 2, label: '2.º', age: '7-8 años',   band: 1 },
  { n: 3, label: '3.º', age: '8-9 años',   band: 2 },
  { n: 4, label: '4.º', age: '9-10 años',  band: 2 },
  { n: 5, label: '5.º', age: '10-11 años', band: 3 },
  { n: 6, label: '6.º', age: '11-12 años', band: 3 }
];
const BANDS = {
  1: { label: 'Primer ciclo',  short: '1.º y 2.º', ages: '6-8 años' },
  2: { label: 'Segundo ciclo', short: '3.º y 4.º', ages: '8-10 años' },
  3: { label: 'Tercer ciclo',  short: '5.º y 6.º', ages: '10-12 años' }
};
const DEFAULT_GRADE = 4;

function gradeInfo(g) { return GRADES.find(x => x.n === g) || GRADES[DEFAULT_GRADE - 1]; }
function bandOf(g) { return gradeInfo(g).band; }
/* En el primer ciclo los enunciados van al grano: sin relato largo */
function terse(g) { return bandOf(g) === 1; }

const NAMES = ['Bruno', 'Kira', 'Tobías', 'Vega', 'Nilo', 'Mara'];
const TREASURES = ['monedas de plata', 'gemas verdes', 'mapas antiguos', 'vasijas pintadas', 'brújulas de latón', 'fósiles brillantes'];

/* ═══════════════ POZO 1 · NUMERACIÓN ═══════════════
   El techo numérico lo marca el curso; el tier solo afina dentro de él. */
function numTop(grade, tier) {
  const techo = { 1: 100, 2: 1000, 3: 10000, 4: 10000, 5: 100000, 6: 1000000 }[grade] || 10000;
  return Math.max(20, Math.min(techo, Math.round(techo * (0.4 + 0.15 * tier))));
}

const numeracion = {
  recordar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    /* 1.º y 2.º: anterior y posterior, que es lo que toca a esa edad */
    if (bandOf(g) === 1) {
      const max = g === 1 ? 99 : 999;
      const n = ri(2, max - 1);
      const antes = Math.random() < 0.5;
      const correct = antes ? n - 1 : n + 1;
      const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
      return {
        skill: 'serie_numerica',
        question: `¿Qué número va ${antes ? 'ANTES' : 'DESPUÉS'} del ${n}?`,
        options, answer,
        hint1: antes ? 'Cuenta hacia atrás desde ese número.' : 'Cuenta uno más.',
        hint2: `${antes ? n - 1 : n} … ${antes ? n : n + 1}`,
        explanation: `${antes ? 'Antes' : 'Después'} del ${n} va el ${correct}.`
      };
    }
    const max = numTop(g, tier);
    const n = ri(Math.floor(max / 10), max);
    const digits = String(n).split('').reverse();
    const places = [
      { i: 0, label: 'unidades' }, { i: 1, label: 'decenas' },
      { i: 2, label: 'centenas' }, { i: 3, label: 'unidades de millar' },
      { i: 4, label: 'decenas de millar' }
    ].filter(p => p.i < digits.length);
    const p = pick(places);
    const correct = Number(digits[p.i]);
    const { options, answer } = buildOptions(correct, digits.map(Number).concat([ri(0, 9), ri(0, 9)]));
    return {
      skill: 'valor_posicional',
      question: `En la bóveda hay grabado el número ${fmtNum(n)}. ¿Qué cifra ocupa el lugar de las ${p.label}?`,
      options, answer,
      hint1: 'Empieza a contar los lugares desde la derecha: unidades, decenas, centenas…',
      hint2: `Las ${p.label} son la posición ${p.i + 1} empezando por la derecha.`,
      explanation: `En ${fmtNum(n)}, contando desde la derecha, la cifra de las ${p.label} es el ${correct}.`
    };
  },

  comprender(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = bandOf(g) === 1 ? (g === 1 ? 99 : 999) : numTop(g, tier);
    if (bandOf(g) === 1 || Math.random() < 0.5) {
      const nums = [];
      while (nums.length < 4) { const n = ri(g === 1 ? 1 : 10, max); if (!nums.includes(n)) nums.push(n); }
      const correct = Math.max(...nums);
      const { options, answer } = buildOptions(correct, nums.filter(x => x !== correct), fmtNum);
      return {
        skill: 'comparar_numeros',
        question: terse(g)
          ? `¿Cuál es el número MAYOR?  ${nums.map(fmtNum).join(' · ')}`
          : `Cuatro cofres están marcados con los números ${nums.map(fmtNum).join(', ')}. El tesoro está en el cofre con el número MAYOR. ¿Cuál es?`,
        options, answer,
        hint1: 'Compara primero cuántas cifras tiene cada número: más cifras, número más grande.',
        hint2: 'Si tienen las mismas cifras, compara empezando por la izquierda.',
        explanation: `${fmtNum(correct)} es el mayor de los cuatro números.`
      };
    }
    /* redondeo: a la centena en 3.º-4.º, al millar en 5.º-6.º */
    const paso = bandOf(g) === 3 ? 1000 : 100;
    const base = ri(2, Math.max(3, Math.floor(max / paso))) * paso;
    const n = base + ri(1, paso - 1);
    const correct = (n - base) * 2 >= paso ? base + paso : base;
    const { options, answer } = buildOptions(correct, [base, base + paso, base - paso, n], fmtNum);
    return {
      skill: 'redondeo',
      question: `Kira necesita redondear ${fmtNum(n)} ${paso === 1000 ? 'al millar' : 'a la centena'} más cercano para su mapa. ¿Qué número anota?`,
      options, answer,
      hint1: `Mira la cifra de las ${paso === 1000 ? 'centenas' : 'decenas'}: si es 5 o más, sube.`,
      hint2: `${fmtNum(n)} está entre ${fmtNum(base)} y ${fmtNum(base + paso)}. ¿De cuál está más cerca?`,
      explanation: `${fmtNum(n)} redondeado ${paso === 1000 ? 'al millar' : 'a la centena'} es ${fmtNum(correct)}.`
    };
  },

  aplicar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const t = pick(TREASURES);
    if (bandOf(g) === 1) {
      const a = ri(2, g === 1 ? 20 : 50), b = ri(2, g === 1 ? 20 : 50);
      const correct = a + b;
      const { options, answer } = buildOptions(correct, nearMisses(correct).concat([Math.abs(a - b)]), fmtNum);
      return {
        skill: 'problema_suma',
        question: `Tobías encuentra ${a} monedas y luego ${b} más.\n¿Cuántas tiene en total?`,
        options, answer,
        hint1: 'Junta las dos cantidades: hay que sumar.',
        hint2: `Empieza en ${a} y cuenta ${b} más.`,
        explanation: `${a} + ${b} = ${correct}.`
      };
    }
    const scale = Math.max(50, Math.floor(numTop(g, tier) / 8));
    const a = ri(scale, scale * 4);
    const b = ri(Math.floor(scale / 2), scale * 2);
    const correct = a + b;
    const { options, answer } = buildOptions(correct, nearMisses(correct).concat([Math.abs(a - b)]), fmtNum);
    return {
      skill: 'problema_suma',
      question: `La expedición ya tenía ${fmtNum(a)} ${t} y en la nueva cámara encuentra ${fmtNum(b)} más. ¿Cuántas ${t} hay ahora en total?`,
      options, answer,
      hint1: '«En total» y «más» son señales de que hay que sumar.',
      hint2: `Suma ${fmtNum(a)} + ${fmtNum(b)}, colocando bien las columnas.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(correct)}. Cuando juntamos cantidades, sumamos.`
    };
  },

  analizar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = bandOf(g) === 1 ? (g === 1 ? 60 : 400) : numTop(g, tier);
    const sorted = [];
    while (sorted.length < 4) { const n = ri(1, max); if (!sorted.includes(n)) sorted.push(n); }
    sorted.sort((x, y) => x - y);
    const wrongIdx = ri(0, 2);
    const bad = sorted.slice();
    [bad[wrongIdx], bad[wrongIdx + 1]] = [bad[wrongIdx + 1], bad[wrongIdx]];
    const correct = bad[wrongIdx];
    const { options, answer } = buildOptions(correct, bad.filter(x => x !== correct), fmtNum);
    return {
      skill: 'ordenar_numeros',
      question: terse(g)
        ? `Estos números van de menor a mayor, pero uno está mal:\n${bad.map(fmtNum).join(' → ')}\n¿Cuál está mal?`
        : `Vera Kovak ordenó estos números de menor a mayor para abrir la cerradura: ${bad.map(fmtNum).join(' → ')}. ¡Pero hay un número mal colocado y la puerta no abre! ¿Cuál está fuera de su sitio?`,
      options, answer,
      hint1: 'Recorre la lista y comprueba que cada número sea menor que el siguiente.',
      hint2: `Fíjate en la pareja ${fmtNum(bad[wrongIdx])} → ${fmtNum(bad[wrongIdx + 1])}. ¿Va de menor a mayor?`,
      explanation: `${fmtNum(bad[wrongIdx])} es mayor que ${fmtNum(bad[wrongIdx + 1])}, así que está mal colocado. El orden correcto es ${sorted.map(fmtNum).join(' → ')}.`
    };
  }
};

/* ═══════════════ POZO 2 · SUMAS Y RESTAS ═══════════════ */
function sumTop(grade, tier) {
  const techo = { 1: 20, 2: 100, 3: 1000, 4: 1000, 5: 10000, 6: 100000 }[grade] || 1000;
  /* el tier afina dentro del techo del curso, nunca por encima de él */
  return Math.max(10, Math.min(techo, Math.round(techo * (0.4 + 0.15 * tier))));
}

const sumas_llevando = {
  recordar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const a = ri(bandOf(g) === 1 ? 1 : 10, max), b = ri(bandOf(g) === 1 ? 1 : 10, max);
    const correct = a + b;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    return {
      skill: 'suma_llevada',
      question: terse(g) ? `${a} + ${b} = ?`
        : `El reloj de engranajes pide el resultado de ${fmtNum(a)} + ${fmtNum(b)} para girar. ¿Cuánto es?`,
      options, answer,
      hint1: 'Suma primero las unidades y luego las decenas.',
      hint2: `Puedes descomponer: ${a} + ${b} = ${a} + ${Math.floor(b / 10) * 10} + ${b % 10}.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(correct)}.`
    };
  },

  comprender(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    /* 1.º y 2.º: restar, que es el par natural de sumar a esa edad */
    if (bandOf(g) === 1) {
      const max = g === 1 ? 20 : 99;
      const a = ri(Math.floor(max / 2), max);
      const b = ri(1, a);
      const correct = a - b;
      const { options, answer } = buildOptions(correct, nearMisses(correct).concat([a + b]), fmtNum);
      return {
        skill: 'resta_llevada',
        question: `Había ${a} monedas y Vera se llevó ${b}.\n¿Cuántas quedan?`,
        options, answer,
        hint1: '«Se llevó» significa que hay que quitar: se resta.',
        hint2: `Empieza en ${a} y cuenta ${b} hacia atrás.`,
        explanation: `${a} − ${b} = ${correct}.`
      };
    }
    const mk = (carry) => {
      const u1 = carry ? ri(5, 9) : ri(0, 4);
      const u2 = carry ? ri(10 - u1, 9) : ri(0, Math.max(0, 4 - u1));
      const d1 = ri(1, tier <= 2 ? 4 : 8), d2 = ri(1, tier <= 2 ? 4 : 8);
      return [d1 * 10 + u1, d2 * 10 + u2];
    };
    const withCarry = mk(true), noCarry = mk(false);
    const pairs = shuffle([
      { txt: `${withCarry[0]} + ${withCarry[1]}`, carry: true },
      { txt: `${noCarry[0]} + ${noCarry[1]}`, carry: false }
    ]);
    const target = pick([true, false]);
    const correctPair = pairs.find(p => p.carry === target);
    const { options, answer } = buildOptions(
      correctPair.txt,
      pairs.filter(p => p !== correctPair).map(p => p.txt).concat([`${ri(11, 44)} + ${ri(11, 44)}`, `${ri(11, 44)} + ${ri(11, 44)}`])
    );
    return {
      skill: 'detectar_llevada',
      question: `Para engrasar el engranaje correcto, Kira busca una suma que ${target ? 'SÍ necesita llevada' : 'NO necesita llevada'}. ¿Cuál elige?`,
      options, answer,
      hint1: 'Hay llevada cuando las unidades suman 10 o más.',
      hint2: 'Suma solo las unidades de cada pareja y comprueba si pasan de 9.',
      explanation: `En ${correctPair.txt} las unidades suman ${target ? '10 o más, así que hay llevada' : 'menos de 10, así que no hay llevada'}.`
    };
  },

  aplicar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const t = pick(TREASURES);
    const a = ri(Math.floor(max / 2), max);
    const b = ri(Math.floor(max / 2), max);
    const c = (bandOf(g) >= 2 && tier >= 4) ? ri(10, 99) : 0;
    const correct = a + b + c;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    const who = pick(NAMES);
    return {
      skill: 'problema_suma',
      question: terse(g)
        ? `Bruno lleva ${a} monedas y Tobías ${b}.\n¿Cuántas hay entre los dos?`
        : `Bruno guarda ${fmtNum(a)} ${t} en la mochila y Tobías desentierra ${fmtNum(b)}${c ? ` y ${who} aporta ${c} más` : ''}. ¿Cuántas ${t} llevan al campamento?`,
      options, answer,
      hint1: 'Junta todas las cantidades con una suma.',
      hint2: `Coloca ${fmtNum(a)} + ${fmtNum(b)}${c ? ' + ' + c : ''} en columnas y no olvides las llevadas.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)}${c ? ' + ' + c : ''} = ${fmtNum(correct)}.`
    };
  },

  analizar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const a = ri(Math.floor(max / 3), max), b = ri(Math.floor(max / 3), max);
    const real = a + b;
    const errType = pick(['carry', 'column']);
    const wrong = errType === 'carry' ? real - 10 : real + 9;
    const correctOpt = errType === 'carry' ? 'Olvidó sumar la llevada' : 'Colocó mal las columnas';
    const { options, answer } = buildOptions(correctOpt, [
      errType === 'carry' ? 'Colocó mal las columnas' : 'Olvidó sumar la llevada',
      'La suma está bien hecha',
      'Restó en vez de sumar'
    ]);
    return {
      skill: 'error_suma',
      question: `En el plano robado, Vera Kovak escribió: ${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(wrong)}. Kira dice que es falso. ¿Qué error cometió Vera?`,
      options, answer,
      hint1: `Haz tú la suma: ¿cuánto da de verdad ${fmtNum(a)} + ${fmtNum(b)}?`,
      hint2: `El resultado correcto es ${fmtNum(real)}. Compara con ${fmtNum(wrong)}.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(real)}, no ${fmtNum(wrong)}. ${correctOpt === 'Olvidó sumar la llevada' ? 'Le faltan 10: se olvidó de la llevada.' : 'El resultado está descuadrado: colocó mal las columnas.'}`
    };
  }
};

/* ═══════════════ POZO 3 · FRACCIONES (3.º a 6.º) ═══════════════ */
const FRACT = [
  { n: 1, d: 2, txt: 'un medio', uni: '½' },
  { n: 1, d: 3, txt: 'un tercio', uni: '⅓' },
  { n: 1, d: 4, txt: 'un cuarto', uni: '¼' },
  { n: 3, d: 4, txt: 'tres cuartos', uni: '¾' },
  { n: 2, d: 3, txt: 'dos tercios', uni: '⅔' },
  { n: 2, d: 5, txt: 'dos quintos', uni: '2/5' },
  { n: 5, d: 6, txt: 'cinco sextos', uni: '5/6' }
];
function fractPool(grade) {
  return bandOf(grade || DEFAULT_GRADE) === 3 ? FRACT : FRACT.slice(0, 5);
}
function fractPicture(n, d) { return '🟩'.repeat(n) + '⬜'.repeat(d - n); }

const fracciones = {
  recordar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const pool = tier <= 2 ? fractPool(g).slice(0, 3) : fractPool(g);
    const f = pick(pool);
    if (Math.random() < 0.5) {
      const { options, answer } = buildOptions(f.uni, FRACT.filter(x => x !== f).map(x => x.uni));
      return {
        skill: 'fraccion_leer',
        question: `Una vasija está dividida en ${f.d} partes iguales y ${f.n} ${f.n === 1 ? 'está pintada' : 'están pintadas'}:\n${fractPicture(f.n, f.d)}\n¿Qué fracción representa la parte pintada?`,
        options, answer,
        hint1: 'El número de abajo (denominador) dice en cuántas partes se divide.',
        hint2: 'El número de arriba (numerador) dice cuántas partes se toman.',
        explanation: `Hay ${f.d} partes y ${f.n} pintada${f.n > 1 ? 's' : ''}: la fracción es ${f.uni} (${f.txt}).`
      };
    }
    const part = pick(['numerador', 'denominador']);
    const correct = part === 'numerador' ? f.n : f.d;
    const { options, answer } = buildOptions(correct, [f.n, f.d, f.n + f.d, ri(2, 9)]);
    return {
      skill: 'fraccion_terminos',
      question: `En el jeroglífico aparece la fracción ${f.n}/${f.d}. ¿Cuál es su ${part}?`,
      options, answer,
      hint1: 'El numerador es el número de ARRIBA; el denominador, el de ABAJO.',
      hint2: `En ${f.n}/${f.d}, arriba está el ${f.n} y abajo el ${f.d}.`,
      explanation: `En ${f.n}/${f.d} el ${part} es ${correct}. Numerador arriba, denominador abajo.`
    };
  },

  comprender(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    /* 5.º-6.º: comparar fracciones, que es el salto propio del tercer ciclo */
    if (bandOf(g) === 3 && Math.random() < 0.5) {
      const d = pick([4, 5, 6, 8]);
      const n1 = ri(1, d - 1);
      let n2 = ri(1, d - 1);
      while (n2 === n1) n2 = ri(1, d - 1);
      const correct = `${Math.max(n1, n2)}/${d}`;
      const { options, answer } = buildOptions(correct, [`${Math.min(n1, n2)}/${d}`, `${d}/${Math.max(n1, n2)}`, `${n1 + n2}/${d}`]);
      return {
        skill: 'comparar_fracciones',
        question: `¿Qué fracción es MAYOR: ${n1}/${d} o ${n2}/${d}?`,
        options, answer,
        hint1: 'Si el denominador es el mismo, las partes son del mismo tamaño.',
        hint2: 'Entonces manda el numerador: cuantas más partes se toman, mayor es.',
        explanation: `Con el mismo denominador (${d}), es mayor la que tiene más numerador: ${correct}.`
      };
    }
    const f = pick(tier <= 2 ? fractPool(g).slice(0, 3) : fractPool(g));
    const situations = {
      '1/2': 'la mitad de un bocadillo',
      '1/3': 'una de las 3 raciones iguales de la cantimplora',
      '1/4': 'un trozo de una torta partida en 4 partes iguales',
      '3/4': 'tres trozos de una torta partida en 4 partes iguales',
      '2/3': 'dos de las 3 raciones iguales de la cantimplora',
      '2/5': 'dos de las 5 tiendas del campamento',
      '5/6': 'cinco de las 6 antorchas encendidas'
    };
    const key = `${f.n}/${f.d}`;
    const correct = situations[key];
    const { options, answer } = buildOptions(correct, shuffle(Object.entries(situations).filter(([k]) => k !== key).map(([, v]) => v)));
    return {
      skill: 'fraccion_significado',
      question: `Kira traduce el jeroglífico ${f.uni}. ¿Qué situación de la expedición representa?`,
      options, answer,
      hint1: `El denominador ${f.d} dice en cuántas partes iguales se divide el total.`,
      hint2: `Busca la situación con ${f.d} partes iguales donde se toman ${f.n}.`,
      explanation: `${f.uni} (${f.txt}) es ${correct}: ${f.d} partes iguales y se toman ${f.n}.`
    };
  },

  aplicar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const f = pick(tier <= 2 ? fractPool(g).slice(0, 3) : fractPool(g));
    const mult = bandOf(g) === 3 ? ri(6, 20) : (tier <= 2 ? ri(2, 5) : ri(4, 12));
    const total = f.d * mult;
    const correct = f.n * mult;
    const t = pick(['galletas', 'cuerdas', 'antorchas', 'mapas', 'cantimploras']);
    const { options, answer } = buildOptions(correct, [total - correct, Math.floor(total / 2), correct + f.d, total]);
    return {
      skill: 'fraccion_de_cantidad',
      question: `La expedición lleva ${total} ${t} y debe dejar ${f.uni} (${f.txt}) en el campamento. ¿Cuántas ${t} deja?`,
      options, answer,
      hint1: `Primero divide ${total} entre ${f.d} para saber cuánto vale cada parte.`,
      hint2: `${total} ÷ ${f.d} = ${mult}. Ahora toma ${f.n} parte${f.n > 1 ? 's' : ''}: ${f.n} × ${mult}.`,
      explanation: `${f.uni} de ${total} → ${total} ÷ ${f.d} = ${mult}, y ${f.n} × ${mult} = ${correct} ${t}.`
    };
  },

  analizar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const f = pick(bandOf(g) === 3 ? fractPool(g) : [FRACT[0], FRACT[2], FRACT[1]]);
    const mult = ri(2, bandOf(g) === 3 ? 12 : 6);
    const total = f.d * mult;
    const real = f.n * mult;
    const veraSays = pick([real + mult, Math.floor(total / 2) === real ? real + 1 : Math.floor(total / 2)]);
    const correctOpt = `No: ${f.uni} de ${total} son ${real}`;
    const { options, answer } = buildOptions(correctOpt, [
      `Sí, Vera tiene razón`,
      `No: ${f.uni} de ${total} son ${real + f.d}`,
      `No: ${f.uni} de ${total} son ${total}`
    ]);
    return {
      skill: 'error_fraccion',
      question: `Vera Kovak reparte el botín y anuncia: «${f.uni} de ${total} monedas son ${veraSays} monedas, ¡me las quedo!». ¿Es correcto su reparto?`,
      options, answer,
      hint1: `Comprueba tú el reparto: divide ${total} entre ${f.d}.`,
      hint2: `${total} ÷ ${f.d} = ${mult}; ahora multiplica por ${f.n}.`,
      explanation: `${f.uni} de ${total} = ${real}, no ${veraSays}. Divide entre ${f.d} y multiplica por ${f.n}.`
    };
  }
};

/* ═══════════════ POZO 4 · EL SENDERO (1.º y 2.º) ═══════════════
   Contar, series y descomponer: lo propio del primer ciclo, con enunciados
   de una línea para que el reto sea el número y no la lectura. */
const sendero = {
  recordar(tier, grade) {
    const g = grade || 1;
    const max = g === 1 ? 30 : 100;
    const n = ri(3, max);
    const dedos = Math.min(10, n);
    const correct = n;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    const grupos = Math.floor(n / 10), sueltos = n % 10;
    return {
      skill: 'contar_agrupando',
      question: `Cuenta el tesoro:\n${'🟨'.repeat(grupos)}${grupos ? ' (bolsas de 10)  ' : ''}${'🪙'.repeat(sueltos)}\n¿Cuántas monedas hay?`,
      options, answer,
      hint1: 'Cada bolsa 🟨 vale 10 monedas.',
      hint2: `${grupos} bolsa(s) son ${grupos * 10}, y ${sueltos} suelta(s) más.`,
      explanation: `${grupos * 10} + ${sueltos} = ${n} monedas.`
    };
  },
  comprender(tier, grade) {
    const g = grade || 1;
    const paso = pick(g === 1 ? [1, 2, 5, 10] : [2, 3, 5, 10]);
    const inicio = ri(1, g === 1 ? 20 : 50);
    const serie = [inicio, inicio + paso, inicio + paso * 2, inicio + paso * 3];
    const correct = inicio + paso * 4;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    return {
      skill: 'series',
      question: `Sigue las huellas:\n${serie.join(' → ')} → ?`,
      options, answer,
      hint1: 'Mira cuánto sube de un número al siguiente.',
      hint2: `Cada paso suma ${paso}.`,
      explanation: `La serie sube de ${paso} en ${paso}: después de ${serie[3]} va ${correct}.`
    };
  },
  aplicar(tier, grade) {
    const g = grade || 1;
    const max = g === 1 ? 10 : 20;
    const a = ri(2, max), b = ri(2, max);
    const correct = a + b;
    const { options, answer } = buildOptions(correct, nearMisses(correct).concat([Math.abs(a - b)]), fmtNum);
    return {
      skill: 'suma_basica',
      question: `Kira tiene ${a} gemas 💎 y encuentra ${b} más.\n¿Cuántas gemas tiene ahora?`,
      options, answer,
      hint1: 'Encontrar más significa sumar.',
      hint2: `Empieza en ${a} y cuenta ${b} más con los dedos.`,
      explanation: `${a} + ${b} = ${correct} gemas.`
    };
  },
  analizar(tier, grade) {
    const g = grade || 1;
    const max = g === 1 ? 20 : 60;
    const nums = [];
    while (nums.length < 4) { const n = ri(1, max); if (!nums.includes(n)) nums.push(n); }
    const par = Math.random() < 0.5;
    const buscados = nums.filter(n => (n % 2 === 0) === par);
    if (!buscados.length) return sendero.comprender(tier, grade);   /* sin candidatos: otra pregunta */
    const correct = buscados[0];
    const { options, answer } = buildOptions(correct, nums.filter(n => n !== correct), fmtNum);
    return {
      skill: 'par_impar',
      question: `¿Cuál de estos números es ${par ? 'PAR' : 'IMPAR'}?\n${nums.join(' · ')}`,
      options, answer,
      hint1: par ? 'Los pares se pueden repartir en dos montones iguales.' : 'Los impares siempre dejan uno suelto.',
      hint2: 'Mira la última cifra: 0, 2, 4, 6 y 8 son pares.',
      explanation: `${correct} es ${par ? 'par' : 'impar'} porque acaba en ${correct % 10}.`
    };
  }
};

/* ═══════════════ POZO 5 · CÁMARA DECIMAL (5.º y 6.º) ═══════════════ */
const decimales = {
  recordar(tier) {
    const ent = ri(1, 99), dec = ri(1, 99);
    const n = ent + dec / 100;
    const txt = n.toLocaleString('es-ES', { minimumFractionDigits: 2 });
    const parte = pick(['décimas', 'centésimas']);
    const correct = parte === 'décimas' ? Math.floor(dec / 10) : dec % 10;
    const { options, answer } = buildOptions(correct, [Math.floor(dec / 10), dec % 10, ent % 10, ri(0, 9)]);
    return {
      skill: 'decimal_posicion',
      question: `El manómetro del templo marca ${txt}. ¿Qué cifra ocupa el lugar de las ${parte}?`,
      options, answer,
      hint1: 'Tras la coma va primero el lugar de las décimas y luego el de las centésimas.',
      hint2: `En ${txt}, después de la coma están ${String(dec).padStart(2, '0')}.`,
      explanation: `En ${txt}, la cifra de las ${parte} es ${correct}.`
    };
  },
  comprender(tier) {
    const pares = [
      { d: '0,5', f: '½' }, { d: '0,25', f: '¼' }, { d: '0,75', f: '¾' },
      { d: '0,2', f: '⅕' }, { d: '0,1', f: '1/10' }
    ];
    const p = pick(pares);
    const { options, answer } = buildOptions(p.f, pares.filter(x => x !== p).map(x => x.f));
    return {
      skill: 'decimal_fraccion',
      question: `Kira anota ${p.d} en la bitácora. ¿A qué fracción equivale?`,
      options, answer,
      hint1: 'Piensa en cuántas partes iguales hacen un entero.',
      hint2: `${p.d} de 1 entero. ¿Cuántas veces cabe en 1?`,
      explanation: `${p.d} equivale a ${p.f}.`
    };
  },
  aplicar(tier) {
    const total = ri(2, 40) * 10;
    const pct = pick([10, 20, 25, 50, 75]);
    const correct = Math.round(total * pct / 100);
    const { options, answer } = buildOptions(correct, [Math.round(total * (pct + 10) / 100), Math.round(total / 2), total - correct].concat(nearMisses(correct)), fmtNum);
    return {
      skill: 'porcentaje',
      question: `El botín es de ${fmtNum(total)} doblones y la Sociedad se queda el ${pct} %. ¿Cuántos doblones son?`,
      options, answer,
      hint1: `El ${pct} % significa ${pct} de cada 100.`,
      hint2: `Divide ${fmtNum(total)} entre 100 y multiplica por ${pct}.`,
      explanation: `${pct} % de ${fmtNum(total)} = ${fmtNum(total)} ÷ 100 × ${pct} = ${fmtNum(correct)} doblones.`
    };
  },
  analizar(tier) {
    /* Este reto existe para desmontar «más cifras = más grande», así que el
       número con MÁS decimales tiene que ser siempre el menor. Antes se
       sorteaban los dos por separado y la mitad de las veces Vera acertaba
       —por el motivo equivocado, pero acertaba—, y el reto acababa dándole la
       razón a la idea que venía a corregir.

       Dos formas, a suertes, para que no se pueda resolver de carrerilla:
       · la parte entera ya decide (2,45 frente a 7,3)
       · la parte entera empata y hay que mirar las décimas (3,45 frente a 3,7),
         que es el caso donde de verdad se tropieza. */
    const porDecimas = ri(0, 1) === 0;
    let ent1, dec1, ent2, dec2;
    if (porDecimas) {
      ent1 = ent2 = ri(1, 9);
      dec1 = ri(0, 4);              /* el de dos decimales, con la décima menor */
      dec2 = ri(dec1 + 1, 9);
    } else {
      ent1 = ri(1, 8);
      ent2 = ri(ent1 + 1, 9);       /* el de un decimal se lleva la parte entera mayor */
      dec1 = ri(0, 9); dec2 = ri(0, 9);
    }
    const masCifras = `${ent1},${dec1}${ri(1, 9)}`;   /* dos decimales */
    const menosCifras = `${ent2},${dec2}`;            /* un decimal */

    const correctOpt = `${menosCifras} es mayor`;
    const { options, answer } = buildOptions(correctOpt, [
      `${masCifras} es mayor`,
      'Son iguales',
      'No se pueden comparar'
    ]);
    return {
      skill: 'comparar_decimales',
      question: `Vera dice que ${masCifras} es mayor que ${menosCifras} «porque tiene más cifras». ¿Quién tiene razón?`,
      options, answer,
      hint1: 'Tener más cifras detrás de la coma no significa ser mayor: 0,5 es mayor que 0,25.',
      hint2: porDecimas
        ? `La parte entera es la misma en los dos (${ent1}). Compara entonces las décimas: ${dec1} y ${dec2}.`
        : `Compara primero la parte entera: ${ent1} y ${ent2}.`,
      explanation: `Vera se equivoca: ${menosCifras} es mayor que ${masCifras}. ` +
        (porDecimas
          ? `Con la misma parte entera manda la décima, y ${dec2} es mayor que ${dec1}.`
          : `Manda la parte entera, y ${ent2} es mayor que ${ent1}.`) +
        ' Contar cifras no sirve para comparar decimales.'
    };
  }
};

/* ═══════════════ CONTENIDO COMO DATOS ═══════════════
   Los tres pozos de fábrica traen generadores procedurales (retos infinitos).
   Los que cree el docente traen un banco de retos escritos por él. Toda la
   estructura —yacimientos, pozos, qué trae cada estrato— vive en la config,
   así que se puede montar entera desde el Panel de Configuración. */


/* ═══════════════ BIBLIOTECA DE ARENA · LENGUA ═══════════════
   El PRD pide una plataforma para toda la primaria, pero hasta ahora solo
   había Matemáticas: media jornada escolar fuera del mapa. Estos tres pozos
   cubren vocabulario, ortografía y comprensión lectora.

   Todo el contenido va por ciclos (banda 1, 2 y 3), no por tier: la
   dificultad de una palabra la marca la edad a la que se aprende, no un
   número del motor adaptativo. El tier solo decide, dentro del ciclo, si se
   coge de la mitad fácil o de la difícil del banco. */

/* Del banco de un ciclo, el tramo que toca según el tier (1-5) */
function porTier(lista, tier) {
  if (lista.length < 4) return pick(lista);
  const t = Math.max(1, Math.min(5, tier || 2));
  const corte = Math.ceil(lista.length * (0.35 + 0.13 * t));
  return pick(lista.slice(0, Math.max(3, corte)));
}
/* Los distractores se pasan de sobra y barajados: buildOptions() descarta los
   repetidos, y con solo tres candidatos una regla duplicada dejaba la pregunta
   con opciones de relleno tipo «palabra?». */
function distractores(lista) { return shuffle(lista); }

/* ── Bancos de palabras por ciclo ── */
const LEX = {
  sinonimos: {
    1: [['contento', 'alegre'], ['bonito', 'guapo'], ['rápido', 'veloz'], ['grande', 'enorme'],
        ['casa', 'vivienda'], ['triste', 'apenado'], ['sucio', 'manchado'], ['flaco', 'delgado']],
    2: [['valiente', 'audaz'], ['antiguo', 'viejo'], ['hallar', 'encontrar'], ['oculto', 'escondido'],
        ['difícil', 'complicado'], ['tranquilo', 'sereno'], ['comenzar', 'empezar'], ['famoso', 'célebre'],
        ['peligro', 'riesgo'], ['observar', 'mirar']],
    3: [['perspicaz', 'astuto'], ['vetusto', 'anticuado'], ['hostil', 'enemigo'], ['ímprobo', 'enorme'],
        ['efímero', 'pasajero'], ['recóndito', 'apartado'], ['dilucidar', 'aclarar'], ['tenaz', 'persistente'],
        ['minucioso', 'detallado'], ['inhóspito', 'inhabitable']]
  },
  antonimos: {
    1: [['grande', 'pequeño'], ['alto', 'bajo'], ['día', 'noche'], ['frío', 'caliente'],
        ['dentro', 'fuera'], ['lleno', 'vacío'], ['abrir', 'cerrar'], ['limpio', 'sucio']],
    2: [['antiguo', 'moderno'], ['valiente', 'cobarde'], ['aparecer', 'desaparecer'], ['claro', 'oscuro'],
        ['húmedo', 'seco'], ['ascender', 'descender'], ['permitir', 'prohibir'], ['culpable', 'inocente'],
        ['generoso', 'tacaño'], ['ruidoso', 'silencioso']],
    3: [['abundante', 'escaso'], ['perpetuo', 'efímero'], ['hostil', 'acogedor'], ['ínfimo', 'inmenso'],
        ['acatar', 'desobedecer'], ['afirmar', 'negar'], ['exterior', 'interior'], ['rígido', 'flexible'],
        ['legible', 'ilegible'], ['moderado', 'excesivo']]
  },
  /* familias léxicas: raíz → palabras de la familia + intruso */
  familias: {
    1: [{ raiz: 'pan', fam: ['panadero', 'panadería', 'panecillo'], fuera: 'pantalón' },
        { raiz: 'flor', fam: ['florero', 'floristería', 'florecer'], fuera: 'flotar' },
        { raiz: 'mar', fam: ['marinero', 'marea', 'marino'], fuera: 'martillo' }],
    2: [{ raiz: 'libro', fam: ['librería', 'librero', 'libreta'], fuera: 'libre' },
        { raiz: 'tierra', fam: ['terreno', 'terrestre', 'enterrar'], fuera: 'terrible' },
        { raiz: 'papel', fam: ['papelera', 'papelería', 'empapelar'], fuera: 'papilla' },
        { raiz: 'agua', fam: ['aguado', 'aguacero', 'acuático'], fuera: 'aguja' }],
    3: [{ raiz: 'tiempo', fam: ['temporal', 'contemporáneo', 'temporada'], fuera: 'templo' },
        { raiz: 'piedra', fam: ['pedregal', 'pedrería', 'empedrado'], fuera: 'pedido' },
        { raiz: 'luz', fam: ['lucero', 'iluminar', 'lucidez'], fuera: 'lucha' },
        { raiz: 'noche', fam: ['nocturno', 'anochecer', 'trasnochar'], fuera: 'noticia' }]
  },
  /* categorías gramaticales, con ejemplos claros por ciclo */
  categorias: {
    1: { sustantivo: ['perro', 'mesa', 'sol', 'mapa'], adjetivo: ['rojo', 'alto', 'nuevo', 'frío'],
         verbo: ['correr', 'saltar', 'comer', 'mirar'] },
    2: { sustantivo: ['brújula', 'templo', 'excavación', 'desierto'], adjetivo: ['antiguo', 'valiente', 'profundo', 'dorado'],
         verbo: ['descubrir', 'excavar', 'observar', 'proteger'], adverbio: ['deprisa', 'ayer', 'aquí', 'siempre'] },
    3: { sustantivo: ['jeroglífico', 'expedición', 'cartografía', 'yacimiento'], adjetivo: ['inhóspito', 'minucioso', 'ancestral', 'perspicaz'],
         verbo: ['descifrar', 'catalogar', 'restaurar', 'interpretar'], adverbio: ['minuciosamente', 'apenas', 'entonces', 'jamás'],
         preposición: ['bajo', 'entre', 'según', 'durante'] }
  }
};

/* ── Ortografía: cada regla con su explicación ──
   `homofono: true` marca las parejas donde la forma incorrecta ES una palabra
   real («calló» frente a «cayó»). Solo valen dentro de una frase, que es lo
   que decide cuál toca: fuera de contexto darían dos opciones bien escritas
   en la misma pregunta. */
const ORTO = {
  1: [
    { tipo: 'bv', bien: 'bueno',   mal: 'gueno',   frase: 'Tobías es un perro muy ___.',            regla: 'Se escribe con B.', pista: 'Suena /b/ al principio.' },
    { tipo: 'h', bien: 'huevo',   mal: 'uevo',    frase: 'En el nido había un ___ de pájaro.',     regla: 'Las palabras que empiezan por «ue» llevan H.', pista: 'Falta una letra muda al principio.' },
    { tipo: 'lly', bien: 'llave',   mal: 'yave',    frase: 'Bruno perdió la ___ del cofre.',         regla: 'Se escribe con LL.', pista: 'Suena igual que «lluvia».' },
    { tipo: 'bv', bien: 'cabeza',  mal: 'caveza',  frase: 'Kira se posó en la ___ de Bruno.',       regla: 'Se escribe con B.', pista: 'Piensa en «cabezón».' },
    { tipo: 'tilde', bien: 'árbol',   mal: 'arbol',   frase: 'Acampamos debajo de un ___ enorme.',     regla: 'Es llana acabada en L, y por eso lleva tilde.', pista: 'Se dice ÁR-bol, con la fuerza al principio.' },
    { tipo: 'gj', bien: 'jirafa',  mal: 'girafa',  frase: 'En el mapa hay dibujada una ___.',       regla: 'Se escribe con J.', pista: 'Aunque suene igual que la G, aquí va J.' },
    { tipo: 'homofonos', bien: 'hola', homofono: true,    mal: 'ola',     frase: 'Bruno saludó: «¡___, exploradores!».',   regla: 'El saludo lleva H; «ola» sin H es la del mar.', pista: 'Depende de lo que quieras decir.' },
    { tipo: 'zsc', bien: 'zapato',  mal: 'sapato',  frase: 'Se le llenó de arena un ___.',           regla: 'Se escribe con Z.', pista: 'Za, ze, zi, zo, zu.' }
  ],
  2: [
    { tipo: 'h', bien: 'hierba',    mal: 'ierba',    frase: 'Junto al río crecía ___ muy alta.',                regla: 'Las palabras que empiezan por «ie» llevan H.', pista: 'Igual que «hielo».' },
    { tipo: 'bv', bien: 'volver',    mal: 'bolver',   frase: 'Tendremos que ___ mañana al yacimiento.',          regla: 'Los verbos acabados en -olver se escriben con V.', pista: 'Como «resolver» y «devolver».' },
    { tipo: 'bv', bien: 'burbuja',   mal: 'vurvuja',  frase: 'Del barro salió una ___ de aire.',                 regla: 'Se escribe con B las dos veces.', pista: 'Bur-bu-ja.' },
    { tipo: 'gj', bien: 'gigante',   mal: 'jigante',  frase: 'La estatua era ___: medía diez metros.',           regla: 'Se escribe con G ante E e I en esta palabra.', pista: 'Como «gimnasia» o «girar».' },
    { tipo: 'homofonos', bien: 'cayó', homofono: true,      mal: 'calló',    frase: 'Bruno tropezó y se ___ en la zanja.',              regla: '«Cayó» es de caerse; «calló» es de callarse.', pista: '¿Se cayó al suelo o se quedó en silencio?' },
    { tipo: 'tilde', bien: 'después',   mal: 'despues',  frase: 'Excavaremos ___ de comer.',                        regla: 'Es aguda acabada en S, así que lleva tilde.', pista: 'La fuerza va en «pués».' },
    { tipo: 'x', bien: 'excavar',   mal: 'escavar',  frase: 'Hay que ___ con mucho cuidado.',                   regla: 'Se escribe con X.', pista: 'Como «excursión» o «excelente».' },
    { tipo: 'mn', bien: 'también',   mal: 'tanbién',  frase: 'Kira ___ quiere bajar a la cámara.',               regla: 'Antes de B y P se escribe M, no N.', pista: 'M antes de B y P, siempre.' },
    { tipo: 'zsc', bien: 'ejercicio', mal: 'ejerzicio',frase: 'Descifrar la tablilla fue un buen ___.',           regla: 'Se escribe con C.', pista: 'Ce, ci suenan como la Z.' },
    { tipo: 'h', bien: 'hacia', homofono: true,     mal: 'asia',     frase: 'La expedición avanzó ___ el norte.',               regla: '«Hacia» indica dirección y lleva H.', pista: 'No confundir con el continente.' }
  ],
  3: [
    { tipo: 'h', bien: 'exhaustivo',  mal: 'exaustivo',   frase: 'El informe debe ser ___ para que sirva de algo.',       regla: 'Lleva H intercalada.', pista: 'Igual que «exhibir» o «exhalar».' },
    { tipo: 'bv', bien: 'absorber',    mal: 'absorver',    frase: 'La arena puede ___ toda el agua de la lluvia.',         regla: 'Se escribe con B.', pista: 'Piensa en «absorbente».' },
    { tipo: 'homofonos', bien: 'vaya', homofono: true,        mal: 'valla',       frase: 'Es mejor que ___ Kira: lee los signos.',                regla: '«Vaya» es del verbo ir; «valla» es una cerca.', pista: '¿Quién se va o qué cerca es?' },
    { tipo: 'junto', bien: 'sinfín', homofono: true,      mal: 'sin fín',     frase: 'Encontramos un ___ de fragmentos.',                     regla: 'Se escribe junto y con tilde: es un sustantivo.', pista: 'Puedes poner «un» delante.' },
    { tipo: 'junto', bien: 'porqué', homofono: true,      mal: 'por que',     frase: 'Nadie entiende el ___ de esas marcas.',                 regla: 'Con tilde y junto es un sustantivo: «el porqué».', pista: 'Se puede poner «el» delante.' },
    { tipo: 'otras', bien: 'arqueología', mal: 'arquiología', frase: 'La ___ estudia lo que dejaron los antiguos.',           regla: 'Se escribe con E: arque-o-lo-gía.', pista: 'Viene de «arqueo-», lo antiguo.' },
    { tipo: 'junto', bien: 'sino', homofono: true,        mal: 'si no',       frase: 'No lo halló Bruno, ___ Vega.',                          regla: 'Junto cuando corrige lo dicho antes.', pista: '¿Corrige lo anterior o es una condición?' },
    { tipo: 'h', bien: 'hubo',        mal: 'ubo',         frase: 'Aquel año ___ tres expediciones.',                      regla: 'Del verbo haber, siempre con H.', pista: 'Haber lleva H en todas sus formas.' },
    { tipo: 'gj', bien: 'geografía',   mal: 'jeografía',   frase: 'La ___ del valle cambió con el río.',                   regla: 'Se escribe con G: «geo-» es tierra.', pista: 'Como «geología» o «geometría».' },
    { tipo: 'junto', bien: 'asimismo', homofono: true,    mal: 'asi mismo',   frase: 'Se anotó la fecha y, ___, la profundidad.',             regla: 'Junto y sin tilde cuando significa «también».', pista: '¿Puedes cambiarlo por «también»?' }
  ]
};

/* ── Textos para comprensión lectora ── */
const TEXTOS = {
  /* Primer ciclo: textos de 20-24 palabras. La comprensión lectora necesita un
     texto —es su objeto—, pero a los 6 años uno largo mide la resistencia, no
     la comprensión. Se sacrifica extensión, no los cuatro niveles de Bloom. */
  1: [{
    texto: 'Tobías es el perro de la expedición. Tiene el pelo marrón. Cada mañana busca huesos en la arena. Ayer encontró una vasija rota.',
    literal: { p: '¿De qué color tiene el pelo Tobías?', r: 'Marrón', d: ['Blanco', 'Negro', 'Gris'] },
    inferencia: { p: '¿Dónde busca Tobías?', r: 'En la arena', d: ['En el río', 'En un árbol', 'En la cocina'] },
    idea: { p: '¿De qué trata el texto?', r: 'Del perro de la expedición', d: ['De una vasija rota', 'De la arena', 'De la mañana'] },
    critica: { p: 'Bruno dice que Tobías encontró oro. ¿Es verdad?', r: 'No: encontró una vasija rota', d: ['Sí, encontró oro', 'Sí, un hueso de oro', 'El texto no habla de Tobías'] }
  }, {
    texto: 'Kira es un escarabajo de latón. No come ni duerme. Lee los signos antiguos de las paredes. Si algo le parece tonto, mueve las alas deprisa.',
    literal: { p: '¿De qué está hecha Kira?', r: 'De latón', d: ['De madera', 'De cristal', 'De papel'] },
    inferencia: { p: 'Kira mueve las alas deprisa. ¿Qué le pasa?', r: 'Algo le parece tonto', d: ['Tiene hambre', 'Va a dormir', 'Está rota'] },
    idea: { p: '¿Para qué sirve Kira?', r: 'Para leer signos antiguos', d: ['Para cavar', 'Para llevar agua', 'Para dormir'] },
    critica: { p: '¿Qué NO dice el texto?', r: 'Cuántos años tiene Kira', d: ['De qué está hecha', 'Para qué sirve', 'Que no come'] }
  }, {
    texto: 'Bruno perdió las gafas tres veces esta semana. El lunes en la tienda. El martes en la zanja. El jueves las llevaba puestas.',
    literal: { p: '¿Cuántas veces perdió Bruno las gafas?', r: 'Tres veces', d: ['Una vez', 'Dos veces', 'Cinco veces'] },
    inferencia: { p: 'El jueves no estaban perdidas. ¿Dónde estaban?', r: 'Puestas en su cara', d: ['En la zanja', 'En la tienda', 'En el mapa'] },
    idea: { p: '¿Cómo es Bruno según el texto?', r: 'Despistado', d: ['Valiente', 'Tacaño', 'Enfadado'] },
    critica: { p: '¿Qué día NO perdió las gafas de verdad?', r: 'El jueves', d: ['El lunes', 'El martes', 'Ningún día'] }
  }],
  2: [{
    texto: 'La expedición llegó al Valle Fósil al amanecer. Bruno quería excavar enseguida, pero Kira le hizo esperar: la arena estaba húmeda por la lluvia de la noche y las paredes de la zanja podían derrumbarse. Esperaron tres horas al sol. Cuando por fin cavaron, encontraron una tablilla con signos que nadie había visto en cien años.',
    literal: { p: '¿Cuánto tiempo esperaron antes de cavar?', r: 'Tres horas', d: ['Toda la noche', 'Media hora', 'Dos días'] },
    inferencia: { p: '¿Por qué era peligroso cavar con la arena húmeda?', r: 'Porque las paredes de la zanja podían derrumbarse', d: ['Porque la tablilla se mojaría', 'Porque hacía demasiado sol', 'Porque Bruno estaba cansado'] },
    idea: { p: '¿Cuál es la idea principal del texto?', r: 'Esperar el momento adecuado permitió excavar con seguridad y hallar algo importante', d: ['Bruno es impaciente', 'En el Valle Fósil llueve mucho', 'Las tablillas son frágiles'] },
    critica: { p: '¿Qué afirmación NO se puede deducir del texto?', r: 'Que Kira ya conocía esa tablilla', d: ['Que había llovido esa noche', 'Que Bruno tenía prisa', 'Que el hallazgo era antiguo'] }
  }, {
    texto: 'Los Saqueadores del Cuervo no excavan: compran. Vera Kovak paga a quien le lleve piezas antiguas y luego las revende a coleccionistas que las guardan en casa. Cuando una pieza sale de su yacimiento sin anotar dónde estaba, se pierde para siempre la información que la acompañaba, aunque el objeto siga entero.',
    literal: { p: '¿Qué hace Vera Kovak con las piezas que compra?', r: 'Las revende a coleccionistas', d: ['Las dona a un museo', 'Las devuelve al yacimiento', 'Las estudia y las publica'] },
    inferencia: { p: 'Según el texto, ¿qué se pierde aunque la pieza siga entera?', r: 'La información de dónde estaba', d: ['Su valor en dinero', 'Su color original', 'Su nombre antiguo'] },
    idea: { p: '¿Qué quiere explicar el texto?', r: 'Que sacar una pieza sin anotar su sitio destruye conocimiento', d: ['Que los coleccionistas pagan mucho', 'Que Vera Kovak es rica', 'Que excavar es difícil'] },
    critica: { p: '¿Cuál de estas frases es una opinión y no un dato del texto?', r: '«Los coleccionistas son personas horribles»', d: ['«Vera Kovak paga por piezas antiguas»', '«Los Saqueadores no excavan»', '«La información se pierde»'] }
  }],
  3: [{
    texto: 'Durante décadas se creyó que la Ciudad de Ossian era una leyenda. El único indicio era un mapa del siglo XVIII que situaba unas ruinas junto a un río que hoy no existe. En 1998, un satélite detectó bajo la arena la huella de un cauce seco exactamente donde el mapa lo dibujaba. La expedición que cavó allí no encontró la ciudad, pero sí un muro de doce metros. El hallazgo no demostró la leyenda: demostró que el mapa era fiable.',
    literal: { p: '¿Qué detectó el satélite en 1998?', r: 'La huella de un cauce seco', d: ['Un muro de doce metros', 'La Ciudad de Ossian', 'Un mapa del siglo XVIII'] },
    inferencia: { p: '¿Por qué el autor distingue entre «demostrar la leyenda» y «demostrar que el mapa era fiable»?', r: 'Porque hallar un muro no prueba que exista la ciudad, solo que el mapa acertaba', d: ['Porque el mapa era falso', 'Porque el muro pertenecía a otra ciudad', 'Porque la leyenda ya estaba demostrada'] },
    idea: { p: '¿Cuál es la tesis del texto?', r: 'Una prueba parcial confirma la fuente, no necesariamente la historia entera', d: ['Los satélites han sustituido a la arqueología', 'La Ciudad de Ossian existió', 'Los mapas antiguos son poco fiables'] },
    critica: { p: '¿Qué haría más sólida la conclusión del autor?', r: 'Datar el muro y compararlo con la fecha que da el mapa', d: ['Buscar más leyendas parecidas', 'Preguntar a los habitantes actuales', 'Dibujar de nuevo el mapa'] }
  }, {
    texto: 'Restaurar una pieza plantea un dilema. Si se reconstruye lo que falta, el objeto se entiende mejor, pero quien lo mire después no sabrá qué parte es original. Si no se reconstruye nada, la pieza se conserva íntegra pero resulta ilegible para casi todos. Muchos museos han optado por una solución intermedia: completar la forma con un material de color distinto, visible de cerca e invisible de lejos.',
    literal: { p: '¿Qué solución intermedia han adoptado muchos museos?', r: 'Completar con un material de color distinto', d: ['No restaurar nunca nada', 'Reconstruir la pieza entera', 'Exponer solo fotografías'] },
    inferencia: { p: '¿Por qué el material se describe como «visible de cerca e invisible de lejos»?', r: 'Para que se entienda la forma sin ocultar qué es original', d: ['Porque es más barato', 'Porque se desgasta con el tiempo', 'Porque brilla con la luz'] },
    idea: { p: '¿Qué estructura sigue el texto?', r: 'Plantea dos opciones opuestas y presenta una tercera que las concilia', d: ['Narra una restauración paso a paso', 'Defiende no restaurar nunca', 'Compara dos museos concretos'] },
    critica: { p: '¿Qué supuesto acepta el autor sin discutirlo?', r: 'Que las piezas deben exponerse al público', d: ['Que restaurar plantea un dilema', 'Que hay varias soluciones posibles', 'Que el color distinto se ve de cerca'] }
  }]
};

/* ═══════════════ POZO · EL ESCRIBA DE ARENA (vocabulario) ═══════════════ */
const vocabulario = {
  recordar(tier, grade) {
    const banda = bandOf(grade);
    const [a, b] = porTier(LEX.sinonimos[banda], tier);
    const otros = LEX.sinonimos[banda].filter(p => p[1] !== b).map(p => p[1]);
    const { options, answer } = buildOptions(b, distractores(otros));
    return {
      skill: 'sinonimos',
      question: terse(grade) ? `¿Qué palabra significa lo mismo que «${a}»?`
                            : `El escriba busca una palabra que signifique lo mismo que «${a}». ¿Cuál es?`,
      options, answer,
      hint1: 'Un sinónimo es otra palabra que significa casi lo mismo.',
      hint2: `Prueba a cambiar «${a}» por cada opción en una frase.`,
      explanation: `«${a}» y «${b}» son sinónimos: significan lo mismo.`
    };
  },
  comprender(tier, grade) {
    const banda = bandOf(grade);
    const [a, b] = porTier(LEX.antonimos[banda], tier);
    const otros = LEX.antonimos[banda].filter(p => p[1] !== b).map(p => p[1]);
    const { options, answer } = buildOptions(b, distractores(otros));
    return {
      skill: 'antonimos',
      question: terse(grade) ? `¿Cuál es lo contrario de «${a}»?`
                            : `En la tablilla falta la palabra contraria a «${a}». ¿Cuál es?`,
      options, answer,
      hint1: 'Un antónimo significa justo lo contrario.',
      hint2: `Piensa: si algo no es «${a}», ¿cómo es?`,
      explanation: `«${b}» es lo contrario de «${a}».`
    };
  },
  aplicar(tier, grade) {
    const banda = bandOf(grade);
    const cats = LEX.categorias[banda];
    const nombres = Object.keys(cats);
    const cat = pick(nombres);
    const correct = pick(cats[cat]);
    const otras = nombres.filter(n => n !== cat).flatMap(n => cats[n]);
    const { options, answer } = buildOptions(correct, distractores(otras));
    const explica = {
      sustantivo: 'nombra cosas, personas o lugares',
      adjetivo: 'dice cómo es algo',
      verbo: 'expresa una acción',
      adverbio: 'dice cómo, cuándo o dónde ocurre algo',
      preposición: 'une palabras y no cambia nunca'
    }[cat];
    return {
      skill: 'categorias',
      question: terse(grade) ? `¿Cuál de estas palabras es un ${cat}?`
                            : `Kira clasifica el vocabulario del diario. ¿Cuál de estas palabras es un ${cat}?`,
      options, answer,
      hint1: `Un ${cat} ${explica}.`,
      hint2: `Prueba a poner «el» o «la» delante: solo funciona con los sustantivos.`,
      explanation: `«${correct}» es un ${cat}: ${explica}.`
    };
  },
  analizar(tier, grade) {
    const banda = bandOf(grade);
    const f = porTier(LEX.familias[banda], tier);
    const { options, answer } = buildOptions(f.fuera, distractores(f.fam));
    return {
      skill: 'familias_palabras',
      question: terse(grade)
        ? `Estas palabras son de la familia de «${f.raiz}»… menos una. ¿Cuál?`
        : `El escriba ha colado un intruso entre las palabras de la familia de «${f.raiz}». ¿Cuál no pertenece?`,
      options, answer,
      hint1: 'Las palabras de una familia comparten una parte y también el significado.',
      hint2: `Pregúntate: ¿esta palabra tiene algo que ver con «${f.raiz}»?`,
      explanation: `«${f.fuera}» se parece por fuera, pero no significa nada relacionado con «${f.raiz}».`
    };
  }
};

/* ═══════════════ POZO · LAS TABLILLAS ROTAS (ortografía) ═══════════════ */
const ortografia = {
  recordar(tier, grade) {
    const banda = bandOf(grade);
    /* Sin contexto no caben homófonas: aquí solo hay UNA opción bien escrita */
    const banco = ORTO[banda].filter(x => !x.homofono);
    const p = porTier(banco, tier);
    const otros = banco.filter(x => x.bien !== p.bien).map(x => x.mal);
    const { options, answer } = buildOptions(p.bien, [p.mal].concat(distractores(otros)));
    return {
      skill: 'orto_' + p.tipo,
      question: terse(grade) ? '¿Cuál está bien escrita?'
                            : 'Una tablilla se ha roto y hay cuatro copias. ¿Cuál está bien escrita?',
      options, answer,
      hint1: p.pista,
      hint2: p.regla,
      explanation: `Se escribe «${p.bien}». ${p.regla}`
    };
  },
  comprender(tier, grade) {
    const banda = bandOf(grade);
    /* La que hay que señalar tiene que estar mal de verdad, no ser otra palabra */
    const banco = ORTO[banda].filter(x => !x.homofono);
    const p = porTier(banco, tier);
    const { options, answer } = buildOptions(p.mal, distractores(ORTO[banda].filter(x => x.bien !== p.bien).map(x => x.bien)));
    return {
      skill: 'orto_' + p.tipo,
      question: terse(grade) ? '¿Cuál está MAL escrita?'
                            : 'Kira revisa el diario de Bruno. ¿Cuál de estas palabras está MAL escrita?',
      options, answer,
      hint1: 'Léelas despacio, una a una.',
      hint2: p.pista,
      explanation: `Lo correcto es «${p.bien}». ${p.regla}`
    };
  },
  aplicar(tier, grade) {
    const banda = bandOf(grade);
    /* Aquí sí entran las homófonas: la frase es la que decide cuál toca */
    const p = porTier(ORTO[banda], tier);
    const otros = ORTO[banda].filter(x => x.bien !== p.bien && !x.homofono).map(x => x.mal);
    const { options, answer } = buildOptions(p.bien, [p.mal].concat(distractores(otros)));
    return {
      skill: 'orto_' + p.tipo,
      question: `Completa la frase del diario:\n«${p.frase}»`,
      options, answer,
      hint1: p.pista,
      hint2: p.regla,
      explanation: `«${p.bien}» es la forma correcta. ${p.regla}`
    };
  },
  analizar(tier, grade) {
    const banda = bandOf(grade);
    /* «¿Por qué está mal?» exige que esté mal: fuera las homófonas */
    const banco = ORTO[banda].filter(x => !x.homofono);
    const p = porTier(banco, tier);
    const otras = ORTO[banda].filter(x => x.regla !== p.regla).map(x => x.regla);
    const { options, answer } = buildOptions(p.regla, distractores(otras));
    return {
      skill: 'orto_' + p.tipo,
      question: terse(grade)
        ? `«${p.mal}» está mal. ¿Por qué?`
        : `Bruno ha escrito «${p.mal}» y Kira lo ha tachado. ¿Cuál es la razón?`,
      options, answer,
      hint1: `La forma correcta es «${p.bien}».`,
      hint2: 'Fíjate en qué letra cambia entre lo que escribió y lo correcto.',
      explanation: `${p.regla} Por eso se escribe «${p.bien}».`
    };
  }
};

/* ═══════════════ POZO · EL PAPIRO DE OSSIAN (comprensión) ═══════════════ */
/* La clave del reto ES el concepto: localizar un dato, inferir, sacar la idea
   principal o valorar lo que dice el texto son cuatro cosas distintas, y a un
   docente le importa cuál de las cuatro falla. */
const CONCEPTO_LECTURA = { literal: 'lectura_literal', inferencia: 'lectura_inferencia',
                           idea: 'lectura_idea', critica: 'lectura_critica' };

function retoTexto(grade, tier, clave, pistas) {
  const banda = bandOf(grade);
  const t = porTier(TEXTOS[banda], tier);
  const q = t[clave];
  const { options, answer } = buildOptions(q.r, q.d);
  return {
    skill: CONCEPTO_LECTURA[clave] || null,
    question: `${t.texto}\n\n${q.p}`,
    options, answer,
    hint1: pistas[0],
    hint2: pistas[1],
    explanation: `La respuesta es «${q.r}».`
  };
}
const comprension = {
  recordar(tier, grade) {
    return retoTexto(grade, tier, 'literal',
      ['La respuesta está escrita tal cual en el texto.', 'Vuelve a leer y busca la palabra exacta de la pregunta.']);
  },
  comprender(tier, grade) {
    return retoTexto(grade, tier, 'inferencia',
      ['Esta no está copiada: hay que atar cabos.', 'Busca la frase que lo explica y piensa qué significa.']);
  },
  aplicar(tier, grade) {
    return retoTexto(grade, tier, 'idea',
      ['La idea principal es de lo que va TODO el texto, no un detalle.', 'Si tuvieras que contarlo en una frase, ¿qué dirías?']);
  },
  analizar(tier, grade) {
    return retoTexto(grade, tier, 'critica',
      ['Aquí no basta con entender: hay que juzgar.', 'Comprueba opción por opción si el texto lo dice de verdad.']);
  }
};

const BUILTIN_GENERATORS = { numeracion, sumas_llevando, fracciones, sendero, decimales,
                             vocabulario, ortografia, comprension };

/* Semilla: lo que hay antes de que el docente toque nada */
function defaultSites() {
  return [{
    id: 'kaldros',
    name: 'Ruinas de Kaldros',
    subject: 'Matemáticas',
    icon: '🏛️',
    desc: 'Templo de engranajes, relojes y bóvedas numéricas.',
    enabled: true,
    branches: [
      { id: 'sendero', name: 'El Sendero de las Huellas', icon: '🐾', source: 'builtin', enabled: true,
        grades: [1, 2],
        desc: 'Contar, seguir huellas y repartir gemas. El primer camino de todo explorador.' },
      { id: 'numeracion', name: 'La Bóveda de los Números', icon: '🔢', source: 'builtin', enabled: true,
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Una cámara llena de cerraduras numéricas. Domina los números para abrirlas todas.' },
      { id: 'sumas_llevando', name: 'El Reloj de Engranajes', icon: '⚙️', source: 'builtin', enabled: true,
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Un reloj gigante que solo gira con cuentas exactas. ¡Cuidado con las llevadas!' },
      { id: 'fracciones', name: 'La Balanza del Mercader', icon: '⚖️', source: 'builtin', enabled: true,
        grades: [3, 4, 5, 6],
        desc: 'Repartos, raciones y vasijas partidas. Aquí el tesoro se divide en partes iguales.' },
      { id: 'decimales', name: 'La Cámara Decimal', icon: '🔬', source: 'builtin', enabled: true,
        grades: [5, 6],
        desc: 'Comas, porcentajes y medidas precisas. La cámara más profunda de Kaldros.' }
    ]
  }, {
    id: 'biblioteca',
    name: 'Biblioteca de Arena',
    subject: 'Lengua',
    icon: '📜',
    desc: 'Una biblioteca sepultada donde las palabras se descubren como piezas.',
    enabled: true,
    branches: [
      { id: 'vocabulario', name: 'El Escriba de Arena', icon: '🖋️', source: 'builtin', enabled: true,
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Sinónimos, contrarios, familias de palabras y clases de palabras.' },
      { id: 'ortografia', name: 'Las Tablillas Rotas', icon: '🪨', source: 'builtin', enabled: true,
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Copias mal escritas de un mismo texto. Encuentra la buena y sabrás por qué.' },
      { id: 'comprension', name: 'El Papiro de Ossian', icon: '📖', source: 'builtin', enabled: true,
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Textos del diario perdido: qué dicen, qué insinúan y qué callan.' }
    ]
  }, {
    /* ── Taller de Cartografía (Bloom 5-6) ──
       Aquí no hay generador: el contenido lo escriben los propios niños y lo
       aprueba el docente. Nace vacío, así que no aparece en el mapa hasta que
       haya algún reto aprobado —branchPlayable() exige contenido— y eso es lo
       correcto: un pozo vacío prometería algo que no está. */
    id: 'taller',
    name: 'Taller de Cartografía',
    subject: 'De la clase',
    icon: '🗺️',
    desc: 'Los acertijos que ha escrito la clase para la clase.',
    enabled: true,
    branches: [
      { id: 'acertijos', name: 'Los acertijos de la clase', icon: '✍️', source: 'bank', enabled: true,
        desc: 'Retos escritos por vosotros. El que los inventa aprende el doble.',
        bank: { recordar: [], comprender: [], aplicar: [], analizar: [] } }
    ]
  }]
}

/* ── Consultas sobre la estructura configurada ── */
function sitesAll()     { return ATLAS_CONFIG.sites || []; }
function sitesEnabled() { return sitesAll().filter(s => s.enabled !== false); }
function siteById(id)   { return sitesAll().find(s => s.id === id) || null; }
function branchesOf(site)        { return (site.branches || []); }

/* ¿Sirve este pozo al curso del alumno? Sin `grades` declarado, sirve a todos:
   así los pozos que cree el docente valen para su clase sin configurar nada. */
function branchFitsGrade(b, grade) {
  if (!b.grades || !b.grades.length) return true;
  return b.grades.includes(grade || DEFAULT_GRADE);
}
function branchesEnabledOf(site, grade) {
  const g = grade === undefined ? currentGrade() : grade;
  return branchesOf(site).filter(b =>
    b.enabled !== false && branchPlayable(b) && branchFitsGrade(b, g));
}
/* Curso del alumno que está jugando; en modo docente, el de la clase */
function currentGrade() {
  if (typeof S !== 'undefined' && S && S.profile && S.profile.grade) return S.profile.grade;
  return (ATLAS_CONFIG && ATLAS_CONFIG.defaultGrade) || DEFAULT_GRADE;
}

/* Localiza un pozo y su yacimiento por id de pozo */
function findBranch(branchId) {
  for (const site of sitesAll()) {
    const b = branchesOf(site).find(x => x.id === branchId);
    if (b) return { site, branch: b };
  }
  return null;
}
function branchDef(branchId) { const f = findBranch(branchId); return f ? f.branch : null; }
function siteOfBranch(branchId) { const f = findBranch(branchId); return f ? f.site : null; }

/* ¿Hay retos para este estrato? Un pozo del docente puede estar a medio llenar. */
function stratumHasContent(branch, stratumId) {
  if (!branch) return false;
  if (branch.source === 'builtin') return !!BUILTIN_GENERATORS[branch.id];
  return (((branch.bank || {})[stratumId]) || []).length > 0;
}
/* Un pozo es jugable si al menos su primer estrato tiene retos */
function branchPlayable(branch) {
  return stratumHasContent(branch, STRATA_ORDER[0]);
}

/* ── Servir un reto ──
   Los pozos de fábrica generan uno nuevo cada vez. Los del docente sacan del
   banco evitando repetir dentro de la misma misión, y barajan las opciones
   para que no se memorice la posición de la respuesta. */
function makeQuestion(branch, stratumId, tier, usedIdx, grade) {
  const bank = ((branch.bank || {})[stratumId]) || [];

  /* ── Un pozo de fábrica CON banco ──
     Los pozos de fábrica generan retos infinitos, y durante mucho tiempo eso
     hizo que ignoraran su banco por completo. Desde que el docente puede
     aprobar retos escritos con IA sobre su currículo, eso los perdía en
     silencio: se guardaban donde nadie los leía.

     Ahora el banco va PRIMERO y sin repetir dentro de la misma misión, y
     cuando se acaba sigue el generador. Es lo predecible: lo que el docente se
     ha molestado en aprobar sale seguro, y lo demás lo rellena la máquina. */
  if (branch.source === 'builtin') {
    const sinUsar = bank.map((q, i) => i).filter(i => !(usedIdx || []).includes(i));
    if (!sinUsar.length) {
      return BUILTIN_GENERATORS[branch.id][stratumId](tier, grade || currentGrade());
    }
    return servirDelBanco(branch, bank, pick(sinUsar), usedIdx);
  }

  if (!bank.length) return null;

  let pool = bank.map((q, i) => i).filter(i => !(usedIdx || []).includes(i));
  if (!pool.length) pool = bank.map((q, i) => i);   /* banco agotado: se recicla */
  return servirDelBanco(branch, bank, pick(pool), usedIdx);
}

/* Un reto del banco, listo para jugarse: las opciones barajadas para que no se
   memorice la posición de la buena. */
function servirDelBanco(branch, bank, idx, usedIdx) {
  if (usedIdx && usedIdx.indexOf(idx) < 0) usedIdx.push(idx);
  const q = bank[idx];
  const correct = q.options[q.answer];
  const shuffled = shuffle(q.options.slice());
  return {
    /* Los retos que escribe el docente no declaran concepto, así que se
       agrupan por su pozo: es lo más útil que se puede decir de ellos sin
       obligarle a etiquetar uno a uno lo que ya ha escrito. Los que salen del
       generador de IA sí lo traen, y por eso cuentan en el diagnóstico. */
    skill: q.skill || ('pozo:' + branch.id),
    question: q.question,
    options: shuffled,
    answer: shuffled.indexOf(correct),
    hint1: q.hint1 || 'Léelo otra vez con calma: la pista está en el enunciado.',
    hint2: q.hint2 || 'Descarta primero las respuestas que seguro que no son.',
    explanation: q.explanation || `La respuesta correcta es «${correct}».`,
    bankIndex: idx
  };
}

/* ═══════════════ ALMACÉN ═══════════════
   El catálogo vive en la configuración del docente (js/config.js y el
   Panel de Configuración), no aquí: es contenido de aula, no del motor. */
function shopCatalog() { return ATLAS_CONFIG.shop; }

const RANKS = [
  { min: 1,  max: 4,  id: 'aprendiz',   name: 'Aprendiz de Mochila' },
  { min: 5,  max: 9,  id: 'rastreador', name: 'Rastreador' },
  { min: 10, max: 17, id: 'cartografo', name: 'Cartógrafo' },
  { min: 18, max: 29, id: 'arqueologo', name: 'Arqueólogo' },
  { min: 30, max: 999, id: 'leyenda',   name: 'Leyenda del Atlas' }
];
