/* Dos funciones con el mismo nombre en ficheros distintos.

   Esta base no tiene empaquetador a propósito: son doce scripts clásicos que
   comparten UN solo ámbito global. Eso significa que dos funciones con el
   mismo nombre no son un error ni un aviso: la del fichero que carga después
   pisa a la anterior, en silencio, y el código que llamaba a la primera
   empieza a recibir otra cosa.

   Pasó de verdad: `conceptosPorArea()` existía en generador.js devolviendo un
   objeto de ids por área, se escribió otra en teacher.js devolviendo un Map, y
   la validación de los retos con IA se quedó sin conceptos válidos. Ningún
   test de la IA la llamaba directamente, así que el fallo salió cinco pruebas
   más allá y sin decir por qué.

   Esta prueba es la red para eso. Si hace falta una función con un nombre que
   ya existe, el arreglo es renombrarla, no apuntarla aquí. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

/* El mismo orden que index.html y que test/cargar.js */
const ORDEN = ['content', 'generador', 'config', 'cloud', 'state', 'game', 'classview',
               'ui', 'play', 'aula', 'teacher', 'app'];

function declaracionesDe(fichero) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', `${fichero}.js`), 'utf8');
  /* Solo las de primer nivel: una función anidada vive en su propio ámbito y
     no pisa nada. Se reconocen porque empiezan en la columna cero. */
  const fn = [...src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  const co = [...src.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1]);
  return { fn, co };
}

function repetidos(clave) {
  const visto = new Map();
  const choques = [];
  for (const f of ORDEN) {
    for (const nombre of declaracionesDe(f)[clave]) {
      if (visto.has(nombre) && visto.get(nombre) !== f) {
        choques.push(`${nombre}: ${visto.get(nombre)}.js y ${f}.js`);
      }
      visto.set(nombre, f);
    }
  }
  return choques;
}

test('ninguna función de primer nivel se llama igual en dos ficheros', () => {
  assert.deepEqual(repetidos('fn'), [],
    'la del fichero que carga después pisa a la anterior sin decir nada');
});

test('ni ninguna constante de primer nivel', () => {
  /* Con `const` el choque no es silencioso —revienta al cargar— pero revienta
     la app entera, que es peor. Mejor saberlo aquí. */
  assert.deepEqual(repetidos('co'), []);
});

test('y dentro de un mismo fichero tampoco', () => {
  /* Ahí la segunda gana igual, y encima parece que las dos están vivas. */
  for (const f of ORDEN) {
    const { fn } = declaracionesDe(f);
    const cuenta = {};
    const dobles = [];
    for (const n of fn) {
      cuenta[n] = (cuenta[n] || 0) + 1;
      if (cuenta[n] === 2) dobles.push(n);
    }
    assert.deepEqual(dobles, [], `${f}.js declara dos veces: ${dobles.join(', ')}`);
  }
});
