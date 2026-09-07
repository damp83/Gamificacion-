/* Dar un mérito desde la lista de clase, sin la tablet del niño.

   Los méritos solo se concedían desde el diario abierto: en la práctica,
   pedirle la tablet al alumno, que la desbloquee, meter el PIN. En clase el
   momento de reconocer algo es justo cuando pasa, y para cuando has hecho
   todo eso el momento se ha ido. El almacén ya se manejaba así desde la
   ficha del alumno; los méritos no. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('la bolsa lleva los méritos, y delante del almacén', () => {
  /* Reconocer algo se hace veinte veces al día; comprar, de vez en cuando. */
  const html = leer('index.html');
  const i = html.indexOf('id="bolsa-meritos"');
  const j = html.indexOf('id="bolsa-tienda"');
  assert.ok(i > 0, 'existe la sección de méritos');
  assert.ok(i < j, 'va antes que el almacén');
});

test('se conceden con la misma función que desde la tablet del niño', () => {
  /* Una segunda forma de dar méritos que no pasara por awardBehavior se
     saltaría el tope diario y el registro. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf("const meritos = $('#bolsa-meritos')");
  const cuerpo = aula.slice(i, i + 1600);
  assert.match(cuerpo, /awardBehavior\(b\.id\)/);
  assert.match(cuerpo, /behaviorCountToday\(b\.id\)/, 'y con el mismo tope diario');
  assert.match(cuerpo, /r\.reason === 'cap'/, 'que se dice cuando se agota');
});

test('el tope diario es del alumno, no del docente', () => {
  /* Se cuenta sobre el diario abierto, que es el del niño al que se le está
     dando. Contarlo de otra forma dejaría dar tres «ayudar» a toda la clase
     y ninguno más al siguiente. */
  const c = cargarApp();
  c.ev('openDiary')('Ana', 3);
  const b = c.ev('ATLAS_CONFIG.behaviors')[0];
  assert.equal(c.ev('behaviorCountToday')(b.id), 0);
  assert.equal(c.ev('awardBehavior')(b.id).ok, true);
  assert.equal(c.ev('behaviorCountToday')(b.id), 1);

  c.ev('openDiary')('Leo', 3);
  assert.equal(c.ev('behaviorCountToday')(b.id), 0, 'a Leo no le cuenta lo de Ana');
});

test('el mérito suma doblones y queda en el diario de quien lo recibe', () => {
  const c = cargarApp();
  c.ev('openDiary')('Ana', 3);
  const antes = c.ev('S.progression.doubloons_balance');
  const b = c.ev('ATLAS_CONFIG.behaviors')[0];
  c.ev('awardBehavior')(b.id);
  assert.equal(c.ev('S.progression.doubloons_balance'), antes + b.coins);
  assert.equal(c.ev('S.behavior_log').length, 1);

  /* Y sigue ahí al volver a abrir su diario. */
  c.ev('closeDiary')();
  c.ev('openDiary')('Ana', 3);
  assert.equal(c.ev('S.behavior_log').length, 1);
});

test('al conceder se repinta todo: el saldo de arriba y el almacén', () => {
  /* Acaba de tener más doblones, así que puede que ya le llegue para algo
     que antes salía en gris. */
  const aula = leer('js/aula.js');
  const i = aula.indexOf("const meritos = $('#bolsa-meritos')");
  const cuerpo = aula.slice(i, i + 1600);
  assert.match(cuerpo, /renderBolsa\(\);/);
});

test('sin reconocimientos configurados se dice dónde se crean', () => {
  /* Una lista vacía sin explicación parece una avería. */
  const aula = leer('js/aula.js');
  assert.match(aula, /No hay reconocimientos configurados/);
  assert.match(aula, /Comportamientos, tareas y actividades/);
});

test('el botón de la ficha ya no habla solo de comprar', () => {
  const aula = leer('js/aula.js');
  assert.match(aula, /Méritos, almacén y fondo de \$\{a\.name\}/);
  assert.match(aula, /dar un mérito, comprar o donar/, 'y lo dice también quien usa lector de pantalla');
});
