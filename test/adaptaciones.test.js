/* La adaptación de un alumno ACNEAE.

   Tres o cuatro de una clase de veintidós la necesitan. Hasta ahora el docente
   no podía decidir nada explícito: el motor ajustaba la dificultad solo y ahí
   se acababa. Estas pruebas fijan las cuatro palancas y, sobre todo, la línea
   que no se cruza: la adaptación abre puertas, NUNCA cambia lo que la app dice
   que el alumno ha demostrado. Bajar el listón y mentir sobre el dominio son
   dos cosas distintas, y aquí solo se hace la primera. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* Abre el diario de un alumno y le pone la adaptación indicada. */
function conAdaptacion(c, ad) {
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('S.profile.adaptacion = ' + JSON.stringify(ad));
  c.ev('saveState()');
  return c;
}

/* ── Sin adaptación, nada cambia ── */

test('sin adaptación, todo alumno juega exactamente igual que antes', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nilo Ferrer', username: 'nilo' }, 3);
  assert.equal(c.ev('miAdaptacion()').activa, false);
  assert.equal(c.ev('dominioParaAbrir()'), 0.8);
  assert.equal(c.ev('retosDeExpedicion("mission")'), c.ev('ECO().missionQuestions'));
  assert.equal(c.ev('retosDeExpedicion("bazar")'), c.ev('ECO().bazarQuestions'));
});

test('con la casilla apagada, los valores guardados se ignoran enteros', () => {
  /* El docente prueba una adaptación, la apaga y se va. Lo que dejó escrito
     no puede seguir actuando a espaldas suyas. */
  const c = conAdaptacion(cargarApp(), { activa: false, retos: 3, techo: 1, dominio: 0.5, voz: 'nunca' });
  assert.equal(c.ev('miAdaptacion()').activa, false);
  assert.equal(c.ev('dominioParaAbrir()'), 0.8);
  assert.equal(c.ev('retosDeExpedicion("mission")'), c.ev('ECO().missionQuestions'));
});

/* ── Retos por expedición ── */

test('menos retos por expedición: quien se cansa al cuarto no falla los dos últimos por cansancio', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, retos: 4 });
  assert.equal(c.ev('retosDeExpedicion("mission")'), 4);
});

test('la expedición la monta con ese número, no con el de la clase', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, retos: 3 });
  assert.match(leer('js/game.js'), /const total = retosDeExpedicion\(mission\.kind\)/,
    'startMission tiene que preguntar por el alumno, no leer ECO() directamente');
});

test('el Encargo del Bazar, que ya es corto, se acorta en proporción y nunca baja de dos', () => {
  const c = cargarApp();
  const base = c.ev('ECO().bazarQuestions');
  conAdaptacion(c, { activa: true, retos: 3 });
  const n = c.ev('retosDeExpedicion("bazar")');
  assert.ok(n >= 2, 'un encargo de un solo reto no es un encargo');
  assert.ok(n <= base, 'la adaptación acorta, no alarga');
});

test('un número absurdo en retos no rompe la expedición', () => {
  const c = cargarApp();
  const base = c.ev('ECO().missionQuestions');
  conAdaptacion(c, { activa: true, retos: 999 });
  assert.ok(c.ev('retosDeExpedicion("mission")') <= 12);
  conAdaptacion(c, { activa: true, retos: -4 });
  assert.ok(c.ev('retosDeExpedicion("mission")') >= 3);
});

/* ── El techo de dificultad ── */

test('una racha con suerte no puede subirle por encima de su techo', () => {
  /* Sin techo, seis aciertos seguidos suben de nivel. Con techo 2, no. */
  const c = conAdaptacion(cargarApp(), { activa: true, techo: 2 });
  c.ev('S.adaptive.tier = 2');
  for (let i = 0; i < 10; i++) c.ev('recordFirstTry')(true, 3000);
  assert.equal(c.ev('S.adaptive.tier'), 2, 'el techo manda sobre la subida');
});

test('sin techo, esa misma racha sí sube: el techo es lo que cambia, no el motor', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nilo Ferrer', username: 'nilo' }, 3);
  c.ev('S.adaptive.tier = 2');
  for (let i = 0; i < 10; i++) c.ev('recordFirstTry')(true, 3000);
  assert.ok(c.ev('S.adaptive.tier') > 2);
});

test('bajar de nivel nunca se le impide: el techo es un techo, no un suelo', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, techo: 3 });
  c.ev('S.adaptive.tier = 3');
  for (let i = 0; i < 10; i++) c.ev('recordFirstTry')(false, 9000);
  assert.ok(c.ev('S.adaptive.tier') < 3, 'si se hunde, se baja igual que a cualquiera');
});

test('poner el techo por debajo del nivel actual le baja ya, sin esperar diez retos', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, techo: 2 });
  c.ev('S.adaptive.tier = 5');
  for (let i = 0; i < 6; i++) c.ev('recordFirstTry')(true, 3000);
  assert.equal(c.ev('S.adaptive.tier'), 2);
});

/* ── La puerta al estrato siguiente ── */

test('la puerta baja hasta donde diga el docente, pero nunca por debajo del 50 %', () => {
  const c = cargarApp();
  conAdaptacion(c, { activa: true, dominio: 0.65 });
  assert.equal(c.ev('dominioParaAbrir()'), 0.65);
  conAdaptacion(c, { activa: true, dominio: 0.2 });
  assert.equal(c.ev('dominioParaAbrir()'), 0.5, 'por debajo de la mitad no es adaptar, es regalar el camino');
  conAdaptacion(c, { activa: true, dominio: 0.95 });
  assert.equal(c.ev('dominioParaAbrir()'), 0.8, 'tampoco se le puede poner MÁS listón que al resto');
  conAdaptacion(c, { activa: true, dominio: 'mucho' });
  assert.equal(c.ev('dominioParaAbrir()'), 0.8, 'un valor inservible cae en el de todos');
});

test('con la puerta bajada, el estrato siguiente se abre y deja de repetir el mismo pozo', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, dominio: 0.6 });
  const rama = c.ev('playableBranchIds()')[0];
  const orden = c.ev('STRATA_ORDER');
  const st = c.ev('getStratum')(rama, orden[0]);
  st.recent_sessions = [0.7, 0.7, 0.7];
  st.attempts = 3;
  c.ev('saveState()');
  /* dos sesiones al 0,65: por encima de SU puerta, por debajo del 0,8 */
  c.ev('updateMastery')(rama, orden[0], 0.65);
  c.ev('updateMastery')(rama, orden[0], 0.65);
  const abierto = orden.slice(1).some(s => c.ev('getStratum')(rama, s).status !== 'locked');
  assert.ok(abierto, 'tenía que haberse abierto algo por delante');
});

/* ══ LA LÍNEA QUE NO SE CRUZA ══
   Todo lo de arriba abre puertas. Nada de ello puede cambiar lo que la app
   dice que este alumno ha demostrado. */

test('avanzar con la puerta bajada NO le marca el estrato como dominado', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, dominio: 0.6 });
  const rama = c.ev('playableBranchIds()')[0];
  const orden = c.ev('STRATA_ORDER');
  for (let i = 0; i < 4; i++) c.ev('updateMastery')(rama, orden[0], 0.65);
  const st = c.ev('getStratum')(rama, orden[0]);
  assert.ok(st.mastery < 0.8);
  assert.notEqual(st.status, 'mastered', 'un 65 % no es dominar, se le adapte o no');
  assert.ok(!st.ever_mastered);
});

test('ni le suma un bloque dominado al trimestre, que es lo que ve la familia', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, dominio: 0.5 });
  const rama = c.ev('playableBranchIds()')[0];
  const orden = c.ev('STRATA_ORDER');
  const antes = c.ev('trimesterBucket()').strata;
  for (let i = 0; i < 4; i++) c.ev('updateMastery')(rama, orden[0], 0.6);
  assert.equal(c.ev('trimesterBucket()').strata, antes,
    'el informe de la familia cuenta lo demostrado, no lo permitido');
});

test('el mapa dibujado sigue midiéndose con el 0,8 de todos', () => {
  assert.match(leer('js/state.js'), /function mapRevealPct[\s\S]{0,400}mastery >= 0\.8/,
    'si el mapa usara la puerta del alumno, le diría que ha excavado lo que no ha excavado');
});

test('el código dice con qué mide cada cosa: la puerta en un sitio, el dominio en otro', () => {
  const s = leer('js/state.js');
  /* Las tres decisiones permanentes —dominado, ever_mastered, recuento del
     trimestre— van con 0,8 literal. Solo st.altas usa la puerta del alumno. */
  assert.match(s, /if \(st\.mastery >= 0\.8\) st\.status = 'mastered'/);
  assert.match(s, /st\.mastery >= 0\.8 && !st\.ever_mastered/);
  assert.match(s, /st\.altas = st\.mastery >= dominioParaAbrir\(S\)/);
});

/* ── La Cámara del Guardián ── */

test('la Cámara se le abre con SU dominio: si no, no llegaría nunca a la prueba', () => {
  assert.match(leer('js/state.js'), /function guardianStatus[\s\S]{0,700}const puerta = dominioParaAbrir\(S\)/);
});

test('pero el listón para superarla es el mismo para todos', () => {
  /* La Cámara es la prueba sumativa: si su aprobado también se le bajara,
     el fragmento recuperado dejaría de significar lo mismo para cada niño. */
  const g = leer('js/game.js');
  assert.match(g, /const superada = accuracy >= \(g\.passAccuracy \|\| 0\.8\)/);
  const i = g.indexOf('const superada = accuracy');
  assert.ok(!/dominioParaAbrir|miAdaptacion/.test(g.slice(i - 900, i + 300)),
    'nada de la adaptación puede tocar el aprobado de la Cámara');
});

/* ── La lectura en voz alta ── */

test('con «siempre», un toque sin querer en su Campamento no se la quita para el curso', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, voz: 'siempre' });
  c.ev('VOZ.disponible = true');
  c.ev('S.profile.accessibility = { read_aloud: false }');
  assert.equal(c.ev('vozActiva()'), true);
});

test('con «nunca», tampoco se la puede poner él', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, voz: 'nunca' });
  c.ev('VOZ.disponible = true');
  c.ev('S.profile.accessibility = { read_aloud: true }');
  assert.equal(c.ev('vozActiva()'), false);
});

test('sin decir nada de la voz, decide él, como siempre', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, retos: 4 });
  c.ev('VOZ.disponible = true');
  c.ev('S.profile.accessibility = { read_aloud: true }');
  assert.equal(c.ev('vozActiva()'), true);
  c.ev('S.profile.accessibility = { read_aloud: false }');
  assert.equal(c.ev('vozActiva()'), false);
});

/* ── Lo que el niño ve ── */

test('el niño no ve la etiqueta en ninguna parte: nota los efectos, nunca el nombre', () => {
  /* En las tres pantallas del alumno, quitando comentarios, la palabra solo
     puede aparecer como llamada a miAdaptacion(). Nunca como texto. */
  const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of ['js/play.js', 'js/ui.js', 'js/game.js']) {
    const restos = sinComentarios(leer(f))
      .split(/\n/)
      .filter(l => /adaptaci/i.test(l) && !/miAdaptacion|adaptacionDe/.test(l));
    assert.deepEqual(restos, [], `${f} nombra la adaptación delante del alumno`);
  }
});

/* ── Lo que el docente ve ── */

test('el docente tiene un botón de adaptación en cada alumno de la lista', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /data-adapta="\$\{esc\(diaryKey\(r\)\)\}"/);
});

test('sin el diario del alumno aquí, se dice en vez de crear un segundo documento suyo', () => {
  const c = cargarApp();
  const caja = c.ev('panelDeAdaptacion')('u:fantasma', { name: 'Nilo Ferrer', username: 'nilo' });
  assert.match(caja.innerHTML, /no está en este equipo/);
  assert.ok(!/ad-activa/.test(caja.innerHTML), 'no se enseñan palancas que no se pueden guardar');
});

test('la ficha avisa de que esto abre la puerta y no cambia lo que significa dominar', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('saveState()');
  c.ev('closeDiary()');
  const caja = c.ev('panelDeAdaptacion')('u:vega', { name: 'Vega Serrano', username: 'vega' });
  assert.match(caja.innerHTML, /ad-activa/);
  assert.match(caja.innerHTML, /no cambia lo que significa dominar/);
});

test('escribir la adaptación no deja abierto el diario de otro alumno', () => {
  /* El bug caro: el docente toca una palanca desde la lista y se queda con el
     diario de ese niño abierto sin saberlo. Todo lo que haga después va ahí. */
  assert.match(leer('js/teacher.js'),
    /const escribir = \(campo, valor\) => \{[\s\S]{0,320}if \(antes\) openDiaryKey\(antes\); else closeDiary\(\);/);
});

test('la nota del docente no sale en el informe de la familia', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Vega Serrano', username: 'vega', grade: 3 }]);
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('S.profile.adaptacion = { activa: true, retos: 4, nota: "Dislexia, acuerdo de octubre" }');
  c.ev('saveState()');
  const html = c.ev('informeFamilia')(c.ev('S'));
  assert.ok(html);
  assert.ok(!/Dislexia/.test(html), 'esa nota es del registro del docente, no de la familia');
});

/* ── El panel de clase ── */

test('el resumen del alumno dice si va adaptado, para que el docente lea sus señales con eso delante', () => {
  const c = conAdaptacion(cargarApp(), { activa: true, retos: 4 });
  assert.equal(c.ev('buildSummaryOf')(c.ev('S')).adaptado, true);
});

test('y la tarjeta de clase lo enseña, sin decir de qué adaptación se trata', () => {
  const a = leer('js/aula.js');
  assert.match(a, /s\.adaptado \? `<span class="student-adaptado"/);
  const i = a.indexOf('student-adaptado');
  assert.ok(!/nota/.test(a.slice(i, i + 200)), 'la tarjeta no filtra el diagnóstico a la pizarra');
});

test('la adaptación viaja en el diario, no en la lista: se aplica también en casa', () => {
  assert.ok(!/adaptacion/.test(leer('js/config.js')),
    'si viviera en la lista de clase se quedaría en este equipo y no llegaría a casa');
  assert.match(leer('js/teacher.js'), /S\.profile\.adaptacion =/);
});
