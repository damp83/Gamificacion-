/* GENERADO por tools/sync-generador.py — no editar a mano.
   El original es js/content.js. Una prueba comprueba que esta copia no
   se quede vieja: si el validador de la tablet y el del servidor se
   separan, uno acepta lo que el otro rechaza y nadie se entera. */

export const STRATA_META = {
  recordar:   { label: 'Recordar',   icon: '🧱', name: 'Fragmentos de cerámica', peBase: 10 },
  comprender: { label: 'Comprender', icon: '🏺', name: 'Vasijas emparejadas',    peBase: 14 },
  aplicar:    { label: 'Aplicar',    icon: '⚖️', name: 'La balanza del mercader', peBase: 18 },
  analizar:   { label: 'Analizar',   icon: '🔍', name: 'El plano falsificado',   peBase: 25 }
};

export const CONCEPTOS = {
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
