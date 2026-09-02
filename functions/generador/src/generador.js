/* GENERADO por tools/sync-generador.py — no editar a mano.
   El original es js/generador.js. Una prueba comprueba que esta copia no
   se quede vieja: si el validador de la tablet y el del servidor se
   separan, uno acepta lo que el otro rechaza y nadie se entera. */

import { CONCEPTOS, STRATA_META } from './catalogo.js';

/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — generador.js
   Lo que hace falta para que un modelo de lenguaje escriba retos
   para el banco SIN que un fallo suyo llegue a un niño.

   Todo lo de aquí es PURO: ni red, ni clave, ni navegador. Corre
   igual en la tablet y dentro de la función de Appwrite, y se
   prueba sin gastar un céntimo. La clave y la llamada al modelo
   viven en la función; aquí está lo que decide qué se acepta.

   El principio que ordena este fichero: un reto con la respuesta
   correcta mal marcada le dice «has fallado» a un niño que
   acertó. En una plataforma cuyo primer principio es que el error
   no penaliza, eso es peor que no tener generador.
   ═══════════════════════════════════════════════════════════ */

/* Áreas que se pueden generar, con los conceptos que admite cada una.
   El modelo NO inventa etiquetas: elige de aquí. Si no lo hiciera, el reto
   entraría en el banco pero desaparecería del diagnóstico «Le está
   costando», que es de lo que vive la parte pedagógica. */
function conceptosPorArea() {
  const out = {};
  for (const id in CONCEPTOS) {
    const a = CONCEPTOS[id].area;
    (out[a] = out[a] || []).push(id);
  }
  return out;
}

const AREAS_IA = {
  matematicas: { nombre: 'Matemáticas', areas: ['Numeración', 'Cálculo', 'Fracciones', 'Decimales'] },
  lengua:      { nombre: 'Lengua', areas: ['Vocabulario', 'Ortografía', 'Comprensión'] }
};

/* Los conceptos que puede usar una materia, en el orden del catálogo. */
function conceptosDe(materia) {
  const def = AREAS_IA[materia];
  if (!def) return [];
  const porArea = conceptosPorArea();
  return def.areas.reduce((acc, a) => acc.concat(porArea[a] || []), []);
}

/* ── Normalización ──
   Lo que devuelve el modelo es texto: se recorta y se convierte a su tipo
   antes de mirarlo, igual que se hace con el resumen que sube el cliente de
   un alumno. Nada de fiarse de que venga bien formado. */
const RETO_MAX_PREGUNTA = 300;
const RETO_MAX_OPCION = 80;
const RETO_MAX_TEXTO = 300;

function textoLimpio(v, tope) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, tope || RETO_MAX_TEXTO);
}

function normalizarReto(crudo) {
  if (!crudo || typeof crudo !== 'object') return null;
  const opciones = Array.isArray(crudo.options) ? crudo.options.map(o => textoLimpio(o, RETO_MAX_OPCION)) : [];
  const n = Number(crudo.answer);
  return {
    question: textoLimpio(crudo.question, RETO_MAX_PREGUNTA),
    options: opciones,
    answer: Number.isInteger(n) ? n : -1,
    hint1: textoLimpio(crudo.hint1),
    hint2: textoLimpio(crudo.hint2),
    explanation: textoLimpio(crudo.explanation),
    skill: textoLimpio(crudo.skill, 40),
    /* De dónde dice el modelo que sale. No es una garantía: es lo que el
       docente lee para decidir si se lo cree. */
    criterio: textoLimpio(crudo.criterio, RETO_MAX_TEXTO)
  };
}

/* ── Comparación de opciones ──
   «Cinco» y «cinco» son la misma respuesta puesta dos veces, y un niño que
   las vea no está eligiendo entre cuatro. */
function claveOpcion(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/* ── Comprobación aritmética ──
   Solo se mete donde puede estar segura: una operación suelta entre dos
   números y cuatro opciones numéricas. Ahí calcula y compara con la marcada.
   Si no reconoce la forma, dice «no aplica» y calla; una comprobación que
   adivina es peor que ninguna, porque descarta retos buenos. */
function comprobarAritmetica(reto) {
  const m = String(reto.question).match(
    /(\d+(?:[.,]\d+)?)\s*([+\-×x*÷:/])\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return { aplica: false };
  const num = t => Number(String(t).replace(',', '.'));
  const a = num(m[1]), b = num(m[3]);
  const op = m[2];
  let esperado;
  if (op === '+') esperado = a + b;
  else if (op === '-') esperado = a - b;
  else if (op === '×' || op === 'x' || op === '*') esperado = a * b;
  else if (b === 0) return { aplica: false };
  else esperado = a / b;

  const valores = reto.options.map(o => {
    const v = String(o).replace(/\s/g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
  });
  if (valores.some(v => v === null)) return { aplica: false };

  const marcado = valores[reto.answer];
  /* Coma flotante: 0,1 + 0,2 no da 0,3 exacto en ningún lenguaje. */
  const igual = Math.abs(marcado - esperado) < 1e-9;
  return { aplica: true, esperado, marcado, ok: igual };
}

/* ── El validador ──
   Devuelve la lista de motivos por los que este reto NO puede entrar. Vacía
   quiere decir que puede pasar a la cola de revisión del docente: nunca al
   banco directamente. */
function validarRetoIA(crudo, opciones) {
  const cfg = opciones || {};
  const r = normalizarReto(crudo);
  const motivos = [];
  if (!r) return { ok: false, motivos: ['No es un reto.'], reto: null };

  if (r.question.length < 8) motivos.push('La pregunta está vacía o es demasiado corta.');
  if (r.options.length !== 4) motivos.push(`Hacen falta 4 opciones y hay ${r.options.length}.`);
  if (r.options.some(o => !o)) motivos.push('Alguna opción está vacía.');

  const claves = r.options.map(claveOpcion);
  if (new Set(claves).size !== claves.length) motivos.push('Hay opciones repetidas.');

  if (r.answer < 0 || r.answer >= r.options.length) motivos.push('La respuesta correcta no señala a ninguna opción.');
  if (!r.hint1 || !r.hint2) motivos.push('Faltan las dos pistas.');
  else if (claveOpcion(r.hint1) === claveOpcion(r.hint2)) motivos.push('Las dos pistas dicen lo mismo.');
  if (!r.explanation) motivos.push('Falta la explicación.');

  /* El concepto tiene que ser uno del catálogo, y de la materia pedida: si no,
     el reto entra en el banco y desaparece del diagnóstico. */
  if (!CONCEPTOS[r.skill]) {
    motivos.push(`«${r.skill || 'sin concepto'}» no es un concepto del catálogo.`);
  } else if (cfg.materia && conceptosDe(cfg.materia).indexOf(r.skill) < 0) {
    motivos.push(`«${r.skill}» no es de ${AREAS_IA[cfg.materia].nombre}.`);
  }

  if (r.options.length === 4 && r.answer >= 0 && r.answer < 4) {
    const correcta = r.options[r.answer];
    const falsas = r.options.filter((_, i) => i !== r.answer);

    /* ── El regalo de la opción larga ──
       Un patrón conocido de los bancos de preguntas escritos deprisa: la
       correcta se escribe con matices y las falsas sueltas. El niño acierta
       midiendo, no pensando. */
    const mediaFalsas = falsas.reduce((a, o) => a + o.length, 0) / falsas.length;
    if (correcta.length > mediaFalsas * 1.6 && falsas.every(o => o.length < correcta.length)) {
      motivos.push('La correcta es mucho más larga que las demás: se acierta sin pensar.');
    }

    /* ── Opciones que no son del mismo tipo ──
       Mezclar «24» con «muchas» deja dos opciones descartables de un vistazo,
       y el reto pasa de cuatro opciones a dos. */
    const esNumero = o => /^-?\d+([.,]\d+)?\s*[^\d]{0,6}$/.test(String(o).trim());
    const numericas = r.options.filter(esNumero).length;
    if (numericas === 3) motivos.push('Tres opciones son números y una no: esa se descarta sola.');

    /* Marcas del propio modelo que se cuelan en el texto */
    if (r.options.some(o => /\((correcta|verdadera|opción buena)\)/i.test(o))) {
      motivos.push('Alguna opción lleva escrito que es la correcta.');
    }

    /* La pregunta no puede contener la respuesta tal cual */
    const enunciado = claveOpcion(r.question);
    const cor = claveOpcion(correcta);
    if (cor.length >= 4 && enunciado.includes(cor) && !falsas.some(o => enunciado.includes(claveOpcion(o)))) {
      motivos.push('La respuesta correcta aparece en el enunciado.');
    }
  }

  /* Y lo que más caro cuesta: la cuenta mal hecha. */
  const ar = comprobarAritmetica(r);
  if (ar.aplica && !ar.ok) {
    motivos.push(`La cuenta no sale: da ${ar.esperado} y está marcado ${ar.marcado}.`);
  }

  return { ok: motivos.length === 0, motivos, reto: r, aritmetica: ar };
}

/* Valida una tanda y separa lo que pasa de lo que se tira, con el motivo. */
function validarTanda(crudos, opciones) {
  const buenos = [], descartados = [];
  for (const c of (Array.isArray(crudos) ? crudos : [])) {
    const v = validarRetoIA(c, opciones);
    if (v.ok) buenos.push(v.reto);
    else descartados.push({ reto: v.reto, motivos: v.motivos });
  }
  return { buenos, descartados };
}

/* ── El encargo que se le hace al modelo ──
   Va aquí, y no dentro de la función, para poder leerlo y probarlo sin
   desplegar nada: el prompt es la mitad de la calidad del resultado. */
function promptGenerador(p) {
  const materia = AREAS_IA[p.materia] || AREAS_IA.matematicas;
  const conceptos = conceptosDe(p.materia)
    .map(id => `  ${id} — ${CONCEPTOS[id].area}: ${CONCEPTOS[id].label}`).join('\n');
  const estrato = (typeof STRATA_META !== 'undefined' && STRATA_META[p.estrato]) || { label: p.estrato, name: '' };
  const curso = Number(p.curso) || 4;
  const cuantos = Math.max(1, Math.min(20, Number(p.n) || 10));

  const sistema = [
    'Escribes retos para «Expedición Atlas», una plataforma de Primaria en español de España.',
    'Los lee un niño solo, en una tablet, sin nadie al lado que le aclare el enunciado.',
    '',
    'Reglas que no se negocian:',
    '1. EXACTAMENTE cuatro opciones —ni tres ni cinco— y `answer` es la posición de la',
    '   correcta contando desde 0, o sea 0, 1, 2 o 3. Las tres falsas tienen que ser PLAUSIBLES: cada una debe',
    '   corresponder a un error que un niño de ese curso comete de verdad (olvidar la',
    '   llevada, confundir el orden, aplicar la regla al revés). Una opción absurda',
    '   convierte el reto en tres opciones.',
    '2. Las cuatro del mismo tipo y parecidas de largo. Si la correcta es la más larga,',
    '   se acierta midiendo en vez de pensando.',
    '3. Sin negaciones dobles, sin «¿cuál de las siguientes NO...?», sin enunciados de',
    '   más de dos líneas.',
    '4. Dos pistas que ESCALAN: la primera orienta sin resolver, la segunda casi lo da.',
    '5. La explicación dice POR QUÉ, no repite la respuesta.',
    '6. Nada de contextos de violencia, marcas comerciales ni nombres de personas reales.',
    '',
    'El concepto (`skill`) se elige de esta lista y de ninguna otra:',
    conceptos,
    '',
    'En `criterio` copias literalmente el fragmento del currículo que trabaja el reto.',
    'Si el currículo que se te da no cubre lo que ibas a preguntar, no lo preguntes.'
  ].join('\n');

  const usuario = [
    `Materia: ${materia.nombre}. Curso: ${curso}.º de Primaria.`,
    `Nivel cognitivo: ${estrato.label}${estrato.name ? ' (' + estrato.name + ')' : ''}.`,
    p.concepto ? `Concepto pedido: ${p.concepto} — ${(CONCEPTOS[p.concepto] || {}).label || ''}.` : '',
    p.foco ? `Interesa especialmente porque la clase falla en: ${p.foco}.` : '',
    '',
    'Currículo (saberes básicos) del que no puedes salirte:',
    '"""',
    textoLimpio(p.curriculo, 20000),
    '"""',
    '',
    `Escribe ${cuantos} retos distintos entre sí.`
  ].filter(x => x !== '').join('\n');

  return { sistema, usuario, cuantos };
}

/* El esquema con el que se pide la salida: el modelo no puede devolver otra
   cosa, y así el validador recibe siempre la misma forma.

   OJO con lo que se pone aquí. El esquema de salida NO admite restricciones
   numéricas (`minimum`, `maximum`) ni de tamaño de array (`minItems`,
   `maxItems`): la petición entera se rechaza con un 400 antes de escribir
   nada. Tenía las dos cosas —cuatro opciones exactas y la respuesta entre 0
   y 3— y por eso no salía ni un reto.

   No se pierde nada quitándolas, porque de eso ya se encarga `validarRetoIA`,
   que además dice en castellano qué falló en vez de tirar la tanda entera.
   La forma se pide en el prompt; el validador es quien la exige. */
function esquemaRetos() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['retos'],
    properties: {
      retos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer', 'hint1', 'hint2', 'explanation', 'skill', 'criterio'],
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            answer: { type: 'integer' },
            hint1: { type: 'string' },
            hint2: { type: 'string' },
            explanation: { type: 'string' },
            skill: { type: 'string' },
            criterio: { type: 'string' }
          }
        }
      }
    }
  };
}

/* ── La segunda pasada ──
   Se le da el reto ya escrito y se le pide que lo resuelva SIN ver cuál está
   marcada. Es lo que caza el fallo que más caro cuesta —la respuesta correcta
   mal señalada— en lo que la comprobación aritmética no alcanza: ortografía,
   comprensión, todo lo que no es una cuenta. */
function promptVerificacion(retos) {
  const lista = retos.map((r, i) =>
    `${i + 1}. ${r.question}\n   A) ${r.options[0]}\n   B) ${r.options[1]}\n   C) ${r.options[2]}\n   D) ${r.options[3]}`
  ).join('\n\n');
  return {
    sistema: 'Resuelves retos de Primaria. Para cada uno das SOLO la letra correcta. ' +
             'Si el reto tiene más de una respuesta válida, o ninguna, lo dices con «X».',
    usuario: lista + '\n\nResponde con la letra de cada uno, en orden.'
  };
}

function esquemaVerificacion() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['respuestas'],
    properties: {
      respuestas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['n', 'letra'],
          properties: {
            n: { type: 'integer' },
            letra: { type: 'string', enum: ['A', 'B', 'C', 'D', 'X'] }
          }
        }
      }
    }
  };
}

/* Compara lo que resolvió la segunda pasada con lo que marcó la primera.
   Discrepancia = fuera. No se intenta adivinar cuál de las dos tiene razón:
   un reto sobre el que dos pasadas no se ponen de acuerdo no es un reto
   claro, y eso solo ya lo descalifica para un niño de nueve años. */
function cruzarVerificacion(retos, respuestas) {
  const letras = ['A', 'B', 'C', 'D'];
  const porN = {};
  for (const r of (Array.isArray(respuestas) ? respuestas : [])) porN[Number(r.n)] = String(r.letra || '');
  const buenos = [], descartados = [];
  retos.forEach((reto, i) => {
    const dicha = porN[i + 1];
    if (!dicha) { descartados.push({ reto, motivos: ['La comprobación no lo resolvió.'] }); return; }
    if (dicha === 'X') { descartados.push({ reto, motivos: ['Al comprobarlo, no tiene una única respuesta válida.'] }); return; }
    if (dicha !== letras[reto.answer]) {
      descartados.push({ reto, motivos: [`Al resolverlo por separado sale ${dicha} y estaba marcada ${letras[reto.answer]}.`] });
      return;
    }
    buenos.push(reto);
  });
  return { buenos, descartados };
}

/* La función de Appwrite usa ESTE MISMO fichero: `tools/sync-generador.py` lo
   copia a functions/generador/src/ y le añade los `export`. Una prueba
   comprueba que la copia no se quede vieja, que es la única forma de que la
   tablet y el servidor validen distinto sin que nadie se entere. */

export {
  AREAS_IA,
  conceptosDe,
  normalizarReto,
  validarRetoIA,
  validarTanda,
  comprobarAritmetica,
  promptGenerador,
  esquemaRetos,
  promptVerificacion,
  esquemaVerificacion,
  cruzarVerificacion
};
