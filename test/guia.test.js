/* La guía del docente que entra por primera vez.

   Un maestro que abre esto aterriza en la sala de mapas y ve tres puertas.
   Nadie le ha dicho para qué sirve desde SU lado, y lo más importante —que
   puede dar clase con un solo dispositivo— es lo menos evidente: cualquiera
   asume que hace falta una tablet por niño.

   Lo que se fija aquí es lo que distingue esta guía de un papel: que la lista
   de «por dónde empiezo» mire el estado de verdad. Una lista que hay que ir
   tachando a mano es una lista que nadie tacha. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const paso = (c, id) => c.ev('JSON.parse(JSON.stringify(pasosGuia()))').find(p => p.id === id);

test('un docente recién llegado tiene todos los pasos por dar', () => {
  const c = cargarApp();
  const pasos = c.ev('JSON.parse(JSON.stringify(pasosGuia()))');
  assert.ok(pasos.length >= 4, 'hacen falta pasos que dar');
  assert.ok(pasos.every(p => !p.hecho), 'sin nada hecho, nada puede salir marcado');
  /* Y cada uno dice qué falta, no solo que falta. */
  pasos.forEach(p => assert.ok(p.falta && p.falta.length > 3, `${p.id} no dice qué le falta`));
});

test('apuntar a la clase marca su paso, con cuántos son', () => {
  const c = cargarApp();
  assert.equal(paso(c, 'clase').hecho, false);
  c.ev('setTeacherConfig')('roster', [{ name: 'Vega', grade: 4 }, { name: 'Bruno', grade: 4 }]);
  const p = paso(c, 'clase');
  assert.equal(p.hecho, true);
  assert.match(p.ya, /2 exploradores/);
});

test('un diario en este equipo marca el turno dirigido', () => {
  /* Es la señal honesta: si hay diario, alguien ha excavado aquí. */
  const c = cargarApp();
  assert.equal(paso(c, 'turno').hecho, false);
  c.ev("const m = loadDiaries(); m['u:vega'] = defaultState('Vega'); saveDiaries(m);");
  assert.equal(paso(c, 'turno').hecho, true);
});

test('la copia de seguridad se marca solo cuando se ha hecho alguna', () => {
  const c = cargarApp();
  assert.equal(paso(c, 'copia').hecho, false);
  assert.match(paso(c, 'copia').falta, /nunca/);
  c.ev('ATLAS_CONFIG_META.backupAt = Date.now(); saveConfigMeta();');
  const p = paso(c, 'copia');
  assert.equal(p.hecho, true);
  assert.match(p.ya, /hoy/);
});

test('sin copia y con diarios que perder, el paso urge', () => {
  /* Es lo único de la lista que puede costarle el curso a alguien. */
  const c = cargarApp();
  assert.equal(paso(c, 'copia').urgente, false, 'sin diarios no hay nada que perder');
  c.ev("const m = loadDiaries(); m['u:vega'] = defaultState('Vega'); saveDiaries(m);");
  assert.equal(paso(c, 'copia').urgente, true);
});

test('los pasos opcionales no cuentan como pendientes', () => {
  /* Que la lista quede a medias a propósito no puede parecer que falta algo:
     si contaran, la tarjeta diría «te quedan 2 pasos» para siempre. */
  const c = cargarApp();
  const pasos = c.ev('JSON.parse(JSON.stringify(pasosGuia()))');
  const opcionales = pasos.filter(p => p.opcional);
  assert.ok(opcionales.length, 'alguno tiene que ser opcional');
  opcionales.forEach(p => assert.ok(p.falta, `${p.id} no dice que es opcional`));

  c.ev('setTeacherConfig')('roster', [{ name: 'Vega', grade: 4 }]);
  c.ev("const m = loadDiaries(); m['u:vega'] = defaultState('Vega'); saveDiaries(m);");
  c.ev('ATLAS_CONFIG_META.backupAt = Date.now(); saveConfigMeta();');
  assert.equal(c.ev('pasosGuiaPendientes()'), 0,
    'con lo obligatorio hecho no puede quedar nada pendiente');
});

test('la tarjeta de la sala de mapas se encoge, pero no se va', () => {
  /* Dentro de dos meses habrá que volver a leerla, o enseñársela a quien coja
     la clase. Esconderla del todo sería perderla. */
  const c = cargarApp();
  c.ev('setTeacherConfig')('roster', [{ name: 'Vega', grade: 4 }]);
  c.ev("const m = loadDiaries(); m['u:vega'] = defaultState('Vega'); saveDiaries(m);");
  c.ev('ATLAS_CONFIG_META.backupAt = Date.now(); ATLAS_CONFIG_META.guiaAt = Date.now(); saveConfigMeta();');
  c.ev('renderGuiaDocente()');
  const caja = "$('#teacher-guia')";
  assert.equal(c.ev(`${caja}.classList.contains('hidden')`), false, 'se ha escondido del todo');
  assert.equal(c.ev(`${caja}.classList.contains('teacher-guia-mini')`), true);
  assert.match(c.ev(`${caja}.innerHTML`), /Cómo funciona/);
});

test('mientras queden pasos, la tarjeta va entera y dice cuántos', () => {
  const c = cargarApp();
  c.ev('renderGuiaDocente()');
  const html = c.ev("$('#teacher-guia').innerHTML");
  assert.match(html, /Primera vez/);
  assert.match(html, /pasos/);
  assert.equal(c.ev("$('#teacher-guia').classList.contains('teacher-guia-mini')"), false);
});

test('abrirla la da por vista, y entonces deja de presentarse como nueva', () => {
  const c = cargarApp();
  assert.ok(!c.ev('ATLAS_CONFIG_META.guiaAt'));
  c.ev('renderGuia()');
  assert.ok(c.ev('ATLAS_CONFIG_META.guiaAt') > 0, 'no se ha apuntado que ya se vio');
  /* Con todo hecho y ya vista, se encoge; sin haberla visto, no. */
  c.ev('setTeacherConfig')('roster', [{ name: 'Vega', grade: 4 }]);
  c.ev("const m = loadDiaries(); m['u:vega'] = defaultState('Vega'); saveDiaries(m);");
  c.ev('ATLAS_CONFIG_META.backupAt = Date.now(); saveConfigMeta();');
  c.ev('renderGuiaDocente()');
  assert.equal(c.ev("$('#teacher-guia').classList.contains('teacher-guia-mini')"), true);
});

test('la guía explica el bucle y lo que hace el docente, no solo los pasos', () => {
  /* Si fuera solo una lista de tareas no respondería a «¿para qué sirve?», que
     es la primera pregunta. */
  const c = cargarApp();
  c.ev('renderGuia()');
  const t = String(c.ev("$('#guia-body').innerHTML")).replace(/<[^>]+>/g, ' ');
  assert.match(t, /el tesoro se llama aprender/i);
  assert.match(t, /Recordar, Comprender, Aplicar y Analizar/);
  assert.match(t, /sesión de diez minutos/i);
  assert.match(t, /Antes/); assert.match(t, /Durante/); assert.match(t, /Después/);
  /* Y lo que más cuesta creerse, dicho con todas las letras. */
  assert.match(t, /ni una tablet por niño/i);
});

test('no se llega a la guía sin pasar por el portal del docente', () => {
  /* Misma regla que el resto de lo suyo: una sola puerta, y con PIN. */
  const h = leer('index.html');
  assert.match(h, /id="screen-guia"/);
  assert.equal((h.match(/id="teacher-go-guia"/g) || []).length, 0,
    'el botón lo pinta el guion dentro del portal, no está suelto en el HTML');
  /* Y no es una pestaña del alumno. */
  const tabs = h.slice(h.indexOf('<nav id="tabbar"'), h.indexOf('</nav>', h.indexOf('<nav id="tabbar"')));
  assert.ok(!/data-nav="guia"/.test(tabs), 'la guía no puede ser una pestaña del alumnado');
});

test('la pantalla está registrada y se pinta al entrar en ella', () => {
  const c = cargarApp();
  assert.ok(c.ev('SCREENS').includes('guia'), 'sin registrar, show() no la enseñaría');
  const u = leer('js/ui.js');
  assert.match(u, /screenId === 'guia'.*renderGuia\(\)/s);
});
