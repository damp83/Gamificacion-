/* Ids repetidos, que eran los mismos ids.

   Crear una cuadrilla nueva le ponía siempre el id «cuadrilla»; un pozo
   nuevo, «pozo»; un yacimiento, «yacimiento». slugify() solo caía en su
   respaldo con la hora cuando el texto no dejaba ni una letra, y a un texto
   fijo eso no le pasa nunca.

   El id no es una etiqueta: es lo que decide de qué pozo es un reto y en qué
   cuadrilla está un niño, y la app resuelve un id devolviendo el PRIMERO que
   encuentra. Así que la segunda cuadrilla nueva era, para todos los efectos,
   la primera. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

test('el fallo: dos textos iguales daban el mismo id', () => {
  /* Se deja escrito lo que hacía slugify, porque idUnico lo sigue usando por
     dentro y es lo que hay que no volver a llamar a pelo al crear algo. */
  const c = cargarApp();
  assert.equal(c.ev('slugify')('cuadrilla', 'team'), 'cuadrilla');
  assert.equal(c.ev('slugify')('cuadrilla', 'team'), c.ev('slugify')('cuadrilla', 'team'));
});

test('idUnico no repite, por muchas veces que se pida', () => {
  const c = cargarApp();
  const usados = [];
  for (let i = 0; i < 5; i++) usados.push(c.ev('idUnico')('cuadrilla', 'team', usados));
  assert.deepEqual(usados, ['cuadrilla', 'cuadrilla_2', 'cuadrilla_3', 'cuadrilla_4', 'cuadrilla_5']);
  assert.equal(new Set(usados).size, 5);
});

test('cinco cuadrillas nuevas son cinco cuadrillas', () => {
  const c = cargarApp();
  const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams.list'));
  for (let i = 0; i < 5; i++) {
    l.push({ id: c.ev('idUnico')('cuadrilla', 'team', l.map(x => x.id)), name: 'Nueva', members: [] });
  }
  assert.equal(new Set(l.map(x => x.id)).size, l.length);
});

test('los pozos son únicos en toda la configuración, no dentro de su yacimiento', () => {
  /* findBranch() los busca en todos los yacimientos y devuelve el primero: un
     pozo de Lengua con el id de uno de Mates se traga sus retos. */
  const c = cargarApp();
  const l = c.ev('sitesCopy()');
  l.push({ id: 's1', name: 'A', icon: '🏛️', enabled: true, branches: [] });
  l.push({ id: 's2', name: 'B', icon: '📜', enabled: true, branches: [] });
  const id1 = c.ev('idUnico')('pozo', 'branch', c.ev('idsDePozos')(l));
  l[l.length - 2].branches.push({ id: id1, name: 'P1' });
  const id2 = c.ev('idUnico')('pozo', 'branch', c.ev('idsDePozos')(l));
  l[l.length - 1].branches.push({ id: id2, name: 'P2' });
  assert.notEqual(id1, id2, 'dos pozos en yacimientos distintos siguen sin poder llamarse igual');
});

test('nadie crea nada llamando a slugify a pelo', () => {
  /* Es el fallo exacto que hubo, y volvería sin hacer ruido. */
  const fs = require('node:fs'), path = require('node:path');
  const t = fs.readFileSync(path.join(__dirname, '..', 'js', 'teacher.js'), 'utf8');
  assert.ok(!/id:\s*slugify\(/.test(t), 'hay un id creado con slugify: se repetirá');
  assert.ok(!/const id = slugify\(/.test(t), 'hay un id creado con slugify: se repetirá');
  assert.match(t, /const raiz = slugify\(base, fallback\);/, 'idUnico sigue siendo quien lo usa');
});

/* ── Reparar lo que ya está roto ── */

const dup = () => ({
  teams: { enabled: true, list: [
    { id: 'cuadrilla', name: 'Tigre', members: ['Ana'] },
    { id: 'cuadrilla', name: 'Flamenco', members: ['Leo'] },
    { id: 'cuadrilla', name: 'Cóndor', members: ['Sara'] }
  ] },
  behaviors: [{ id: 'nuevo', name: 'A' }, { id: 'nuevo', name: 'B' }],
  shop: [{ id: 'articulo', name: 'A' }, { id: 'articulo', name: 'B' }],
  sites: [
    { id: 'yacimiento', name: 'Uno', branches: [{ id: 'pozo', name: 'P1' }, { id: 'pozo', name: 'P2' }] },
    { id: 'yacimiento', name: 'Dos', branches: [{ id: 'pozo', name: 'P3' }] }
  ]
});

test('los ajustes ya rotos se reparan al cargarlos', () => {
  const c = cargarApp();
  const o = c.ev('migrateOverlay')(dup());
  assert.deepEqual(o.teams.list.map(t => t.id), ['cuadrilla', 'cuadrilla_2', 'cuadrilla_3']);
  assert.deepEqual(o.behaviors.map(x => x.id), ['nuevo', 'nuevo_2']);
  assert.deepEqual(o.shop.map(x => x.id), ['articulo', 'articulo_2']);
  assert.deepEqual(o.sites.map(x => x.id), ['yacimiento', 'yacimiento_2']);
});

test('los pozos se reparan contando todos los yacimientos a la vez', () => {
  const c = cargarApp();
  const o = c.ev('migrateOverlay')(dup());
  const ids = o.sites.reduce((a, s) => a.concat(s.branches.map(b => b.id)), []);
  assert.deepEqual(ids, ['pozo', 'pozo_2', 'pozo_3']);
  assert.equal(new Set(ids).size, 3);
});

test('el primero conserva su id, y con él lo que ya se jugara', () => {
  /* Renombrarlos todos dejaría huérfano el progreso de los niños. */
  const c = cargarApp();
  const o = c.ev('migrateOverlay')(dup());
  assert.equal(o.teams.list[0].id, 'cuadrilla');
  assert.equal(o.sites[0].branches[0].id, 'pozo');
});

test('lo que ya estaba bien no se toca', () => {
  const c = cargarApp();
  const antes = c.ev('defaultSites()');
  const o = c.ev('migrateOverlay')({ sites: c.ev('deepClone')(antes) });
  assert.deepEqual(o.sites.map(s => s.id), antes.map(s => s.id));
  for (let i = 0; i < antes.length; i++) {
    assert.deepEqual(o.sites[i].branches.map(b => b.id), antes[i].branches.map(b => b.id));
  }
});

test('unos ajustes sin nada de esto no revientan', () => {
  const c = cargarApp();
  assert.doesNotThrow(() => c.ev('migrateOverlay')({}));
  assert.doesNotThrow(() => c.ev('migrateOverlay')({ teams: {}, sites: null, shop: 'no' }));
});

test('cada cuadrilla enseña a los suyos, no los de la de al lado', () => {
  /* El síntoma que se veía: la lista de clase pintaba dos veces el mismo
     grupo, con los alumnos de las dos cuadrillas juntos. */
  const c = cargarApp();
  const o = c.ev('migrateOverlay')(dup());
  c.ev('setTeacherConfig')('teams', o.teams);
  c.ev('setTeacherConfig')('roster', ['Ana', 'Leo', 'Sara'].map(n => ({ name: n, username: n.toLowerCase(), grade: 3 })));
  const porId = {};
  for (const n of ['Ana', 'Leo', 'Sara']) porId[n] = c.ev('cuadrillaDe')(n).id;
  assert.equal(new Set(Object.values(porId)).size, 3, 'cada uno en la suya');
});

test('la reparación se guarda y se sube, no se queda en este equipo', () => {
  /* Si no, esta tablet los vería bien y la de al lado seguiría enseñando dos
     cuadrillas iguales hasta que alguien tocara un ajuste por casualidad. */
  const fs = require('node:fs'), path = require('node:path');
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  assert.match(cfg, /if \(idsReparados\) saveTeacherConfig\(\);/);
  assert.match(cfg, /idsReparados = true;/);
});

test('sin nada que reparar no se toca el guardado', () => {
  /* Guardar por guardar dispararía una subida en cada arranque. */
  const c = cargarApp();
  c.ev('migrateOverlay')({ teams: { list: [{ id: 'a' }, { id: 'b' }] } });
  assert.equal(c.ev('idsReparados'), false);
  c.ev('migrateOverlay')({ teams: { list: [{ id: 'a' }, { id: 'a' }] } });
  assert.equal(c.ev('idsReparados'), true);
});
