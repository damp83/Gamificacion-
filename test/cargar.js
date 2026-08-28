/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — test/cargar.js

   La plataforma no tiene empaquetador a propósito: son ocho scripts
   clásicos que comparten un ámbito global. Para poder probarlos desde
   Node se evalúan aquí en un contexto de `vm` con lo justo del navegador
   —localStorage y document de mentira—, en el MISMO orden que index.html.

   Así las pruebas corren contra el código que se sirve, sin una copia
   paralela que se quede vieja en cuanto alguien toque un fichero.
   ═══════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
/* El mismo orden que index.html y que tools/build-standalone.py */
const ORDEN = ['content', 'config', 'cloud', 'state', 'game', 'classview', 'teacher', 'app'];

function almacenDeMentira() {
  const datos = new Map();
  return {
    getItem: k => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: k => datos.delete(k),
    clear: () => datos.clear()
  };
}

/* Lo mínimo para que app.js y teacher.js se puedan EVALUAR. No sirve para
   pintar: las pruebas de pintado van en el navegador de verdad. */
function documentoDeMentira() {
  const nodo = {
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, appendChild() {}, querySelector: () => nodo,
    querySelectorAll: () => [], focus() {}, click() {}, select() {},
    dataset: {}, style: {}, innerHTML: '', textContent: '', value: '', disabled: false
  };
  return {
    querySelector: () => nodo,
    querySelectorAll: () => [],
    createElement: () => ({ ...nodo }),
    addEventListener() {},
    body: nodo,
    documentElement: nodo
  };
}

/* Devuelve el contexto con todo cargado. `ficheros` permite quedarse solo
   con una parte (útil cuando una prueba no quiere el peso de app.js). */
function cargarApp(ficheros) {
  const lista = ficheros || ORDEN;
  const ctx = {
    console,
    localStorage: almacenDeMentira(),
    document: documentoDeMentira(),
    setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { onLine: true },
    crypto: require('node:crypto').webcrypto,
    Uint32Array,
    fetch: async () => { throw new Error('sin red en las pruebas'); }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const nombre of lista) {
    const ruta = path.join(RAIZ, 'js', `${nombre}.js`);
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), ctx, { filename: ruta });
  }
  /* Los `const` del nivel superior de un script viven en el ámbito léxico del
     realm, no como propiedades del objeto global: `ctx.BUILTIN_GENERATORS` es
     undefined aunque el código sí lo vea. Por eso las pruebas leen a través de
     `ev`, que evalúa dentro del contexto. */
  ctx.ev = expr => vm.runInContext(expr, ctx);
  return ctx;
}

/* El service worker vive en otro ámbito (ServiceWorkerGlobalScope), así que
   se carga aparte con sus propios dobles. Devuelve los oyentes registrados
   para poder dispararlos a mano. */
function cargarServiceWorker(origen) {
  const oyentes = {};
  const guardadas = [];
  const ctx = {
    console, URL,
    Response: { error: () => ({ error: true }) },
    caches: {
      open: async () => ({ put: async req => { guardadas.push(req.url); }, addAll: async () => {} }),
      keys: async () => [], match: async () => null, delete: async () => {}
    },
    fetch: async peticion => {
      if (!peticion.respuesta) throw new Error('sin red');
      return peticion.respuesta;
    }
  };
  ctx.self = {
    location: { origin: origen || 'https://colegio.example' },
    addEventListener: (n, f) => { oyentes[n] = f; },
    skipWaiting() {}, clients: { claim() {} }
  };
  ctx.self.self = ctx.self;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), ctx);
  return { oyentes, guardadas };
}

module.exports = { cargarApp, cargarServiceWorker, ORDEN, RAIZ };
