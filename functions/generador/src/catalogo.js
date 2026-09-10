/* GENERADO por tools/sync-generador.py — no editar a mano.
   El original es js/content.js. Una prueba comprueba que esta copia no
   se quede vieja: si el validador de la tablet y el del servidor se
   separan, uno acepta lo que el otro rechaza y nadie se entera. */

export const STRATA_META = {
  recordar:   { label: 'Recordar',   icon: '🧱', name: 'Fragmentos de cerámica', peBase: 10, img: 'img/estratos/recordar.webp' },
  comprender: { label: 'Comprender', icon: '🏺', name: 'Vasijas emparejadas',    peBase: 14, img: 'img/estratos/comprender.webp' },
  aplicar:    { label: 'Aplicar',    icon: '⚖️', name: 'La balanza del mercader', peBase: 18, img: 'img/estratos/aplicar.webp' },
  analizar:   { label: 'Analizar',   icon: '🔍', name: 'El plano falsificado',   peBase: 25, img: 'img/estratos/analizar.webp' }
};

export const CONCEPTOS = {
  /* ── Numeración ── */
  serie_numerica:      { area: 'Numeración', label: 'Anterior y posterior',
                         casa: 'Al subir portales o escaleras: «vivimos en el 7, ¿quién vive justo antes?».' },
  valor_posicional:    { area: 'Numeración', label: 'Valor posicional',
                         casa: 'Con el número de un recibo o una matrícula: «¿cuántas decenas hay en 340?».' },
  comparar_numeros:    { area: 'Numeración', label: 'Comparar números',
                         casa: 'Dos precios en la mano en el súper: «¿cuál es mayor?», sin hacer la resta.' },
  redondeo:            { area: 'Numeración', label: 'Redondeo',
                         casa: 'Antes de pagar, «¿cuánto es más o menos?». Redondear a euros y comprobar con el ticket.' },
  ordenar_numeros:     { area: 'Numeración', label: 'Ordenar de menor a mayor',
                         casa: 'Ordenar los dorsales de un partido, las páginas de un cómic o las tallas de la ropa tendida.' },
  contar_agrupando:    { area: 'Numeración', label: 'Contar agrupando de diez',
                         casa: 'Contar cromos, garbanzos o calcetines haciendo montones de diez antes de sumar.' },
  series:              { area: 'Numeración', label: 'Continuar una serie',
                         casa: 'Poner la mesa contando de dos en dos; subir los escalones de tres en tres.' },
  par_impar:           { area: 'Numeración', label: 'Pares e impares',
                         casa: 'Repartir algo entre dos: si sobra uno, es impar. Con la fruta o con las cartas.' },

  /* ── Cálculo ── */
  suma_basica:         { area: 'Cálculo', label: 'Sumar sin llevada',
                         casa: 'Sumar en voz alta lo que se va echando al carro, sin decimales.' },
  suma_llevada:        { area: 'Cálculo', label: 'Suma con llevada',
                         casa: 'Sumar dos precios de dos cifras en un papel, diciendo en alto dónde «me llevo una».' },
  resta_llevada:       { area: 'Cálculo', label: 'Resta llevando',
                         casa: 'El cambio de la compra: «he pagado 20 y ha costado 13, ¿cuánto me devuelven?».' },
  detectar_llevada:    { area: 'Cálculo', label: 'Reconocer cuándo hay llevada',
                         casa: 'Antes de hacer la cuenta, preguntar solo «¿va a haber llevada?». Nada más.' },
  error_suma:          { area: 'Cálculo', label: 'Encontrar el error en una suma',
                         casa: 'Hacer una suma mal a propósito y pedirle que encuentre el fallo.' },
  problema_suma:       { area: 'Cálculo', label: 'Problema de sumar (enunciado)',
                         casa: 'Al revés: dar el resultado y que sea él quien invente el problema.' },

  /* ── Fracciones ── */
  fraccion_leer:       { area: 'Fracciones', label: 'Leer una fracción',
                         casa: 'Al partir la pizza o la tortilla: «esto es un cuarto, dilo tú».' },
  fraccion_terminos:   { area: 'Fracciones', label: 'Numerador y denominador',
                         casa: 'Con la tableta de chocolate: cuántos trozos hay en total y cuántos te llevas.' },
  comparar_fracciones: { area: 'Fracciones', label: 'Comparar fracciones',
                         casa: 'Dos vasos con distinta cantidad: «¿medio o un tercio?». Que lo vea antes de decirlo.' },
  fraccion_significado:{ area: 'Fracciones', label: 'Qué representa una fracción',
                         casa: 'Repartir de verdad seis galletas entre cuatro, y que explique cómo lo ha hecho.' },
  fraccion_de_cantidad:{ area: 'Fracciones', label: 'Fracción de una cantidad',
                         casa: '«Bébete la mitad del zumo» o «un tercio», y que lo sirva él.' },
  error_fraccion:      { area: 'Fracciones', label: 'Encontrar el error en un reparto',
                         casa: 'Repartir mal a propósito, con trozos desiguales, y que diga por qué no vale.' },

  /* ── Decimales y porcentajes ── */
  decimal_posicion:    { area: 'Decimales', label: 'Décimas y centésimas',
                         casa: 'Los precios del súper: «1,25 es un euro y…». Con monedas se toca mejor que se explica.' },
  decimal_fraccion:    { area: 'Decimales', label: 'Decimal y fracción equivalentes',
                         casa: 'Medio euro es 0,50. Con monedas de 50 y de 20 céntimos se ve solo.' },
  porcentaje:          { area: 'Decimales', label: 'Porcentaje de una cantidad',
                         casa: 'Los carteles de rebajas: «un 20 % de 30 euros, ¿cuánto se quita?».' },
  comparar_decimales:  { area: 'Decimales', label: 'Comparar decimales',
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
