/* Del «esto se falla» al «genero retos de esto».

   La vista de clase ya decía «nueve alumnos fallan la fracción de una
   cantidad», y ahí se acababa: para hacer algo con esa frase había que
   traducirla a materia, pozo y estrato a mano, en otra pantalla. El generador
   admitía `concepto` y `foco` desde el primer día y no se los mandaba nadie. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('cada concepto sabe de qué materia es', () => {
  const c = cargarApp();
  assert.equal(c.ev('materiaDeConcepto')('fraccion_de_cantidad'), 'matematicas');
  assert.equal(c.ev('materiaDeConcepto')('sinonimos'), 'lengua');
  assert.equal(c.ev('materiaDeConcepto')('inventado'), '', 'lo que no se sabe no se inventa');
});

test('todas las áreas del catálogo tienen materia', () => {
  /* Un área sin materia deja el botón sin poder elegir el pozo, y el docente
     acaba en el generador con lo que hubiera puesto de antes. */
  const c = cargarApp();
  const conceptos = c.ev('CONCEPTOS');
  const sinMateria = [];
  for (const id in conceptos) {
    if (!c.ev('materiaDeConcepto')(id)) sinMateria.push(`${id} (${conceptos[id].area})`);
  }
  assert.deepEqual(sinMateria, []);
});

test('el concepto cae en el pozo que habla de eso', () => {
  /* Se empareja con lo que el pozo dice que trabaja, que es lo mismo que lee
     el generador: si un pozo habla de fracciones, ahí va lo de fracciones. */
  const c = cargarApp();
  assert.equal(c.ev('pozoParaConcepto')('fraccion_de_cantidad'), 'kaldros/fracciones');
  assert.equal(c.ev('pozoParaConcepto')('valor_posicional'), 'kaldros/numeracion');
  assert.equal(c.ev('pozoParaConcepto')('sinonimos'), 'biblioteca/vocabulario');
  assert.equal(c.ev('pozoParaConcepto')('lectura_idea'), 'biblioteca/comprension');
});

test('sin acierto claro cae en un pozo de su materia, no en cualquiera', () => {
  const c = cargarApp();
  const destino = c.ev('pozoParaConcepto')('sinonimos');
  assert.ok(destino.startsWith('biblioteca/'), destino);
});

test('preparar el generador deja puesto todo lo que hace falta', () => {
  const c = cargarApp();
  c.ev('generarParaConcepto')('fraccion_de_cantidad', 9);
  assert.equal(c.ev('ATLAS_CONFIG.iaMateria'), 'matematicas');
  assert.equal(c.ev('ATLAS_CONFIG.iaPozo'), 'kaldros/fracciones');
  assert.equal(c.ev('ATLAS_CONFIG.iaConcepto'), 'fraccion_de_cantidad');
  assert.match(c.ev('ATLAS_CONFIG.iaFoco'), /Fracción de una cantidad/);
  assert.match(c.ev('ATLAS_CONFIG.iaFoco'), /9 alumnos/);
});

test('«lo fallan 1 alumno» no, «1 alumno» sí', () => {
  const c = cargarApp();
  c.ev('generarParaConcepto')('sinonimos', 1);
  assert.match(c.ev('ATLAS_CONFIG.iaFoco'), /1 alumno\)/);
  assert.ok(!/1 alumnos/.test(c.ev('ATLAS_CONFIG.iaFoco')));
});

test('el concepto y el foco llegan al generador', () => {
  /* El prompt los admitía desde el principio; lo que faltaba era mandarlos. */
  const t = leer('js/teacher.js');
  assert.match(t, /concepto: ATLAS_CONFIG\.iaConcepto \|\| '', foco: ATLAS_CONFIG\.iaFoco \|\| ''/);
  const g = leer('js/generador.js');
  assert.match(g, /Concepto pedido: \$\{p\.concepto\}/);
  assert.match(g, /Interesa especialmente porque la clase falla en/);
});

test('el foco se puede quitar, o se queda pegado para siempre', () => {
  /* Es un ajuste guardado: sin botón, la siguiente tanda de otro pozo saldría
     con el concepto de la semana pasada. */
  const t = leer('js/teacher.js');
  assert.match(t, /id="ia-sin-foco"/);
  assert.match(t, /setTeacherConfig\('iaConcepto', ''\)/);
});

test('el botón solo sale si la generación puede funcionar', () => {
  const a = leer('js/aula.js');
  assert.match(a, /const puedeGenerar = cloudConfigured\(\) && cloudEnabled\(\)/);
  assert.match(a, /puedeGenerar \? `<button class="btn btn-secondary btn-small repaso-gen"/);
});

test('el botón manda el concepto y a cuántos les pasa', () => {
  const a = leer('js/aula.js');
  assert.match(a, /generarParaConcepto\(b\.dataset\.concepto, \+b\.dataset\.cuantos \|\| 0\)/);
});
