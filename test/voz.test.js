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

/* ── Escuchar el reto desde la mesa del docente ──

   El botón del niño es una adaptación suya y por eso se le ofrece a quien la
   tiene activada. «Dirigir la clase» es otra cosa: ahí el reto lo lee el
   maestro en alto para el grupo, y poder darle a un botón le deja las manos y
   la voz libres. Lo que se fija aquí es que ese botón NO dependa de la
   preferencia del niño —no manda sobre lo que hace el maestro con su propio
   dispositivo— y que se calle cuando el reto deja de estar en pantalla. */

/* Un turno dirigido abierto sobre un alumno cualquiera. */
function turnoDirigido(ctx) {
  ctx.ev('createState')('Vega');
  ctx.ev('startMission')('numeracion', 'recordar');
}

test('el docente puede escuchar el reto aunque ese niño no tenga la voz activada', () => {
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev('S.profile.grade = 6;');
  ctx.ev('S.profile.accessibility = { read_aloud: false };');
  assert.equal(ctx.ev('vozActiva()'), false, 'el niño no la tiene: ese es el caso');

  ctx.ev('aulaLeerReto()');
  const textos = dicho.filter(u => u !== 'CANCEL').map(u => u.text);
  assert.equal(textos.length, 5, 'el enunciado y las cuatro opciones');
  assert.match(textos[1], /^Opción A\./);
});

test('sin voces en el navegador el botón no está, en vez de estar y no hacer nada', () => {
  const ctx = cargarApp();          /* sin conVoz: no hay Web Speech API */
  turnoDirigido(ctx);
  ctx.ev('aulaVozReposo()');
  assert.ok(ctx.ev("$('#aula-voz').classList.contains('hidden')"));

  const ctx2 = cargarApp();
  conVoz(ctx2);
  turnoDirigido(ctx2);
  ctx2.ev('aulaVozReposo()');
  assert.ok(!ctx2.ev("$('#aula-voz').classList.contains('hidden')"));
});

test('el segundo toque calla: con la clase delante hay que poder cortarlo', () => {
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  turnoDirigido(ctx);

  ctx.ev('aulaLeerReto()');
  assert.equal(ctx.ev('VOZ.leyendo'), true);
  assert.equal(ctx.ev("$('#aula-voz-txt').textContent"), 'Parar');

  const antes = dicho.length;
  ctx.ev('aulaLeerReto()');
  assert.equal(ctx.ev('VOZ.leyendo'), false);
  assert.equal(ctx.ev("$('#aula-voz-txt').textContent"), 'Escuchar');
  assert.ok(dicho.slice(antes).includes('CANCEL'), 'no ha cortado nada');
});

test('cuando la voz acaba sola, el botón vuelve a decir «Escuchar»', () => {
  /* Sin esto el botón se queda en «Parar» para siempre y el siguiente toque
     no hace nada visible. */
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev('aulaLeerReto()');
  const ultima = dicho.filter(u => u !== 'CANCEL').pop();
  assert.equal(typeof ultima.onend, 'function', 'nadie avisa de que ha terminado');
  ultima.onend();
  assert.equal(ctx.ev('VOZ.leyendo'), false);
  assert.equal(ctx.ev("$('#aula-voz-txt').textContent"), 'Escuchar');
});

test('pasar al siguiente reto corta la voz del anterior', () => {
  /* Oír las opciones de una pregunta que ya no está en pantalla desorienta a
     toda la clase, no solo a quien responde. */
  const ctx = cargarApp();
  conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev("aulaAlumno = { id: 'u:vega', name: 'Vega', grade: 4 }");
  ctx.ev('aulaLeerReto()');
  assert.equal(ctx.ev('VOZ.leyendo'), true);
  ctx.ev('renderAulaPregunta()');
  assert.equal(ctx.ev('VOZ.leyendo'), false, 'sigue sonando el reto anterior');
  assert.equal(ctx.ev("$('#aula-voz-txt').textContent"), 'Escuchar');
});

test('responder corta la voz: ya no informa a nadie y tapa al maestro', () => {
  const ctx = cargarApp();
  conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev("aulaAlumno = { id: 'u:vega', name: 'Vega', grade: 4 }");
  ctx.ev('aulaLeerReto()');
  ctx.ev("aulaResponder(0, $('#aula-opciones'))");
  assert.equal(ctx.ev('VOZ.leyendo'), false);
});

test('cerrar el turno corta la voz', () => {
  const ctx = cargarApp();
  conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev("aulaAlumno = { id: 'u:vega', name: 'Vega', grade: 4 }");
  ctx.ev('aulaLeerReto()');
  ctx.ev('volverATurnos()');
  assert.equal(ctx.ev('VOZ.leyendo'), false);
});

test('si Kira ya ha dado su pista, también se lee', () => {
  /* Es lo que hay en pantalla. Y repetir el enunciado entero detrás de la
     pista sería volver a empezar. */
  const ctx = cargarApp();
  const dicho = conVoz(ctx);
  turnoDirigido(ctx);
  ctx.ev("$('#aula-kira').classList.remove('hidden')");
  ctx.ev("$('#aula-kira').querySelector = () => ({ textContent: 'Busca primero el 10.' })");
  ctx.ev('aulaLeerReto()');
  const textos = dicho.filter(u => u !== 'CANCEL').map(u => u.text);
  assert.equal(textos.length, 6);
  assert.match(textos[5], /^Pista de Kira\. Busca primero el 10\./);
});
