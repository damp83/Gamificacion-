/* El currículo del generador, por materia Y curso.

   Se guardaba solo por materia: el mismo texto servía para 1.º y para 6.º.
   El encargo dice «no te salgas de este currículo», así que el modelo
   obedecía… al que no tocaba, y escribía con aplomo cosas que ese niño no ha
   dado. Es peor que no darle ninguno, porque parece bien hecho. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('lo que estuviera pegado antes no se pierde: pasa a valer para todos', () => {
  /* Es lo que estaba haciendo ya, sin decirlo. */
  const c = cargarApp();
  const migrado = c.ev('migrateOverlay')({ curriculo: { matematicas: 'SABERES VIEJOS' } });
  assert.deepEqual(migrado.curriculo.matematicas, { todos: 'SABERES VIEJOS' });
  c.ev('applyOverlay')(migrado);
  for (const curso of [1, 3, 6]) {
    assert.equal(c.ev('iaCurriculo')('matematicas', curso), 'SABERES VIEJOS');
  }
});

test('cada curso usa el suyo, y cae en el de todos si no lo tiene', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('curriculo', { matematicas: { todos: 'GENERAL', 2: 'DE SEGUNDO' } });
  assert.equal(c.ev('iaCurriculo')('matematicas', 2), 'DE SEGUNDO');
  assert.equal(c.ev('iaCurriculo')('matematicas', 5), 'GENERAL');
});

test('sin nada puesto devuelve vacío, no revienta', () => {
  /* Y la función de Appwrite rechaza la petición diciendo que falta el
     currículo, que es lo correcto. */
  const c = cargarApp();
  assert.equal(c.ev('iaCurriculo')('lengua', 3), '');
  c.ev('setTeacherConfig')('curriculo', { lengua: {} });
  assert.equal(c.ev('iaCurriculo')('lengua', 3), '');
});

test('se genera con el currículo del curso pedido', () => {
  /* El fallo entero estaba en esta línea: pasaba iaCurriculo(materia) a
     secas y el curso se ignoraba. */
  const t = leer('js/teacher.js');
  assert.match(t, /curriculo: iaCurriculo\(materia, curso\)/);
  assert.ok(!/curriculo: iaCurriculo\(materia\)/.test(t), 'ya no hay ninguna llamada sin curso');
});

test('elegir el curso del currículo cambia también el de generar', () => {
  /* Verlos decir cosas distintas es la forma más fácil de generar para el
     curso que no era sin enterarse. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("data-curr-grade]");
  const cuerpo = t.slice(i, i + 700);
  assert.match(cuerpo, /cfgSave\('iaCurso', Number\(v\), false\)/);
});

test('el panel dice qué cursos tienen currículo y cuál falta', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('curriculo', { matematicas: { 2: 'x', 4: '   ', todos: 'y' } });
  assert.deepEqual(c.ev('iaCursosConCurriculo')('matematicas'), ['2'],
    'un bloque en blanco no cuenta como puesto');
  assert.equal(c.ev('iaHayParaTodos')('matematicas'), true);
});

test('traer un currículo de un fichero FUSIONA, no sustituye', () => {
  /* Traer el de Lengua de un compañero no puede borrarte el de Matemáticas
     que llevas media hora pegando. */
  const t = leer('js/teacher.js');
  const i = t.indexOf("ia-curr-fichero');");
  const cuerpo = t.slice(i, i + 1400);
  assert.match(cuerpo, /const mio = deepClone\(ATLAS_CONFIG\.curriculo \|\| \{\}\)/);
  assert.match(cuerpo, /if \(!texto\.trim\(\)\) continue;/, 'un bloque vacío del fichero no pisa uno lleno');
  assert.match(cuerpo, /datos\.tipo !== 'atlas-curriculo'/, 'y se comprueba que el fichero es lo que dice ser');
});

test('el currículo sigue sin viajar a las tablets', () => {
  /* Son cien mil caracteres largos: dentro del documento del aula se comerían
     casi todo el espacio que tiene. Por eso el fichero. */
  const c = cargarApp();
  assert.ok(c.ev('NO_SE_COMPARTE').includes('curriculo'));
});
