/* Dar de alta al alumnado. El panel dejaba escribir una contraseña de tres
   letras, la guardaba sin rechistar, y el fallo solo salía al intentar entrar
   —diciendo además «contraseña incorrecta», que manda a mirar donde no es. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const { ev } = cargarApp();
const pega = ev('pegaDeLaCuenta');

test('una contraseña más corta de 8 se señala, y se dice por qué', () => {
  const r = pega({ name: 'Jan', username: 'jan', password: 'abc', account: true });
  assert.ok(r, 'tiene que devolver una pega');
  assert.match(r, /3 caracteres/, 'dice cuántos tiene');
  assert.match(r, /8/, 'y cuántos hacen falta');
});

test('escribir la contraseña no basta: hay que crear la cuenta', () => {
  /* Es el malentendido de fondo: la lista de clase vive en este equipo, y la
     cuenta hay que darla de alta en Appwrite a propósito. */
  const r = pega({ name: 'Jan', username: 'jan', password: 'brujula1234', account: false });
  assert.match(r, /Crear las cuentas/);
});

test('con todo en regla no hay ninguna pega', () => {
  assert.equal(pega({ name: 'Jan', username: 'jan', password: 'brujula1234', account: true }), null);
});

test('se señala lo que falte, uno por uno', () => {
  assert.match(pega({ account: true }), /Sin nombre/);
  assert.match(pega({ name: 'Jan', account: true }), /usuario/);
  assert.match(pega({ name: 'Jan', username: 'jan', account: true }), /contraseña/);
});

test('las contraseñas que genera el panel siempre valen para Appwrite', () => {
  const ctx = cargarApp();
  const minimo = ctx.ev('PASS_MINIMO');
  for (let i = 0; i < 300; i++) {
    const pw = ctx.ev('makePassword')();
    assert.ok(pw.length >= minimo, `«${pw}» tiene ${pw.length}`);
  }
});

test('el error al entrar no culpa solo a la contraseña', () => {
  /* Appwrite responde igual si la contraseña está mal Y si la cuenta no
     existe: lo hace a propósito para que no se pueda averiguar quién tiene
     cuenta probando. El mensaje tiene que cubrir las dos cosas. */
  const msg = ev('friendlyAuthError')(new Error('Invalid credentials'));
  assert.match(msg, /usuario/i);
  assert.match(msg, /cuenta/i, 'menciona que puede que no exista todavía');
});

test('los errores que sí tienen una causa concreta la siguen diciendo', () => {
  assert.match(ev('friendlyAuthError')(new Error('Password must be at least 8 characters')), /8/);
  assert.match(ev('friendlyAuthError')(new Error('Failed to fetch')), /conexión/i);
  assert.match(ev('friendlyAuthError')(new Error('A user with the same id already exists')), /ya existe/i);
});
