/* La asistente de yacimientos.

   Crear un yacimiento era un formulario en blanco: nombre, ambientación,
   icono, y luego otro formulario por cada pozo con sus cursos. El docente sabe
   qué quiere trabajar —lo tiene escrito en su currículo— y lo que le cuesta es
   inventarse ocho nombres de expedición y repartir el temario sin solapes.

   La asistente propone la ESTRUCTURA y nunca los retos, y esa frontera es lo
   que la hace segura: un pozo sin retos no le aparece a ningún niño, así que
   una propuesta mala no llega a clase, se borra. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const gen = () => cargarApp(['content', 'generador']);

/* ── El encargo que se le manda ── */

test('el currículo del docente viaja en el encargo', () => {
  /* Es la razón de que esto valga la pena: no hay que volver a contarle nada
     que ya esté escrito en el panel. */
  const c = gen();
  const p = c.ev('promptYacimiento')({
    materia: 'lengua', cursos: [3, 4], cuantos: 5,
    curriculo: 'Ortografía: la tilde. Comprensión lectora.'
  });
  assert.match(p.sistema, /Ortografía: la tilde/);
  assert.match(p.usuario, /3\.º, 4\.º/);
  assert.match(p.usuario, /5 pozos/);
});

test('sin currículo se le dice que no lo hay, en vez de callarlo', () => {
  const c = gen();
  const p = c.ev('promptYacimiento')({ materia: 'lengua', cursos: [3] });
  assert.match(p.sistema, /no se ha dado/);
});

test('al completar, se le manda lo que ya hay para que no lo repita', () => {
  /* Es la diferencia entre ampliar un yacimiento y proponer otro parecido. */
  const c = gen();
  const p = c.ev('promptYacimiento')({
    materia: 'lengua', cursos: [3], curriculo: 'Ortografía.',
    existente: { name: 'Biblioteca de Arena', pozos: [
      { name: 'La Sala de los Acentos', contenido: 'Tildes', grades: [3] }] }
  });
  assert.match(p.usuario, /AMPLÍALO/);
  assert.match(p.usuario, /La Sala de los Acentos/);
  assert.match(p.usuario, /NO debes repetir/);
});

test('lo que pide el docente a mano manda sobre lo demás', () => {
  const c = gen();
  const p = c.ev('promptYacimiento')({
    materia: 'lengua', cursos: [3], curriculo: 'Ortografía.',
    tema: 'Ambiéntalo en el Antiguo Egipto.'
  });
  assert.match(p.usuario, /Antiguo Egipto/);
  assert.match(p.usuario, /manda sobre lo anterior/);
});

test('una materia sin validador de retos se monta igual', () => {
  /* El generador de retos solo sabe de Matemáticas y Lengua. Un yacimiento de
     Naturales no escribe ni un reto, así que basta con saber cómo se llama. */
  const c = gen();
  const p = c.ev('promptYacimiento')({
    materia: '', materiaNombre: 'Ciencias Naturales', cursos: [5], curriculo: 'El ecosistema.'
  });
  assert.match(p.usuario, /Ciencias Naturales/);
});

/* ── Lo que vuelve, antes de tocar nada ── */

test('un icono de tres emojis no entra tal cual', () => {
  const c = gen();
  const y = c.ev('limpiarYacimiento')({
    name: 'X', subject: 'Lengua', icon: '📜📜📜📜📜 la biblioteca', desc: 'd',
    pozos: [{ name: 'P', icon: '✒️', desc: 'd', contenido: 'c', grades: [3] }]
  }, [3, 4]);
  assert.ok(Array.from(y.icon).length <= 3, y.icon);
});

test('un curso que no se ha pedido se cae', () => {
  /* Un pozo de 6.º en una propuesta para 3.º y 4.º es un pozo que nadie ve. */
  const c = gen();
  const y = c.ev('limpiarYacimiento')({
    name: 'X', subject: '', icon: '📜', desc: '',
    pozos: [{ name: 'P', icon: '✒️', desc: '', contenido: '', grades: [3, 6, 99] }]
  }, [3, 4]);
  assert.deepEqual(y.pozos[0].grades, [3]);
});

test('un pozo sin ningún curso válido se queda con todos los pedidos', () => {
  /* Antes que dejarlo invisible para siempre sin decir nada. */
  const c = gen();
  const y = c.ev('limpiarYacimiento')({
    name: 'X', subject: '', icon: '📜', desc: '',
    pozos: [{ name: 'P', icon: '✒️', desc: '', contenido: '', grades: [6] }]
  }, [3, 4]);
  assert.deepEqual(y.pozos[0].grades, [3, 4]);
});

test('un pozo sin nombre no se cuela, y sin pozos no hay propuesta', () => {
  const c = gen();
  const y = c.ev('limpiarYacimiento')({
    name: 'X', subject: '', icon: '📜', desc: '',
    pozos: [{ name: '  ', icon: '✒️', desc: '', contenido: '', grades: [3] }]
  }, [3]);
  assert.equal(y, null);
  assert.equal(c.ev('limpiarYacimiento')(null, [3]), null);
  assert.equal(c.ev('limpiarYacimiento')({ pozos: [] }, [3]), null);
});

/* ── La frontera: propone estructura, nunca retos ── */

test('la propuesta no trae ni un reto: el esquema no tiene dónde ponerlos', () => {
  /* Es lo que la hace segura. Si algún día alguien le añade un campo de
     retos, se saltaría la cola de revisión y llegarían a un niño sin leer. */
  const c = gen();
  const e = JSON.stringify(c.ev('esquemaYacimiento')());
  for (const campo of ['question', 'options', 'answer', 'hint1', 'explanation']) {
    assert.ok(!e.includes(campo), `el esquema del yacimiento no puede traer «${campo}»`);
  }
});

test('los pozos aceptados nacen vacíos, que es lo que los deja invisibles', () => {
  const t = leer('js/teacher.js');
  const i = t.indexOf("$('#prop-ok')");
  const bloque = t.slice(i, i + 1400);
  assert.match(bloque, /bank: \{\}/, 'sin banco, el pozo no le aparece a nadie hasta tener retos');
  assert.match(bloque, /source: 'docente'/);
});

test('la asistente solo se ofrece si puede funcionar', () => {
  /* Sin función de Appwrite o sin clave, el botón lleva a un error en vez de
     a una propuesta. */
  const t = leer('js/teacher.js');
  assert.match(t, /const nubeIA = cloudConfigured\(\) && cloudEnabled\(\)/);
  assert.match(t, /ATLAS_CONFIG\.iaClave \|\| ''\)\.trim\(\)/);
});

test('el tercer encargo de la función pide currículo o petición a mano', () => {
  const main = leer('functions/generador/src/main.js');
  const i = main.indexOf("if (paso === 'yacimiento')");
  assert.ok(i > 0, 'la función atiende el encargo');
  const bloque = main.slice(i, i + 2500);
  assert.match(bloque, /pistas\.length < 30/, 'sin nada que darle, se lo inventaría');
  assert.match(bloque, /limpiarYacimiento/, 'lo que vuelve se limpia antes de devolverlo');
});

/* ── El inspector: mira lo que hay, sin llamar a nadie ── */

function conYacimiento(branches, roster) {
  const c = cargarApp();
  if (roster) c.ev('setTeacherConfig')('roster', roster);
  const l = c.ev('sitesCopy()');
  l.push({ id: 'x', name: 'Selva', subject: 'Naturales', icon: '🌿', enabled: true, branches });
  c.ev('setTeacherConfig')('sites', l);
  return c.ev('revisarYacimiento')(c.ev('ATLAS_CONFIG.sites').find(s => s.id === 'x'));
}
const pozo = (extra) => Object.assign(
  { id: 'p', name: 'Las Plantas', icon: '🌱', enabled: true, grades: [3], source: 'docente', bank: {} },
  extra);
const reto = skill => ({ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 0, skill });

test('avisa del pozo que no ve nadie, que es el fallo que no da error', () => {
  const avisos = conYacimiento([pozo()]);
  assert.ok(avisos.some(a => /no lo ve nadie/.test(a.que)), JSON.stringify(avisos));
});

test('avisa del pozo que se queda a medias', () => {
  const avisos = conYacimiento([pozo({ bank: { recordar: [reto('Hojas')] } })]);
  assert.ok(avisos.some(a => /a medias/.test(a.que)));
});

test('avisa del pozo puesto para cursos que no tienes en clase', () => {
  const avisos = conYacimiento(
    [pozo({ grades: [6], bank: { recordar: [reto('a')], comprender: [reto('b')], aplicar: [reto('c')], analizar: [reto('d')] } })],
    [{ name: 'Ana', username: 'ana', grade: 3 }]);
  assert.ok(avisos.some(a => /fuera de tus cursos/.test(a.que)), JSON.stringify(avisos));
});

test('sin lista de clase no se inventa que un curso sobra', () => {
  /* Avisar de algo que no consta es peor que callarse. */
  const avisos = conYacimiento(
    [pozo({ grades: [6], bank: { recordar: [reto('a')], comprender: [reto('b')], aplicar: [reto('c')], analizar: [reto('d')] } })],
    []);
  assert.ok(!avisos.some(a => /fuera de tus cursos/.test(a.que)), JSON.stringify(avisos));
});

test('avisa cuando un pozo es diez maneras de preguntar lo mismo', () => {
  const banco = { recordar: [reto('Fotosíntesis'), reto('Fotosíntesis'), reto('Fotosíntesis')],
                  comprender: [reto('Fotosíntesis'), reto('Raíces'), reto('Hojas')] };
  const avisos = conYacimiento([pozo({ bank: banco })]);
  assert.ok(avisos.some(a => /repite mucho/.test(a.que)), JSON.stringify(avisos));
});

test('con pocos retos no se dice nada del reparto: no significaría nada', () => {
  const avisos = conYacimiento([pozo({ bank: { recordar: [reto('Hojas'), reto('Hojas')] } })]);
  assert.ok(!avisos.some(a => /repite mucho/.test(a.que)));
});

test('avisa de dos pozos con el mismo nombre', () => {
  const lleno = { recordar: [reto('a')], comprender: [reto('b')], aplicar: [reto('c')], analizar: [reto('d')] };
  const avisos = conYacimiento([pozo({ id: 'p1', bank: lleno }), pozo({ id: 'p2', bank: lleno })]);
  assert.ok(avisos.some(a => /mismo nombre/.test(a.que)), JSON.stringify(avisos));
});

test('un yacimiento sano no dice nada', () => {
  /* Un inspector que siempre encuentra algo se deja de leer. */
  const lleno = { recordar: [reto('a')], comprender: [reto('b')], aplicar: [reto('c')], analizar: [reto('d')] };
  const avisos = conYacimiento([pozo({ bank: lleno })], [{ name: 'Ana', username: 'ana', grade: 3 }]);
  assert.deepEqual(avisos, []);
});

test('los pozos de fábrica no se acusan de estar vacíos', () => {
  /* Generan retos solos: un banco vacío ahí es lo normal, no un problema. */
  const avisos = conYacimiento([pozo({ source: 'builtin' })]);
  assert.deepEqual(avisos, []);
});

test('un yacimiento sin pozos se dice en una línea y no en cinco', () => {
  const avisos = conYacimiento([]);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0].que, /Sin pozos/);
});
