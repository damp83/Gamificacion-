/* Lo que aguanta cuando algo llega mal.

   Los cinco primeros hallazgos de la auditoría eran la misma familia: la app
   confiando en que los datos que le llegan tienen la forma que espera. Con el
   panel delante eso es cierto —sanea lo que se teclea—, pero no es la única
   puerta: restaurar una copia hecha con otra versión, adoptar los ajustes de
   una clase creada con otra, importar el fichero de un compañero.

   Ninguno de estos fallos daba error donde se causaba. Daban error después, a
   otra persona, o no lo daban en absoluto. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const conDiario = () => { const c = cargarApp(); c.ev('openDiary')({ name: 'Ana', username: 'ana', grade: 3 }); return c; };

/* ── 01 · un diario a medias no se pierde ── */

test('un diario sin bloques se completa en vez de reventar', () => {
  const c = cargarApp();
  for (const malo of [{}, { profile: {} }, { profile: { explorer_name: 'X' }, progression: null },
                      { profile: { explorer_name: 'X' }, daily: 'no soy un objeto' },
                      { profile: { explorer_name: 'X' }, inventory: [] }]) {
    const st = c.ev('migrateState')(c.ev('deepClone')(malo));
    assert.ok(st.progression && st.daily && st.metrics && st.inventory,
      `faltan bloques en ${JSON.stringify(malo)}`);
    assert.equal(typeof st.progression.doubloons_balance, 'number');
  }
});

test('y conserva lo que sí traía', () => {
  /* Completar no puede significar empezar de cero: lo que el niño llevara
     jugado tiene que sobrevivir. */
  const c = cargarApp();
  const st = c.ev('migrateState')({
    profile: { explorer_name: 'Vega', grade: 5 },
    progression: { xp_total: 900, doubloons_balance: 42 }
  });
  assert.equal(st.profile.explorer_name, 'Vega');
  assert.equal(st.profile.grade, 5);
  assert.equal(st.progression.xp_total, 900);
  assert.equal(st.progression.doubloons_balance, 42);
  assert.equal(st.progression.team_contribution, 0, 'lo que faltaba se rellena');
});

test('el caso real: restaurar una copia a medias y poder abrir a ese niño', () => {
  /* Reproducido tal cual en la auditoría: importBackup decía «1 diario
     restaurado ✓» y openDiary reventaba después. */
  const c = cargarApp();
  const paq = c.ev('exportBackup()');
  paq.diarios = { 'u:ana': { profile: { explorer_name: 'Ana', grade: 3 }, updated_at: Date.now() } };
  assert.equal(c.ev('importBackup')(paq).ok, true);
  const st = c.ev('openDiary')({ name: 'Ana', username: 'ana' });
  assert.ok(st && st.progression, 'el diario restaurado se abre');
  assert.equal(c.ev('allDiaries()').length, 1, 'y sale en la vista de clase');
});

test('un diario que no hay forma de leer se cuenta, no se descarta', () => {
  /* Restarlo de la cuenta sin decir nada es lo que hacía que un niño
     desapareciera de la pantalla y nadie supiera por qué. */
  const c = cargarApp();
  c.ev('saveDiaries')({ 'u:ana': c.ev('defaultState')('Ana'), 'u:roto': 'esto no es un diario' });
  assert.equal(c.ev('allDiaries()').length, 1);
  assert.deepEqual(c.ev('ilegiblesDeEsteEquipo()'), ['u:roto']);
});

test('y la vista de clase lo dice con su nombre', () => {
  const a = leer('js/aula.js');
  assert.match(a, /ilegiblesDeEsteEquipo\(\)/);
  assert.match(a, /diario\(s\) de este equipo no se han podido leer/);
});

/* ── 02 · el equipo que no puede guardar ── */

test('un guardado que falla se nota, y no tumba el guardado', () => {
  const c = conDiario();
  const bueno = c.ev('localStorage').setItem;
  c.ev('localStorage').setItem = () => { throw new Error('QuotaExceededError'); };
  assert.doesNotThrow(() => { for (let i = 0; i < 5; i++) c.ev('saveState()'); },
    'avisar no puede romper lo que venía a contar');
  assert.equal(c.ev('elGuardadoFalla()'), true);
  c.ev('localStorage').setItem = bueno;
  c.ev('saveState()');
  assert.equal(c.ev('elGuardadoFalla()'), false, 'y se retira en cuanto vuelve a poder');
});

test('el aviso se pinta una vez, no en cada respuesta', () => {
  const st = leer('js/state.js');
  const i = st.indexOf('function guardadoHaFallado');
  assert.match(st.slice(i, i + 400), /if \(fallaElGuardado\) return;/);
  assert.match(st.slice(i, i + 500), /try \{ if \(typeof avisarDeGuardadoRoto/);
});

test('el aviso dice qué pasa y qué hacer, no «error»', () => {
  const app = leer('js/app.js');
  assert.match(app, /no se está quedando/);
  assert.match(app, /modo privado|ventana privada/);
  assert.match(app, /setAttribute\('role', 'alert'\)/, 'un lector de pantalla también tiene que enterarse');
});

/* ── 03, 04 y 05 · la economía no admite números imposibles ── */

test('ganar nunca resta ni rompe la bolsa', () => {
  for (const coins of [-50, 'diez', undefined, null, NaN, Infinity, 1e12]) {
    const c = conDiario();
    const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.behaviors'));
    l[0].coins = coins; l[0].perDay = 1;
    c.ev('setTeacherConfig')('behaviors', l);
    c.ev('awardBehavior')(l[0].id);
    const saldo = c.ev('S.progression.doubloons_balance');
    assert.ok(Number.isFinite(saldo) && saldo >= 0, `con coins=${String(coins)} la bolsa quedó en ${saldo}`);
  }
});

test('un precio que no se entiende no se cobra', () => {
  /* Con `<` y un precio no numérico la comparación era siempre falsa: se
     «pagaba» y la bolsa quedaba en NaN. Mejor un artículo gratis. */
  for (const cost of [-100, 'gratis', undefined, NaN]) {
    const c = conDiario();
    c.ev('S').progression.doubloons_balance = 10;
    const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.shop'));
    l[0].cost = cost;
    c.ev('setTeacherConfig')('shop', l);
    c.ev('buyItem')(l[0].id);
    const saldo = c.ev('S.progression.doubloons_balance');
    assert.ok(Number.isFinite(saldo) && saldo >= 0, `con cost=${String(cost)} la bolsa quedó en ${saldo}`);
  }
});

test('el tope diario aguanta un ajuste ilegible', () => {
  for (const [perDay, esperado] of [[3, 3], [1, 1], [0, 0], [-5, 0],
                                    [undefined, 1], [null, 1], ['', 1], ['tres', 1], [NaN, 1]]) {
    const c = conDiario();
    const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.behaviors'));
    l[0].perDay = perDay; l[0].coins = 5;
    c.ev('setTeacherConfig')('behaviors', l);
    let dados = 0;
    for (let i = 0; i < 20; i++) if (c.ev('awardBehavior')(l[0].id).ok) dados++;
    assert.equal(dados, esperado, `perDay=${String(perDay)} concedió ${dados}`);
  }
});

test('un tope que no se entiende limita, no desactiva', () => {
  /* Apagar un mérito en silencio sería peor que limitarlo: el docente lo
     pulsa, no pasa nada, y no hay forma de saber por qué. */
  const c = conDiario();
  const l = c.ev('deepClone')(c.ev('ATLAS_CONFIG.behaviors'));
  l[0].perDay = 'tres';
  c.ev('setTeacherConfig')('behaviors', l);
  assert.equal(c.ev('awardBehavior')(l[0].id).ok, true, 'el primero sí entra');
});

test('la aportación a la cuadrilla se queda entre 0 y lo ganado', () => {
  for (const rate of [-1, 2, 'media', undefined, NaN, 0.5]) {
    const c = conDiario();
    const t = c.ev('deepClone')(c.ev('ATLAS_CONFIG.teams'));
    t.enabled = true; t.list[0].members = ['Ana']; t.contributionRate = rate;
    c.ev('setTeacherConfig')('teams', t);
    c.ev('earnDoubloons')(100);
    const ap = c.ev('S.progression.team_contribution');
    assert.ok(Number.isFinite(ap) && ap >= 0 && ap <= 100,
      `con rate=${String(rate)} la aportación fue ${ap}`);
  }
});

test('donar sigue sin admitir cantidades imposibles', () => {
  const c = conDiario();
  c.ev('S').progression.doubloons_balance = 100;
  for (const [n, deberia] of [[0, false], [-5, false], [2.7, true], [1000, false],
                              ['abc', false], [Infinity, false], [NaN, false]]) {
    assert.equal(c.ev('donateToFund')(n).ok, deberia, `donar ${String(n)}`);
  }
  const saldo = c.ev('S.progression.doubloons_balance');
  assert.ok(Number.isFinite(saldo) && saldo >= 0, `bolsa=${saldo}`);
});

test('el saneado vive en el motor, no solo en el panel', () => {
  /* El panel es una puerta; restaurar una copia es otra. Si el saneado
     estuviera solo en el panel, esa segunda puerta seguiría abierta. */
  const st = leer('js/state.js');
  assert.match(st, /function enteroSano\(/);
  assert.match(st, /function fraccionSana\(/);
  const i = st.indexOf('function earnDoubloons');
  assert.match(st.slice(i, i + 700), /enteroSano\(n, 0, 0/);
  assert.match(st.slice(i, i + 1600), /fraccionSana\(t\.contributionRate, 0\)/);
  assert.match(leer('js/game.js'), /enteroSano\(b\.perDay, 1, 0, 50\)/);
});
