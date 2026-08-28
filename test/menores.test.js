/* Los arreglos pequeños: contraseñas, claves peligrosas en la configuración
   y el reparto del Fondo. Ninguno tumbaba la plataforma, pero todos estaban
   mal de una forma que se podía comprobar. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

test('las contraseñas salen del generador criptográfico, no de Math.random', () => {
  const ctx = cargarApp();
  /* Si se colara Math.random(), fijarlo a un valor constante daría siempre la
     misma contraseña. Con crypto, no. */
  ctx.Math = Object.create(Math);
  ctx.ev('Math.random = () => 0.5;');
  const generadas = new Set();
  for (let i = 0; i < 200; i++) generadas.add(ctx.ev('makePassword')());
  assert.ok(generadas.size > 100,
    `con Math.random() fijo salieron ${generadas.size} contraseñas distintas de 200`);
});

test('las contraseñas se pueden teclear en una tablet y valen para Appwrite', () => {
  const ctx = cargarApp();
  for (let i = 0; i < 500; i++) {
    const pw = ctx.ev('makePassword')();
    assert.ok(pw.length >= 8, `«${pw}» no llega al mínimo de 8 de Appwrite`);
    assert.match(pw, /^[a-z]+[0-9]{4}$/, `«${pw}» tiene algo que un niño de 8 años no va a teclear`);
  }
});

test('el reparto de las contraseñas no favorece a unos números sobre otros', () => {
  const ctx = cargarApp();
  const azarSeguro = ctx.ev('azarSeguro');
  const cuentas = new Array(7).fill(0);
  const N = 70000;
  for (let i = 0; i < N; i++) cuentas[azarSeguro(7)]++;
  /* 7 no divide 2^32: si no se descartara el tramo incompleto, los primeros
     valores saldrían algo más. Con 70 000 tiradas, ±4 % es de sobra. */
  for (const c of cuentas) {
    assert.ok(Math.abs(c - N / 7) < N / 7 * 0.04, `reparto desigual: ${cuentas.join(', ')}`);
  }
});

test('una configuración con __proto__ no puede colar un PIN', () => {
  const ctx = cargarApp();
  /* Los ajustes del equipo y las copias de seguridad llegan como JSON, y
     JSON.parse sí crea __proto__ como propiedad propia. Asignarla no guarda un
     valor: cambia el prototipo, y entonces `delete o.teacherPin` no lo quita
     porque no es una propiedad propia. */
  const veneno = JSON.parse('{"__proto__":{"teacherPin":"0000","colado":true}}');
  ctx.ev('applyOverlay')(veneno);

  assert.equal(ctx.ev('ATLAS_CONFIG').colado, undefined, 'no debe llegar nada por el prototipo');
  assert.notEqual(ctx.ev('ATLAS_CONFIG.teacherPin'), '0000', 'el PIN no se cambia desde fuera');
  assert.equal(ctx.ev('({}).colado'), undefined, 'Object.prototype intacto');
});

test('setTeacherConfig no acepta una ruta con claves peligrosas', () => {
  const ctx = cargarApp();
  ctx.ev('setTeacherConfig')('__proto__.colado', true);
  ctx.ev('setTeacherConfig')('teams.constructor.colado', true);
  assert.equal(ctx.ev('({}).colado'), undefined);
  assert.equal(ctx.ev('ATLAS_CONFIG').colado, undefined);
});

test('el Fondo coge el mayor de los dos totales, sin contar dos veces', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  const fundTotal = ctx.ev('fundTotal');

  /* El total de clase lo anota el docente leyendo todos los diarios, así que
     ya incluye lo de este niño: sumarlos sería contarlo dos veces. */
  ctx.ev('ATLAS_CONFIG.fund').classTotal = 400;
  ctx.ev('S.progression').fund_donated = 30;
  assert.equal(fundTotal(), 400);

  /* Y si el apunte del docente se queda atrás, manda lo del niño: la barra
     nunca retrocede. */
  ctx.ev('S.progression').fund_donated = 900;
  assert.equal(fundTotal(), 900);
});

test('donar sale de la bolsa del niño y jamás toca su progreso', () => {
  const ctx = cargarApp();
  ctx.ev('createState')('Vega');
  ctx.ev('S.progression').doubloons_balance = 100;
  ctx.ev('S.progression').xp_total = 555;

  assert.deepEqual(ctx.ev('donateToFund')(30), { ok: true, donated: 30, total: 30 });
  assert.equal(ctx.ev('S.progression.doubloons_balance'), 70);
  assert.equal(ctx.ev('S.progression.xp_total'), 555, 'los PE no se tocan nunca');

  assert.equal(ctx.ev('donateToFund')(1000).ok, false, 'no se puede donar lo que no se tiene');
  assert.equal(ctx.ev('S.progression.doubloons_balance'), 70);
});
