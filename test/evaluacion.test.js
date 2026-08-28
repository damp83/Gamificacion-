/* El registro de la evaluación y el informe para la familia. La Cámara del
   Guardián es la prueba sumativa y hasta ahora no dejaba rastro: no se podía
   llevar a un boletín ni calcular las métricas del PRD §6. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

function alumnoQueHaceLaCamara(ctx, { acertar }) {
  ctx.ev('createState')('Vega Serrano');
  ctx.ev('rolloverIfNeeded()');
  ctx.ev(`['recordar','comprender','aplicar','analizar'].forEach(s => {
    const st = getStratum('numeracion', s);
    st.status = 'available'; st.mastery = 0.9; st.ever_mastered = true;
  });`);
  ctx.ev('startGuardian')('numeracion');
  ctx.ev(`while (mission) {
    const q = mission.current;
    answerQuestion(${acertar} ? q.answer : (q.answer + 1) % 4);
    if (!advance()) break;
  }`);
  return ctx.ev('finishGuardian')();
}

test('cada intento de la Cámara queda registrado con fecha y resultado', () => {
  const ctx = cargarApp();
  const r = alumnoQueHaceLaCamara(ctx, { acertar: true });
  assert.equal(r.superada, true);

  const hist = ctx.ev('historialEvaluacion')();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].attempts, 1);
  assert.equal(hist[0].cleared, true);

  const intento = hist[0].intentos[0];
  assert.equal(intento.date, ctx.ev('todayStr()'), 'lleva la fecha del intento');
  assert.equal(intento.passed, true);
  assert.ok(intento.accuracy > 0.8);
  assert.ok(intento.masteryThen > 0, 'guarda el dominio que tenía en ese momento');
});

test('el historial se queda con los últimos intentos, no crece sin fin', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  for (let i = 0; i < 15; i++) {
    ctx.ev('registrarIntentoGuardian')('numeracion', { accuracy: 0.5, passed: false, masteryThen: 0.6 });
  }
  assert.equal(ctx.ev("guardianState('numeracion').history").length, 10);
});

test('la divergencia avisa de un árbol de dominio inflado', () => {
  /* Es la métrica del PRD §6 que de verdad importa: si la barra de dominio
     prometía 0.9 y la prueba sumativa da 0.2, el dominio está mintiendo. */
  const ctx = cargarApp();
  alumnoQueHaceLaCamara(ctx, { acertar: false });
  const m = ctx.ev('metricasEvaluacion')();

  assert.equal(m.camaras, 1);
  assert.equal(m.superadas, 0);
  assert.equal(m.passRate, 0);
  assert.ok(m.divergencia > 0.5,
    `el dominio prometía mucho más de lo que confirmó la prueba (divergencia ${m.divergencia})`);
});

test('sin divergencia cuando el dominio y la prueba coinciden', () => {
  const ctx = cargarApp();
  alumnoQueHaceLaCamara(ctx, { acertar: true });
  const m = ctx.ev('metricasEvaluacion')();
  assert.ok(Math.abs(m.divergencia) < 0.2, `divergencia ${m.divergencia}: dominio y prueba de acuerdo`);
  assert.equal(m.passRate, 1);
});

test('el Guardian Pass Rate de la clase sale del resumen de cada alumno', () => {
  const { ev } = cargarApp();
  const alumno = (n, evalu) => ({ id: n, name: n, summary: { v: 1, xp: 100, evalu } });
  /*            [cámaras, superadas, intentos, passRate, divergencia] */
  const d = ev('buildClassOverview')([
    alumno('Vega', [2, 2, 2, 1, 0.02]),
    alumno('Nilo', [2, 1, 3, 0.33, 0.31]),
    alumno('Mara', [1, 0, 2, 0, 0.45])
  ], '2026-08-28');

  assert.equal(d.kpis.guardianIntentos, 7);
  assert.equal(d.kpis.guardianPassRate, 3 / 5, 'tres cámaras superadas de cinco abiertas');
  assert.ok(Math.abs(d.kpis.divergencia - 0.26) < 0.01);
});

test('el informe a la familia no lleva notas, porcentajes ni comparaciones', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega Serrano');
  for (let i = 0; i < 6; i++) ctx.ev('recordConcepto')('valor_posicional', true);
  for (let i = 0; i < 6; i++) ctx.ev('recordConcepto')('suma_llevada', false);

  const html = ctx.ev('informeFamilia')(ctx.ev('S'), { clase: '4.º B' });

  /* Se comprueba el TEXTO que lee la familia, no el código: los nombres de
     clase del CSS no son contenido y no deben hacer fallar nada. */
  const texto = html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  assert.ok(texto.includes('Vega Serrano'));
  assert.ok(texto.includes('4.º B'));

  /* El informe propiamente dicho acaba donde empieza la nota de «cómo leer
     esto», que es meta: habla precisamente de que NO hay notas ni suspensos,
     así que buscar esas palabras ahí dentro no dice nada. */
  const informe = texto.split('Cómo leer esto')[0];
  const nota = texto.split('Cómo leer esto')[1] || '';
  assert.ok(nota.length > 80, 'la nota explicativa sigue estando');

  /* Lo que sí: conceptos en castellano llano */
  assert.ok(texto.includes('Valor posicional'), 'lo que ya le sale');
  assert.ok(texto.includes('Suma con llevada'), 'lo que está trabajando');

  /* Lo que NO puede aparecer nunca */
  assert.doesNotMatch(informe, /\d+\s?%/, 'sin porcentajes de dominio');
  assert.doesNotMatch(informe, /suspenso|aprobad|insuficiente|sobresaliente|calificaci|\bnotas?\b/i,
    'sin calificaciones');
  assert.doesNotMatch(informe, /Recordar|Comprender|Aplicar|Analizar/,
    'sin jerga de Bloom: a una familia no le dice nada');
  assert.doesNotMatch(informe, /media de la clase|por encima|por debajo de sus compañeros/i,
    'sin comparaciones con nadie (PRD §0.2)');
});

test('el informe aguanta un diario recién empezado', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Nilo');
  const html = ctx.ev('informeFamilia')(ctx.ev('S'), {});
  assert.ok(html.includes('Nilo'));
  assert.ok(html.includes('Está empezando'), 'lo dice en vez de dejar huecos');
});

test('el nombre del archivo se entiende dentro de seis meses', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Ana María Ibáñez');
  const n = ctx.ev('informeFileName')(ctx.ev('S'));
  assert.match(n, /^informe-ana-maria-ibanez-\d{4}-\d{2}-\d{2}\.html$/);
});

test('un nombre con marcado no puede colarse en el informe', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('<img src=x onerror=alert(1)>');
  const html = ctx.ev('informeFamilia')(ctx.ev('S'), {});
  const cuerpo = html.replace(/<style>[\s\S]*?<\/style>/g, ' ');
  assert.doesNotMatch(cuerpo, /<img/, 'el nombre no puede abrir una etiqueta');
  assert.ok(cuerpo.includes('&lt;img'), 'sale escapado, como texto');
});
