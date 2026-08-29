/* El validador de lo que escribe el modelo. Aquí no hay red ni clave: lo que
   se prueba es qué se acepta y qué se tira, que es lo único que separa un
   generador útil de uno que le dice «has fallado» a un niño que acertó. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const ctx = cargarApp(['content', 'generador']);
const validar = (r, o) => ctx.ev('validarRetoIA')(r, o);
const motivos = (r, o) => validar(r, o).motivos.join(' | ');

/* Un reto correcto, del que se parte para estropear una cosa cada vez. */
const BUENO = {
  question: '¿Cuántas patas tienen 3 arañas si cada una tiene 8?',
  options: ['24', '11', '18', '32'],
  answer: 0,
  hint1: 'Cada araña tiene 8 patas y hay 3 arañas.',
  hint2: 'Suma 8 + 8 + 8, o multiplica 8 × 3.',
  explanation: 'Se repite 8 tres veces: 8 × 3 = 24.',
  skill: 'problema_suma',
  criterio: 'Resolución de problemas de la vida cotidiana con las cuatro operaciones.'
};
const con = extra => Object.assign({}, BUENO, extra);

test('un reto bien escrito pasa', () => {
  const v = validar(BUENO, { materia: 'matematicas' });
  assert.equal(v.ok, true, v.motivos.join(' | '));
});

test('se tira si la respuesta correcta no señala a ninguna opción', () => {
  assert.match(motivos(con({ answer: 7 })), /no señala a ninguna/);
  assert.match(motivos(con({ answer: -1 })), /no señala a ninguna/);
});

test('se tira si hay opciones repetidas, aunque cambien tildes o mayúsculas', () => {
  /* «Cinco» y «cinco» son la misma respuesta puesta dos veces: el niño no
     elige entre cuatro, elige entre tres. */
  assert.match(motivos(con({ options: ['Cinco', 'cinco', 'seis', 'siete'], answer: 0 })), /repetidas/);
  assert.match(motivos(con({ options: ['bebió', 'bebio', 'comió', 'salió'], answer: 0 })), /repetidas/);
});

test('se tira si el concepto no es del catálogo', () => {
  assert.match(motivos(con({ skill: 'multiplicacion_avanzada' })), /no es un concepto del catálogo/);
  assert.match(motivos(con({ skill: '' })), /sin concepto/);
});

test('se tira si el concepto es de la otra materia', () => {
  /* Un reto de ortografía etiquetado en una tanda de matemáticas entra en el
     pozo equivocado y el diagnóstico deja de significar nada. */
  assert.match(motivos(con({ skill: 'orto_bv' }), { materia: 'matematicas' }), /no es de Matemáticas/);
  assert.equal(validar(con({ skill: 'orto_bv',
    question: '¿Cuál se escribe con B?', options: ['bebía', 'vevía', 'bevía', 'vebía'], answer: 0
  }), { materia: 'lengua' }).ok, true);
});

test('se tira la correcta mucho más larga que las demás', () => {
  /* El regalo clásico: la buena se escribe con matices y las falsas sueltas.
     Se acierta midiendo, no pensando. */
  assert.match(motivos(con({
    options: ['Veinticuatro patas, porque son ocho de cada una de las tres arañas', '11', '18', '32'],
    answer: 0
  })), /más larga/);
});

test('se tira si tres opciones son números y una no', () => {
  assert.match(motivos(con({ options: ['24', '11', '18', 'muchísimas'], answer: 0 })), /se descarta sola/);
});

test('se tira si alguna opción lleva escrito que es la correcta', () => {
  assert.match(motivos(con({ options: ['24 (correcta)', '11', '18', '32'], answer: 0 })), /escrito que es la correcta/);
});

test('se tira si faltan las pistas o dicen lo mismo', () => {
  assert.match(motivos(con({ hint2: '' })), /pistas/);
  assert.match(motivos(con({ hint2: BUENO.hint1 })), /dicen lo mismo/);
});

/* ── La comprobación aritmética ──
   Es lo que más caro cuesta equivocar: una cuenta mal marcada le dice «has
   fallado» a un niño que acertó, en una plataforma donde el error no penaliza. */
test('caza la cuenta mal marcada', () => {
  const malo = con({ question: '¿Cuánto es 47 + 25?', options: ['62', '72', '82', '75'], answer: 0,
                     skill: 'suma_llevada' });
  const v = validar(malo, { materia: 'matematicas' });
  assert.equal(v.ok, false);
  assert.match(v.motivos.join(' '), /da 72 y está marcado 62/);
});

test('deja pasar la cuenta bien marcada', () => {
  const v = validar(con({ question: '¿Cuánto es 47 + 25?', options: ['62', '72', '82', '75'], answer: 1,
                          skill: 'suma_llevada' }), { materia: 'matematicas' });
  assert.equal(v.ok, true, v.motivos.join(' | '));
});

test('la comprobación calla cuando no puede estar segura', () => {
  /* Una comprobación que adivina descarta retos buenos, que es peor que no
     tenerla: el docente deja de fiarse y aprueba a ciegas. */
  const comp = ctx.ev('comprobarAritmetica');
  assert.equal(comp({ question: '¿Cuál es la idea principal del texto?', options: ['a','b','c','d'], answer: 0 }).aplica, false);
  assert.equal(comp({ question: '¿Cuánto es 8 × 3?', options: ['24', 'veinticuatro', 'c', 'd'], answer: 0 }).aplica, false);
  assert.equal(comp({ question: '¿Cuánto es 10 : 0?', options: ['0','1','2','3'], answer: 0 }).aplica, false);
});

test('los decimales no se caen por la coma flotante', () => {
  /* 0,1 + 0,2 no da 0,3 exacto en ningún lenguaje: comparar con === tiraría
     un reto correcto. */
  const comp = ctx.ev('comprobarAritmetica');
  const r = comp({ question: '¿Cuánto es 0,1 + 0,2?', options: ['0,3', '0,12', '0,03', '1,2'], answer: 0 });
  assert.equal(r.aplica, true);
  assert.equal(r.ok, true);
});

test('una tanda se parte en lo que pasa y lo que se tira, con el motivo', () => {
  const tanda = [BUENO,
    con({ answer: 9 }),
    con({ question: '¿Cuánto es 12 + 9?', options: ['21', '22', '23', '24'], answer: 1, skill: 'suma_llevada' })];
  const r = ctx.ev('validarTanda')(tanda, { materia: 'matematicas' });
  assert.equal(r.buenos.length, 1);
  assert.equal(r.descartados.length, 2);
  assert.ok(r.descartados.every(d => d.motivos.length > 0), 'cada descarte dice por qué');
});

/* ── La segunda pasada ── */
test('si al resolverlo por separado sale otra letra, se tira', () => {
  const retos = [{ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 0 }];
  const r = ctx.ev('cruzarVerificacion')(retos, [{ n: 1, letra: 'C' }]);
  assert.equal(r.buenos.length, 0);
  assert.match(r.descartados[0].motivos[0], /sale C y estaba marcada A/);
});

test('un reto con más de una respuesta válida también se tira', () => {
  const retos = [{ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 0 }];
  const r = ctx.ev('cruzarVerificacion')(retos, [{ n: 1, letra: 'X' }]);
  assert.match(r.descartados[0].motivos[0], /única respuesta válida/);
});

test('coincidiendo las dos pasadas, pasa', () => {
  const retos = [{ question: 'q', options: ['a', 'b', 'c', 'd'], answer: 2 }];
  assert.equal(ctx.ev('cruzarVerificacion')(retos, [{ n: 1, letra: 'C' }]).buenos.length, 1);
});

/* ── El encargo ── */
test('el encargo lleva el currículo y solo los conceptos de su materia', () => {
  const p = ctx.ev('promptGenerador')({
    materia: 'lengua', curso: 5, estrato: 'comprender',
    curriculo: 'Uso de la tilde diacrítica en monosílabos.', n: 8 });
  assert.match(p.usuario, /Uso de la tilde diacrítica/);
  assert.match(p.usuario, /5\.º de Primaria/);
  assert.match(p.usuario, /Escribe 8 retos/);
  assert.match(p.sistema, /orto_tilde/);
  assert.ok(!/valor_posicional/.test(p.sistema), 'no ofrece conceptos de matemáticas');
});

test('el encargo exige distractores plausibles y la cita del currículo', () => {
  /* Es la mitad de la calidad del resultado: sin esto salen tres opciones
     absurdas y una buena, y el reto deja de medir nada. */
  const p = ctx.ev('promptGenerador')({ materia: 'matematicas', curso: 4, estrato: 'aplicar', curriculo: 'x' });
  assert.match(p.sistema, /PLAUSIBLES/);
  assert.match(p.sistema, /criterio/);
  assert.match(p.sistema, /ESCALAN/);
});

test('no se puede pedir una tanda desmesurada', () => {
  assert.equal(ctx.ev('promptGenerador')({ materia: 'lengua', n: 500, curriculo: 'x' }).cuantos, 20);
  assert.equal(ctx.ev('promptGenerador')({ materia: 'lengua', n: 0, curriculo: 'x' }).cuantos, 10);
});

test('las dos materias cubren conceptos reales del catálogo', () => {
  const mates = ctx.ev('conceptosDe')('matematicas');
  const lengua = ctx.ev('conceptosDe')('lengua');
  assert.ok(mates.length >= 20, `matemáticas tiene ${mates.length}`);
  assert.ok(lengua.length >= 15, `lengua tiene ${lengua.length}`);
  assert.ok(mates.includes('suma_llevada') && mates.includes('fraccion_leer'));
  assert.ok(lengua.includes('orto_bv') && lengua.includes('lectura_idea'));
  assert.equal(mates.filter(c => lengua.includes(c)).length, 0, 'no se solapan');
});

test('el esquema obliga a cuatro opciones y a un índice de 0 a 3', () => {
  /* Sin esto, el modelo devuelve tres opciones o un índice de 1 a 4 y el
     fallo aparece en la tablet de un niño, no aquí. */
  const e = ctx.ev('esquemaRetos')();
  const it = e.properties.retos.items;
  assert.equal(it.properties.options.minItems, 4);
  assert.equal(it.properties.options.maxItems, 4);
  assert.equal(it.properties.answer.maximum, 3);
  assert.deepEqual(it.required.sort(),
    ['answer', 'criterio', 'explanation', 'hint1', 'hint2', 'options', 'question', 'skill']);
});

test('lo que llega del modelo se recorta antes de mirarlo', () => {
  /* Es texto de fuera: se sanea igual que el resumen que sube el cliente de
     un alumno, sin fiarse de que venga bien formado. */
  const n = ctx.ev('normalizarReto')({
    question: '  ¿Cuánto\n\n es  2+2? ', options: ['4', 'x'.repeat(200), '5', '6'],
    answer: '0', hint1: 'a', hint2: 'b', explanation: 'c', skill: 'suma_basica' });
  assert.equal(n.question, '¿Cuánto es 2+2?');
  assert.equal(n.options[1].length, 80);
  assert.equal(n.answer, 0, 'el índice llega como texto y se convierte');
});

/* ── La copia que corre en el servidor ──
   El validador tiene que ser EL MISMO en la tablet y en la función. Si se
   separan, la función acepta lo que el panel rechaza —o al revés— y nadie se
   entera hasta que un reto malo llega a un niño. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('la copia de la función no se ha quedado vieja', () => {
  /* Se regenera en un aparte y se compara: si alguien tocó js/generador.js y
     no pasó tools/sync-generador.py, esto se pone rojo. */
  const antes = leer('functions/generador/src/generador.js');
  execFileSync('python3', [path.join(RAIZ, 'tools', 'sync-generador.py')], { stdio: 'pipe' });
  assert.equal(leer('functions/generador/src/generador.js'), antes,
    'ejecuta tools/sync-generador.py y vuelve a commitear');
});

test('el catálogo de conceptos de la función es el de la app', () => {
  const catalogo = leer('functions/generador/src/catalogo.js');
  const enApp = Object.keys(ctx.ev('CONCEPTOS'));
  for (const id of enApp) {
    assert.ok(catalogo.includes(id + ':'), `falta ${id} en la copia del catálogo`);
  }
  assert.match(catalogo, /export const STRATA_META/);
});

test('la copia se importa como módulo y valida igual que la app', async () => {
  const mod = await import(path.join(RAIZ, 'functions/generador/src/generador.js'));
  const malo = { question: '¿Cuánto es 47 + 25?', options: ['62', '72', '82', '75'], answer: 0,
                 hint1: 'a', hint2: 'b', explanation: 'c', skill: 'suma_llevada' };
  const enServidor = mod.validarRetoIA(malo, { materia: 'matematicas' });
  const enApp = validar(malo, { materia: 'matematicas' });
  assert.deepEqual(enServidor.motivos, enApp.motivos, 'los dos tienen que decir lo mismo');
  assert.equal(enServidor.ok, false);
});

test('la clave de la API no aparece en nada que se sirva al navegador', () => {
  /* La razón de que la función exista. Si algún día alguien la mete en
     config.js «para probar», esto se pone rojo antes de publicarla. */
  for (const f of ['js/generador.js', 'js/config.js', 'index.html']) {
    assert.doesNotMatch(leer(f), /sk-ant-[A-Za-z0-9_-]{10}/, `${f} lleva una clave dentro`);
    assert.doesNotMatch(leer(f), /ANTHROPIC_API_KEY/, `${f} nombra la clave`);
  }
  assert.match(leer('functions/generador/src/main.js'), /process\.env\.ANTHROPIC_API_KEY/,
    'la clave se lee de la variable de entorno de la función');
});

test('la función exige sesión antes de gastar la cuenta de la API', () => {
  const main = leer('functions/generador/src/main.js');
  assert.match(main, /x-appwrite-user-id/);
  assert.match(main, /sin-sesion/);
});
