/* Los ajustes de la clase, de la nube al equipo.

   Subían solos desde la v33 y no bajaban solos: solo se traían al tocar la
   clase en «Mis clases». Un docente creaba un yacimiento en el portátil,
   abría el iPad al día siguiente y no estaba, porque el iPad seguía con su
   copia de la semana pasada. Parecía que no se había guardado. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('al arrancar se bajan los ajustes de la clase abierta', () => {
  const app = leer('js/app.js');
  assert.match(app, /await traerAjustesDeAula\(\)/, 'el arranque los pide');
  const iBaja = app.indexOf('traerAjustesDeAula');
  const iRetos = app.indexOf('sincronizarRetos');
  assert.ok(iBaja < iRetos, 'antes que los retos: los retos se colocan en los pozos que traigan los ajustes');
});

test('no baja nada si hay cambios de este equipo sin subir', () => {
  /* Traer lo de la nube encima de trabajo sin guardar es perderlo. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function traerAjustesDeAula()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /if \(ajustesPendientes\) return \{ ok: false, reason: 'hay-pendientes' \}/);
});

test('solo se adopta lo más nuevo que lo último que este equipo vio', () => {
  /* Si no, cada arranque pisaría los cambios locales con una copia vieja. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function traerAjustesDeAula()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /if \(marca <= \(ATLAS_CONFIG_META\.sharedAt \|\| 0\)\) return \{ ok: true, adoptado: false \}/);
});

test('al subir se anota la marca, para no tragarse la propia copia', () => {
  /* Sin esto, al arrancar el equipo vería en la nube una versión «más
     nueva» —la suya— y se la volvería a adoptar, pisando lo que hubiera
     tocado desde entonces. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudSaveAulaConfig()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /ATLAS_CONFIG_META\.sharedAt = Number\(data\.updated_at\)/);
  assert.match(cuerpo, /saveConfigMeta\(\)/);
});

test('lo que baja respeta lo que nunca viaja', () => {
  /* Adopta por adoptSharedConfig, que conserva las contraseñas del alumnado,
     el PIN, los datos de Appwrite y la clave de la API de este equipo. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function traerAjustesDeAula()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /adoptSharedConfig\(/);
  assert.ok(!/applyOverlay\(/.test(cuerpo), 'nunca se aplica el paquete crudo');
});
