/* Taller de Cartografía: el escalón de Bloom que el árbol no tenía. El árbol
   de excavación llega hasta Analizar; crear es el nivel siguiente y el PRD lo
   señala como el que mejor predice que lo aprendido se quede. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const RETO_BUENO = {
  question: '¿Cuántas patas tienen 3 arañas?',
  options: ['24', '12', '16', '8'],
  answer: 0,
  explanation: 'Cada araña tiene 8 patas: 8 × 3 = 24.'
};

function conAlumno(nombre) {
  const ctx = cargarApp();
  ctx.ev('createState')(nombre || 'Vega Serrano');
  return ctx;
}

test('un reto bien hecho se guarda como pendiente y da doblones al enviarlo', () => {
  const ctx = conAlumno();
  const antes = ctx.ev('S.progression.doubloons_balance');
  const r = ctx.ev('crearReto')(RETO_BUENO);

  assert.equal(r.ok, true);
  assert.equal(r.reto.status, 'pendiente');
  assert.equal(r.reto.autor, 'Vega Serrano');
  assert.equal(ctx.ev('S.progression.doubloons_balance') - antes, 15);
  /* Los PE NO se dan todavía: siguen midiendo solo aprendizaje demostrado, y
     que el reto esté bien pensado no consta hasta que alguien lo lee. */
  assert.equal(ctx.ev('S.progression.xp_total'), 0);
});

test('no se puede enviar un reto a medias', () => {
  const ctx = conAlumno();
  const casos = [
    [{ ...RETO_BUENO, question: 'corto' }, 'pregunta-corta'],
    [{ ...RETO_BUENO, options: ['4', '4', '5', '6'] }, 'opciones-repetidas'],
    [{ ...RETO_BUENO, options: ['4', '', '5', '6'] }, 'faltan-opciones'],
    [{ ...RETO_BUENO, options: ['4', '5', '6'] }, 'faltan-opciones'],
    [{ ...RETO_BUENO, answer: -1 }, 'sin-correcta'],
    [{ ...RETO_BUENO, answer: 9 }, 'sin-correcta']
  ];
  for (const [datos, motivo] of casos) {
    const r = ctx.ev('crearReto')(datos);
    assert.equal(r.ok, false);
    assert.equal(r.reason, motivo);
  }
  assert.equal(ctx.ev('S.creations').length, 0, 'ninguno se ha colado');
});

test('hay un tope diario: el taller no es una fábrica de acertijos malos', () => {
  const ctx = conAlumno();
  for (let i = 0; i < 3; i++) {
    assert.equal(ctx.ev('crearReto')({ ...RETO_BUENO, question: `Pregunta número ${i} larga` }).ok, true);
  }
  const r = ctx.ev('crearReto')({ ...RETO_BUENO, question: 'Una más, la cuarta del día' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tope');
});

test('aprobar da los PE y devolver no quita nada', () => {
  const ctx = conAlumno();
  ctx.ev('crearReto')(RETO_BUENO);
  const id = ctx.ev('S.creations[0].id');
  const doblones = ctx.ev('S.progression.doubloons_balance');

  const r = ctx.ev('resolverCreacion')(null, id, true, '');
  assert.equal(r.ok, true);
  assert.equal(ctx.ev('S.creations[0].status'), 'aprobado');
  assert.equal(ctx.ev('S.progression.xp_total'), 30);
  assert.equal(ctx.ev('S.progression.doubloons_balance') - doblones, 25);

  /* Y uno devuelto: se acompaña de una nota y no se penaliza nada. */
  const ctx2 = conAlumno();
  ctx2.ev('crearReto')(RETO_BUENO);
  const antes = ctx2.ev('S.progression.doubloons_balance');
  ctx2.ev('resolverCreacion')(null, ctx2.ev('S.creations[0].id'), false, 'Casi: piénsalo otra vez.');
  assert.equal(ctx2.ev('S.creations[0].status'), 'devuelto');
  assert.equal(ctx2.ev('S.creations[0].nota'), 'Casi: piénsalo otra vez.');
  assert.equal(ctx2.ev('S.progression.xp_total'), 0, 'no da PE');
  assert.equal(ctx2.ev('S.progression.doubloons_balance'), antes, 'ni quita lo ya ganado');
});

test('un reto no se puede aprobar dos veces', () => {
  const ctx = conAlumno();
  ctx.ev('crearReto')(RETO_BUENO);
  const id = ctx.ev('S.creations[0].id');
  ctx.ev('resolverCreacion')(null, id, true, '');
  const otra = ctx.ev('resolverCreacion')(null, id, true, '');
  assert.equal(otra.ok, false);
  assert.equal(ctx.ev('S.progression.xp_total'), 30, 'los PE no se cobran dos veces');
});

test('el docente ve lo pendiente de todos los diarios del equipo', () => {
  const ctx = cargarApp();
  for (const n of ['Vega', 'Nilo', 'Mara']) {
    ctx.ev('openDiary')(n, 4);
    ctx.ev('crearReto')({ ...RETO_BUENO, question: `El acertijo de ${n}, bien largo` });
  }
  ctx.ev('closeDiary()');
  const pend = ctx.ev('creacionesPendientes()');
  assert.equal(pend.length, 3);
  assert.deepEqual(pend.map(c => c.autor).sort(), ['Mara', 'Nilo', 'Vega']);
  assert.ok(pend.every(c => c.clave), 'cada uno sabe de qué diario viene');
});

test('el pozo del Taller no aparece en el mapa mientras esté vacío', () => {
  /* Un pozo vacío prometería algo que no está. */
  const { ev } = cargarApp();
  const taller = ev('ATLAS_CONFIG.sites').find(s => s.id === 'taller');
  assert.ok(taller, 'el yacimiento existe de fábrica');
  assert.equal(ev('branchPlayable')(taller.branches[0]), false);

  taller.branches[0].bank.recordar.push({ question: 'Uno', options: ['a', 'b', 'c', 'd'], answer: 0 });
  assert.equal(ev('branchPlayable')(taller.branches[0]), true);
});

test('un reto aprobado se juega como cualquier otro, con las opciones barajadas', () => {
  const ctx = cargarApp();
  const taller = ctx.ev('ATLAS_CONFIG.sites').find(s => s.id === 'taller');
  taller.branches[0].bank.recordar.push({
    question: RETO_BUENO.question, options: RETO_BUENO.options.slice(),
    answer: 0, explanation: RETO_BUENO.explanation, skill: 'pozo:acertijos'
  });
  ctx.ev('createState')('Nilo');

  /* La respuesta correcta sigue siendo la buena aunque se barajen */
  for (let i = 0; i < 40; i++) {
    const q = ctx.ev('makeQuestion')(taller.branches[0], 'recordar', 2, [], 4);
    assert.equal(q.options[q.answer], '24');
    assert.equal(q.skill, 'pozo:acertijos');
  }
});

test('el texto que escribe un niño no puede llegar como marcado a los demás', () => {
  const ctx = conAlumno();
  const r = ctx.ev('crearReto')({
    question: '<img src=x onerror=alert(1)> ¿cuánto es esto?',
    options: ['<script>a</script>', 'b', 'c', 'd'], answer: 1
  });
  assert.equal(r.ok, true, 'se guarda: el texto es un dato');
  const esc = ctx.ev('esc');
  assert.doesNotMatch(esc(r.reto.question), /<[a-zA-Z/]/, 'al pintarlo va escapado');
  assert.doesNotMatch(esc(r.reto.options[0]), /<[a-zA-Z/]/);
});

test('los textos larguísimos se recortan antes de guardarse', () => {
  const ctx = conAlumno();
  const r = ctx.ev('crearReto')({
    question: 'a'.repeat(5000), options: ['b'.repeat(500), 'c', 'd', 'e'], answer: 0
  });
  assert.ok(r.reto.question.length <= 300);
  assert.ok(r.reto.options[0].length <= 80);
});
