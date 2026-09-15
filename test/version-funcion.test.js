/* La función de Appwrite y la app son dos despliegues distintos.

   La app web se actualiza sola al publicar. La función NO: vive dentro de
   Appwrite y hay que redesplegarla a mano, o dejar que su integración con Git
   lo haga. Cuando se separan, el docente ve en pantalla arreglos que no se
   están ejecutando y el síntoma es idéntico a que no funcionaran.

   Eso costó una tarde: dos entregas seguidas arreglando la latencia del
   generador sin saber si el código nuevo estaba corriendo siquiera. Por eso la
   función sabe decir su versión, y por eso se le pregunta justo cuando algo ha
   fallado por tiempo. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');
const leer = f => require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', f), 'utf8');

test('la función declara la MISMA versión que la app', () => {
  const c = cargarApp();
  const main = leer('functions/generador/src/main.js');
  const m = main.match(/const GENERADOR_VERSION = '([^']+)'/);
  assert.ok(m, 'la función no declara versión');
  /* Si se separan aquí, el aviso de «función vieja» saltaría siempre o nunca,
     y en los dos casos deja de servir. */
  assert.equal(m[1], c.ev('ATLAS_VERSION'),
    'la versión de la función y la de la app se han separado en el repositorio');
});

test('preguntar la versión no cuesta nada ni necesita clave', () => {
  const main = leer('functions/generador/src/main.js');
  const i = main.indexOf("if (paso === 'ping')");
  assert.ok(i > 0, 'no existe el paso ping');
  /* Va ANTES que cualquier comprobación de clave o de currículo: tiene que
     contestar también en el equipo donde todavía no hay nada configurado, que
     es justo donde más falta hace saberlo. */
  assert.ok(i < main.indexOf("paso === 'verificar'"), 'el ping va lo primero');
  assert.ok(i < main.indexOf('ANTHROPIC_API_KEY'), 'no puede pedir clave para contestar');
  const cuerpo = main.slice(i, main.indexOf('}', main.indexOf('return res.json', i)));
  assert.ok(!/messages\.create|deprisa\(/.test(cuerpo), 'no puede llamar al modelo');
  assert.match(cuerpo, /version: GENERADOR_VERSION/);
});

test('una función que no conozca el ping cuenta como vieja', async () => {
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.functions = {}; CLOUD.user = { $id: 'd1' }`);
  /* Una función anterior a esto no devuelve `version`: no hay que fiarse de
     que conteste «soy vieja», hay que deducirlo de que no lo diga. */
  c.ev(`ejecutarGenerador = async () => ({ ok: true })`);
  const v = await c.ev('cloudVersionGenerador()');
  assert.equal(v.ok, true);
  assert.equal(v.alDia, false, 'sin versión declarada tiene que contar como vieja');

  c.ev(`ejecutarGenerador = async () => ({ ok: true, version: ATLAS_VERSION, modelo: 'claude-opus-5' })`);
  const alDia = await c.ev('cloudVersionGenerador()');
  assert.equal(alDia.alDia, true);
});

test('el aviso solo sale cuando algo falló por TIEMPO', async () => {
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.functions = {}; CLOUD.user = { $id: 'd1' };
        ejecutarGenerador = async () => ({ ok: true, version: 'v1' })`);
  /* Preguntarlo en cada error convertiría «sin saldo» en un sermón sobre
     despliegues. El desfase solo explica los cortes de tiempo. */
  assert.equal(await c.ev(`avisoDeFuncionVieja({ reason: 'sin-saldo' })`), '');
  assert.equal(await c.ev(`avisoDeFuncionVieja(null)`), '');
  const aviso = await c.ev(`avisoDeFuncionVieja({ reason: 'tope' })`);
  assert.match(aviso, /NO se están ejecutando/);
  assert.match(aviso, /Deployments/, 'y dice dónde se arregla');
});

test('con la función al día, el aviso se calla', async () => {
  const c = cargarApp();
  c.ev(`ATLAS_CONFIG.appwrite = Object.assign({}, ATLAS_CONFIG.appwrite,
          { generadorFunctionId: 'fn1' })`);
  c.ev(`CLOUD.enabled = true; CLOUD.functions = {}; CLOUD.user = { $id: 'd1' };
        ejecutarGenerador = async () => ({ ok: true, version: ATLAS_VERSION })`);
  assert.equal(await c.ev(`avisoDeFuncionVieja({ reason: 'tope' })`), '',
    'un corte con la función al día no es un problema de despliegue');
});

test('los dos sitios donde se puede cortar preguntan por la versión', () => {
  const t = leer('js/teacher.js');
  /* El asistente de yacimientos y la tanda de retos. Fue en el asistente donde
     se vio, y el de retos tiene exactamente el mismo desfase posible. */
  assert.match(t, /a\.error = esc\(\(r\.texto \|\| 'No se ha podido pedir la propuesta\.'\) \+ await avisoDeFuncionVieja\(r\)\)/);
  assert.match(t, /iaEstado = '⚠️ ' \+ r\.texto \+ await avisoDeFuncionVieja\(r\)/);
});

test('y el diagnóstico de «¿Está bien puesto?» lo enseña sin que falle nada', () => {
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /anotar\('Versión de la función'/);
  assert.match(cloud, /redespliega/i);
});
