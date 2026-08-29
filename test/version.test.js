/* Un docente que ve un comportamiento viejo necesita poder distinguir «no está
   arreglado» de «mi navegador me está sirviendo una copia guardada». Esa
   pregunta se contesta con un número, y el número solo sirve si sube. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');

const RAIZ = path.join(__dirname, '..');

test('la versión de la app y la del service worker no se separan', () => {
  /* Son dos ficheros y dos motivos distintos para tocarlos —publicar y
     renovar la caché— pero si se separan, el número que lee el docente deja
     de decirle qué copia tiene. */
  const ctx = cargarApp(['content', 'config']);
  const version = ctx.ev('ATLAS_VERSION');
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const cache = sw.match(/const CACHE = '([^']+)'/);
  assert.ok(cache, 'el service worker declara su caché');
  assert.ok(cache[1].endsWith('-' + version),
    `la caché es «${cache[1]}» y la versión «${version}»`);
});

test('la versión no la puede pisar la configuración compartida', () => {
  /* Los ajustes del equipo viajan de una tablet a otra. Si la versión viajara
     con ellos, una tablet vieja anunciaría la versión de la que publicó. */
  const ctx = cargarApp(['content', 'config']);
  const compartido = ctx.ev('configParaCompartir()');
  assert.ok(!('version' in compartido));
  assert.ok(!('ATLAS_VERSION' in compartido));
});
