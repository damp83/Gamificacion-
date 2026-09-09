/* Las ocho mejoras del informe del alumno.

   El informe es lo único de la plataforma que sale de ella y llega a una
   casa. Lo que se fija aquí no es que se pinte, sino que diga la verdad:
   de qué periodo habla, con qué denominador, con cuánta evidencia detrás, y
   que lo que escribe una persona no se pierda por sincronizar. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const texto = html => html.replace(/<style>[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* Un diario con algo dentro. Uno recién creado recibe a propósito el informe
   corto de «todavía no ha empezado», así que las pruebas del informe largo
   tienen que darle algo que contar. */
function diarioConAlgo(c, nombre) {
  const s = c.ev('defaultState')(nombre || 'Vega');
  s.metrics.questions_answered = 12;
  return s;
}

/* ── M1 · la nota del docente ── */

test('la nota del docente abre el informe, antes que ninguna cifra', () => {
  /* Es lo único de la hoja que ha escrito una persona mirando a ese niño. */
  const c = cargarApp();
  c.ev('guardarNotaDeAlumno')('u:vega', 'Ha dado un salto este trimestre.');
  const s = diarioConAlgo(c, 'Vega');
  const h = c.ev('informeFamilia')(s, { docente: 'Diego Moya', notas: c.ev('notasDeAlumno')('u:vega') });
  const t = texto(h);
  assert.ok(t.includes('Ha dado un salto este trimestre.'));
  assert.ok(t.indexOf('Lo que dice Diego Moya') < t.indexOf('Lo que ya le sale'));
});

test('sin nota escrita, el informe sale como siempre', () => {
  const c = cargarApp();
  const h = c.ev('informeFamilia')(diarioConAlgo(c, 'Vega'), {});
  assert.ok(!/Lo que dice/.test(texto(h)));
});

test('las notas se guardan por diario, no por nombre', () => {
  /* Dos alumnas del mismo nombre no comparten lo que se dice de cada una. */
  const c = cargarApp();
  c.ev('guardarNotaDeAlumno')('u:mara', 'De la de 2.º');
  c.ev('guardarNotaDeAlumno')('u:mara2', 'De la de 4.º');
  assert.equal(c.ev('ultimaNotaDeAlumno')('u:mara').texto, 'De la de 2.º');
  assert.equal(c.ev('ultimaNotaDeAlumno')('u:mara2').texto, 'De la de 4.º');
});

test('dos notas el mismo día son una corrección, no dos momentos', () => {
  const c = cargarApp();
  c.ev('guardarNotaDeAlumno')('u:v', 'primera');
  c.ev('guardarNotaDeAlumno')('u:v', 'corregida');
  const l = c.ev('notasDeAlumno')('u:v');
  assert.equal(l.length, 1);
  assert.equal(l[0].texto, 'corregida');
});

test('las anteriores se conservan con su fecha, para ver el camino', () => {
  const c = cargarApp();
  c.ev('guardarNotaDeAlumno')('u:v', 'diciembre');
  c.ev("ATLAS_CONFIG.notasInforme['u:v'][0].fecha = '2025-12-19'");
  c.ev('guardarNotaDeAlumno')('u:v', 'marzo');
  const h = c.ev('informeFamilia')(diarioConAlgo(c, 'V'), { notas: c.ev('notasDeAlumno')('u:v') });
  const t = texto(h);
  assert.ok(t.includes('marzo'));
  assert.ok(t.includes('diciembre'), 'la anterior sigue estando');
  assert.ok(t.includes('19/12/2025'), 'con su fecha, en castellano');
});

test('no se guardan más de las que caben, y en blanco borra la última', () => {
  const c = cargarApp();
  for (let i = 0; i < 10; i++) {
    c.ev('guardarNotaDeAlumno')('u:v', 'nota ' + i);
    c.ev(`ATLAS_CONFIG.notasInforme['u:v'][ATLAS_CONFIG.notasInforme['u:v'].length - 1].fecha = '2026-0${i % 9 + 1}-01'`);
  }
  assert.ok(c.ev('notasDeAlumno')('u:v').length <= c.ev('NOTAS_TOPE'));
  const antes = c.ev('notasDeAlumno')('u:v').length;
  c.ev('guardarNotaDeAlumno')('u:v', '');
  assert.equal(c.ev('notasDeAlumno')('u:v').length, antes - 1);
});

test('las notas NO viajan al documento que leen los alumnos', () => {
  /* Es lo mismo que las contraseñas: el documento de la clase lo lee toda la
     clase, y esto es lo que el docente dice de UN niño a SU familia. */
  const c = cargarApp();
  c.ev('guardarNotaDeAlumno')('u:vega', 'Le cuesta arrancar.');
  const paquete = c.ev('configParaCompartir()');
  assert.equal(paquete.notasInforme, undefined);
  assert.ok(!JSON.stringify(paquete).includes('Le cuesta arrancar'));
  assert.ok(c.ev('NO_SE_COMPARTE').includes('notasInforme'));
});

test('juntar dos equipos no pierde ninguna nota', () => {
  const c = cargarApp();
  const mezcla = c.ev('mezclarNotas');
  const r = mezcla(
    { 'u:v': [{ fecha: '2025-12-19', texto: 'del portátil' }] },
    { 'u:v': [{ fecha: '2026-03-02', texto: 'de la tablet' }] });
  assert.deepEqual(r['u:v'].map(n => n.texto), ['del portátil', 'de la tablet']);
});

test('y el mismo día gana la de este equipo, que es la que se acaba de ver', () => {
  const c = cargarApp();
  const r = c.ev('mezclarNotas')(
    { 'u:v': [{ fecha: '2026-03-02', texto: 'vieja' }] },
    { 'u:v': [{ fecha: '2026-03-02', texto: 'nueva' }] });
  assert.equal(r['u:v'][0].texto, 'nueva');
});

/* ── M2 · qué puede hacer la familia ── */

test('cada concepto del catálogo dice qué hacer en casa', () => {
  /* «Está trabajando la resta llevando» dice qué pasa, no qué hacer. */
  const c = cargarApp();
  const cs = c.ev('CONCEPTOS');
  const sinCasa = Object.keys(cs).filter(k => !cs[k].casa);
  assert.deepEqual(sinCasa, [], 'todos los conceptos llevan su frase de casa');
});

test('y esa frase sale en el informe, junto a lo que le cuesta', () => {
  const c = cargarApp();
  const s = diarioConAlgo(c, 'Vega');
  s.metrics.errors_by_concept = { resta_llevada: { errors: 5, attempts: 9 } };
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(t.includes('Resta llevando'));
  assert.ok(t.includes(c.ev('CONCEPTOS').resta_llevada.casa.slice(0, 40)));
});

test('las frases de casa no mandan a comprar ni a imprimir nada', () => {
  /* Una casa que no puede comprar ni imprimir tiene que poder hacerlo igual. */
  const c = cargarApp();
  const cs = c.ev('CONCEPTOS');
  for (const k of Object.keys(cs)) {
    assert.doesNotMatch(cs[k].casa, /imprim|ficha|cuadernillo|descarg|comprar la app|suscrip/i, k);
  }
});

/* ── M3 · el informe habla de un trimestre ── */

test('el informe dice de qué periodo habla', () => {
  const c = cargarApp();
  const t = texto(c.ev('informeFamilia')(diarioConAlgo(c, 'V'), {}));
  assert.match(t, /Este informe habla del .*trimestre/);
});

test('la constancia es la del trimestre, no la de siempre', () => {
  const c = cargarApp();
  const s = diarioConAlgo(c, 'V');
  const tri = c.ev('ATLAS_CONFIG.course.trimesters')[c.ev('currentTrimesterIndex()')];
  s.metrics.sessions_log = [
    { date: tri.start, missions: 2, minutes: 10 },
    { date: '2020-01-01', missions: 9, minutes: 400 }   /* de otro curso */
  ];
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(t.includes('1 día trabajado'), 'solo cuenta el del trimestre');
  assert.ok(t.includes('10 minutos'), 'y sus minutos');
  assert.ok(!t.includes('410'), 'lo de hace años no se suma');
});

test('las pruebas de otro trimestre no salen', () => {
  const c = cargarApp();
  const s = diarioConAlgo(c, 'V');
  const tri = c.ev('ATLAS_CONFIG.course.trimesters')[c.ev('currentTrimesterIndex()')];
  s.dig_sites = { ciudad: { numeracion: { strata: {}, guardian: { cleared: true, clearedAt: tri.start,
    attempts: 2, history: [
      { date: '2020-01-01', accuracy: 0.4, passed: false, masteryThen: 0.9 },
      { date: tri.start, accuracy: 0.9, passed: true, masteryThen: 0.9 }] } } } };
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(t.includes('superada'));
  assert.ok(!/2 intentos/.test(t), 'el intento de hace años no cuenta en este trimestre');
});

test('lo que no se acota a un trimestre se dice que no', () => {
  /* Callarlo era lo que hacía imposible comparar dos informes del mismo curso. */
  const c = cargarApp();
  const t = texto(c.ev('informeFamilia')(diarioConAlgo(c, 'V'), {}));
  assert.match(t, /Qué periodo cubre cada parte/);
});

/* ── M4 · números con denominador ── */

test('las pruebas se cuentan con su denominador', () => {
  const c = cargarApp();
  const s = diarioConAlgo(c, 'V');
  const tri = c.ev('ATLAS_CONFIG.course.trimesters')[c.ev('currentTrimesterIndex()')];
  const camara = (id, passed) => ({ strata: {}, guardian: { cleared: passed, attempts: 1,
    history: [{ date: tri.start, accuracy: passed ? 0.9 : 0.4, passed, masteryThen: 0.9 }] } });
  s.dig_sites = { ciudad: { numeracion: camara('numeracion', true), calculo: camara('calculo', false) } };
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(t.includes('Ha superado 1 de 2'), 'un número solo no dice nada');
});

test('singular y plural, que esto se imprime y se firma', () => {
  const c = cargarApp();
  const s = diarioConAlgo(c, 'V');
  const tri = c.ev('ATLAS_CONFIG.course.trimesters')[c.ev('currentTrimesterIndex()')];
  s.metrics.sessions_log = [{ date: tri.start, missions: 1, minutes: 1 }];
  const t = texto(c.ev('informeFamilia')(s, {}));
  assert.ok(t.includes('1 día trabajado'), 'no «1 días»');
  assert.ok(t.includes('1 minuto '), 'no «1 minutos»');
  assert.ok(t.includes('1 expedición'), 'no «1 expediciones»');
});

/* ── M5 · más evidencia antes de «ya le sale» ── */

test('tres aciertos del tirón no bastan para decir «ya le sale»', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 3; i++) c.ev('recordConcepto')('valor_posicional', true);
  assert.equal(c.ev('conceptosDominadosDe')(c.ev('S'), 9).length, 0);
});

test('repartidos en dos días, sí', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 2; i++) c.ev('recordConcepto')('valor_posicional', true);
  c.ev("S.metrics.errors_by_concept.valor_posicional.ultimo = '2000-01-01'");
  c.ev('recordConcepto')('valor_posicional', true);
  assert.deepEqual(c.ev('conceptosDominadosDe')(c.ev('S'), 9).map(x => x.id), ['valor_posicional']);
});

test('a un diario antiguo, sin cuenta de días, no se le vacía el informe', () => {
  /* Quitarle de golpe todo lo que ya sabía hacer sería castigarle por un
     cambio nuestro. */
  const c = cargarApp();
  const s = c.ev('defaultState')('V');
  s.metrics.errors_by_concept = { valor_posicional: { errors: 0, attempts: 6 } };
  assert.equal(c.ev('conceptosDominadosDe')(s, 9).length, 1);
});

/* ── M6 · toda la clase de una vez ── */

test('los informes de la clase van en un documento, uno por página', () => {
  const c = cargarApp();
  const uno = c.ev('datosDelInforme')(diarioConAlgo(c, 'Ana'), {});
  const dos = c.ev('datosDelInforme')(diarioConAlgo(c, 'Leo'), {});
  const html = c.ev('informeDeClase')([uno, dos], { clase: '4.º B' });
  assert.equal((html.match(/<article class="informe">/g) || []).length, 2);
  assert.match(html, /page-break-after: always/, 'uno por hoja al imprimir');
  assert.match(html, /<html lang="es">/);
});

test('el informe de un alumno y el de la clase comparten el estilo', () => {
  /* Dos copias del mismo CSS son dos copias que un día dejan de coincidir. */
  const aula = leer('js/aula.js');
  assert.match(aula, /const ESTILO_INFORME = /);
  assert.equal((aula.match(/\$\{ESTILO_INFORME\}/g) || []).length, 2);
});

test('el informe declara el idioma', () => {
  const c = cargarApp();
  assert.match(c.ev('informeFamilia')(diarioConAlgo(c, 'V'), {}), /<html lang="es">/);
});

/* ── M7 · la divergencia, a la vista ── */

test('la vista de clase pinta la divergencia y dice qué hacer con ella', () => {
  const aula = leer('js/aula.js');
  const i = aula.indexOf('function pintarEvaluacion');
  const cuerpo = aula.slice(i, aula.indexOf('\n}\n', i));
  assert.match(cuerpo, /k\.divergencia/);
  assert.match(cuerpo, /guardianPassRate/);
  /* Y que se diga de quién es el problema: no del niño. */
  assert.match(cuerpo, /no es cosa de los\n?\s*niños|banco de retos/i);
});

test('sin ningún intento no se pinta un cero que no significa nada', () => {
  const c = cargarApp();
  const d = c.ev('buildClassOverview')([
    { id: 'v', name: 'Vega', summary: { v: 1, xp: 10 } }
  ], c.ev('todayStr()'));
  assert.equal(d.kpis.guardianIntentos, 0);
  assert.equal(d.kpis.guardianPassRate, null);
});

/* ── M8 · el nivel donde se rompe ── */

test('se apunta en qué estrato se falla cada concepto', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 3; i++) c.ev('recordConcepto')('resta_llevada', false, 'aplicar');
  c.ev('recordConcepto')('resta_llevada', false, 'analizar');
  const f = c.ev('conceptosFlojosDe')(c.ev('S'), 9)[0];
  assert.equal(f.id, 'resta_llevada');
  assert.equal(f.estrato, 'aplicar', 'donde más se rompe');
});

test('solo se cuentan los fallos: acertar no dice dónde se atasca', () => {
  const c = cargarApp();
  c.ev('createState')('V');
  for (let i = 0; i < 5; i++) c.ev('recordConcepto')('resta_llevada', true, 'recordar');
  for (let i = 0; i < 3; i++) c.ev('recordConcepto')('resta_llevada', false, 'analizar');
  assert.equal(c.ev('conceptosFlojosDe')(c.ev('S'), 9)[0].estrato, 'analizar');
});

test('la clase lo agrega por cuánta gente se atasca en cada nivel', () => {
  const c = cargarApp();
  const alu = (n, estrato) => ({ id: n, name: n, summary: { v: 1, xp: 10,
    conceptos: [['resta_llevada', 4, 8, estrato]] } });
  const d = c.ev('buildClassOverview')([
    alu('Ana', 'aplicar'), alu('Leo', 'aplicar'), alu('Sara', 'analizar')
  ], c.ev('todayStr()'));
  const r = d.repasar[0];
  assert.equal(r.id, 'resta_llevada');
  assert.equal(r.estrato, 'aplicar');
  assert.equal(r.estratoAlumnos, 2);
});

test('un estrato inventado por el cliente de un alumno se descarta', () => {
  const c = cargarApp();
  const d = c.ev('buildClassOverview')([
    { id: 'a', name: 'Ana', summary: { v: 1, xp: 10,
      conceptos: [['resta_llevada', 4, 8, '<script>']] } }
  ], c.ev('todayStr()'));
  assert.equal(d.repasar[0].estrato, '');
});
