/* Los hallazgos 06 a 11 de la auditoría.

   Ninguno perdía datos —por eso no eran los primeros— pero todos comparten
   que la app sabía algo y no lo decía: que la configuración no iba a caber,
   que un campo no tiene nombre para quien no ve la pantalla, que un chip es
   más pequeño que un dedo, o que dos retos preguntan lo mismo. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* ── 06 · la configuración que no cabe ── */

function conNube() {
  const c = cargarApp();
  c.Appwrite = { Permission: { read: r => r, update: r => r, delete: r => r },
                 Role: { users: () => 'users', user: i => 'u:' + i } };
  const cfg = c.ev('ATLAS_CONFIG.appwrite');
  cfg.databaseId = 'db'; cfg.aulasCollectionId = 'aulas'; cfg.collectionId = 'd';
  const CLOUD = c.ev('CLOUD');
  CLOUD.enabled = true; CLOUD.user = { $id: 'd1' };
  CLOUD.subido = null;
  CLOUD.db = { updateDocument: async (a, b, i, data) => { CLOUD.subido = data; return {}; } };
  c.ev('setAulaActiva')('aulaA', '4.º A');
  return c;
}

function conBancoGordo(c, retosPorEstrato) {
  const l = c.ev('sitesCopy()');
  for (let s = 0; s < 3; s++) {
    const site = { id: 's' + s, name: 'Y' + s, icon: '🏛️', subject: 'X', enabled: true, branches: [] };
    for (let b = 0; b < 8; b++) {
      const banco = {};
      for (const e of ['recordar', 'comprender', 'aplicar', 'analizar']) {
        banco[e] = Array.from({ length: retosPorEstrato }, (_, i) => ({
          question: '¿Cuánto es ' + i + ' más ' + i + '? Una pregunta de largo normal para medir.',
          options: ['uno', 'dos', 'tres', 'cuatro'], answer: 1,
          hint1: 'Piensa en la decena', hint2: 'Casi lo tienes',
          explanation: 'Porque sí, y con razón', skill: 'valor_posicional', origen: 'docente' }));
      }
      site.branches.push({ id: 's' + s + 'b' + b, name: 'P' + b, icon: '⛏️', enabled: true,
                           grades: [1, 2, 3], source: 'bank', bank: banco });
    }
    l.push(site);
  }
  c.ev('setTeacherConfig')('sites', l);
}

test('unos ajustes normales suben sin estorbo', async () => {
  const c = conNube();
  const r = await c.ev('cloudSaveAulaConfig()');
  assert.equal(r.ok, true);
  const subido = c.ev('CLOUD').subido;
  assert.ok(subido, 'llega a mandarlos');
  assert.doesNotThrow(() => JSON.parse(subido.config), 'y manda los ajustes serializados');
});

test('unos ajustes que no caben se paran antes de mandarlos', async () => {
  /* Mandarlos era descubrirlo en el error crudo de Appwrite, que no dice qué
     ocupa de más ni qué hacer. */
  const c = conNube();
  conBancoGordo(c, 10);
  const r = await c.ev('cloudSaveAulaConfig()');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'demasiado-grande');
  assert.equal(c.ev('CLOUD').subido, null, 'ni se intenta');
});

test('y el aviso dice cuánto ocupa, cuántos retos lo llenan y qué hacer', () => {
  const c = conNube();
  conBancoGordo(c, 10);
  return c.ev('cloudSaveAulaConfig()').then(r => {
    assert.match(r.detail, /\d+ KB/);
    assert.match(r.detail, /960 reto\(s\) escritos dentro/);
    assert.match(r.detail, /tabla de retos/);
  });
});

test('el recuento de retos dentro de los ajustes es el de verdad', () => {
  const c = conNube();
  conBancoGordo(c, 2);
  assert.equal(c.ev('retosDentroDeLosAjustes()'), 3 * 8 * 4 * 2);
});

test('el fallo se queda pendiente: no se da por subido lo que no subió', () => {
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /if \(paquete\.length > CONFIG_MAX\)/);
  const i = cloud.indexOf('async function subirAjustesAhora');
  assert.match(cloud.slice(i, i + 700), /ajustesFallo = r\.reason === 'sin-permiso'/);
});

/* ── 07 y 08 · el panel, para quien no ve la pantalla y para un dedo ── */

test('todo campo de icono y de nombre dice qué es', () => {
  /* Sin etiqueta, un lector de pantalla los lee como «campo de texto» a secas
     y no hay forma de saber cuál es cuál. */
  const t = leer('js/teacher.js');
  const campos = t.match(/<input[^>]*class="[^"]*cfg-icono[^"]*"[^>]*>/g) || [];
  assert.ok(campos.length >= 8, `solo ${campos.length} campos de icono`);
  const mudos = campos.filter(c => !/aria-label=/.test(c));
  assert.deepEqual(mudos, [], 'hay campos de icono sin nombre accesible');
  for (const clase of ['cfg-b-name', 'cfg-t-name', 'cfg-si-name', 'cfg-b2-name', 'cfg-s-name', 'prop-b-name']) {
    const m = t.match(new RegExp(`<input[^>]*class="${clase}"[^>]*>`));
    assert.ok(m && /aria-label=/.test(m[0]), `${clase} sin aria-label`);
  }
  assert.match(t, /<select class="cfg-b-cat"[^>]*aria-label=/);
});

test('el chip de curso llega al tamaño de un dedo', () => {
  /* Medía 36×26 px. Se usa con el dedo, de pie, en clase. */
  const css = leer('css/styles.css');
  const i = css.indexOf('.grade-chip {');
  const bloque = css.slice(i, i + 400);
  assert.match(bloque, /min-height: 2\.75rem/);
  assert.match(bloque, /padding: \.5rem \.7rem/);
});

/* ── 09 · comentarios que ya no son verdad ── */

test('ningún comentario dice que el panel crea el diario', () => {
  /* Se quitó en la v55: Appwrite no deja repartir permisos que uno no tiene.
     Un comentario que miente es peor que ninguno, porque el próximo que lo
     lea diseñará sobre él. */
  const todo = ['js/state.js', 'js/aula.js', 'js/cloud.js', 'js/teacher.js'].map(leer).join('\n');
  assert.ok(!/panel (lo )?crea el diario al dar de alta/.test(todo));
  assert.ok(!/desde que el\s*\n?\s*panel crea el diario/.test(todo));
});

/* ── 11 · retos que preguntan lo mismo ── */

const reto = q => ({ question: q, options: ['a', 'b', 'c', 'd'], answer: 0 });

test('caza el mismo reto escrito con otras palabras', () => {
  /* Dos tandas distintas rara vez repiten el enunciado exacto; sí repiten la
     pregunta cambiando el orden. Comparar letra a letra no valdría. */
  const c = cargarApp();
  const pares = c.ev('retosParecidos')({ bank: { recordar: [
    reto('¿Cuánto vale la cifra 4 en el número 347?'),
    reto('En el número 347, ¿cuánto vale la cifra 4?')
  ] } });
  assert.equal(pares.length, 1);
  assert.ok(pares[0].parecido >= 0.8);
});

test('y no acusa a dos retos del mismo concepto con números distintos', () => {
  /* Un pozo entero de sumas no es un pozo de retos repetidos. */
  const c = cargarApp();
  const pares = c.ev('retosParecidos')({ bank: { recordar: [
    reto('¿Cuánto es 25 más 17?'),
    reto('¿Cuánto es 34 menos 12?'),
    reto('Reparte 20 gemas entre 4 exploradores. ¿Cuántas toca a cada uno?')
  ] } });
  assert.deepEqual(pares, []);
});

test('busca en el pozo entero, no dentro de cada estrato', () => {
  /* El mismo reto en dos estratos es igual de repetido, y ahí no se ve nunca
     porque están en pestañas distintas. */
  const c = cargarApp();
  const pares = c.ev('retosParecidos')({ bank: {
    recordar: [reto('¿Cuánto vale la cifra 4 en el número 347?')],
    aplicar: [reto('¿Cuánto vale la cifra 4 en el número 347?')]
  } });
  assert.equal(pares.length, 1);
  assert.equal(pares[0].uno.estrato, 'recordar');
  assert.equal(pares[0].otro.estrato, 'aplicar');
});

test('un pozo vacío o con retos sin escribir no da falsos avisos', () => {
  const c = cargarApp();
  assert.deepEqual(c.ev('retosParecidos')({}), []);
  assert.deepEqual(c.ev('retosParecidos')({ bank: { recordar: [reto(''), reto('   ')] } }), []);
});

test('el aviso no borra nada: se los pone delante al docente', () => {
  /* Quien decide si dos retos sobran es quien da la clase. */
  const t = leer('js/teacher.js');
  const i = t.indexOf('const pares = retosParecidos(branch);');
  assert.ok(i > 0, 'el aviso se pinta en el banco de retos');
  const bloque = t.slice(i, i + 1200);
  assert.match(bloque, /par\(es\) de retos que preguntan casi lo mismo/);
  assert.ok(!/splice|delete/.test(bloque), 'el aviso no puede borrar por su cuenta');
});
