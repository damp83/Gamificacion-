/* Lectura en voz alta. Un niño de seis años que todavía descifra no puede
   hacer las matemáticas solo: si tiene que descodificar el enunciado antes de
   restar, la prueba le mide la lectura y no el cálculo. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

/* Doble de la Web Speech API: apunta lo que se manda decir. */
function conVoz(ctx) {
  const dicho = [];
  ctx.speechSynthesis = {
    speak: u => dicho.push(u),
    cancel: () => dicho.push('CANCEL'),
    getVoices: () => [{ lang: 'es-ES', name: 'Spanish' }, { lang: 'en-US', name: 'English' }],
    addEventListener: () => {}
  };
  ctx.SpeechSynthesisUtterance = function (t) { this.text = t; };
  ctx.ev('vozInit()');
  return dicho;
}

test('sin voces en el navegador, no se ofrece el botón en vez de no hacer nada', () => {
  const ctx = cargarApp();
  assert.equal(ctx.ev('vozSoportada()'), false);
  assert.equal(ctx.ev('vozInit()'), false);
  ctx.ev('createState')('Vega');
  assert.equal(ctx.ev('vozActiva()'), false);
});

test('se elige una voz en español, no la primera que haya', () => {
  const ctx = cargarApp();
  conVoz(ctx);
  assert.equal(ctx.ev('VOZ.voz').lang, 'es-ES');
});

test('los emoji no se leen: son ruido, no enunciado', () => {
  const ctx = cargarApp();
  const t = ctx.ev('textoParaVoz');
  assert.equal(t('Cuenta el tesoro: 🟨🟨🟨 (bolsas de 10)'), 'Cuenta el tesoro: (bolsas de 10)');
  assert.equal(t('2 → 4 → 6 → ?'), '2, 4, 6, ?');
  assert.equal(t('14 · 27 · 38'), '14, 27, 38');
});

test('se lee el enunciado y luego las opciones, nombradas por su letra', () => {
  /* Nombrarlas «la C» es lo que permite responder en voz alta en clase. */
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  ctx.ev('createState')('Vega');
  ctx.ev('startMission')('numeracion', 'recordar');
  ctx.ev('leerRetoActual()');

  const textos = dicho.filter(u => u !== 'CANCEL').map(u => u.text);
  assert.equal(textos.length, 5, 'el enunciado y las cuatro opciones');
  assert.match(textos[1], /^Opción A\./);
  assert.match(textos[4], /^Opción D\./);
});

test('la voz va más lenta de lo normal y en español', () => {
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  ctx.ev('vozLeer')('hola');
  const u = dicho.find(x => x !== 'CANCEL');
  assert.equal(u.lang, 'es-ES');
  assert.ok(u.rate < 1, 'es para quien aún no lee con soltura');
});

test('empezar a leer corta lo que estuviera sonando', () => {
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  ctx.ev('vozLeer')('primero');
  ctx.ev('vozLeer')('segundo');
  assert.equal(dicho.filter(x => x === 'CANCEL').length, 2);
});

test('de fábrica se ofrece en 1.º y 2.º, donde la lectura aún se construye', () => {
  const ctx = cargarApp();
  conVoz(ctx);
  for (const [curso, esperado] of [[1, true], [2, true], [3, false], [6, false]]) {
    ctx.ev('createState')('Vega');
    ctx.ev(`S.profile.grade = ${curso};`);
    assert.equal(ctx.ev('vozActiva()'), esperado, `curso ${curso}`);
  }
});

test('el docente puede darla a toda la clase, y el alumno decide por encima', () => {
  const ctx = cargarApp();
  conVoz(ctx);
  ctx.ev('createState')('Vega');
  ctx.ev('S.profile.grade = 5;');
  assert.equal(ctx.ev('vozActiva()'), false);

  ctx.ev('setTeacherConfig')('readAloud', 'todos');
  assert.equal(ctx.ev('vozActiva()'), true, 'el docente la enciende para el grupo');

  ctx.ev("S.profile.accessibility.read_aloud = false;");
  assert.equal(ctx.ev('vozActiva()'), false, 'y el alumno puede quitársela');

  ctx.ev('setTeacherConfig')('readAloud', 'nunca');
  ctx.ev("S.profile.accessibility.read_aloud = true;");
  assert.equal(ctx.ev('vozActiva()'), true, 'y ponérsela aunque la clase no la tenga');
});
