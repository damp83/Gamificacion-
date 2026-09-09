/* Por qué no se llega al servidor.

   «Failed to fetch» contra Appwrite se decía como «revisa la red», y eso manda
   a mirar el wifi cuando lo normal es que el wifi esté bien: si la app ha
   cargado, la red va. Detrás del mismo mensaje del navegador hay tres causas
   distintas y solo una es la red; la más común —que el proyecto de Appwrite no
   tenga dada de alta la dirección desde la que se abre la app— se arregla en un
   minuto, pero solo si alguien te dice que es eso.

   Y hay una cosa que las cuatro tienen que decir, porque es la que hace perder
   la tarde: la contraseña NO se ha llegado a comprobar. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* Monta el diagnóstico con una red de mentira: `contesta` decide si el
   servidor llegó a responder algo, que es la única pregunta que hace. */
function conRed(c, { contesta, online, protocolo }) {
  c.ev('navigator').onLine = online === undefined ? true : online;
  if (protocolo) c.ev('location').protocol = protocolo;
  const llamadas = [];
  c.fetch = (url, opciones) => {
    llamadas.push({ url, opciones });
    return contesta ? Promise.resolve({ type: 'opaque' }) : Promise.reject(new Error('Failed to fetch'));
  };
  return llamadas;
}

/* ── Distinguir las tres ── */

test('si el dispositivo dice que no tiene red, es la red y no se pregunta nada', async () => {
  const c = cargarApp();
  const llamadas = conRed(c, { contesta: true, online: false });
  assert.equal(await c.ev('diagnosticarConexion()'), 'sin-red');
  assert.deepEqual(llamadas, [], 'sin conexión no hay a quién preguntar');
});

test('si el servidor contesta pero la sesión falló, es el navegador tapando la respuesta', async () => {
  /* Es la más común con diferencia, y la única que se arregla en un minuto. */
  const c = cargarApp();
  conRed(c, { contesta: true });
  assert.equal(await c.ev('diagnosticarConexion()'), 'bloqueado');
});

test('si no contesta nadie, no se llega: filtro del centro o servicio caído', async () => {
  const c = cargarApp();
  conRed(c, { contesta: false });
  assert.equal(await c.ev('diagnosticarConexion()'), 'no-responde');
});

test('abierta desde un fichero guardado, ningún servidor la va a aceptar', async () => {
  const c = cargarApp();
  conRed(c, { contesta: true, protocolo: 'file:' });
  assert.equal(await c.ev('diagnosticarConexion()'), 'fichero');
});

test('sin endpoint puesto no se inventa un diagnóstico', async () => {
  const c = cargarApp();
  conRed(c, { contesta: true });
  c.ev('ATLAS_CONFIG.appwrite.endpoint = ""');
  assert.equal(await c.ev('diagnosticarConexion()'), 'sin-configurar');
});

/* ── Cómo se pregunta ── */

test('la comprobación va en modo opaco: es lo único que separa «no hay ruta» de «hay ruta»', async () => {
  const c = cargarApp();
  const llamadas = conRed(c, { contesta: true });
  await c.ev('diagnosticarConexion()');
  assert.equal(llamadas.length, 1, 'una petición, no un sondeo');
  assert.equal(llamadas[0].opciones.mode, 'no-cors');
  assert.equal(llamadas[0].opciones.cache, 'no-store', 'una respuesta guardada mentiría al día siguiente');
});

test('y no lleva sesión, ni contraseñas, ni lee lo que vuelve', async () => {
  const c = cargarApp();
  const llamadas = conRed(c, { contesta: true });
  await c.ev('diagnosticarConexion()');
  assert.match(llamadas[0].url, /^https:\/\/[^?]+\/health\/version$/,
    'un punto público de estado, sin parámetros');
  assert.ok(!llamadas[0].opciones.headers, 'sin cabeceras no hay nada que filtrar');
});

/* ── Qué se le dice a quien está delante ── */

test('las cuatro causas dicen que la contraseña no es el problema', () => {
  /* Es lo que hace perder la tarde: se prueba otra contraseña, y otra. */
  const c = cargarApp();
  for (const caso of ['sin-red', 'no-responde', 'bloqueado', 'fichero']) {
    const t = c.ev('textoDeConexion')(caso);
    assert.ok(t && t.length > 40, `${caso} se queda sin explicar`);
    assert.match(t, /contraseña|dirección de internet/i, `${caso} deja creer que es la contraseña`);
  }
});

test('la causa más común dice la dirección exacta que hay que dar de alta', () => {
  const c = cargarApp();
  const t = c.ev('textoDeConexion')('bloqueado');
  assert.match(t, /Platforms/);
  assert.match(t, /docente/, 'quien lo lee es un niño y no puede arreglarlo él');
  const origen = c.ev('origenDeLaApp()');
  if (origen) assert.ok(t.includes(origen), 'teclear la dirección a mano es la mitad de los fallos');
});

test('cada causa manda a un sitio distinto: si no, daría igual distinguirlas', () => {
  const c = cargarApp();
  const textos = ['sin-red', 'no-responde', 'bloqueado', 'fichero', 'sin-configurar']
    .map(x => c.ev('textoDeConexion')(x));
  assert.equal(new Set(textos).size, textos.length);
});

test('el mensaje de siempre ya no culpa a la red, porque casi nunca es la red', () => {
  const c = cargarApp();
  const m = c.ev('friendlyAuthError')(new Error('Failed to fetch'));
  assert.ok(!/revisa la red/i.test(m));
  assert.match(m, /Comprobando por qué/, 'se dice que se está averiguando, no se deja a medias');
});

test('un fallo de contraseña no dispara ningún diagnóstico de red', () => {
  const c = cargarApp();
  assert.equal(c.ev('esFalloDeRed')(new Error('Invalid credentials')), false);
  assert.equal(c.ev('esFalloDeRed')(new Error('Failed to fetch')), true);
  assert.equal(c.ev('esFalloDeRed')(new Error('NetworkError when attempting to fetch')), true);
});

/* ── Dónde lo ve el docente, que es quien puede arreglarlo ── */

test('el panel enseña la dirección desde la que se abre la app', () => {
  const c = cargarApp();
  const caja = c.ev('document').createElement('div');
  c.ev('cfgAcceso')(caja);
  assert.match(caja.innerHTML, /Settings → Platforms/);
  assert.match(caja.innerHTML, /el navegador tapa la respuesta/,
    'sin esta frase el docente no relaciona «no hay conexión» con Platforms');
});

test('las dos pantallas usan el mismo diagnóstico, no dos parecidos', () => {
  /* Dos textos que se parecen se desincronizan en el primer arreglo. */
  const t = leer('js/teacher.js');
  const a = leer('js/app.js');
  assert.match(t, /textoDeConexion\(saludConexion\)/);
  assert.match(a, /textoDeConexion\(await diagnosticarConexion\(\)\)/);
  assert.equal((a.match(/function textoDeConexion/g) || []).length, 1);
});
