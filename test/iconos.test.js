/* El banco de iconos.

   Escribir un emoji a mano es fácil en un portátil y un suplicio en una
   tablet: abrir el teclado de emojis, buscar entre miles y acertar. Y el
   icono es de lo primero que se toca al crear un yacimiento. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('el banco está agrupado por para qué sirve, no por Unicode', () => {
  const c = cargarApp(['content']);
  const grupos = c.ev('ICONOS');
  assert.ok(grupos.length >= 6, 'varios grupos');
  for (const g of grupos) {
    assert.ok(g.grupo && typeof g.grupo === 'string', 'cada grupo tiene nombre');
    assert.ok(g.lista.length >= 8, `«${g.grupo}» tiene pocos`);
  }
  const nombres = grupos.map(g => g.grupo);
  for (const esperado of ['Excavación', 'Matemáticas', 'Lengua', 'Comportamiento']) {
    assert.ok(nombres.includes(esperado), `falta el grupo ${esperado}`);
  }
});

test('ningún icono está repetido', () => {
  /* Verlo dos veces hace dudar de si son el mismo. */
  const c = cargarApp(['content']);
  const todos = c.ev('iconosTodos')();
  assert.equal(new Set(todos).size, todos.length);
});

test('TODOS los iconos de fábrica salen en el banco', () => {
  /* Si algo de fábrica usa un icono que el banco no tiene, cambiarlo por
     error deja al docente sin forma de volver atrás desde el panel: tendría
     que buscar ese emoji concreto en el teclado. Vale para yacimientos,
     pozos, reconocimientos, almacén, cuadrillas e hitos del Fondo. */
  const c = cargarApp();
  const banco = new Set(c.ev('iconosTodos')());
  const faltan = [];
  const mirar = (icono, que) => { if (icono && !banco.has(icono)) faltan.push(que + ': ' + icono); };

  for (const s of c.ev('ATLAS_CONFIG.sites')) {
    mirar(s.icon, 'yacimiento ' + s.name);
    for (const b of (s.branches || [])) mirar(b.icon, 'pozo ' + b.name);
  }
  for (const b of (c.ev('ATLAS_CONFIG.behaviors') || [])) mirar(b.icon, 'mérito ' + b.name);
  for (const i of (c.ev('ATLAS_CONFIG.shop') || [])) mirar(i.icon, 'almacén ' + i.name);
  for (const t of ((c.ev('ATLAS_CONFIG.teams') || {}).list || [])) mirar(t.icon, 'cuadrilla ' + t.name);
  for (const m of ((c.ev('ATLAS_CONFIG.fund') || {}).milestones || [])) mirar(m.icon, 'hito ' + m.name);

  assert.deepEqual(faltan, [], 'iconos de fábrica que no se pueden volver a elegir');
});

test('se engancha a TODOS los campos de icono, no a seis a mano', () => {
  /* Enchufarlo campo a campo garantiza que el séptimo que se añada se quede
     sin él. Se marcan con una clase común y se montan de una vez. */
  const t = leer('js/teacher.js');
  assert.equal((t.match(/cfg-icono"/g) || []).length, 6, 'los seis campos llevan la marca');
  assert.match(t, /\$\$\('#cfg-body input\.cfg-icono'\)/);
  assert.match(t, /renderers\[cfgSection\]\(body\);\n  montarSelectoresDeIcono\(\);/,
    'se monta tras cada pintado, sea la sección que sea');
});

test('elegir un icono pasa por el guardado de siempre', () => {
  /* Una segunda vía de guardado acaba desincronizándose de la primera. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('function montarSelectoresDeIcono()');
  const cuerpo = t.slice(i, t.indexOf('\n}\n\n', i));
  assert.match(cuerpo, /inp\.value = b\.dataset\.ico;/);
  assert.match(cuerpo, /inp\.dispatchEvent\(new Event\('change'\)\)/,
    'dispara el manejador que ya existía');
  assert.ok(!/cfgSave\(|setTeacherConfig\(|writeSites\(/.test(cuerpo),
    'no guarda por su cuenta');
});

test('el campo de texto no desaparece', () => {
  /* El banco son 128 iconos elegidos, no Unicode entero: quien quiera otro
     tiene que poder escribirlo. */
  const t = leer('js/teacher.js');
  assert.match(t, /class="cfg-si-icon cfg-icono" data-si="\$\{si\}"/,
    'el input sigue siendo un campo de texto editable');
});

test('el emoji elegido se ve marcado', () => {
  const t = leer('js/teacher.js');
  assert.match(t, /\$\{i === inp\.value \? ' on' : ''\}/);
});
