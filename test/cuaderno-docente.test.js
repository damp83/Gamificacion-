/* El Cuaderno del Docente es una lectura pedagógica SOBRE el alumno: su nivel
   de dificultad adaptativa y el objetivo de acierto del motor, el tiempo real
   de trabajo, «responde en menos de 2 s, posible sesión al azar», la lista de
   lo que le cuesta. Lo que se prueba aquí es que el niño no llega a esa
   pantalla, y que el docente sí. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

/* Deja en el equipo el diario de una alumna que ya ha jugado. */
function conDiarioDeVega() {
  const ctx = cargarApp();
  ctx.ev('openDiary')('Vega Serrano', 4);
  ctx.ev('startMission')('numeracion', 'recordar');
  ctx.ev('while (mission) { answerQuestion(mission.current.answer); if (!advance()) break; }');
  ctx.ev('finishMission()');
  ctx.ev('closeDiary()');
  return ctx;
}

test('en la sesión de un alumno, el cuaderno docente no se puede abrir', () => {
  const ctx = conDiarioDeVega();
  ctx.ev('openDiary')('Vega Serrano', 4);
  assert.equal(ctx.ev('teacherOnly'), false);
  assert.equal(ctx.ev('enModoLectura()'), false);
  assert.equal(ctx.ev('puedeVerCuadernoDocente()'), false);
});

test('consultando el cuaderno de un alumno, el docente sí lo ve', () => {
  /* Es justo lo que ha venido a mirar: la lectura pedagógica de ESE niño. */
  const ctx = conDiarioDeVega();
  ctx.ev('teacherOnly = true');
  ctx.ev('abrirDiarioLectura')('Vega Serrano');
  assert.equal(ctx.ev('puedeVerCuadernoDocente()'), true);
});

test('al salir de la consulta deja de verse', () => {
  /* Quien manda cambia a mitad de sesión. Si la pestaña se quedara puesta,
     el siguiente en tocar la tablet sería un niño. */
  const ctx = conDiarioDeVega();
  ctx.ev('teacherOnly = true');
  ctx.ev('abrirDiarioLectura')('Vega Serrano');
  ctx.ev('cerrarLectura()');
  ctx.ev('teacherOnly = false');
  assert.equal(ctx.ev('puedeVerCuadernoDocente()'), false);
});

test('el docente en su portal lo tiene abierto', () => {
  const ctx = cargarApp();
  ctx.ev('teacherOnly = true');
  assert.equal(ctx.ev('puedeVerCuadernoDocente()'), true);
});

test('la pestaña nace escondida en el HTML', () => {
  /* Nace escondida y la enseña show(): al revés, entre que carga la página y
     se navega por primera vez, el niño la vería. */
  const tab = HTML.match(/<button data-nav="dashboard"[^>]*>/);
  assert.ok(tab, 'la pestaña sigue existiendo');
  assert.match(tab[0], /class="tab hidden"/, 'nace escondida');
  assert.match(tab[0], /id="tab-dashboard"/, 'con el id por el que show() la busca');
});

test('show() busca la pestaña por ese mismo id', () => {
  /* Son dos ficheros distintos: si alguien renombra el id en index.html, la
     pestaña dejaría de esconderse sin que nada fallara a la vista. */
  const ui = fs.readFileSync(path.join(RAIZ, 'js', 'ui.js'), 'utf8');
  assert.match(ui, /#tab-dashboard/);
});

test('el cuaderno docente no ofrece puertas a los datos de la clase', () => {
  /* Antes tenía dos atajos a la vista general y a la configuración, donde
     está la hoja con las contraseñas de los 25. Se sale por la barra de
     consulta; el PIN protege igual, pero un atajo menos es una tentación
     menos delante de una clase. */
  const seccion = HTML.split('<section id="screen-dashboard"')[1].split('</section>')[0];
  assert.ok(!/btn-open-class|btn-open-config/.test(seccion));
  assert.ok(!/data-nav="(class|config|aula)"/.test(seccion));
});
