/* Qué acaba guardado en el disco de la tablet. En un aula el dispositivo pasa
   de mano en mano, así que guardar una respuesta de Appwrite significa dejar
   el diario de un niño para el siguiente que la abra. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarServiceWorker } = require('./cargar.js');

const ORIGEN = 'https://colegio.example';

function peticion(url, opciones) {
  const o = opciones || {};
  return {
    url, method: o.method || 'GET', mode: o.mode || 'cors',
    respuesta: o.sinRed ? null
      : { ok: o.ok !== false, status: o.status || 200, type: o.type || 'basic', clone: () => 'copia' }
  };
}

async function seGuarda(p) {
  const { oyentes, guardadas } = cargarServiceWorker(ORIGEN);
  const espera = [];
  oyentes.fetch({ request: p, respondWith: pr => espera.push(Promise.resolve(pr).catch(() => {})), waitUntil() {} });
  await Promise.all(espera);
  await new Promise(r => setTimeout(r, 20));
  return guardadas.includes(p.url);
}

test('el diario de un alumno NUNCA se guarda en la tablet', async () => {
  const url = 'https://cloud.appwrite.io/v1/databases/atlas/collections/diarios/documents/abc';
  assert.equal(await seGuarda(peticion(url, { type: 'cors' })), false);
});

test('la cuenta del alumno tampoco', async () => {
  assert.equal(await seGuarda(peticion('https://cloud.appwrite.io/v1/account', { type: 'cors' })), false);
});

test('el SDK del CDN no se queda clavado en la caché', async () => {
  const url = 'https://cdn.jsdelivr.net/npm/appwrite@17.0.0/dist/iife/sdk.js';
  assert.equal(await seGuarda(peticion(url, { mode: 'no-cors', type: 'opaque' })), false);
});

test('la app sí se guarda: es para lo que existe el caché', async () => {
  assert.equal(await seGuarda(peticion(`${ORIGEN}/js/app.js`)), true);
  assert.equal(await seGuarda(peticion(`${ORIGEN}/index.html`, { mode: 'navigate' })), true);
});

test('un 404 o un 500 no envenenan el caché', async () => {
  assert.equal(await seGuarda(peticion(`${ORIGEN}/js/app.js`, { ok: false, status: 404 })), false);
  assert.equal(await seGuarda(peticion(`${ORIGEN}/css/styles.css`, { ok: false, status: 500 })), false);
});

test('lo que no es GET ni se toca', async () => {
  assert.equal(await seGuarda(peticion(`${ORIGEN}/js/app.js`, { method: 'POST' })), false);
});
