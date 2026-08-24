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
      question: `El botín es de ${fmtNum(total)} doblones y la Sociedad se queda el ${pct} %. ¿Cuántos doblones son?`,
      options, answer,
      hint1: `El ${pct} % significa ${pct} de cada 100.`,
      hint2: `Divide ${fmtNum(total)} entre 100 y multiplica por ${pct}.`,
      explanation: `${pct} % de ${fmtNum(total)} = ${fmtNum(total)} ÷ 100 × ${pct} = ${fmtNum(correct)} doblones.`
    };
  },
  analizar(tier) {
    const a = (ri(10, 99) / 10).toFixed(1).replace('.', ',');
    const b = (ri(100, 999) / 100).toFixed(2).replace('.', ',');
    const na = parseFloat(a.replace(',', '.')), nb = parseFloat(b.replace(',', '.'));
    const mayor = na > nb ? a : b;
    /* el error típico: creer que más cifras es más grande */
    const correctOpt = `${mayor} es mayor`;
    const { options, answer } = buildOptions(correctOpt, [
      `${mayor === a ? b : a} es mayor`,
      'Son iguales',
      'No se pueden comparar'
    ]);
    return {
      question: `Vera dice que ${b} es mayor que ${a} «porque tiene más cifras». ¿Quién tiene razón?`,
      options, answer,
      hint1: 'Tener más cifras detrás de la coma no significa ser mayor.',
      hint2: `Compara primero la parte entera: ${Math.floor(na)} y ${Math.floor(nb)}.`,
      explanation: `${mayor} es mayor. En decimales manda la parte entera, y luego las décimas: el número de cifras no decide.`
    };
  }
};

/* ═══════════════ CONTENIDO COMO DATOS ═══════════════
   Los tres pozos de fábrica traen generadores procedurales (retos infinitos).
   Los que cree el docente traen un banco de retos escritos por él. Toda la
   estructura —yacimientos, pozos, qué trae cada estrato— vive en la config,
   así que se puede montar entera desde el Panel de Configuración. */

const BUILTIN_GENERATORS = { numeracion, sumas_llevando, fracciones, sendero, decimales };

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
  }];
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
  if (branch.source === 'builtin') {
    return BUILTIN_GENERATORS[branch.id][stratumId](tier, grade || currentGrade());
  }
  const bank = ((branch.bank || {})[stratumId]) || [];
  if (!bank.length) return null;

  let pool = bank.map((q, i) => i).filter(i => !(usedIdx || []).includes(i));
  if (!pool.length) pool = bank.map((q, i) => i);   /* banco agotado: se recicla */
  const idx = pick(pool);
  if (usedIdx) usedIdx.push(idx);

  const q = bank[idx];
  const correct = q.options[q.answer];
  const shuffled = shuffle(q.options.slice());
  return {
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
