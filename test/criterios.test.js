/* La evaluación por criterios: el puente entre lo que mide la app y lo que
   pide el centro.

   Atlas no pone notas a propósito, y esto no las pone. Lo que se fija aquí es
   justamente esa frontera: que se reúna la evidencia por criterio, que se diga
   cuánta hay detrás de cada cifra, que no se proponga un nivel cuando no hay
   con qué, y que nada de esto se le enseñe nunca a un niño ni a su familia. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const CRITERIOS = [
  { id: 'c1', codigo: 'MAT.2.1', texto: 'Resuelve problemas de suma y resta.',
    conceptos: ['suma_llevada', 'resta_llevada'] },
  { id: 'c2', codigo: 'LEN.3.4', texto: 'Ortografía trabajada.', conceptos: ['orto_tilde'] }
];

function alumnoCon(c, { aciertos, fallos, concepto }) {
  c.ev('createState')('V');
  for (let i = 0; i < aciertos; i++) c.ev('recordConcepto')(concepto, true, 'aplicar');
  for (let i = 0; i < fallos; i++) c.ev('recordConcepto')(concepto, false, 'aplicar');
  return c.ev('S');
}

/* ── La evidencia ── */

test('junta los intentos de todos los conceptos de un criterio', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 6; i++) c.ev('recordConcepto')('suma_llevada', true, 'aplicar');
  for (let i = 0; i < 4; i++) c.ev('recordConcepto')('resta_llevada', i < 1, 'aplicar');
  const r = c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, null);
  assert.equal(r.filas[0].intentos, 10);
  assert.equal(r.filas[0].aciertos, 7);
  assert.equal(r.filas[0].pct, 70);
  assert.equal(r.filas[0].nivel, 'Bien');
});

test('un criterio sin intentos no inventa un cero', () => {
  /* Un cero y «no lo hemos trabajado» se parecen en una tabla y no son lo
     mismo: uno se lleva a la nota y el otro a la programación. */
  const c = cargarApp();
  c.ev('createState')('V');
  const r = c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, null);
  assert.equal(r.filas[1].pct, null);
  assert.equal(r.filas[1].nivel, '');
});

test('con pocos intentos no se propone nivel', () => {
  /* Un 100 % de tres respuestas no es un sobresaliente: es un 100 % de tres
     respuestas. */
  const c = cargarApp();
  alumnoCon(c, { aciertos: 3, fallos: 0, concepto: 'suma_llevada' });
  const f = c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, null).filas[0];
  assert.equal(f.pct, 100);
  assert.equal(f.suficiente, false);
  assert.equal(f.nivel, '', 'la cifra sí, el nivel no');
});

test('el mínimo de evidencia es el mismo para todos', () => {
  const c = cargarApp();
  const min = c.ev('CRITERIO_MIN_INTENTOS');
  alumnoCon(c, { aciertos: min, fallos: 0, concepto: 'suma_llevada' });
  assert.equal(c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, null).filas[0].suficiente, true);
});

test('los niveles son los del boletín, y el corte está a la vista', () => {
  const c = cargarApp();
  const nivel = c.ev('nivelDeCriterio');
  assert.equal(nivel(95), 'Sobresaliente');
  assert.equal(nivel(85), 'Notable');
  assert.equal(nivel(70), 'Bien');
  assert.equal(nivel(55), 'Suficiente');
  assert.equal(nivel(30), 'Insuficiente');
  assert.equal(nivel(0), 'Insuficiente');
});

/* ── Por trimestre ── */

test('se puede acotar al trimestre, que es lo que pide el centro', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 9; i++) c.ev('recordConcepto')('suma_llevada', true, 'aplicar');
  const tri = c.ev('currentTrimesterIndex()');
  const deEste = c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, tri).filas[0];
  assert.equal(deEste.intentos, 9);
  const otro = tri === 0 ? 1 : 0;
  assert.equal(c.ev('evidenciaDeCriterios')(c.ev('S'), CRITERIOS, otro).filas[0].intentos, 0);
});

test('un diario anterior al desglose lo dice, en vez de repartir a ojo', () => {
  const c = cargarApp();
  const s = c.ev('defaultState')('V');
  s.metrics.errors_by_concept = { suma_llevada: { errors: 2, attempts: 10 } };
  const r = c.ev('evidenciaDeCriterios')(s, CRITERIOS, 0);
  assert.equal(r.hayTrimestres, false);
  assert.equal(r.filas[0].intentos, 0, 'no se le atribuye a ningún trimestre');
  assert.equal(c.ev('evidenciaDeCriterios')(s, CRITERIOS, null).filas[0].intentos, 10,
    'pero el total sigue estando');
});

/* ── El CSV ── */

test('el CSV ancho es una fila por alumno y una columna por criterio', () => {
  const c = cargarApp();
  c.ev('tablaEvaluacion = ' + JSON.stringify({
    trimestre: null, periodo: 'x', calculadaEl: '2026-09-09', sinDatos: [], hayTrimestres: true,
    criterios: [{ id: 'c1', codigo: 'MAT.2.1', texto: 'Suma y resta' }],
    filas: [{ clave: 'u:v', nombre: 'Vega S.', celdas: [{ pct: 90, aciertos: 9, intentos: 10, nivel: 'Sobresaliente', suficiente: true }] }]
  }));
  const csv = c.ev('csvDeEvaluacion')(false);
  const lineas = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lineas[0], 'Alumno;MAT.2.1');
  assert.equal(lineas[1], 'Vega S.;90');
  assert.ok(csv.startsWith('﻿'), 'con BOM, que es lo que abre bien un Excel en español');
});

test('y el largo lleva los intentos, que es de donde sale la cifra', () => {
  const c = cargarApp();
  c.ev('tablaEvaluacion = ' + JSON.stringify({
    trimestre: null, periodo: 'x', calculadaEl: '2026-09-09', sinDatos: [], hayTrimestres: true,
    criterios: [{ id: 'c1', codigo: 'MAT.2.1', texto: 'Suma y resta' }],
    filas: [{ clave: 'u:v', nombre: 'Vega S.', celdas: [{ pct: 90, aciertos: 9, intentos: 10, nivel: 'Sobresaliente', suficiente: true }] }]
  }));
  const lineas = c.ev('csvDeEvaluacion')(true).replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lineas[0], 'Alumno;Criterio;Texto;Aciertos;Intentos;Porcentaje;Nivel');
  assert.equal(lineas[1], 'Vega S.;MAT.2.1;Suma y resta;9;10;90;Sobresaliente');
});

test('un texto con punto y coma no rompe la columna', () => {
  const c = cargarApp();
  const campo = c.ev('csvCampo');
  assert.equal(campo('Suma; resta'), '"Suma; resta"');
  assert.equal(campo('Dice "esto"'), '"Dice ""esto"""');
  assert.equal(campo('normal'), 'normal');
});

/* ── Leerlos del currículo ── */

test('lo que devuelve el modelo se limpia antes de guardarse', () => {
  const c = cargarApp();
  const l = c.ev('limpiarCriterios')([
    { codigo: 'CE.3.1', texto: '  Resuelve   problemas de suma. ',
      saberes: ['Estrategias.', ''], conceptos: ['suma_llevada', 'inventado', 'suma_llevada'] },
    { codigo: 'X', texto: '', saberes: [], conceptos: [] },
    'basura'
  ]);
  assert.equal(l.length, 1, 'un criterio sin texto no es un criterio');
  assert.equal(l[0].texto, 'Resuelve problemas de suma.');
  assert.deepEqual(l[0].conceptos, ['suma_llevada'], 'ni inventados ni repetidos');
  assert.deepEqual(l[0].saberes, ['Estrategias.']);
});

test('un concepto que no está en el catálogo se cae', () => {
  /* Es lo que llega de fuera: si se colara, la tabla mediría algo que no
     existe y saldría siempre vacía sin decir por qué. */
  const c = cargarApp();
  const l = c.ev('limpiarCriterios')([
    { codigo: '1', texto: 'x', saberes: [], conceptos: ['<script>', 'resta_llevada'] }]);
  assert.deepEqual(l[0].conceptos, ['resta_llevada']);
});

test('el prompt prohíbe reescribir el criterio y prohíbe inventar conceptos', () => {
  /* Lo que va a la programación del centro tiene que ser lo que dice el
     currículo, palabra por palabra. Y un emparejamiento forzado da una
     evaluación de otra cosa. */
  const g = leer('js/generador.js');
  const i = g.indexOf('function promptCriterios');
  const cuerpo = g.slice(i, g.indexOf('\n}\n', i));
  assert.match(cuerpo, /COPIADO LITERALMENTE/);
  assert.match(cuerpo, /NO inventes criterios/);
  assert.match(cuerpo, /Y DE NINGUNA OTRA/);
  assert.match(cuerpo, /devuelve la lista VACÍA/);
});

test('el esquema pide los saberes junto a cada criterio', () => {
  const c = cargarApp();
  const e = c.ev('esquemaCriterios()');
  const props = e.properties.criterios.items;
  assert.deepEqual(props.required.sort(), ['codigo', 'conceptos', 'saberes', 'texto']);
  assert.equal(props.additionalProperties, false);
  /* El esquema de salida no admite límites de tamaño: se rechaza la petición
     entera con un 400 antes de escribir nada. */
  const texto = JSON.stringify(e);
  assert.ok(!/minItems|maxItems|minLength|maxLength|minimum|maximum/.test(texto));
});

test('la función reparte el encargo por su paso, y el validador es el mismo', () => {
  const main = leer('functions/generador/src/main.js');
  assert.match(main, /paso === 'criterios'/);
  assert.match(main, /limpiarCriterios/);
  /* La copia del validador que corre en el servidor no puede quedarse vieja:
     si se separan, uno acepta lo que el otro rechaza. */
  const copia = leer('functions/generador/src/generador.js');
  assert.match(copia, /function limpiarCriterios/);
  assert.match(copia, /function promptCriterios/);
});

test('sin currículo pegado no se llama a la API', () => {
  const main = leer('functions/generador/src/main.js');
  const i = main.indexOf("paso === 'criterios'");
  const cuerpo = main.slice(i, main.indexOf('Tercer encargo', i));
  assert.match(cuerpo, /reason: 'sin-curriculo'/);
  assert.match(cuerpo, /reason: 'sin-clave'/, 'ni sin clave de API');
  assert.ok(cuerpo.indexOf('sin-curriculo') < cuerpo.indexOf('messages.create'),
    'se comprueba antes de gastar la cuenta');
});

/* ── Las actividades de cada criterio ── */

test('dice cuántos retos hay de lo que mide un criterio', () => {
  /* Marcar conceptos y quedarse sin actividades da una tabla vacía que se
     descubre en diciembre. */
  const c = cargarApp();
  const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.sites'));
  const br = l[0].branches[0];
  br.bank = { recordar: [
    { question: 'a', options: ['1', '2', '3', '4'], answer: 0, skill: 'suma_llevada' },
    { question: 'b', options: ['1', '2', '3', '4'], answer: 0, skill: 'suma_llevada' }] };
  c.ev('setTeacherConfig')('sites', l);
  const cuenta = c.ev('retosPorConcepto()');
  assert.equal(cuenta.suma_llevada, 2);
  const act = c.ev('actividadesDeCriterio')(CRITERIOS[0], cuenta);
  assert.equal(act.total, 2);
  assert.deepEqual(act.sin, ['resta_llevada'], 'y dice de cuál no hay ninguno');
});

test('un criterio sin ningún reto se avisa en su ficha', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /sin retos de esto todavía/);
  assert.match(t, /La tabla de evaluación no[\s\S]{0,20}podrá decir nada de esa parte/);
});

test('un criterio que la app no mide se propone sin marcar', () => {
  /* Se puede añadir igual —está en su programación— pero no se cuela solo. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('async function leerCriteriosDelCurriculo');
  const cuerpo = t.slice(i, t.indexOf('\n}\n', i));
  assert.match(cuerpo, /marcado: c\.conceptos\.length > 0/);
});

test('nada se guarda sin revisarlo', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf('function pintarPropuestaDeCriterios');
  const cuerpo = t.slice(i, t.indexOf('\n}\n', i));
  assert.match(cuerpo, /cr-aceptar/, 'hace falta aceptar');
  assert.match(cuerpo, /cr-descartar/);
  assert.ok(!/setTeacherConfig\('criterios'/.test(cuerpo.slice(0, cuerpo.indexOf('cr-aceptar'))),
    'no se escribe nada al pintarla');
});

/* ── La frontera que no se cruza ── */

test('los criterios no viajan a las tablets del alumnado', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('criterios', CRITERIOS);
  const paquete = c.ev('configParaCompartir()');
  assert.equal(paquete.criterios, undefined);
  assert.ok(c.ev('NO_SE_COMPARTE').includes('criterios'));
});

test('nada de esto entra en el informe de la familia', () => {
  /* El informe no lleva notas ni porcentajes, y esto es exactamente lo que no
     puede colarse dentro. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf('function datosDelInforme');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.ok(!/evidenciaDeCriterios|nivelDeCriterio|criterios/.test(cuerpo));
});

test('ni el niño ve un nivel por ningún lado', () => {
  const play = leer('js/play.js');
  assert.ok(!/nivelDeCriterio|evidenciaDeCriterios/.test(play));
});

test('la pantalla dice que es evidencia y no una nota', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf('function pintarTablaDeEvaluacion');
  const cuerpo = t.slice(i, t.indexOf('\n}\n', i));
  assert.match(cuerpo, /evidencia, no una nota/i);
  assert.match(cuerpo, /aciertos y los intentos que hay detrás/);
});
