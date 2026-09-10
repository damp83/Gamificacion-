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
const ORDEN = ['content', 'generador', 'config', 'cloud', 'state', 'game', 'classview',
               'ui', 'play', 'aula', 'teacher', 'app'];

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
   pintar de verdad —lo que se ve se comprueba en el navegador— pero sí lleva
   la cuenta de las clases y de las variables de estilo, que es lo que muchas
   funciones deciden y devuelven.

   Cada nodo es NUEVO. Antes se clonaba uno compartido con `{...nodo}`, y como
   la copia es superficial, todos los elementos creados compartían el mismo
   `dataset` y el mismo `style`: lo que escribía uno lo leía otro. */
function nodoDeMentira() {
  const clases = new Set();
  const nodo = {
    classList: {
      add: (...c) => c.forEach(x => clases.add(x)),
      remove: (...c) => c.forEach(x => clases.delete(x)),
      toggle: (c, on) => { const v = on === undefined ? !clases.has(c) : !!on;
                           if (v) clases.add(c); else clases.delete(c); return v; },
      contains: c => clases.has(c)
    },
    addEventListener() {}, appendChild() {}, replaceWith() {},
    querySelector: () => nodo, querySelectorAll: () => [],
    focus() {}, click() {}, select() {},
    setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
    hasAttribute: () => false,
    dataset: {},
    style: { valores: {}, setProperty(k, v) { this.valores[k] = v; },
             removeProperty(k) { delete this.valores[k]; },
             getPropertyValue(k) { return this.valores[k] || ''; } },
    innerHTML: '', textContent: '', value: '', disabled: false, offsetWidth: 0
  };
  /* `className` refleja lo que hay en classList, que es como se lee en el
     navegador y como lo comprueban las pruebas. */
  Object.defineProperty(nodo, 'className', {
    get: () => [...clases].join(' '),
    set: v => { clases.clear(); String(v).split(/\s+/).filter(Boolean).forEach(x => clases.add(x)); }
  });
  return nodo;
}

function documentoDeMentira() {
  /* Un solo nodo para todas las consultas: las pruebas que miran lo pintado
     leen por el mismo `$()` que usa el código, así que da igual cuál sea. */
  const nodo = nodoDeMentira();
  return {
    querySelector: () => nodo,
    querySelectorAll: () => [],
    createElement: () => nodoDeMentira(),
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
    /* La dirección desde la que se sirve la app. Importa: es la que hay que
       dar de alta en Appwrite, y el diagnóstico de conexión la enseña. */
    location: { protocol: 'https:', origin: 'https://damp83.github.io',
                href: 'https://damp83.github.io/Gamificacion-/' },
    crypto: require('node:crypto').webcrypto,
    /* Navegar entre pantallas sube la página arriba. En las pruebas no hay
       nada que subir, pero sin esto la llamada revienta la prueba entera. */
    scrollTo: () => {},
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
