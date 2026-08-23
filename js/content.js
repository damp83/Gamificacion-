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
  while (opts.length < 4 && guard++ < 50) {
    const d = typeof correct === 'number' ? correct + ri(1, 10) * (Math.random() < 0.5 ? -1 : 1) : correct + '?';
    if ((typeof d !== 'number' || d >= 0) && !seen.has(fmt(d))) { seen.add(fmt(d)); opts.push(d); }
  }
  const shuffled = shuffle(opts);
  return { options: shuffled.map(fmt), answer: shuffled.indexOf(correct) };
}
function fmtNum(n) { return n.toLocaleString('es-ES'); }

const NAMES = ['Bruno', 'Kira', 'Tobías', 'Vega', 'Nilo', 'Mara'];
const TREASURES = ['monedas de plata', 'gemas verdes', 'mapas antiguos', 'vasijas pintadas', 'brújulas de latón', 'fósiles brillantes'];

/* ═══════════════ POZO 1 · NUMERACIÓN ═══════════════ */
const numeracion = {
  recordar(tier) {
    const max = tier <= 2 ? 999 : tier === 3 ? 9999 : 99999;
    const n = ri(Math.floor(max / 10), max);
    const digits = String(n).split('').reverse();
    const places = [
      { i: 0, label: 'unidades' }, { i: 1, label: 'decenas' },
      { i: 2, label: 'centenas' }, { i: 3, label: 'unidades de millar' }
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
  comprender(tier) {
    const max = tier <= 2 ? 999 : tier === 3 ? 9999 : 99999;
    if (Math.random() < 0.5) {
      const nums = [];
      while (nums.length < 4) { const n = ri(10, max); if (!nums.includes(n)) nums.push(n); }
      const correct = Math.max(...nums);
      const { options, answer } = buildOptions(correct, nums.filter(x => x !== correct), fmtNum);
      return {
        question: `Cuatro cofres están marcados con los números ${nums.map(fmtNum).join(', ')}. El tesoro está en el cofre con el número MAYOR. ¿Cuál es?`,
        options, answer,
        hint1: 'Compara primero cuántas cifras tiene cada número: más cifras, número más grande.',
        hint2: 'Si tienen las mismas cifras, compara empezando por la izquierda.',
        explanation: `${fmtNum(correct)} es el mayor de los cuatro números.`
      };
    }
    const base = ri(2, Math.floor(max / 100)) * 100;
    const n = base + ri(1, 99);
    const correct = Math.abs(n - base) <= 50 ? base : base + 100;
    const { options, answer } = buildOptions(correct, [base, base + 100, base - 100, n], fmtNum);
    return {
      question: `Kira necesita redondear ${fmtNum(n)} a la centena más cercana para su mapa. ¿Qué número anota?`,
      options, answer,
      hint1: 'Mira la cifra de las decenas: si es 5 o más, sube a la centena siguiente.',
      hint2: `${fmtNum(n)} está entre ${fmtNum(base)} y ${fmtNum(base + 100)}. ¿De cuál está más cerca?`,
      explanation: `${fmtNum(n)} redondeado a la centena es ${fmtNum(correct)}, porque la cifra de las decenas ${n - base >= 50 ? 'llega a 5 y se sube' : 'no llega a 5 y se baja'}.`
    };
  },
  aplicar(tier) {
    const scale = tier <= 2 ? 100 : tier === 3 ? 500 : 2000;
    const a = ri(scale, scale * 4);
    const b = ri(Math.floor(scale / 2), scale * 2);
    const t = pick(TREASURES);
    const correct = a + b;
    const { options, answer } = buildOptions(correct, [a + b + 10, a + b - 10, a + b + 100, Math.abs(a - b)], fmtNum);
    return {
      question: `La expedición ya tenía ${fmtNum(a)} ${t} y en la nueva cámara encuentra ${fmtNum(b)} más. ¿Cuántas ${t} hay ahora en total?`,
      options, answer,
      hint1: '«En total» y «más» son señales de que hay que sumar.',
      hint2: `Suma ${fmtNum(a)} + ${fmtNum(b)}, colocando bien las columnas.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(correct)}. Cuando juntamos cantidades, sumamos.`
    };
  },
  analizar(tier) {
    const max = tier <= 2 ? 999 : 9999;
    const sorted = [];
    while (sorted.length < 4) { const n = ri(10, max); if (!sorted.includes(n)) sorted.push(n); }
    sorted.sort((x, y) => x - y);
    const wrongIdx = ri(0, 2);
    const bad = sorted.slice();
    [bad[wrongIdx], bad[wrongIdx + 1]] = [bad[wrongIdx + 1], bad[wrongIdx]];
    const correct = bad[wrongIdx];
    const { options, answer } = buildOptions(correct, bad.filter(x => x !== correct), fmtNum);
    return {
      question: `Vera Kovak ordenó estos números de menor a mayor para abrir la cerradura: ${bad.map(fmtNum).join(' → ')}. ¡Pero hay un número mal colocado y la puerta no abre! ¿Cuál está fuera de su sitio?`,
      options, answer,
      hint1: 'Recorre la lista y comprueba que cada número sea menor que el siguiente.',
      hint2: `Fíjate en la pareja ${fmtNum(bad[wrongIdx])} → ${fmtNum(bad[wrongIdx + 1])}. ¿Va de menor a mayor?`,
      explanation: `${fmtNum(bad[wrongIdx])} es mayor que ${fmtNum(bad[wrongIdx + 1])}, así que está mal colocado. El orden correcto es ${sorted.map(fmtNum).join(' → ')}.`
    };
  }
};

/* ═══════════════ POZO 2 · SUMAS CON LLEVADA ═══════════════ */
const sumas_llevando = {
  recordar(tier) {
    const max = tier <= 2 ? 50 : tier === 3 ? 200 : 500;
    const a = ri(10, max), b = ri(10, max);
    const correct = a + b;
    const { options, answer } = buildOptions(correct, [correct + 1, correct - 1, correct + 10, correct - 10], fmtNum);
    return {
      question: `El reloj de engranajes pide el resultado de ${a} + ${b} para girar. ¿Cuánto es?`,
      options, answer,
      hint1: 'Suma primero las unidades y luego las decenas.',
      hint2: `Puedes descomponer: ${a} + ${b} = ${a} + ${Math.floor(b / 10) * 10} + ${b % 10}.`,
      explanation: `${a} + ${b} = ${correct}.`
    };
  },
  comprender(tier) {
    const mk = (carry) => {
      const u1 = carry ? ri(5, 9) : ri(0, 4);
      const u2 = carry ? ri(10 - u1, 9) : ri(0, 4 - u1 > 0 ? 4 - u1 : 0);
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
  aplicar(tier) {
    const scale = tier <= 2 ? 90 : tier === 3 ? 400 : 900;
    const a = ri(Math.floor(scale / 2), scale);
    const b = ri(Math.floor(scale / 2), scale);
    const c = tier >= 4 ? ri(10, 99) : 0;
    const correct = a + b + c;
    const who = pick(NAMES);
    const t = pick(TREASURES);
    const { options, answer } = buildOptions(correct, [correct + 10, correct - 10, correct + 100, correct - 1], fmtNum);
    const extra = c ? ` y ${who} aporta ${c} más` : '';
    return {
      question: `Bruno guarda ${a} ${t} en la mochila y Tobías desentierra ${b}${extra}. ¿Cuántas ${t} llevan al campamento?`,
      options, answer,
      hint1: 'Junta todas las cantidades con una suma.',
      hint2: `Coloca ${a} + ${b}${c ? ' + ' + c : ''} en columnas y no olvides las llevadas.`,
      explanation: `${a} + ${b}${c ? ' + ' + c : ''} = ${fmtNum(correct)}.`
    };
  },
  analizar(tier) {
    const max = tier <= 2 ? 90 : 800;
    const a = ri(15, max), b = ri(15, max);
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
      question: `En el plano robado, Vera Kovak escribió: ${a} + ${b} = ${fmtNum(wrong)}. Kira dice que es falso. ¿Qué error cometió Vera?`,
      options, answer,
      hint1: `Haz tú la suma: ¿cuánto da de verdad ${a} + ${b}?`,
      hint2: `El resultado correcto es ${fmtNum(real)}. Compara con ${fmtNum(wrong)}: ¿qué diferencia hay?`,
      explanation: `${a} + ${b} = ${fmtNum(real)}, no ${fmtNum(wrong)}. ${correctOpt === 'Olvidó sumar la llevada' ? 'Le faltan 10: se olvidó de la llevada de las unidades.' : 'El resultado está descuadrado: colocó mal las columnas al sumar.'}`
    };
  }
};

/* ═══════════════ POZO 3 · FRACCIONES ═══════════════ */
const FRACT = [
  { n: 1, d: 2, txt: 'un medio', uni: '½' },
  { n: 1, d: 3, txt: 'un tercio', uni: '⅓' },
  { n: 1, d: 4, txt: 'un cuarto', uni: '¼' },
  { n: 3, d: 4, txt: 'tres cuartos', uni: '¾' },
  { n: 2, d: 3, txt: 'dos tercios', uni: '⅔' }
];
function fractPicture(n, d) {
  return '🟩'.repeat(n) + '⬜'.repeat(d - n);
}
const fracciones = {
  recordar(tier) {
    const pool = tier <= 2 ? FRACT.slice(0, 3) : FRACT;
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
  comprender(tier) {
    const pool = tier <= 2 ? FRACT.slice(0, 3) : FRACT;
    const f = pick(pool);
    const situations = {
      '1/2': 'la mitad de un bocadillo',
      '1/3': 'una de las 3 raciones iguales de la cantimplora',
      '1/4': 'un trozo de una torta partida en 4 partes iguales',
      '3/4': 'tres trozos de una torta partida en 4 partes iguales',
      '2/3': 'dos de las 3 raciones iguales de la cantimplora'
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
  aplicar(tier) {
    const f = pick(tier <= 2 ? FRACT.slice(0, 3) : FRACT);
    const mult = tier <= 2 ? ri(2, 5) : ri(4, 12);
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
  analizar(tier) {
    const f = pick(tier <= 2 ? [FRACT[0], FRACT[2]] : FRACT.slice(0, 3));
    const mult = ri(2, 6);
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
      explanation: `${f.uni} de ${total} = ${real}, no ${veraSays}. Vera intentaba quedarse con un reparto falso: divide entre ${f.d} y multiplica por ${f.n}.`
    };
  }
};

/* ═══════════════ CATÁLOGO DE POZOS (Ruinas de Kaldros) ═══════════════ */
const BRANCHES = {
  numeracion: {
    id: 'numeracion',
    name: 'La Bóveda de los Números',
    icon: '🔢',
    desc: 'Una cámara llena de cerraduras numéricas. Domina los números grandes para abrirlas todas.',
    generators: numeracion
  },
  sumas_llevando: {
    id: 'sumas_llevando',
    name: 'El Reloj de Engranajes',
    icon: '⚙️',
    desc: 'Un reloj gigante que solo gira con sumas exactas. ¡Cuidado con las llevadas!',
    generators: sumas_llevando
  },
  fracciones: {
    id: 'fracciones',
    name: 'La Balanza del Mercader',
    icon: '⚖️',
    desc: 'Repartos, raciones y vasijas partidas. Aquí el tesoro se divide en partes iguales.',
    generators: fracciones
  }
};

const DIG_SITES = {
  kaldros: {
    id: 'kaldros',
    name: 'Ruinas de Kaldros',
    subject: 'Matemáticas',
    icon: '🏛️',
    desc: 'Templo de engranajes, relojes y bóvedas numéricas.',
    branches: ['numeracion', 'sumas_llevando', 'fracciones']
  }
};

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
