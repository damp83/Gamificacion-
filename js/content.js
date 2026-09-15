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
  recordar:   { label: 'Recordar',   icon: '🧱', name: 'Fragmentos de cerámica', peBase: 10, img: 'img/estratos/recordar.webp' },
  comprender: { label: 'Comprender', icon: '🏺', name: 'Vasijas emparejadas',    peBase: 14, img: 'img/estratos/comprender.webp' },
  aplicar:    { label: 'Aplicar',    icon: '⚖️', name: 'La balanza del mercader', peBase: 18, img: 'img/estratos/aplicar.webp' },
  analizar:   { label: 'Analizar',   icon: '🔍', name: 'El plano falsificado',   peBase: 25, img: 'img/estratos/analizar.webp' }
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
/* ── El catálogo de conceptos ──
   `area` y `label` son para las pantallas del docente y para el informe.

   `casa` es para la familia, y es lo que convierte «está trabajando la resta
   llevando» —que dice qué pasa— en algo que se puede hacer esta tarde. Regla
   al escribirlas: cinco minutos, con lo que ya hay en una casa, sin fichas,
   sin pantallas y sin «que practique más». Una casa que no puede comprar nada
   ni imprimir nada tiene que poder hacerlo igual. */
/* ══════════════════════════════════════════════════════════
   OAOA — Otros Algoritmos para las Operaciones Aritméticas
   ══════════════════════════════════════════════════════════

   Las ayudas de matemáticas de esta app siguen OAOA, que es lo que se
   trabaja en el aula para la que está hecha. No es una preferencia de
   estilo: si el niño oye «descompón» en clase y lee «coloca en columnas y
   no olvides la llevada» en la tablet, la tablet le está enseñando a
   desconfiar de su maestro.

   Lo esencial, de la formación OAOA:

     · Se opera con CANTIDADES, no con cifras. 48+24 no es «8 y 4, me llevo
       una»: es (40+20) y (8+4), o sea 60+12, o sea 72.
     · Hay VARIOS caminos buenos y el alumno elige según los números. Ante
       5+4 valen «cuento desde el 5», «5+5 son 10, uno menos» y «4+4 y uno
       más». Las tres. Una ayuda que impone una sola ruta va contra esto.
     · Primero se ESTIMA y después se calcula.
     · En los problemas se entiende la historia; no se cazan palabras
       clave. «En total = sumar» falla, y falla justo cuando el problema se
       pone interesante.
     · A los algoritmos tradicionales la formación los llama ATOA, y su
       vocabulario —llevadas, columnas, bajar la cifra— aquí no se usa.

   Lo que esta app NO puede hacer, y conviene tenerlo escrito: la regla de
   oro de OAOA son las tres fases de Bruner —manipular, dibujar, escribir—
   y saltarse la primera está prohibido. Una tablet no da regletas en la
   mano: vive en la tercera fase. Lo que sí puede es no contradecir a las
   dos primeras y hablar su idioma. */

/* Vocabulario que no puede aparecer en una ayuda de matemáticas. Lo usa el
   validador de retos y lo vigila una prueba sobre TODOS los generadores de
   fábrica, que es lo que impide que vuelva a colarse dentro de un año. */
const OAOA_VETADO = [
  /* Solo el femenino, que es como se nombra el mecanismo: «la llevada», «las
     llevadas». En masculino es el verbo de toda la vida —«se han llevado una
     parte»— y vetarlo sería vetar el castellano. */
  { re: /\bllevadas?\b/i,
    en_vez: 'di si las unidades completan una decena' },
  /* «Bruno lleva 45 monedas» es lenguaje normal y tiene que pasar. Lo que se
     veta es la llevada como mecanismo: «me llevo una», «te llevas una». */
  { re: /\b(?:me|te|se|nos)\s+llev\w+\s+(?:una|uno|1)\b/i,
    en_vez: 'di qué cantidad se junta, no qué cifra se apunta arriba' },
  { re: /(?:en|por) columnas?\b|coloca(?:r|ndo)?[^.]{0,20}columna/i,
    en_vez: 'alinea por valor —unidades con unidades— o descompón' },
  { re: /baja(?:r|mos|s)? la cifra/i,
    en_vez: 'reparte el total en trozos manejables (cocientes parciales)' },
  { re: /son señales? de que|palabras? clave/i,
    en_vez: 'pregunta por la relación: ¿te dan las partes o el todo?' }
];

/* Qué pega tiene un texto de ayuda. Devuelve [] si está limpio. */
function pegasOAOA(texto) {
  const t = String(texto || '');
  return OAOA_VETADO.filter(v => v.re.test(t))
    .map(v => `«${(t.match(v.re) || [''])[0]}» es de ATOA: ${v.en_vez}`);
}

/* ── La progresión, curso a curso ──
   Sacada de la formación OAOA del centro. El curso es el PRIMERO en el que
   esa estrategia entra; de ahí en adelante sigue valiendo. */
const OAOA_ESTRATEGIAS = {
  numeracion: [
    { desde: 1, nombre: 'La casa de los números',
      dice: 'componer y descomponer sin parar: 15 es 10 y 5, y también 7 y 8' },
    { desde: 3, nombre: 'Descomposición canónica',
      dice: '15.456 es 10.000 + 5.000 + 400 + 50 + 6, no un 1, un 5 y un 4' }
  ],
  suma: [
    { desde: 1, nombre: 'Buscar el 10',
      dice: '98 + 8 es 98 + 2 + 6, o sea 100 + 6' },
    { desde: 1, nombre: 'Dobles y casi dobles',
      dice: '4 + 5 es 4 + 4 y uno más' },
    { desde: 3, nombre: 'El Árbol',
      dice: '454 + 678 son (400+600) y (50+70) y (4+8): 1.000 + 120 + 12' },
    { desde: 5, nombre: 'Alinear por valor',
      dice: 'con decimales, euros con euros y céntimos con céntimos' }
  ],
  resta: [
    { desde: 1, nombre: 'Contar hacia arriba',
      dice: 'de 13 a 20 hay 7, que es lo que te devuelven' },
    { desde: 3, nombre: 'Descomponer el sustraendo',
      dice: '602 − 388: quita 300, luego 80, luego 8' }
  ],
  multiplicacion: [
    { desde: 3, nombre: 'Modelo de área',
      dice: 'un rectángulo partido: 40×300, 40×50, 40×6…' },
    { desde: 3, nombre: 'Propiedad distributiva',
      dice: 'descomponer para vencer: 8×46 es 8×40 y 8×6' },
    { desde: 4, nombre: 'Doble y mitad',
      dice: '15 × 5 es la mitad de 15 × 10' }
  ],
  division: [
    { desde: 4, nombre: 'Cocientes parciales',
      dice: '439 entre 8: quito 400 (son 50 veces), me quedan 39, quito 32 (4 veces más): 54 y sobran 7' }
  ],
  fdp: [
    { desde: 4, nombre: 'Fracción, decimal y porcentaje son lo mismo',
      dice: '1/2 es 0,50 € es el 50 %' },
    { desde: 4, nombre: 'Porcentajes de cabeza',
      dice: '50 % es la mitad, 10 % es dividir entre 10, 5 % es la mitad del 10 %' }
  ],
  problemas: [
    { desde: 1, nombre: 'Partes y todo',
      dice: '¿te dan las dos partes y buscas el todo, o al revés? Eso decide la operación' },
    { desde: 2, nombre: 'Modelo de barras',
      dice: 'dibuja una barra para el todo y trozos para las partes' }
  ],
  estimacion: [
    { desde: 3, nombre: 'Estimar antes de calcular',
      dice: '481 × 19 anda por 500 × 20, o sea unos 10.000' }
  ]
};

/* Un número partido por valores: 613 → «600 + 10 + 3». Es la descomposición
   canónica de OAOA, y hace falta a mano porque escribir la de dos cifras y la
   de cuatro por separado es como se cuelan los errores. Los ceros no se
   escriben: «605» es «600 + 5», no «600 + 0 + 5». */
function porValores(n) {
  const s = String(Math.abs(Math.trunc(Number(n) || 0)));
  const trozos = [];
  for (let i = 0; i < s.length; i++) {
    const cifra = Number(s[i]);
    if (cifra) trozos.push(cifra * Math.pow(10, s.length - 1 - i));
  }
  return trozos.length ? trozos.join(' + ') : '0';
}

/* ── Los cuatro criterios de evaluación de OAOA ──
   La formación del centro evalúa «el razonamiento, no solo el resultado
   final», y lo concreta en cuatro preguntas. Aquí van redactadas en el
   registro de un criterio de evaluación —verbo en infinitivo, objeto,
   contexto y finalidad—, para que entren en una programación sin tener que
   reescribirlas.

   AVISO, y va en el código porque es lo que impide un disgusto: NO son
   criterios del Real Decreto 157/2022 ni de la Región de Murcia. Son los
   criterios de OAOA vestidos de oficial. Por eso el código empieza por
   «OAOA» y no por un número de competencia: quien los vea en una
   programación tiene que poder distinguirlos de los del BOE de un vistazo, y
   el docente decide a qué competencia específica los cuelga.

   `conceptos` vacío no es un olvido: significa que esta app NO mide ese
   criterio, y el panel ya sabe decirlo. Dos de los cuatro son así, y tiene
   sentido que lo sean: explicar en voz alta por qué funciona una estrategia
   no cabe en un test de cuatro opciones. */
const CRITERIOS_OAOA = [
  { codigo: 'OAOA.1',
    texto: 'Explicar oralmente el procedimiento de cálculo elegido, justificando por qué '
      + 'funciona a partir del valor de las cantidades implicadas, para consolidar el '
      + 'razonamiento propio y reconocer como válidas otras estrategias distintas de la suya.',
    saberes: ['Sentido numérico: estrategias de cálculo mental y algoritmos flexibles',
              'Sentido socioafectivo: comunicación del razonamiento matemático'],
    conceptos: [],
    nota: 'No sale de los retos, que solo ven el resultado: se anota de un toque en «Dirigir '
      + 'la clase», cuando el niño explica su camino en voz alta, y sale en el informe como '
      + '«Cómo resuelve».' },

  { codigo: 'OAOA.2',
    texto: 'Realizar estimaciones razonadas del resultado de una operación antes de calcularlo, '
      + 'eligiendo el redondeo adecuado a la magnitud de los datos, para valorar si el resultado '
      + 'obtenido después es plausible en el contexto del problema.',
    saberes: ['Sentido numérico: estimación razonada de cantidades',
              'Sentido numérico: redondeo y aproximación'],
    conceptos: ['estimacion', 'redondeo'],
    nota: '' },

  { codigo: 'OAOA.3',
    texto: 'Relacionar y transformar entre sí fracciones, números decimales y porcentajes '
      + 'sencillos en contextos de compra, medida y reparto, para reconocer que expresan una '
      + 'misma cantidad de tres formas distintas.',
    saberes: ['Sentido numérico: fracciones, decimales y porcentajes como cantidades equivalentes',
              'Sentido de la medida: contextos de compra y reparto'],
    conceptos: ['decimal_fraccion', 'porcentaje', 'fraccion_de_cantidad', 'comparar_decimales'],
    nota: '' },

  { codigo: 'OAOA.4',
    texto: 'Utilizar la calculadora para comprobar un resultado previamente estimado, y no '
      + 'para sustituir el cálculo, para centrar el esfuerzo en la interpretación del problema '
      + 'y no en la destreza operatoria.',
    saberes: ['Sentido numérico: uso razonado de herramientas de cálculo',
              'Sentido socioafectivo: autonomía y toma de decisiones'],
    conceptos: [],
    nota: 'Se evalúa observando cómo trabaja. La app no lo mide.' }
];

/* Las estrategias que se le pueden ofrecer al docente cuando un niño acaba de
   resolver algo de ESTE concepto: las de su operación que ese curso ya ha
   trabajado con las manos. Vacío para Lengua, y vacío para un concepto que no
   declare operación: mejor no ofrecer nada que ofrecer lo que no toca. */
function estrategiasParaConcepto(skill, curso) {
  const op = (CONCEPTOS[skill] || {}).oaoa;
  return op ? estrategiasOAOA(op, curso) : [];
}

/* Las estrategias que un curso ya tiene a mano. */
function estrategiasOAOA(operacion, curso) {
  const lista = OAOA_ESTRATEGIAS[operacion] || [];
  const g = Number(curso) || 4;
  return lista.filter(e => e.desde <= g);
}

const CONCEPTOS = {
  /* ── Numeración ── */
  serie_numerica:      { area: 'Numeración', label: 'Anterior y posterior', oaoa: 'numeracion',
                         casa: 'Al subir portales o escaleras: «vivimos en el 7, ¿quién vive justo antes?».' },
  valor_posicional:    { area: 'Numeración', label: 'Valor posicional', oaoa: 'numeracion',
                         casa: 'Con el número de un recibo o una matrícula: «¿cuántas decenas hay en 340?».' },
  comparar_numeros:    { area: 'Numeración', label: 'Comparar números', oaoa: 'numeracion',
                         casa: 'Dos precios en la mano en el súper: «¿cuál es mayor?», sin hacer la resta.' },
  redondeo:            { area: 'Numeración', label: 'Redondeo', oaoa: 'estimacion',
                         casa: 'Antes de pagar, «¿cuánto es más o menos?». Redondear a euros y comprobar con el ticket.' },
  ordenar_numeros:     { area: 'Numeración', label: 'Ordenar de menor a mayor', oaoa: 'numeracion',
                         casa: 'Ordenar los dorsales de un partido, las páginas de un cómic o las tallas de la ropa tendida.' },
  contar_agrupando:    { area: 'Numeración', label: 'Contar agrupando de diez', oaoa: 'numeracion',
                         casa: 'Contar cromos, garbanzos o calcetines haciendo montones de diez antes de sumar.' },
  series:              { area: 'Numeración', label: 'Continuar una serie', oaoa: 'numeracion',
                         casa: 'Poner la mesa contando de dos en dos; subir los escalones de tres en tres.' },
  par_impar:           { area: 'Numeración', label: 'Pares e impares', oaoa: 'numeracion',
                         casa: 'Repartir algo entre dos: si sobra uno, es impar. Con la fruta o con las cartas.' },

  /* ── Cálculo ── */
  suma_basica:         { area: 'Cálculo', label: 'Sumar sin completar decenas', oaoa: 'suma',
                         casa: 'Sumar en voz alta lo que se va echando al carro, sin decimales.' },
  /* El id se queda: lo llevan guardado los diarios de las clases que ya
     existen y cambiarlo borraría el historial de esos niños. Lo que cambia
     es lo que se lee: la etiqueta y, sobre todo, el consejo para casa, que
     mandaba a las familias a decir «me llevo una». */
  suma_llevada:        { area: 'Cálculo', label: 'Suma completando decenas', oaoa: 'suma',
                         casa: 'Sumar dos precios en voz alta buscando el 10: «48 y 24… 40 y 20 son 60, 8 y 4 son 12: 72».' },
  resta_llevada:       { area: 'Cálculo', label: 'Resta descomponiendo', oaoa: 'resta',
                         casa: 'El cambio de la compra: «he pagado 20 y ha costado 13, ¿cuánto me devuelven?».' },
  detectar_llevada:    { area: 'Cálculo', label: 'Ver si se completa una decena', oaoa: 'suma',
                         casa: 'Antes de hacer la cuenta, preguntar solo «¿las unidades llegan a diez?». Nada más.' },
  /* Estimar es competencia propia en OAOA, no un adorno previo al cálculo:
     «¿sabe estimar antes de operar?» es uno de los criterios de evaluación de
     la formación. En la vida real hace falta la magnitud, no el decimal. */
  estimacion:          { area: 'Cálculo', label: 'Estimar antes de calcular', oaoa: 'estimacion',
                         casa: 'Antes de pagar en la caja: «¿nos vamos a pasar de 20 euros?». Sin calcularlo exacto.' },
  error_suma:          { area: 'Cálculo', label: 'Encontrar el error en una suma', oaoa: 'suma',
                         casa: 'Hacer una suma mal a propósito y pedirle que encuentre el fallo.' },
  problema_suma:       { area: 'Cálculo', label: 'Problema de sumar (enunciado)', oaoa: 'problemas',
                         casa: 'Al revés: dar el resultado y que sea él quien invente el problema.' },

  /* ── Fracciones ── */
  fraccion_leer:       { area: 'Fracciones', label: 'Leer una fracción', oaoa: 'fdp',
                         casa: 'Al partir la pizza o la tortilla: «esto es un cuarto, dilo tú».' },
  fraccion_terminos:   { area: 'Fracciones', label: 'Numerador y denominador', oaoa: 'fdp',
                         casa: 'Con la tableta de chocolate: cuántos trozos hay en total y cuántos te llevas.' },
  comparar_fracciones: { area: 'Fracciones', label: 'Comparar fracciones', oaoa: 'fdp',
                         casa: 'Dos vasos con distinta cantidad: «¿medio o un tercio?». Que lo vea antes de decirlo.' },
  fraccion_significado:{ area: 'Fracciones', label: 'Qué representa una fracción', oaoa: 'fdp',
                         casa: 'Repartir de verdad seis galletas entre cuatro, y que explique cómo lo ha hecho.' },
  fraccion_de_cantidad:{ area: 'Fracciones', label: 'Fracción de una cantidad', oaoa: 'fdp',
                         casa: '«Bébete la mitad del zumo» o «un tercio», y que lo sirva él.' },
  error_fraccion:      { area: 'Fracciones', label: 'Encontrar el error en un reparto', oaoa: 'fdp',
                         casa: 'Repartir mal a propósito, con trozos desiguales, y que diga por qué no vale.' },

  /* ── Decimales y porcentajes ── */
  decimal_posicion:    { area: 'Decimales', label: 'Décimas y centésimas', oaoa: 'fdp',
                         casa: 'Los precios del súper: «1,25 es un euro y…». Con monedas se toca mejor que se explica.' },
  decimal_fraccion:    { area: 'Decimales', label: 'Decimal y fracción equivalentes', oaoa: 'fdp',
                         casa: 'Medio euro es 0,50. Con monedas de 50 y de 20 céntimos se ve solo.' },
  porcentaje:          { area: 'Decimales', label: 'Porcentaje de una cantidad', oaoa: 'fdp',
                         casa: 'Los carteles de rebajas: «un 20 % de 30 euros, ¿cuánto se quita?».' },
  comparar_decimales:  { area: 'Decimales', label: 'Comparar decimales', oaoa: 'fdp',
                         casa: 'Dos precios parecidos, 1,9 y 1,15: cuál es más caro y por qué engaña.' },

  /* ── Vocabulario ── */
  sinonimos:           { area: 'Vocabulario', label: 'Sinónimos',
                         casa: 'Repetir una frase cambiando una palabra por otra que valga igual.' },
  antonimos:           { area: 'Vocabulario', label: 'Antónimos',
                         casa: 'El juego del revés: uno dice una palabra y el otro contesta la contraria.' },
  categorias:          { area: 'Vocabulario', label: 'Sustantivo, adjetivo y verbo',
                         casa: 'Con cualquier frase de la tele: señalar quién hace, qué hace y cómo es.' },
  familias_palabras:   { area: 'Vocabulario', label: 'Familias de palabras',
                         casa: 'De «pan» salen panadero, panadería y panecillo. Ver cuántas caben en una.' },

  /* ── Ortografía ──
     Por regla y no por estrato: «falla ortografía» no se puede enseñar,
     «falla B/V» sí. El tipo lo declara cada palabra del banco. */
  orto_bv:             { area: 'Ortografía', label: 'B y V',
                         casa: 'Una lista corta en la nevera con las que se le atragantan, para verla al pasar.' },
  orto_h:              { area: 'Ortografía', label: 'La H',
                         casa: 'La H no suena, así que leerla no basta: escribir la palabra y quedarse con su imagen.' },
  orto_lly:            { area: 'Ortografía', label: 'LL e Y',
                         casa: 'Que escriba él la lista de la compra: ahí salen «bollo», «pollo» y «papaya».' },
  orto_gj:             { area: 'Ortografía', label: 'G y J',
                         casa: 'Al escribir un mensaje a la familia, dejarle dudar y buscar la palabra antes de enviarlo.' },
  orto_tilde:          { area: 'Ortografía', label: 'Tildes',
                         casa: 'Leer en voz alta dando una palmada en la sílaba fuerte: la tilde va donde suena.' },
  orto_zsc:            { area: 'Ortografía', label: 'Z, S y C',
                         casa: 'Decir la palabra despacio antes de escribirla; se pronuncian casi igual y hay que verla.' },
  orto_x:              { area: 'Ortografía', label: 'La X',
                         casa: 'Las palabras con X salen poco: apuntar las que aparezcan al leer, en una lista.' },
  orto_homofonos:      { area: 'Ortografía', label: 'Palabras homófonas',
                         casa: '«Hola» y «ola», «vaca» y «baca»: pedirle una frase con cada una.' },
  orto_mn:             { area: 'Ortografía', label: 'M antes de B y P',
                         casa: 'Antes de B y de P, siempre M. Se aprende diciéndolo: «bomba», «campo», «tiempo».' },
  orto_junto:          { area: 'Ortografía', label: 'Junto o separado',
                         casa: '«Por qué» y «porque»: preguntarle cuál va en la pregunta y cuál en la respuesta.' },
  orto_otras:          { area: 'Ortografía', label: 'Otras reglas',
                         casa: 'Diez minutos de lectura al día hacen más por la ortografía que cualquier ejercicio.' },

  /* ── Comprensión lectora ── */
  lectura_literal:     { area: 'Comprensión', label: 'Localizar un dato en el texto',
                         casa: 'Tras leer algo juntos, preguntarle un dato y que lo busque en el texto, no de memoria.' },
  lectura_inferencia:  { area: 'Comprensión', label: 'Inferir lo que no está escrito',
                         casa: 'Preguntar «¿cómo crees que se sentía?» sobre algo que el texto no llega a decir.' },
  lectura_idea:        { area: 'Comprensión', label: 'Idea principal',
                         casa: 'Contar en una sola frase de qué iba el capítulo. Una sola.' },
  lectura_critica:     { area: 'Comprensión', label: 'Valorar lo que dice el texto',
                         casa: 'Preguntarle «¿estás de acuerdo con lo que hizo?» y pedirle el porqué.' }
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
/* Un nombre que NO sea alguno de los que ya están en el enunciado. Sin esto
   salía «Bruno guarda 581 brújulas y Bruno desentierra 311 más», que a un
   niño de ocho años le cuesta más que la propia suma. */
const otroNombre = (...fuera) => pick(NAMES.filter(n => !fuera.includes(n)));
/* Los tesoros llevan su género, porque «¿Cuántas mapas antiguos?» y
   «¿Cuántas fósiles brillantes?» son las dos preguntas que salían antes: la
   lista mezcla masculinos y femeninos y el enunciado decía «Cuántas» siempre.
   Un niño de ocho años que todavía descifra no necesita además tropezar con
   una concordancia mal hecha. */
const TREASURES = [
  { n: 'monedas de plata',   f: true  },
  { n: 'gemas verdes',       f: true  },
  { n: 'mapas antiguos',     f: false },
  { n: 'vasijas pintadas',   f: true  },
  { n: 'brújulas de latón',  f: true  },
  { n: 'fósiles brillantes', f: false }
];
/* «Cuántas» o «Cuántos», según el tesoro que haya tocado. */
const cuantos = t => (t.f ? 'Cuántas' : 'Cuántos');

/* ── La rampa de dificultad, y por qué no llegaba arriba ──

   La fórmula era `0,4 + 0,15 × nivel`, que vale 1,00 en el nivel 4: a partir
   de ahí el resultado ya era el techo del curso y el 5 daba EXACTAMENTE lo
   mismo que el 4. El motor adaptativo podía subir a un alumno al nivel 5 y no
   pasaba nada, que es precisamente el caso de quien necesita ampliación.

   Con `0,32 + 0,136 × nivel` los cinco niveles son distintos y el 5 cae
   EXACTAMENTE en el techo del curso, que sigue siendo infranqueable: un
   alumno de 4.º no ve números de 5.º por mucho que vaya sobrado. El curso lo
   decide el currículo, no una racha de aciertos.

       nivel 1 → 45,6 %   nivel 2 → 59,2 %   nivel 3 → 72,8 %
       nivel 4 → 86,4 %   nivel 5 → 100 % del techo del curso */
function rampaTier(techo, tier, suelo) {
  const n = Math.min(5, Math.max(1, Number(tier) || 1));
  return Math.max(suelo, Math.min(techo, Math.round(techo * (0.32 + 0.136 * n))));
}

/* ═══════════════ POZO 1 · NUMERACIÓN ═══════════════
   El techo numérico lo marca el curso; el tier solo afina dentro de él. */
function numTop(grade, tier) {
  const techo = { 1: 100, 2: 1000, 3: 10000, 4: 10000, 5: 100000, 6: 1000000 }[grade] || 10000;
  return rampaTier(techo, tier, 20);
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
    const cifra = Number(digits[p.i]);

    /* ── Niveles 4 y 5: cuánto VALE, no qué cifra es ──
       Señalar la cifra de las centenas se resuelve contando posiciones con el
       dedo, sin entender nada. Preguntar cuánto vale obliga a leer la cantidad
       —«el 5 aquí vale quinientos»—, que es exactamente lo que pide OAOA:
       operar con cantidades y no con cifras.

       Y la trampa es la buena: entre las opciones está la cifra suelta (5),
       que es el error de quien lee posiciones en vez de cantidades. */
    /* Las unidades quedan fuera a propósito: «¿cuánto vale el 7 en las
       unidades?» es 7, o sea la misma cifra, y entonces la trampa —la cifra
       suelta— sería la respuesta correcta. Ahí no hay nada que aprender. */
    const altos = places.filter(x => x.i >= 1 && Number(digits[x.i]) > 0);
    if (tier >= 4 && altos.length) {
      const q = pick(altos);
      const cif = Number(digits[q.i]);
      const valor = cif * Math.pow(10, q.i);
      const otros = places.filter(x => x.i !== q.i)
        .map(x => Number(digits[x.i]) * Math.pow(10, x.i)).filter(v => v > 0);
      const { options, answer } = buildOptions(
        valor, [cif, valor * 10, valor / 10].concat(otros).filter(v => v > 0 && Number.isInteger(v)),
        fmtNum);
      return {
        skill: 'valor_posicional',
        question: `En la bóveda hay grabado el número ${fmtNum(n)}. ¿Cuánto VALE la cifra ${cif} que está en el lugar de las ${q.label}?`,
        options, answer,
        hint1: 'No es la cifra que ves: es la cantidad que representa en ese lugar.',
        hint2: `${fmtNum(n)} es ${porValores(n)}. Busca el trozo que empieza por ${cif}.`,
        explanation: `En ${fmtNum(n)}, ese ${cif} está en las ${q.label}, así que vale ${fmtNum(valor)}.`
      };
    }

    const correct = cifra;
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
      question: `La expedición ya tenía ${fmtNum(a)} ${t.n} y en la nueva cámara encuentra ${fmtNum(b)} más. ¿${cuantos(t)} ${t.n} hay ahora en total?`,
      options, answer,
      /* Cazar palabras clave («en total» = sumar) es lo que OAOA descarta
         expresamente: funciona hasta que el problema se pone interesante.
         Se pregunta por la RELACIÓN entre los datos, que es lo que de
         verdad decide la operación. */
      hint1: 'Tienes las dos partes y te piden el todo. ¿Qué operación junta partes?',
      hint2: `Parte los dos por valores y junta cada uno con el suyo: ${porValores(a)} y ${porValores(b)}.`,
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
  return rampaTier(techo, tier, 10);
}

const sumas_llevando = {
  recordar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const a = ri(bandOf(g) === 1 ? 1 : 10, max), b = ri(bandOf(g) === 1 ? 1 : 10, max);
    const correct = a + b;

    /* ── Niveles 4 y 5: el sumando que falta ──
       Sumar dos números con números más grandes es la misma tarea con más
       cifras, y para quien ya suma bien no añade nada. Preguntar cuál es el
       sumando que falta —«? + 47 = 120»— sí: obliga a pensar en partes y todo
       en vez de ejecutar una suma, que es el modelo de barras del que OAOA
       saca la resolución de problemas.

       Se pide la parte que falta, no el todo, y la trampa es el propio todo:
       quien lee «suma» y opera sin mirar, suma los dos que ve. */
    if (tier >= 4 && !terse(g)) {
      const { options, answer } = buildOptions(
        a, nearMisses(a).concat([correct, correct + b]), fmtNum);
      return {
        skill: 'suma_llevada',
        question: `El reloj de engranajes marca ${fmtNum(correct)} y una de sus dos ruedas se ha borrado. `
                + `La que queda marca ${fmtNum(b)}. ¿Qué número tenía la otra?`,
        options, answer,
        hint1: `El todo es ${fmtNum(correct)} y una parte es ${fmtNum(b)}. Busca la otra parte.`,
        hint2: `Cuenta hacia arriba desde ${fmtNum(b)} hasta ${fmtNum(correct)}: lo que subas es lo que falta.`,
        explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(correct)}, así que la rueda borrada marcaba ${fmtNum(a)}.`
      };
    }

    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    return {
      skill: 'suma_llevada',
      question: terse(g) ? `${a} + ${b} = ?`
        : `El reloj de engranajes pide el resultado de ${fmtNum(a)} + ${fmtNum(b)} para girar. ¿Cuánto es?`,
      options, answer,
      /* La pista 1 NOMBRA la estrategia y deja elegir: en OAOA valen varios
         caminos y el niño escoge según los números. La 2 aplica uno. */
      hint1: 'Parte los números por valores, o busca primero el 10 más cercano. Las dos valen.',
      hint2: `Por valores: ${a} es ${porValores(a)} y ${b} es ${porValores(b)}. Junta cada valor con el suyo.`,
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
        /* En partes y todo, no en palabras del enunciado: tenías el todo y te
           han quitado una parte. Es el modelo de barras de Singapur, que es
           de donde OAOA saca la resolución de problemas. */
        hint1: `El todo eran ${a} y una parte (${b}) ya no está. ¿Cuánto mide la otra parte?`,
        hint2: `Puedes contar hacia arriba desde ${b} hasta ${a}: lo que subas es lo que queda.`,
        explanation: `${a} − ${b} = ${correct}.`
      };
    }
    /* ── Estimar antes de calcular (3.º en adelante) ──
       En OAOA no es un calentamiento: es competencia propia y criterio de
       evaluación. «En la vida real necesitamos magnitud, no precisión decimal
       inmediata.» Por eso la pregunta NO se puede resolver calculando: los
       números son grandes a propósito y lo que se mide es si sabe redondear
       cada uno y operar con los redondos de cabeza.

       Comparte estrato con la pregunta de la decena porque las dos son el
       mismo gesto: mirar los números ANTES de ponerse a operar. */
    if (bandOf(g) >= 2 && pick([true, false])) {
      const redondo = n => Math.round(n / 100) * 100;
      /* Los dos números tienen que estar LEJOS de su centena, y la estimación
         lejos del exacto. Si no, sale «la mejor estimación de 405 + 394» con
         800 de respuesta y 799 entre las opciones: ahí el que calcula acierta
         más que el que estima, y el reto enseña lo contrario de lo que quiere.
         Treinta es el margen: por debajo, las dos respuestas se confunden. */
      let a, b, aprox, exacto, vueltas = 0;
      do {
        a = ri(1, 4) * 100 + ri(18, 82);
        b = ri(1, 4) * 100 + ri(18, 82);
        aprox = redondo(a) + redondo(b);
        exacto = a + b;
      } while (Math.abs(exacto - aprox) < 30 && ++vueltas < 20);
      /* Las falsas son estimaciones que un niño hace de verdad: redondear
         solo uno de los dos, irse un orden de magnitud, o dar el exacto
         —que aquí es el error, porque no se pedía calcular—. */
      const { options, answer } = buildOptions(fmtNum(aprox), [
        fmtNum(redondo(a) + b - (b % 10)),
        fmtNum(aprox + 1000),
        fmtNum(exacto)
      ]);
      return {
        skill: 'estimacion',
        question: `Kira no necesita la cuenta exacta: solo quiere saber si caben ${fmtNum(a)} y ${fmtNum(b)} gemas en el arcón. ¿Cuál es la mejor estimación de ${fmtNum(a)} + ${fmtNum(b)}?`,
        options, answer,
        hint1: 'No lo calcules. Redondea cada número a la centena más cercana y súmalos de cabeza.',
        hint2: `${fmtNum(a)} anda por ${fmtNum(redondo(a))} y ${fmtNum(b)} por ${fmtNum(redondo(b))}.`,
        explanation: `${fmtNum(redondo(a))} + ${fmtNum(redondo(b))} = ${fmtNum(aprox)}. Estimar es saber por dónde anda la respuesta; el resultado exacto (${fmtNum(exacto)}) se calcula después, si hace falta.`
      };
    }

    /* ── Aquí había un reto con más de una respuesta buena ──
       Se construían UNA suma que completaba decena y OTRA que no, y las dos
       opciones que faltaban se rellenaban con sumas al azar SIN comprobarlas
       contra lo que se estaba preguntando. Medido: el 75 % de estas preguntas
       tenía dos, tres o cuatro opciones válidas, y solo una marcada. Un niño
       que razonaba bien y elegía otra recibía «has fallado».

       Ahora las tres falsas se CONSTRUYEN incumpliendo la condición, con el
       mismo generador que la buena. Y el rango de decenas sube por la rampa,
       que era otro `tier <= 2`. */
    const tope = 2 + (Math.max(1, Math.min(5, tier || 2)));
    const mk = (carry) => {
      const u1 = carry ? ri(5, 9) : ri(0, 4);
      const u2 = carry ? ri(10 - u1, 9) : ri(0, Math.max(0, 4 - u1));
      const d1 = ri(1, tope), d2 = ri(1, tope);
      return `${d1 * 10 + u1} + ${d2 * 10 + u2}`;
    };
    const target = pick([true, false]);
    const correctPair = mk(target);
    const falsas = [];
    for (let i = 0; i < 24 && falsas.length < 5; i++) {
      const s = mk(!target);
      if (s !== correctPair && !falsas.includes(s)) falsas.push(s);
    }
    const { options, answer } = buildOptions(correctPair, falsas);
    return {
      skill: 'detectar_llevada',
      question: `Para engrasar el engranaje correcto, Kira busca una suma en la que las unidades ${target ? 'SÍ completan una decena' : 'NO llegan a completar una decena'}. ¿Cuál elige?`,
      options, answer,
      hint1: 'Mira solo las unidades: ¿juntas llegan a completar una decena?',
      hint2: 'Suma las unidades de cada pareja. Si llegan a 10, se forma una decena nueva.',
      explanation: `En ${correctPair.txt} las unidades suman ${target ? '10 o más, así que forman una decena entera' : 'menos de 10, así que no llegan a formar una decena'}.`
    };
  },

  aplicar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const t = pick(TREASURES);

    /* ── Nivel 5: dos pasos y de signos distintos ──
       Juntar tres cantidades es el mismo gesto tres veces. Juntar y luego
       quitar obliga a decidir QUÉ operación pide cada trozo del enunciado, que
       es donde se atasca de verdad quien ya calcula bien.

       Las falsas son las dos maneras reales de equivocarse: sumarlo todo sin
       leer, y quitar antes de juntar. Ninguna sale de mover una cifra. */
    if (bandOf(g) >= 2 && tier >= 5) {
      const a = ri(Math.floor(max / 2), max);
      const b = ri(Math.floor(max / 4), Math.floor(max / 2));
      const perdidas = ri(10, Math.max(11, Math.floor((a + b) / 4)));
      const correct = a + b - perdidas;
      const who = otroNombre('Bruno');
      const { options, answer } = buildOptions(
        correct, [a + b + perdidas, a + b, a - perdidas + b - perdidas].concat(nearMisses(correct)),
        fmtNum);
      return {
        skill: 'problema_suma',
        question: `Bruno guarda ${fmtNum(a)} ${t.n} y ${who} desentierra ${fmtNum(b)} más. `
                + `De vuelta al campamento se les caen ${fmtNum(perdidas)} por el camino. `
                + `¿${cuantos(t)} ${t.n} llegan?`,
        options, answer,
        hint1: 'Son dos cosas distintas: primero juntan y después pierden. No lo hagas todo de una vez.',
        hint2: `Junta ${fmtNum(a)} y ${fmtNum(b)}; a ese todo quítale la parte que se cae.`,
        explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(a + b)}, y ${fmtNum(a + b)} − ${fmtNum(perdidas)} = ${fmtNum(correct)}.`
      };
    }

    const a = ri(Math.floor(max / 2), max);
    const b = ri(Math.floor(max / 2), max);
    const c = (bandOf(g) >= 2 && tier >= 4) ? ri(10, 99) : 0;
    const correct = a + b + c;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    const who = otroNombre('Bruno', 'Tobías');
    return {
      skill: 'problema_suma',
      question: terse(g)
        ? `Bruno lleva ${a} monedas y Tobías ${b}.\n¿Cuántas hay entre los dos?`
        : `Bruno guarda ${fmtNum(a)} ${t.n} en la mochila y Tobías desentierra ${fmtNum(b)}${c ? ` y ${who} aporta ${c} más` : ''}. ¿${cuantos(t)} ${t.n} llevan al campamento?`,
      options, answer,
      hint1: 'Junta todas las cantidades. Puedes ir por partes: primero dos y al resultado la otra.',
      hint2: `Por valores: las centenas con las centenas y las decenas con las decenas, y luego se juntan los trozos.`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)}${c ? ' + ' + c : ''} = ${fmtNum(correct)}.`
    };
  },

  analizar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const max = sumTop(g, tier);
    const a = ri(Math.floor(max / 3), max), b = ri(Math.floor(max / 3), max);
    const real = a + b;
    /* Los errores que se le ofrecen al niño SON una taxonomía, y por tanto
       enseñan. Estos eran «olvidó la llevada» y «colocó mal las columnas»:
       errores que solo existen si se calcula en columna. Quien aprende
       descomponiendo se equivoca de otra manera —pierde un trozo al
       recomponer, o parte mal un número—, y las dos cuentas siguen saliendo:
       dejarse una decena da 10 menos, y partir 47 como 40+16 en vez de 40+7
       da 9 de más. */
    const errType = pick(['trozo_perdido', 'mal_partido']);
    const wrong = errType === 'trozo_perdido' ? real - 10 : real + 9;
    const FALLOS = {
      trozo_perdido: 'Se dejó una decena al juntar los trozos',
      mal_partido:   'Partió mal uno de los números'
    };
    const correctOpt = FALLOS[errType];
    const { options, answer } = buildOptions(correctOpt, [
      FALLOS[errType === 'trozo_perdido' ? 'mal_partido' : 'trozo_perdido'],
      'La suma está bien hecha',
      'Restó en vez de sumar'
    ]);
    return {
      skill: 'error_suma',
      question: `En el plano robado, Vera Kovak escribió: ${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(wrong)}. Kira dice que es falso. ¿Qué error cometió Vera?`,
      options, answer,
      hint1: `Haz tú la suma por partes: ¿cuánto da de verdad ${fmtNum(a)} + ${fmtNum(b)}?`,
      hint2: `El resultado correcto es ${fmtNum(real)}. Compara con ${fmtNum(wrong)}: ¿sobra o falta?`,
      explanation: `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(real)}, no ${fmtNum(wrong)}. ` +
        (errType === 'trozo_perdido'
          ? 'Faltan justo 10: al juntar los trozos se dejó una decena por el camino.'
          : 'Sobran 9: al partir uno de los números se pasó, y ese trozo de más se arrastra hasta el final.')
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
/* ── Hasta dónde llega la lista en este nivel ──
   Con la lista ordenada de fácil a difícil, el nivel decide cuánto se abre:
   en el 1 solo lo de delante, en el 5 entera. Es una rampa de cinco pasos de
   verdad y no un interruptor, y por eso la usan también las fracciones desde
   que se les quitó el `tier <= 2` que las partía en dos. */
function hastaTier(lista, tier) {
  if (lista.length < 4) return lista;
  const t = Math.max(1, Math.min(5, tier || 2));
  const corte = Math.ceil(lista.length * (0.35 + 0.13 * t));
  return lista.slice(0, Math.max(3, corte));
}
function porTier(lista, tier) { return pick(hastaTier(lista, tier)); }

function fractPool(grade) {
  return bandOf(grade || DEFAULT_GRADE) === 3 ? FRACT : FRACT.slice(0, 5);
}
function fractPicture(n, d) { return '🟩'.repeat(n) + '⬜'.repeat(d - n); }

const fracciones = {
  recordar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    const pool = hastaTier(fractPool(g), tier);
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
    const f = porTier(fractPool(g), tier);
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
    const f = porTier(fractPool(g), tier);
    /* El multiplicador también sube por la rampa: en el nivel 1 la cantidad
       cabe en los dedos, en el 5 hay que repartir de verdad. */
    const tope = bandOf(g) === 3 ? 6 + tier * 4 : 3 + tier * 2;
    const mult = ri(Math.max(2, Math.floor(tope / 2)), tope);
    const total = f.d * mult;
    const correct = f.n * mult;
    const t = pick(['galletas', 'cuerdas', 'antorchas', 'mapas', 'cantimploras']);
    const { options, answer } = buildOptions(correct, [total - correct, Math.floor(total / 2), correct + f.d, total]);
    return {
      skill: 'fraccion_de_cantidad',
      question: `La expedición lleva ${total} ${t.n} y debe dejar ${f.uni} (${f.txt}) en el campamento. ¿${cuantos(t)} ${t.n} deja?`,
      options, answer,
      hint1: `Primero divide ${total} entre ${f.d} para saber cuánto vale cada parte.`,
      hint2: `${total} ÷ ${f.d} = ${mult}. Ahora toma ${f.n} parte${f.n > 1 ? 's' : ''}: ${f.n} × ${mult}.`,
      explanation: `${f.uni} de ${total} → ${total} ÷ ${f.d} = ${mult}, y ${f.n} × ${mult} = ${correct} ${t.n}.`
    };
  },

  analizar(tier, grade) {
    const g = grade || DEFAULT_GRADE;
    /* También por la rampa: en el nivel 1, las fracciones que se ven de un
       vistazo y cantidades pequeñas; en el 5, todas y repartos de verdad. */
    const f = porTier(bandOf(g) === 3 ? fractPool(g) : [FRACT[0], FRACT[2], FRACT[1]], tier);
    const tope = bandOf(g) === 3 ? 2 + tier * 2 : 2 + tier;
    const mult = ri(2, Math.max(3, tope));
    const total = f.d * mult;
    const real = f.n * mult;
    const veraSays = pick([real + mult, Math.floor(total / 2) === real ? real + 1 : Math.floor(total / 2)]);
    /* ── Las falsas, sin repetirse entre ellas ──
       Estaban escritas a mano y dos coincidían cuando `real + f.d` daba justo
       `total` —que con ½ pasa siempre—, así que quedaban tres opciones y
       buildOptions rellenaba la cuarta repitiendo la BUENA con un «?» detrás.
       Un niño que marcaba esa recibía «has fallado» habiendo acertado, que es
       lo peor que puede hacer esta plataforma.

       Ahora se listan los repartos equivocados que un niño hace de verdad
       —quedarse con todo, confundirse de parte, sumar el denominador— y se
       quitan los repetidos y el que coincida con el bueno. */
    const equivocados = [];
    [total, total - real, real + f.d, f.n * f.d, real + 1, real + mult]
      .forEach(v => {
        if (v !== real && v > 0 && v <= total * 2 && !equivocados.includes(v)) equivocados.push(v);
      });
    const correctOpt = `No: ${f.uni} de ${total} son ${real}`;
    const { options, answer } = buildOptions(correctOpt,
      ['Sí, Vera tiene razón'].concat(equivocados.map(v => `No: ${f.uni} de ${total} son ${v}`)));
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
    /* También aquí manda la rampa, aunque el techo del curso sea pequeño: a
       los seis años contar 8 monedas y contar 28 no es lo mismo. */
    const max = rampaTier(g === 1 ? 30 : 100, tier, 6);
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
    const t = Math.max(1, Math.min(5, tier || 2));
    /* ── Niveles 4 y 5: la serie va hacia atrás ──
       Contar hacia atrás es bastante más difícil que contar hacia delante a
       esta edad, y es contenido de 1.º y 2.º: no es una dificultad inventada
       para que el nivel 5 tenga algo. */
    const atras = t >= 4;
    const techo = g === 1 ? 30 : 99;
    /* Y el paso tiene que CABER hacia atrás. Con paso 10 desde 30 la serie
       llegaba a −5, y un niño de seis años contando monedas no tiene números
       negativos: se descartan los pasos que no quepan antes de elegir. */
    const pasos = (g === 1 ? [1, 2, 10, 5, 3] : [2, 10, 5, 3, 4])
      .filter(p => !atras || p * 4 < techo);
    const paso = porTier(pasos.length ? pasos : [1], t);
    const inicio = atras
      ? ri(paso * 4 + 1, techo)
      : ri(1, g === 1 ? 20 : 50);
    const signo = atras ? -1 : 1;
    const serie = [0, 1, 2, 3].map(i => inicio + signo * paso * i);
    const correct = inicio + signo * paso * 4;
    const { options, answer } = buildOptions(correct, nearMisses(correct), fmtNum);
    return {
      skill: 'series',
      question: `Sigue las huellas:\n${serie.join(' → ')} → ?`,
      options, answer,
      hint1: `Mira cuánto ${atras ? 'baja' : 'sube'} de un número al siguiente.`,
      hint2: `Cada paso ${atras ? 'quita' : 'suma'} ${paso}.`,
      explanation: `La serie ${atras ? 'baja' : 'sube'} de ${paso} en ${paso}: después de ${serie[3]} va ${correct}.`
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
  /* ── Este pozo no usaba el nivel en ninguno de sus cuatro estratos ──
     Recibía `tier` y lo ignoraba: los cinco niveles daban exactamente lo
     mismo. Y es el pozo de 5.º y 6.º, que es donde la ampliación importa
     más. Ahora el nivel decide cuántos lugares decimales hay en juego y, a
     partir del 4, qué se pregunta. */
  recordar(tier) {
    const t = Math.max(1, Math.min(5, tier || 2));
    /* Décimas hasta el nivel 2, centésimas del 3 al 4, milésimas en el 5. */
    const lugares = t <= 2 ? 1 : t <= 4 ? 2 : 3;
    const NOMBRES = ['décimas', 'centésimas', 'milésimas'];
    const ent = ri(1, 99);
    const dec = ri(1, Math.pow(10, lugares) - 1);
    const cifras = String(dec).padStart(lugares, '0');
    const txt = `${ent},${cifras}`;
    const i = ri(0, lugares - 1);
    const parte = NOMBRES[i];
    const cifra = Number(cifras[i]);

    /* ── Niveles 4 y 5: cuánto VALE, no qué cifra es ──
       Igual que en la bóveda: señalar la cifra se resuelve contando lugares
       con el dedo; decir cuánto vale obliga a leer la cantidad. Y con
       decimales el error típico es justo el contrario del de los enteros —se
       lee «siete centésimas» como 0,7— así que ese valor está entre las
       falsas. */
    if (t >= 4 && cifra > 0) {
      const valor = cifra / Math.pow(10, i + 1);
      const fmt = v => v.toLocaleString('es-ES', { maximumFractionDigits: 3 });
      const falsas = [cifra, cifra / 10, cifra / 100, cifra / 1000]
        .filter(v => v !== valor).map(fmt);
      const { options, answer } = buildOptions(fmt(valor), falsas);
      return {
        skill: 'decimal_posicion',
        question: `El manómetro del templo marca ${txt}. ¿Cuánto VALE la cifra ${cifra} que ocupa el lugar de las ${parte}?`,
        options, answer,
        hint1: 'No es la cifra que ves: es la cantidad que representa en ese lugar.',
        hint2: `Una décima es 0,1; una centésima, 0,01; una milésima, 0,001. Tienes ${cifra} de esas.`,
        explanation: `${cifra} ${parte} son ${fmt(valor)}.`
      };
    }

    const { options, answer } = buildOptions(cifra,
      cifras.split('').map(Number).concat([ent % 10, ri(0, 9)]));
    return {
      skill: 'decimal_posicion',
      question: `El manómetro del templo marca ${txt}. ¿Qué cifra ocupa el lugar de las ${parte}?`,
      options, answer,
      hint1: `Tras la coma va primero el lugar de las décimas${lugares > 1 ? ', luego el de las centésimas' : ''}${lugares > 2 ? ' y después el de las milésimas' : ''}.`,
      hint2: `En ${txt}, después de la coma están ${cifras}.`,
      explanation: `En ${txt}, la cifra de las ${parte} es ${cifra}.`
    };
  },
  comprender(tier) {
    /* Ordenadas de fácil a difícil: la mitad y los cuartos se ven, los octavos
       y los quintos altos hay que pensarlos. La rampa decide hasta dónde. */
    const PARES = [
      { d: '0,5', f: '½' }, { d: '0,25', f: '¼' }, { d: '0,75', f: '¾' },
      { d: '0,1', f: '1/10' }, { d: '0,2', f: '⅕' }, { d: '0,4', f: '⅖' },
      { d: '0,6', f: '⅗' }, { d: '0,125', f: '⅛' }, { d: '0,375', f: '⅜' }
    ];
    const t = Math.max(1, Math.min(5, tier || 2));
    const pares = hastaTier(PARES, t);
    const p = pick(pares);
    /* En el nivel 5 se pregunta al revés la mitad de las veces: de la fracción
       al decimal es el camino que no se puede resolver reconociendo el dibujo
       de memoria, hay que hacer la división. */
    const alReves = t >= 5 && pick([true, false]);
    if (alReves) {
      const { options, answer } = buildOptions(p.d, PARES.filter(x => x !== p).map(x => x.d));
      return {
        skill: 'decimal_fraccion',
        question: `Kira anota ${p.f} en la bitácora. ¿Qué número decimal es?`,
        options, answer,
        hint1: 'Una fracción es un reparto: el de arriba entre el de abajo.',
        hint2: `${p.f} es una parte de las que hacen 1 entero. ¿Cuánto vale esa parte?`,
        explanation: `${p.f} equivale a ${p.d}.`
      };
    }
    const { options, answer } = buildOptions(p.f, PARES.filter(x => x !== p).map(x => x.f));
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
    /* De fácil a difícil, y la dificultad aquí no es el número: es si el
       porcentaje sale de cabeza de un tirón (la mitad, dividir entre diez) o
       hay que componerlo con dos (el 15 % es 10 % y 5 %). Eso es lo que OAOA
       llama porcentajes de cabeza, y es la estrategia que se nombra en la
       pista en vez de mandar dividir entre 100 y multiplicar. */
    /* Ordenados por PASOS de cabeza, no por tamaño: uno (la mitad, entre
       diez), dos (la mitad de la mitad, el 10 % dos veces) y tres o más. */
    const PCT = [50, 10, 25, 20, 5, 75, 30, 15, 35];
    const t = Math.max(1, Math.min(5, tier || 2));
    const pct = pick(hastaTier(PCT, t));
    const total = ri(2, 20 + t * 8) * 10;
    const correct = Math.round(total * pct / 100);
    const diez = total / 10;
    /* Cómo se saca de cabeza ESTE porcentaje, con la estrategia por su
       nombre. Componer dos es lo que separa el nivel alto del bajo. */
    const camino = { 50: 'la mitad', 25: 'la mitad de la mitad', 75: 'la mitad más la mitad de la mitad',
                     10: 'dividir entre 10', 20: 'el 10 % dos veces',
                     30: 'el 10 % tres veces', 5: 'la mitad del 10 %',
                     15: 'el 10 % más su mitad', 35: 'el 10 % tres veces más la mitad de uno' }[pct];
    const { options, answer } = buildOptions(correct,
      [Math.round(total * (pct + 10) / 100), Math.round(total / 2), total - correct, pct]
        .concat(nearMisses(correct)), fmtNum);
    return {
      skill: 'porcentaje',
      question: `El botín es de ${fmtNum(total)} doblones y la Sociedad se queda el ${pct} %. ¿Cuántos doblones son?`,
      options, answer,
      hint1: `El ${pct} % de algo es ${camino}.`,
      hint2: `El 10 % de ${fmtNum(total)} es ${fmtNum(diez)}. Desde ahí sale el resto.`,
      explanation: `El ${pct} % de ${fmtNum(total)} es ${camino}: ${fmtNum(correct)} doblones.`
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

    /* ── Nivel 5: ordenar tres, no juzgar a Vera ──
       Con dos números y cuatro opciones se puede acertar descartando: «Vera
       casi nunca tiene razón». Ordenar tres no se puede descartar, y obliga a
       comparar por pares mirando de verdad el valor de cada posición. */
    if ((tier || 2) >= 5) {
      const base = ri(2, 8);
      const tres = [`${base},${ri(0, 4)}${ri(1, 9)}`, `${base},${ri(5, 9)}`, `${base + 1},${ri(0, 9)}`];
      const num = s => Number(s.replace(',', '.'));
      const ordenado = [...tres].sort((a, b) => num(a) - num(b));
      /* Las falsas salen de las SEIS ordenaciones posibles quitando la buena:
         así son siempre tres distintas y de verdad. Derivarlas ordenando la
         misma lista de tres maneras las hacía coincidir entre sí, y la opción
         que faltaba la rellenaba buildOptions con un «…?» que no significa
         nada. Entre ellas está siempre la de «más cifras, mayor», que es el
         error que este reto viene a corregir. */
      const perms = [];
      for (const a of tres) for (const b of tres) for (const c2 of tres) {
        if (a !== b && b !== c2 && a !== c2) perms.push([a, b, c2].join(' < '));
      }
      const bueno = ordenado.join(' < ');
      const masCifrasPrimero = [...tres].sort((a, b) => a.length - b.length).join(' < ');
      const falsas = [masCifrasPrimero, [...ordenado].reverse().join(' < ')]
        .concat(shuffle(perms))
        .filter(x => x !== bueno);
      const { options, answer } = buildOptions(bueno, falsas);
      return {
        skill: 'comparar_decimales',
        question: `Vera tiene que colocar tres pesas en la balanza, de la más ligera a la más pesada: `
                + `${tres.join(' · ')}. ¿Cuál es el orden correcto?`,
        options, answer,
        hint1: 'Compara primero la parte entera. Solo si empata hay que mirar las décimas.',
        hint2: 'Tener más cifras detrás de la coma no hace un número mayor: 0,5 es mayor que 0,25.',
        explanation: `De menor a mayor: ${ordenado.join(' < ')}.`
      };
    }

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
    }, {
    /* Los dos últimos de cada ciclo son los más exigentes: es el orden que
       lee la rampa, y por eso solo salen en los niveles altos. Aquí la
       respuesta ya no está en una sola frase: hay que juntar dos. */
    texto: 'Vera llegó al pozo antes que nadie. Cogió la lámpara de Bruno sin pedirla. Cuando Bruno bajó, no veía nada y tuvo que subir otra vez.',
    literal: { p: '¿Qué cogió Vera?', r: 'La lámpara de Bruno', d: ['Una vasija', 'El mapa', 'Una cuerda'] },
    inferencia: { p: '¿Por qué tuvo que subir Bruno?', r: 'Porque no veía sin la lámpara', d: ['Porque tenía hambre', 'Porque Vera le llamó', 'Porque el pozo estaba lleno'] },
    idea: { p: '¿Qué hizo mal Vera?', r: 'Coger algo sin pedirlo', d: ['Llegar temprano', 'Bajar al pozo', 'Encender la lámpara'] },
    critica: { p: 'Kira dice que Bruno bajó sin lámpara porque quiso. ¿Es verdad?', r: 'No: Vera se la había llevado', d: ['Sí, a Bruno no le gustan las lámparas', 'Sí, quería probar a oscuras', 'El texto no lo cuenta'] }
  }, {
    texto: 'Ayer llovió en el campamento. Hoy la arena está dura y cuesta cavar. Bruno dice que mañana será más fácil, cuando el sol la seque.',
    literal: { p: '¿Cómo está la arena hoy?', r: 'Dura', d: ['Blanda', 'Caliente', 'Seca'] },
    inferencia: { p: '¿Por qué está dura la arena?', r: 'Porque ayer llovió', d: ['Porque hace sol', 'Porque nadie cava', 'Porque es de noche'] },
    idea: { p: '¿Qué espera Bruno?', r: 'Que el sol seque la arena', d: ['Que vuelva a llover', 'Que llegue Vera', 'Que se acabe la arena'] },
    critica: { p: 'Tobías dice que hoy es el mejor día para cavar. ¿Tiene razón?', r: 'No: hoy cuesta más que mañana', d: ['Sí, la arena está perfecta', 'Sí, porque llovió', 'El texto no habla de cavar'] }
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
    }, {
    texto: 'Bruno anotó en su diario que la tablilla pesaba dos kilos. Kira la pesó después: pesaba ochocientos gramos. Bruno no había limpiado la arena pegada antes de pesarla, y esa arena era casi todo el peso de más.',
    literal: { p: '¿Cuánto pesaba la tablilla de verdad?', r: 'Ochocientos gramos', d: ['Dos kilos', 'Un kilo', 'Ochenta gramos'] },
    inferencia: { p: '¿Por qué le salió a Bruno un peso mayor?', r: 'Porque pesó también la arena pegada', d: ['Porque su balanza era vieja', 'Porque la tablilla se rompió', 'Porque midió dos veces'] },
    idea: { p: '¿Qué enseña este episodio?', r: 'Que hay que limpiar antes de medir', d: ['Que las tablillas pesan mucho', 'Que Kira pesa mejor', 'Que el diario se equivoca solo'] },
    critica: { p: 'Vera dice que la balanza de Bruno está estropeada. ¿Es esa la causa?', r: 'No: el error fue no limpiar la arena', d: ['Sí, la balanza falla', 'Sí, marca de más siempre', 'El texto dice que se rompió'] }
  }, {
    texto: 'La Sociedad manda dos cajas al campamento cada mes. Este mes solo llegó una. Bruno repartió la comida igual que siempre y a mitad de mes no quedaba nada. Kira se lo había advertido el primer día.',
    literal: { p: '¿Cuántas cajas llegaron este mes?', r: 'Una', d: ['Dos', 'Ninguna', 'Tres'] },
    inferencia: { p: '¿Por qué se acabó la comida antes?', r: 'Porque repartió igual habiendo la mitad', d: ['Porque llegaron tarde', 'Porque comieron más', 'Porque Kira se la llevó'] },
    idea: { p: '¿Qué debería haber hecho Bruno?', r: 'Ajustar el reparto a lo que había', d: ['Pedir tres cajas', 'Comer solo él', 'Esperar al mes siguiente'] },
    critica: { p: 'Bruno dice que nadie podía saberlo. ¿Es cierto?', r: 'No: Kira se lo advirtió el primer día', d: ['Sí, fue una sorpresa', 'Sí, la Sociedad no avisó', 'El texto no habla de Kira'] }
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
    }, {
    texto: 'Durante cuarenta años se creyó que el Atlas de Ossian era un solo mapa. La hipótesis se sostenía en un único testimonio: el diario de un marinero que decía haberlo visto entero. Cuando aparecieron dos fragmentos idénticos en continentes distintos, la explicación se vino abajo: un mapa único no puede estar en dos sitios, y lo que el marinero vio debió de ser una copia.',
    literal: { p: '¿En qué se apoyaba la hipótesis del mapa único?', r: 'En el diario de un marinero', d: ['En dos fragmentos idénticos', 'En los archivos de la Sociedad', 'En una copia del Atlas'] },
    inferencia: { p: '¿Por qué los dos fragmentos desmontan la hipótesis?', r: 'Porque un mapa único no puede estar en dos sitios', d: ['Porque el marinero mintió', 'Porque estaban en mal estado', 'Porque nadie los examinó'] },
    idea: { p: '¿Cuál es la idea central del texto?', r: 'Que una prueba nueva puede derribar una creencia antigua', d: ['Que los marineros no son de fiar', 'Que el Atlas tiene dos partes', 'Que cuarenta años son muchos'] },
    critica: { p: 'Vera concluye que el marinero inventó su diario. ¿Se puede afirmar eso?', r: 'No: pudo ver una copia sin mentir', d: ['Sí, queda demostrado', 'Sí, porque el mapa no existía', 'Sí, lo dice el texto'] }
  }, {
    texto: 'El informe de la excavación afirma que la cámara se selló en el año 300. La datación de la madera de la puerta da el año 450. Los autores explican la diferencia diciendo que la puerta se repuso más tarde, pero no aportan ninguna prueba de esa reposición: es una suposición que encaja con sus fechas.',
    literal: { p: '¿Qué año da la datación de la madera?', r: 'El año 450', d: ['El año 300', 'El año 400', 'El año 150'] },
    inferencia: { p: '¿Qué problema tiene la explicación de los autores?', r: 'Que no aportan pruebas de la reposición', d: ['Que la madera es moderna', 'Que no dataron la puerta', 'Que confunden dos cámaras'] },
    idea: { p: '¿Qué distingue una prueba de una suposición?', r: 'Que la prueba se puede comprobar', d: ['Que la suposición es más antigua', 'Que la prueba la firma un experto', 'Que la suposición no se escribe'] },
    critica: { p: '¿Se puede dar por buena la fecha del año 300?', r: 'No mientras la diferencia no se explique con pruebas', d: ['Sí, lo dice el informe', 'No, la buena es el 450 seguro', 'Sí, la madera se repone siempre'] }
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
    /* Las categorías van ordenadas de concreta a abstracta dentro de cada
       ciclo, así que la rampa sirve igual que con las palabras sueltas. */
    const nombres = hastaTier(Object.keys(cats), tier);
    const cat = pick(nombres);
    const correct = porTier(cats[cat], tier);
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
    /* Como en los roles: con `img` sale el dibujo, sin él el emoji. Un
       yacimiento que cree el docente no tiene dibujo y se ve igual de bien. */
    img: 'img/kaldros.webp',
    /* El fondo de la pantalla del reto: la cámara por dentro. Sin él, el reto
       se pinta sobre el pergamino de siempre y no pasa nada. */
    fondo: 'img/fondos/kaldros.webp',
    desc: 'Templo de engranajes, relojes y bóvedas numéricas.',
    enabled: true,
    branches: [
      { id: 'sendero', name: 'El Sendero de las Huellas', icon: '🐾', source: 'builtin', enabled: true, img: 'img/pozos/sendero.webp',
        grades: [1, 2],
        desc: 'Contar, seguir huellas y repartir gemas. El primer camino de todo explorador.',
        contenido: 'Contar hasta 99, series, comparar cantidades, sumas y restas sencillas sin llevar.' },
      { id: 'numeracion', name: 'La Bóveda de los Números', icon: '🔢', source: 'builtin', enabled: true, img: 'img/pozos/numeracion.webp',
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Una cámara llena de cerraduras numéricas. Domina los números para abrirlas todas.',
        contenido: 'Numeración: valor posicional, leer y escribir números, ordenar y comparar, descomponer.' },
      /* El id se queda —lo llevan los diarios—, pero lo que se LEE cambia. Y
         `contenido` no es decorativo: es lo que se le pasa a la IA como tema
         del pozo, así que decir ahí «con llevadas» era pedirle retos de ATOA
         por la puerta de atrás. */
      { id: 'sumas_llevando', name: 'El Reloj de Engranajes', icon: '⚙️', source: 'builtin', enabled: true, img: 'img/pozos/sumas_llevando.webp',
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Un reloj gigante que solo gira con cuentas exactas. Parte los números y vencerás.',
        contenido: 'Cálculo: sumar y restar descomponiendo por valores, completar decenas, estimar antes de calcular, multiplicación, división y problemas de operaciones.' },
      { id: 'fracciones', name: 'La Balanza del Mercader', icon: '⚖️', source: 'builtin', enabled: true, img: 'img/pozos/fracciones.webp',
        grades: [3, 4, 5, 6],
        desc: 'Repartos, raciones y vasijas partidas. Aquí el tesoro se divide en partes iguales.',
        contenido: 'Fracciones: leerlas, representarlas, comparar, equivalentes y fracción de una cantidad.' },
      { id: 'decimales', name: 'La Cámara Decimal', icon: '🔬', source: 'builtin', enabled: true, img: 'img/pozos/decimales.webp',
        grades: [5, 6],
        desc: 'Comas, porcentajes y medidas precisas. La cámara más profunda de Kaldros.',
        contenido: 'Decimales y porcentajes: valor posicional con coma, operar con decimales, medidas y equivalencias.' }
    ]
  }, {
    id: 'biblioteca',
    name: 'Biblioteca de Arena',
    subject: 'Lengua',
    icon: '📜',
    img: 'img/biblioteca.webp',
    fondo: 'img/fondos/biblioteca.webp',
    desc: 'Una biblioteca sepultada donde las palabras se descubren como piezas.',
    enabled: true,
    branches: [
      { id: 'vocabulario', name: 'El Escriba de Arena', icon: '🖋️', source: 'builtin', enabled: true, img: 'img/pozos/vocabulario.webp',
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Sinónimos, contrarios, familias de palabras y clases de palabras.',
        contenido: 'Vocabulario: sinónimos y antónimos, familias léxicas, campo semántico y clases de palabras.' },
      { id: 'ortografia', name: 'Las Tablillas Rotas', icon: '🪨', source: 'builtin', enabled: true, img: 'img/pozos/ortografia.webp',
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Copias mal escritas de un mismo texto. Encuentra la buena y sabrás por qué.',
        contenido: 'Ortografía: reglas de escritura, acentuación, signos de puntuación y palabras que se confunden.' },
      { id: 'comprension', name: 'El Papiro de Ossian', icon: '📖', source: 'builtin', enabled: true, img: 'img/pozos/comprension.webp',
        grades: [1, 2, 3, 4, 5, 6],
        desc: 'Textos del diario perdido: qué dicen, qué insinúan y qué callan.',
        contenido: 'Comprensión lectora: idea principal, detalles, inferencias y sentido de una palabra en su texto.' }
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
/* ══════════ LOS TRES COMPAÑEROS ══════════

   Bruno, Kira y Tobías salían NOMBRADOS en los textos —«Tobías te mira con
   cara de yo también me equivoco»— y no aparecían por ninguna parte: eran tres
   emoji. Un compañero al que solo se le cita no acompaña a nadie.

   Están aquí y no repartidos por las pantallas porque a cada uno lo llaman
   tres o cuatro sitios distintos, y el día que cambie un dibujo tiene que
   cambiar en todos a la vez. `alt` va al lado del fichero por lo mismo: quien
   usa lector oye lo que hay, no un nombre de archivo.

   Tobías tiene dos caras y no es un capricho. La de acertar celebra; la de
   fallar acompaña. Un niño de ocho años que se equivoca no necesita un
   aspaviento, necesita ver que alguien sigue ahí. */
const RETRATOS = {
  bruno:   { img: 'img/bruno.webp',          alt: 'El profesor Bruno Ocaña',    emoji: '🧔🏻‍♂️' },
  kira:    { img: 'img/kira.webp',           alt: 'Kira, la escarabaja',        emoji: '🪲' },
  tobias:  { img: 'img/tobias-calma.webp',   alt: 'Tobías, el perro',           emoji: '🐕' },
  tobiasFiesta: { img: 'img/tobias-fiesta.webp', alt: 'Tobías dando un salto',  emoji: '🐕' },
  vera:    { img: 'img/vera.webp',           alt: 'Vera Kovak, la rival',       emoji: '🐦‍⬛' }
};

/* Quién ha hecho esto.

   Va aquí, en un sitio y no escrito a mano en cada pantalla, porque sale en
   dos: el pie de la portada y la línea de versión del panel del docente. Una
   autoría escrita dos veces es una autoría que un día deja de coincidir.

   Sin correo ni forma de contacto a propósito: la portada la abre el aula
   entera y las familias, y una dirección puesta ahí acaba en sitios donde
   nadie la puso. Quien tenga que localizarle ya sabe dónde. */
const AUTOR_ATLAS = {
  nombre: 'Diego Alberto Moya Puerta',
  oficio: 'Maestro de Educación Primaria y Educación Física',
  lugar: 'Murcia',
  /* ── La licencia ──
     Es la que usan los materiales educativos publicados en España —INTEF,
     Procomún, los CEP— y dice tres cosas: cualquier maestro puede llevársela
     a su aula y adaptarla citando a quien la hizo; nadie puede venderla; y lo
     que salga de ella sigue siendo igual de libre para el siguiente.

     Va aquí y no suelta en el pie porque se enseña en dos sitios —la portada
     y el panel— y una licencia escrita dos veces se contradice a la tercera.
     Los datos de la licencia son suyos, no de la app: quien la cambie cambia
     esta ficha y ya. */
  licencia: {
    nombre: 'CC BY-NC-SA 4.0',
    largo: 'Reconocimiento-NoComercial-CompartirIgual 4.0 Internacional',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es',
    desde: 2026
  }
};

/* El dibujo del mapa. Va aquí y no dentro del SVG que lo pinta por lo mismo
   que los retratos: el día que cambie, cambia en un sitio. */
const CARTA_FONDO = 'img/carta.webp';
/* Los dos dibujos de espera. Una pantalla vacía con un dibujo dice «esto
   todavía no ha empezado»; la misma pantalla con media pantalla de beige y
   una frase dice «esto está roto», que no es verdad. */
const ESPERAS = {
  cuaderno:  { img: 'img/espera-cuaderno.webp',  alt: 'Un cuaderno de campo abierto por una página en blanco' },
  banderin:  { img: 'img/espera-banderin.webp',  alt: 'Un banderín de expedición clavado en la arena junto a una caja' }
};

/* Un dibujo de espera con su frase debajo. Sin dibujo queda la frase sola,
   que es exactamente lo que había antes. */
function espera(cual, texto) {
  const e = ESPERAS[cual];
  return `<div class="espera">${e
    ? `<img class="espera-img" src="${esc(e.img)}" alt="${esc(e.alt)}" loading="lazy">` : ''}
    <p>${texto}</p></div>`;
}

/* El trozo de Atlas que se recupera al vencer al Guardián. */
const FRAGMENTO_ATLAS = 'img/fragmento.webp';
/* El paisaje del campamento y la cara del Guardián. Aquí por lo mismo: el día
   que cambien, cambian en un sitio. */
const FONDO_CAMPAMENTO = 'img/campamento.webp';
const CARA_GUARDIAN = 'img/guardian.webp';
/* El sello que se estampa cada semana con tres días de expedición. */
const SELLO_SEMANA = 'img/sello.webp';

/* El retrato de un compañero, listo para meter en cualquier sitio. Si algún
   día falta el dibujo, sale su emoji y la pantalla sigue entera: es lo mismo
   que hacen los roles de la cuadrilla. */
function retrato(quien, clase) {
  const r = RETRATOS[quien];
  if (!r) return '';
  const c = clase ? ' ' + clase : '';
  return r.img
    ? `<img class="retrato${c}" src="${esc(r.img)}" alt="${esc(r.alt)}" loading="lazy">`
    : `<span class="retrato-emoji${c}" aria-hidden="true">${esc(r.emoji)}</span>`;
}

/* ══════════ LAS CARAS DE EXPLORADOR ══════════

   Hasta aquí, el niño no tenía cara: un emoji genérico, el mismo para todos,
   en la cabecera, en el campamento y en la lista de clase del docente. Es lo
   único de toda la app que puede decir «este soy yo», y no lo decía nada.

   Ocho, no cuarenta: elegir entre ocho es una decisión y elegir entre
   cuarenta es un catálogo, y esto pasa una sola vez, al crear el diario, con
   un niño de seis años que lo que quiere es empezar. Y ocho distintas de
   verdad —pelo, piel, gorro—, que es lo que hace que valga la pena elegir.

   El `alt` describe lo que se ve y no quién es: quién es lo decide el niño. */
const CARAS_EXPLORADOR = [
  { id: 'c1', img: 'img/caras/1.webp', alt: 'Explorador con sombrero de ala ancha y pañuelo verde' },
  { id: 'c2', img: 'img/caras/2.webp', alt: 'Exploradora rubia con trenzas, gafas y salacot' },
  { id: 'c3', img: 'img/caras/3.webp', alt: 'Explorador con gorra hacia atrás y pañuelo amarillo' },
  { id: 'c4', img: 'img/caras/4.webp', alt: 'Exploradora con coleta alta y pañuelo estampado' },
  { id: 'c5', img: 'img/caras/5.webp', alt: 'Explorador pelirrojo con pañuelo naranja' },
  { id: 'c6', img: 'img/caras/6.webp', alt: 'Exploradora con el pelo recogido y pañuelo marrón' },
  { id: 'c7', img: 'img/caras/7.webp', alt: 'Explorador con salacot y pañuelo azul' },
  { id: 'c8', img: 'img/caras/8.webp', alt: 'Exploradora con melena rizada y brújula al cuello' }
];

function caraPorId(id) { return CARAS_EXPLORADOR.find(c => c.id === id) || null; }

/* Lo mismo que `retrato`, pero para las cosas: artículos del almacén y
   medallas de rango. La ficha manda —si trae `img` sale el dibujo y si no,
   su emoji— y eso es justo lo que hace falta aquí, porque el docente puede
   añadir artículos suyos desde el panel y esos nunca tendrán dibujo. Un
   almacén con doce fotos y un emoji suelto se ve raro; un almacén roto
   porque falta un fichero se ve peor. */
function iconoDeFicha(ficha, clase) {
  const c = clase ? ' ' + clase : '';
  if (ficha && ficha.img) {
    return `<img class="icono-dibujo${c}" src="${esc(ficha.img)}" alt="" loading="lazy" decoding="async">`;
  }
  return `<span class="icono-emoji${c}" aria-hidden="true">${esc((ficha && ficha.icon) || '📦')}</span>`;
}

/* ══════════ LOS ROLES DE LA CUADRILLA ══════════

   Cinco papeles dentro de cada cuadrilla, cada uno con su personaje. No es
   decoración: reparte el trabajo del grupo en tareas que un niño de ocho
   años entiende y puede cumplir —quién lee el objetivo, quién vigila el
   reloj, quién guarda los doblones— y le da a cada uno algo suyo que hacer
   cuando el grupo trabaja junto.

   `img` está vacío y es a propósito: cada rol enseña su emoji hasta que
   haya una ilustración en `img/roles/`. Poner ahí la ruta es lo único que
   hace falta para que pase a verse el dibujo; nada más cambia. */
const ROLES_CUADRILLA = [
  { id: 'cartografo', icon: '🧭', img: 'img/roles/cartografo.png',
    personaje: 'Leo, el Cartógrafo',
    rol: 'Coordinador · Guía de ruta',
    desc: 'Lee el objetivo, guía al equipo y recuerda en qué punto del mapa o del estrato están.' },
  { id: 'descodificadora', icon: '🪲', img: 'img/roles/descodificadora.png',
    personaje: 'Maya, la Descodificadora',
    rol: 'Investigadora de pistas · Portavoz',
    desc: 'Busca las respuestas ocultas, analiza los fallos con Kira y comunica la respuesta final.' },
  { id: 'guardian', icon: '🎒', img: 'img/roles/guardian.png',
    personaje: 'Nico, el Guardián del Campamento',
    rol: 'Materiales y logística',
    desc: 'Mantiene la mesa ordenada, reparte los recursos y custodia los Doblones de la cuadrilla.' },
  { id: 'cronometradora', icon: '⏳', img: 'img/roles/cronometradora.png',
    personaje: 'Sofía, la Cronometradora',
    rol: 'Guardiana del tiempo y del ritmo',
    desc: 'Vigila el reloj y avisa del tiempo que queda para mantener un buen ritmo de excavación.' },
  { id: 'ilustrador', icon: '🎨', img: 'img/roles/ilustrador.png',
    personaje: 'Hugo, el Ilustrador de la Bitácora',
    rol: 'Diseño creativo · Apoyo',
    desc: 'Da forma visual a los retos, propone ideas en el Taller de Cartografía y anima a los suyos.' },
  /* El Intendente no es de una cuadrilla: es de la clase. Por eso lleva tope
     —dos manos derechas y no más, o deja de ser un encargo especial— y por eso
     el tope se cuenta sobre TODAS las cuadrillas, no dentro de cada una. */
  { id: 'intendente', icon: '🎖️', img: 'img/roles/intendente.png', especial: true, tope: 2,
    personaje: 'Gael o Sara, Intendente de Campo',
    rol: 'Ayudante principal del docente · Encargo rotativo',
    desc: 'Mano derecha del Prof. Ocaña: anota la fecha, guarda la caja del recreo, lidera la fila y echa una mano en los recados del aula.' }
];

/* Cuántos alumnos, en toda la clase, pueden llevar un rol a la vez. */
function topeDeRol(id) {
  const r = rolPorId(id);
  return r && r.tope ? r.tope : 0;
}

function rolPorId(id) { return ROLES_CUADRILLA.find(r => r.id === id) || null; }

/* ══════════ EL BANCO DE ICONOS ══════════

   Escribir un emoji a mano es fácil en un portátil y un suplicio en una
   tablet: abrir el teclado de emojis, buscar entre miles y acertar. Y el
   icono es de lo primero que se toca al crear un yacimiento.

   La lista es CORTA y elegida, no el catálogo de Unicode: agrupada por para
   qué sirve aquí, con lo que de verdad se usa en un colegio. Quien quiera
   otro sigue pudiendo escribirlo: el campo de texto no desaparece. */
const ICONOS = [
  { grupo: 'Excavación', lista: ['🏛️','⛏️','🗿','🏺','🪨','🦴','🗺️','🧭','🔦','🪜','🧱','🏕️','🐾','🕳️','⚱️','📜','⚙️'] },
  { grupo: 'Matemáticas', lista: ['🔢','➕','➖','✖️','➗','📐','📏','🧮','💯','⏱️','⚖️','🍕','📊','🎲','🪙','📈'] },
  { grupo: 'Lengua', lista: ['✏️','📚','📖','✍️','🔤','💬','📝','🗣️','🎭','📰','🔡','🧩','📓','🖋️','🗨️','📃'] },
  { grupo: 'Naturales y Sociales', lista: ['🌿','🌍','🔬','🦋','🌱','🐢','🌦️','🦎','🌋','🧪','🦕','🌳','🐝','🏔️','💧','🔭'] },
  { grupo: 'Comportamiento', lista: ['🤝','🧹','🤫','🙋','❤️','👂','🧘','🫱','🪥','🎒','⏰','🚶','🙂','👏','🧑‍🤝‍🧑','🫶'] },
  { grupo: 'Premios y logros', lista: ['🏅','🏆','⭐','🌟','🎖️','👑','💎','🥇','🎉','✨','🔥','🎯','🚀','💪','🦸','🎁'] },
  /* Los siete primeros son los que trae el almacén de fábrica: si no
     estuvieran, cambiar uno por error dejaría al docente sin forma de
     recuperarlo sin buscar ese emoji en el teclado. */
  { grupo: 'Almacén', lista: ['👒','⛑️','🧥','🥾','🫙','⛺','🚙','🎩','👓','🧢','🎨','🖌️','🧣','🥽','🪄','🧸','🎫','🍪','🍭','🧃'] },
  { grupo: 'Hitos y metas', lista: ['🌉','🚢','🗼','🏰','🚂','🏗️','🧗','🏁','🌅','🎪','🪁','🎈','🗻','🛶','🏜️','🌠'] },
  { grupo: 'Cuadrillas', lista: ['🛖','🦅','🐺','🦉','🐬','🦁','🐉','🦊','🐴','🦌','🐆','🐅','🦈','🐘','🦩','🐙','🦔'] }
];

/* Todos en una lista, para comprobar si uno viene del banco. */
function iconosTodos() {
  const fuera = [];
  for (const g of ICONOS) for (const i of g.lista) fuera.push(i);
  return fuera;
}

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
  { min: 1,  max: 4,  id: 'aprendiz',   name: 'Aprendiz de Mochila', img: 'img/rangos/aprendiz.webp' },
  { min: 5,  max: 9,  id: 'rastreador', name: 'Rastreador',          img: 'img/rangos/rastreador.webp' },
  { min: 10, max: 17, id: 'cartografo', name: 'Cartógrafo',          img: 'img/rangos/cartografo.webp' },
  { min: 18, max: 29, id: 'arqueologo', name: 'Arqueólogo',          img: 'img/rangos/arqueologo.webp' },
  { min: 30, max: 999, id: 'leyenda',   name: 'Leyenda del Atlas',   img: 'img/rangos/leyenda.webp' }
];
