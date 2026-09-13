/* El tráiler de la portada.

   No es un vídeo: es una secuencia hecha con los dibujos que ya están en la
   carpeta. Eso le da tres propiedades que aquí se fijan, porque las tres se
   pierden con un despiste de una línea:

     · funciona en un aula sin wifi, porque todos sus dibujos están en la
       lista del service worker;
     · no sale nada hacia fuera, porque no hay ni un `iframe` ni una URL
       ajena de por medio;
     · y no arranca solo, que en una clase de veinticinco tabletas no es un
       detalle de estilo. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp, ORDEN } = require('./cargar.js');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
/* Para mirar lo que el código HACE y no lo que sus comentarios cuentan: aquí
   arriba se explica justamente por qué no hay un YouTube empotrado, y esa
   explicación no puede hacer saltar la prueba que lo comprueba. */
const sinComentarios = js => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

/* El guion, leído desde dentro del contexto: son `const` de nivel superior. */
function guion() { return cargarApp().ev('JSON.parse(JSON.stringify(TRAILER_GUION))'); }

/* Todos los dibujos que nombra una escena, sea del tipo que sea. */
function dibujosDe(c, e) {
  if (e.img) return [e.img];
  if (e.retratos) return e.retratos.map(id => c.ev(`(RETRATOS['${id}']||{}).img`));
  if (e.rangos) return c.ev('RANKS.map(r => r.img)');
  return [];
}

test('el guion cuenta la historia entera y ninguna escena se queda a medias', () => {
  const g = guion();
  assert.ok(g.length >= 6, 'un tráiler de tres escenas no cuenta nada');
  g.forEach((e, i) => {
    assert.ok(e.titulo && e.titulo.trim(), `la escena ${i + 1} no tiene título`);
    assert.ok(e.texto && e.texto.trim(), `la escena ${i + 1} no tiene texto`);
  });
  /* La última es la puerta: sin ella el tráiler termina en un callejón. */
  assert.strictEqual(g[g.length - 1].tipo, 'cierre');
});

test('todos los dibujos del tráiler existen de verdad', () => {
  /* Una ruta mal escrita no rompe nada al cargar: se ve en la escena, en
     clase y delante de los niños. */
  const c = cargarApp();
  c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))').forEach((e, i) => {
    dibujosDe(c, e).forEach(src => {
      assert.ok(src, `la escena ${i + 1} nombra un dibujo que no existe`);
      assert.ok(fs.existsSync(path.join(RAIZ, src)), `falta el dibujo ${src}`);
    });
  });
});

test('y todos llegan a un aula sin wifi', () => {
  /* Si un dibujo del tráiler no está en la lista del service worker, el
     tráiler se ve en el colegio con wifi y se rompe en el que no lo tiene. */
  const sw = leer('sw.js');
  const c = cargarApp();
  c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))').forEach(e => {
    dibujosDe(c, e).forEach(src => {
      assert.ok(sw.includes(`'./${src}'`), `${src} no está guardado para sin conexión`);
    });
  });
});

test('cada dibujo se enseña como aguanta su tamaño', () => {
  /* De los sesenta y siete dibujos solo tres pasan de 800 px de ancho. Un
     recorte de 91 px puesto a sangre en media pantalla sale pastoso, así que
     solo los grandes pueden declararse `escenario`. La medida se lee de la
     cabecera del WebP, sin depender de ninguna librería. */
  const anchoWebp = f => {
    const b = fs.readFileSync(path.join(RAIZ, f));
    /* VP8L (sin pérdida): 14 bits de ancho menos uno, tras la firma 0x2f. */
    if (b.slice(12, 16).toString('latin1') === 'VP8L')
      return (((b[22] | (b[23] << 8)) & 0x3fff) + 1);
    /* VP8 con pérdida: ancho en los 14 bits del offset 26. */
    if (b.slice(12, 16).toString('latin1') === 'VP8 ')
      return b.readUInt16LE(26) & 0x3fff;
    /* VP8X (extendido): ancho-1 en 24 bits little endian en el offset 24. */
    if (b.slice(12, 16).toString('latin1') === 'VP8X')
      return (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
    return null;
  };
  const c = cargarApp();
  c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))')
    .filter(e => e.tipo === 'escenario')
    .forEach(e => {
      const ancho = anchoWebp(e.img);
      assert.ok(ancho === null || ancho >= 800,
        `${e.img} mide ${ancho} px y se está enseñando a sangre`);
    });
});

test('ningún dibujo del tráiler se queda sin texto alternativo', () => {
  /* Es lo único que queda si un dibujo no llega, y es lo que se lee en voz
     alta. Los de las filas lo sacan de RETRATOS y RANKS, que ya lo traen. */
  guion().filter(e => e.img).forEach(e => {
    assert.ok(e.alt && e.alt.length > 10, `${e.img} no tiene alt decente`);
  });
});

test('el tráiler no arranca solo', () => {
  /* La portada la abre un aula entera a la vez. Veinticinco tabletas
     poniéndose a contar una historia sin que nadie lo pida no es una
     presentación, es un problema. Solo puede abrirlo el cartel. */
  const js = sinComentarios(leer('js/trailer.js'));
  /* Las llamadas, sin contar la declaración ni el enganche del cartel. */
  const llamadas = (js.match(/(?<!function\s)abrirTrailer\s*\(/g) || []).length;
  assert.strictEqual(llamadas, 0, 'trailer.js se abre a sí mismo en algún sitio');
  assert.ok(/addEventListener\('click', abrirTrailer\)/.test(js),
    'el cartel tiene que ser lo único que lo abra');
  /* Y nadie más lo abre desde fuera. */
  ORDEN.filter(n => n !== 'trailer').forEach(n => {
    assert.ok(!leer(`js/${n}.js`).includes('abrirTrailer('), `${n}.js abre el tráiler solo`);
  });
});

test('no hay ni un servicio de fuera de por medio', () => {
  /* El motivo de montarlo con dibujos propios en vez de empotrar un vídeo:
     esa misma portada promete que no se cede nada a terceros, y un `iframe`
     de YouTube le cuenta a Google quién abre la página. */
  const js = sinComentarios(leer('js/trailer.js'));
  assert.ok(!/iframe|youtube|vimeo|https?:\/\//i.test(js),
    'el tráiler no puede pedirle nada a nadie de fuera');
});

test('se puede parar, que se mueve solo más de cinco segundos', () => {
  /* Requisito, no adorno (WCAG 2.2.2). Y en clase sirve para congelar una
     escena y hablar encima. */
  const c = cargarApp();
  assert.strictEqual(c.ev('typeof pausarTrailer'), 'function');
  assert.ok(leer('index.html').includes('id="tr-pausa"'));
  c.ev('trailerEnPausa = false; pausarTrailer(true)');
  assert.strictEqual(c.ev('trailerEnPausa'), true);
  assert.strictEqual(c.ev('trailerReloj'), null, 'pausado no puede quedar reloj puesto');
  c.ev('pausarTrailer()');
  assert.strictEqual(c.ev('trailerEnPausa'), false, 'sin argumento alterna');
});

test('avanzar y retroceder se quedan dentro del guion', () => {
  const c = cargarApp();
  const n = c.ev('TRAILER_GUION.length');
  c.ev('trailerEnPausa = true; trailerIndice = 0');
  c.ev('avanzarTrailer(-1)');
  assert.strictEqual(c.ev('trailerIndice'), 0, 'antes de la primera no hay nada');
  c.ev('avanzarTrailer(1)');
  assert.strictEqual(c.ev('trailerIndice'), 1);
  /* Pasarse del final cierra en vez de dejar el índice fuera de rango. */
  c.ev(`trailerIndice = ${n - 1}; avanzarTrailer(1)`);
  assert.ok(c.ev('trailerIndice') < n);
});

test('la última escena no pasa sola: espera al niño', () => {
  const c = cargarApp();
  c.ev(`trailerEnPausa = false; trailerIndice = TRAILER_GUION.length - 1; armarRelojTrailer()`);
  assert.strictEqual(c.ev('trailerReloj'), null,
    'el cierre tiene que quedarse puesto con el botón de entrar');
});

test('cada molde pinta lo suyo', () => {
  const c = cargarApp();
  const html = i => c.ev(`escenaTrailer(TRAILER_GUION[${i}])`);
  const g = c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))');
  const cierre = html(g.length - 1);
  assert.ok(cierre.includes('id="tr-empezar"'), 'el cierre necesita la puerta de entrada');

  const iFila = g.findIndex(e => e.tipo === 'fila' && e.rangos);
  assert.ok(iFila >= 0);
  const fila = html(iFila);
  c.ev('RANKS.map(r => r.name)').forEach(nombre => {
    assert.ok(fila.includes(nombre), `falta el rango ${nombre} en la escalera`);
  });

  const iFig = g.findIndex(e => e.tipo === 'figura');
  assert.ok(html(iFig).includes('tr-halo'), 'un recorte va con halo, no con marco');
  const iEsc = g.findIndex(e => e.tipo === 'escenario');
  assert.ok(html(iEsc).includes('tr-escenario'));
});

test('trailer.js está en las cuatro listas de carga', () => {
  /* Los scripts comparten un único ámbito y el orden se mantiene a mano en
     cuatro sitios. Olvidar uno no rompe nada aquí: rompe la web publicada, o
     la versión de un solo archivo, o el sin conexión. */
  assert.ok(ORDEN.includes('trailer'), 'falta en test/cargar.js');
  assert.ok(leer('index.html').includes('<script src="js/trailer.js"></script>'));
  assert.ok(leer('sw.js').includes("'./js/trailer.js'"));
  assert.ok(leer('tools/build-standalone.py').includes("'trailer'"));
});

test('el cartel de la portada lleva a alguna parte', () => {
  const html = leer('index.html');
  assert.ok(html.includes('id="home-trailer"'), 'no está el cartel');
  assert.ok(html.includes('id="trailer"'), 'no está el reproductor');
  /* Diálogo de verdad: por debajo hay una portada llena de botones. */
  const i = html.indexOf('id="trailer"');
  const etiqueta = html.slice(i - 120, i + 220);
  assert.ok(etiqueta.includes('aria-modal="true"'));
  assert.ok(etiqueta.includes('role="dialog"'));
  /* Y nace escondido. */
  assert.ok(/id="trailer" class="trailer hidden"/.test(html));
});

/* ══════════════════════════════════════════════════════════
   EL SONIDO
   ══════════════════════════════════════════════════════════ */

test('sale apagado, y sin ninguna pista cargada no hay ni botón', () => {
  /* Aunque haya archivos declarados, hasta que una pista no carga de verdad
     no hay sonido que ofrecer: en un aula sin wifi que nunca lo haya puesto,
     el tráiler tiene que ir como iba, por reloj y mudo. */
  const c = cargarApp();
  assert.strictEqual(c.ev('trailerConSonido'), false, 'el sonido no puede nacer encendido');
  assert.strictEqual(c.ev('Object.keys(trailerPistas).length'), 0,
    'no puede haber ninguna pista montada antes de abrir el tráiler');
  assert.strictEqual(c.ev('hayAudioDeTrailer()'), false);
  assert.strictEqual(c.ev('vozManda()'), false);
  /* Y el reloj sigue mandando. */
  c.ev('trailerEnPausa = false; trailerIndice = 0; armarRelojTrailer()');
  assert.notStrictEqual(c.ev('trailerReloj'), null, 'sin voz, las escenas van por reloj');
  c.ev('pararRelojTrailer()');
});

test('la música no se cuela en la instalación del service worker', () => {
  /* Son 1,5 MB: más que los sesenta y siete dibujos juntos. Meterlos en la
     lista de ASSETS dobla lo que se descarga la primera vez una tableta de
     colegio, y para algo que además nace apagado. Se guarda sola cuando
     alguien la pone, por el camino normal del `fetch` del service worker. */
  const c = cargarApp();
  const musica = c.ev('TRAILER_AUDIO.musica.src');
  assert.ok(musica, 'debería haber música de fondo declarada');
  assert.ok(fs.existsSync(path.join(RAIZ, musica)), `falta el archivo ${musica}`);
  assert.ok(!leer('sw.js').includes(musica),
    'la música está en la precarga del service worker y no debe estarlo');
});

test('la música se pide entera una vez para que quede guardada', () => {
  /* Un <audio> pide el archivo por trozos y el servidor contesta 206. Una
     respuesta parcial no se puede guardar en la caché —la API lo prohíbe—,
     así que por el camino de la reproducción esto no se guardaría NUNCA y el
     tráiler sería mudo en cuanto se fuera la red. Por eso se pide además una
     vez del tirón, que sí devuelve 200 y sí se guarda. */
  const js = sinComentarios(leer('js/trailer.js'));
  assert.ok(/function guardarAudioParaSinRed/.test(js));
  assert.ok(/guardarAudioParaSinRed\(\)/.test(js.replace('function guardarAudioParaSinRed()', '')),
    'nadie llama a guardar el audio para sin red');
  const c = cargarApp();
  /* Y solo una vez: no se vuelve a bajar en cada encendido. */
  assert.strictEqual(c.ev('trailerCacheado'), false);
  c.ev('guardarAudioParaSinRed()');
  assert.strictEqual(c.ev('trailerCacheado'), true);
});

test('con voz, la música se aparta por debajo', () => {
  const c = cargarApp();
  const fondo = c.ev('TRAILER_AUDIO.musica.volumen');
  assert.ok(fondo > 0 && fondo < 1, 'la música de fondo no puede ir a todo volumen');
  /* Sin voz, su volumen normal. */
  assert.strictEqual(c.ev('volumenDeMusica()'), fondo);
  /* Con voz montada, más bajo todavía. */
  c.ev("trailerPistas.voz = { volume: 1 }");
  assert.ok(c.ev('volumenDeMusica()') < fondo, 'con alguien hablando encima, el fondo baja');
});

/* Cuánto dura un mp3 de tasa constante, leído de su cabecera. Sin librerías:
   es el tamaño del audio partido por los bits por segundo. */
function duracionMp3(rel) {
  const d = fs.readFileSync(path.join(RAIZ, rel));
  let off = 0;
  if (d.slice(0, 3).toString('latin1') === 'ID3') {
    off = 10 + ((d[6] & 0x7f) << 21 | (d[7] & 0x7f) << 14 | (d[8] & 0x7f) << 7 | (d[9] & 0x7f));
  }
  const TASAS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  for (let i = off; i < d.length - 4; i++) {
    if (d[i] === 0xFF && (d[i + 1] & 0xE0) === 0xE0) {
      const kbps = TASAS[(d[i + 2] >> 4) & 0xF];
      if (!kbps) continue;
      return (d.length - off) * 8 / (kbps * 1000);
    }
  }
  return 0;
}

test('el reparto automático va en orden y cabe en lo que dura', () => {
  /* Es lo que se usa cuando una escena no trae su segundo escrito: reparte
     por la longitud del texto, que es lo que tarda en decirse. */
  const c = cargarApp();
  c.ev('TRAILER_GUION.forEach(e => { delete e.desde; })');
  const marcas = c.ev('repartoDeVoz(50)');
  const n = c.ev('TRAILER_GUION.length');
  assert.strictEqual(marcas.length, n, 'una marca por escena');
  assert.strictEqual(marcas[0], 0, 'la primera escena empieza cuando empieza la voz');
  for (let i = 1; i < marcas.length; i++) {
    assert.ok(marcas[i] > marcas[i - 1], `la escena ${i + 1} empieza antes que la anterior`);
    assert.ok(marcas[i] < 50, 'una escena empieza después de que acabe la narración');
  }
  /* Las escenas largas de leer se llevan más tiempo que las cortas, que es
     todo lo que pretende el reparto. */
  const g = c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))');
  const largo = (e) => ((e.titulo || '') + (e.texto || '')).length;
  const duras = g.map((e, i) => ({ l: largo(e), d: (marcas[i + 1] || 50) - marcas[i] }));
  const masLarga = duras.reduce((a, b) => (b.l > a.l ? b : a));
  const masCorta = duras.reduce((a, b) => (b.l < a.l ? b : a));
  assert.ok(masLarga.d > masCorta.d, 'la escena con más texto tiene que durar más');
});

test('los segundos de la narración caben dentro de la narración', () => {
  /* Están medidos sobre la onda del mp3 de verdad. Si alguien cambia el
     archivo por otro más corto y no toca los números, la última escena
     entraría después del final y el tráiler se quedaría clavado en una de en
     medio. Esto lo dice antes de que pase en un aula. */
  const c = cargarApp();
  const voz = c.ev('TRAILER_AUDIO.voz.src');
  if (!voz) return;                       // sin voz montada no hay nada que comprobar
  assert.ok(fs.existsSync(path.join(RAIZ, voz)), `falta el archivo ${voz}`);
  const dura = duracionMp3(voz);
  assert.ok(dura > 5, 'no se ha podido leer cuánto dura la narración');

  const g = c.ev('JSON.parse(JSON.stringify(TRAILER_GUION))');
  g.forEach((e, i) => {
    assert.strictEqual(typeof e.desde, 'number', `la escena ${i + 1} no tiene su segundo`);
    assert.ok(e.desde >= 0 && e.desde < dura,
      `la escena ${i + 1} entra en el segundo ${e.desde} y la narración dura ${dura.toFixed(1)}`);
    if (i > 0) assert.ok(e.desde > g[i - 1].desde, `la escena ${i + 1} entra antes que la anterior`);
  });
  /* Y a la última le queda tiempo de decirse: si entrase en el último medio
     segundo, no se vería. */
  assert.ok(dura - g[g.length - 1].desde > 2,
    'la última escena entra tan al final que no da tiempo a leerla');
});

test('un segundo escrito a mano manda sobre el reparto', () => {
  /* Para cuando una frase de la grabación no cae donde el cálculo supone. */
  const c = cargarApp();
  c.ev('TRAILER_GUION[2].desde = 12.5');
  assert.strictEqual(c.ev('repartoDeVoz(50)')[2], 12.5);
});

test('con la voz sonando no hay además un reloj por detrás', () => {
  /* Dos cosas cambiando de escena a destiempo es lo que se ve cuando la
     imagen va por su lado y el locutor por el suyo. */
  const c = cargarApp();
  c.ev("trailerPistas.voz = { pause() {}, play() {}, currentTime: 0 }; trailerConSonido = true");
  assert.strictEqual(c.ev('vozManda()'), true);
  c.ev('trailerEnPausa = false; trailerIndice = 0; armarRelojTrailer()');
  assert.strictEqual(c.ev('trailerReloj'), null, 'manda el locutor, no el reloj');
  /* Con música sola, en cambio, el reloj sigue siendo quien manda: una pista
     de fondo no sabe por dónde va la historia. */
  c.ev("delete trailerPistas.voz; trailerPistas.musica = { pause() {}, play() {}, volume: .4 }");
  assert.strictEqual(c.ev('vozManda()'), false);
  c.ev('armarRelojTrailer()');
  assert.notStrictEqual(c.ev('trailerReloj'), null);
  c.ev('pararRelojTrailer()');
});

/* ══════════════════════════════════════════════════════════
   LA PRIMERA VEZ
   ══════════════════════════════════════════════════════════ */

test('el cartel se destaca la primera vez y nunca más', () => {
  const c = cargarApp();
  assert.strictEqual(c.ev('trailerYaVisto()'), false, 'en un equipo nuevo hay que ofrecerlo');
  c.ev('marcarTrailerVisto()');
  assert.strictEqual(c.ev('trailerYaVisto()'), true, 'una vez visto, deja de destacarse');
  /* Y sobrevive a cerrar la app: la bandera está en el almacén, no en una
     variable que se va con la pestaña. */
  assert.strictEqual(c.ev("localStorage.getItem('atlas_trailer_visto_v1')"), '1');
});

test('destacarse es ofrecerlo, no abrirse solo', () => {
  /* La diferencia importa: en un aula, un tráiler que se abre solo es
     veinticinco pantallas secuestradas a la vez, y un niño que venía a seguir
     excavando donde lo dejó se encuentra una película. */
  const js = sinComentarios(leer('js/trailer.js'));
  assert.ok(/classList\.add\('primera-vez'\)/.test(js), 'la primera vez tiene que destacar el cartel');
  /* Lo de siempre: nadie lo abre por su cuenta. */
  assert.ok(!/(?<!function\s)abrirTrailer\s*\(/.test(js));
});

test('la demostración no se lleva por delante las banderas del equipo', () => {
  /* Un maestro que prueba la demostración en la tablet de clase no puede
     dejar marcado como «ya visto» el tráiler que ese niño no ha visto. */
  const c = cargarApp();
  c.ev('DEMO = true');
  c.ev('marcarTrailerVisto()');
  c.ev("almacen().setItem(TRAILER_SONIDO_KEY, '1')");
  assert.strictEqual(c.ev("localStorage.getItem('atlas_trailer_visto_v1')"), null,
    'la demostración marcó el tráiler como visto en el equipo de verdad');
  assert.strictEqual(c.ev("localStorage.getItem('atlas_trailer_sonido_v1')"), null);
});

/* ══════════════════════════════════════════════════════════
   EL GUION PARA GRABAR
   ══════════════════════════════════════════════════════════ */

test('el texto de la voz tiene una frase por escena', () => {
  /* Si alguien añade una escena y no toca el guion de voz, la narración se
     queda corta y la última escena se ve en silencio. Esto lo dice antes. */
  const doc = leer('docs/voz-del-trailer.md');
  const frases = doc.match(/^> \*\*\d+\.\*\* .+$/gm) || [];
  const escenas = cargarApp().ev('TRAILER_GUION.length');
  assert.strictEqual(frases.length, escenas,
    `hay ${escenas} escenas y ${frases.length} frases grabadas`);
});

test('el altavoz no se enseña hasta que hay algo que de verdad suena', () => {
  /* Con `preload: 'none'` el navegador no toca el archivo hasta el play, así
     que un mp3 que falta no daba error nunca: el botón salía puesto y al
     tocarlo no pasaba nada. Pasa en cuanto el servidor del colegio se queda
     sin el archivo, y pasa siempre en la versión de un solo archivo, que no
     lleva audio dentro. Ahora la pista no cuenta hasta que dice cuánto dura. */
  const js = sinComentarios(leer('js/trailer.js'));
  assert.ok(/preload = 'metadata'/.test(js),
    "con preload 'none' no hay forma de saber si el archivo existe");
  /* La pista se apunta dentro del manejador de «ya sé cuánto duro», no antes. */
  const i = js.indexOf("addEventListener('loadedmetadata'");
  const j = js.indexOf('trailerPistas[nombre] = a');
  assert.ok(i > 0 && j > i && j - i < 200,
    'la pista se da por buena antes de saber si se puede reproducir');
});

test('el bucle de la música se cierra antes de que se apague', () => {
  /* La pista dura 62,4 s pero se desvanece a partir del 58,9 y deja tres
     segundos y medio de silencio. Con el `loop` del navegador —que reproduce
     el archivo entero— eso es un agujero de casi cinco segundos de nada por
     debajo de la escena 7. Se cierra a mano antes. */
  const js = sinComentarios(leer('js/trailer.js'));
  assert.ok(!/\.loop = true/.test(js),
    'con el bucle del navegador suena también la cola de silencio');
  const c = cargarApp();
  const b = c.ev('TRAILER_AUDIO.musica.bucle');
  assert.ok(b, 'la música necesita saber dónde cerrar el bucle');
  const dura = duracionMp3(c.ev('TRAILER_AUDIO.musica.src'));
  assert.ok(c.ev('TRAILER_AUDIO.musica.bucle.hasta') < dura - 1,
    'el bucle se cierra tan al final que suena el silencio de la cola');
  assert.ok(c.ev('TRAILER_AUDIO.musica.bucle.vuelveA') < c.ev('TRAILER_AUDIO.musica.bucle.hasta'));

  /* Y que de verdad rebobine al llegar. */
  c.ev("trailerPistas.musica = { currentTime: 60, volume: .2 }");
  c.ev('cerrarBucleDeMusica()');
  assert.strictEqual(c.ev('trailerPistas.musica.currentTime'),
    c.ev('TRAILER_AUDIO.musica.bucle.vuelveA'));
  /* Pero no antes de tiempo. */
  c.ev('trailerPistas.musica.currentTime = 30; cerrarBucleDeMusica()');
  assert.strictEqual(c.ev('trailerPistas.musica.currentTime'), 30);
});

/* Un `Audio` de mentira que deja disparar sus eventos a mano. Hace falta para
   probar el camino de verdad: qué pasa cuando una pista TERMINA DE CARGAR,
   que es donde estaba el fallo. */
const AUDIO_FALSO = `
  globalThis.__audios = [];
  globalThis.Audio = function () {
    const yo = this;
    this.oyentes = {};
    this.sonando = false; this.currentTime = 0; this.volume = 1; this.duration = 76;
    this.addEventListener = (n, f) => { (yo.oyentes[n] = yo.oyentes[n] || []).push(f); };
    this.play = () => { yo.sonando = true; return { catch() {} }; };
    this.pause = () => { yo.sonando = false; };
    this.cargada = () => (yo.oyentes['loadedmetadata'] || []).forEach(f => f());
    globalThis.__audios.push(this);
  };
  trailerPistas = {}; trailerPistasPedidas = {}; trailerConSonido = false;
  trailerIndice = 0; trailerEnPausa = false;`;

test('la pista que carga la última también arranca', () => {
  /* El fallo que se vio en clase: el equipo ya tenía el sonido encendido; la
     música, que pesa menos, cargaba primero y encendía el sonido ella sola; y
     cuando llegaba la voz —más pesada— ya no la arrancaba nadie. Se oía la
     música y la narración se quedaba muda en el segundo cero. */
  const c = cargarApp();
  c.ev(AUDIO_FALSO);
  c.ev("almacen().setItem(TRAILER_SONIDO_KEY, '1')");   // ya venía encendido
  c.ev('prepararAudioTrailer()');
  assert.strictEqual(c.ev('__audios.length'), 2, 'tienen que montarse las dos pistas');

  /* Carga la música. Al ser la primera, enciende el sonido ella sola. */
  c.ev('__audios[0].cargada()');
  assert.strictEqual(c.ev('trailerConSonido'), true);
  assert.strictEqual(c.ev('__audios[0].sonando'), true, 'la música no arrancó');

  /* Y ahora carga la voz, con el sonido YA puesto. */
  c.ev('__audios[1].cargada()');
  assert.strictEqual(c.ev('__audios[1].sonando'), true,
    'la voz cargó la última y nadie la puso en marcha: se oye la música y no la narración');
  /* Colocada en la escena que se está viendo, no en el segundo cero. */
  assert.strictEqual(c.ev('__audios[1].currentTime'), c.ev('trailerMarcas[0]'));
  /* Y el reloj le ha cedido el mando. */
  assert.strictEqual(c.ev('trailerReloj'), null,
    'con la voz sonando no puede quedar un reloj moviendo las escenas por su cuenta');
});

test('y da igual cuál de las dos llegue primero', () => {
  /* El mismo fallo al revés: si la voz cargara antes, la música se quedaría
     muda. Que una pista dependa del orden de descarga es justo el problema. */
  const c = cargarApp();
  c.ev(AUDIO_FALSO);
  c.ev("almacen().setItem(TRAILER_SONIDO_KEY, '1')");
  c.ev('prepararAudioTrailer()');
  c.ev('__audios[1].cargada()');    // primero la voz
  c.ev('__audios[0].cargada()');    // después la música
  assert.strictEqual(c.ev('__audios[1].sonando'), true, 'la voz no arrancó');
  assert.strictEqual(c.ev('__audios[0].sonando'), true, 'la música no arrancó');
});

test('y el reloj le cede el mando en cuanto la voz entra', () => {
  /* La otra mitad del mismo fallo: con la voz sonando seguía habiendo un
     temporizador por detrás, así que las escenas iban por su cuenta. */
  const c = cargarApp();
  c.ev(`trailerPistas = {}; trailerEnPausa = false; trailerIndice = 0;
        trailerConSonido = true; armarRelojTrailer();`);
  assert.notStrictEqual(c.ev('trailerReloj'), null, 'sin voz manda el reloj');
  c.ev(`trailerPistas.voz = { play() { return { catch() {} }; }, pause() {}, currentTime: 0 };
        armarRelojTrailer();`);
  assert.strictEqual(c.ev('trailerReloj'), null, 'con la voz puesta no puede quedar reloj');
});

test('encender el sonido arranca TODAS las pistas, no la primera', () => {
  const c = cargarApp();
  c.ev(`trailerPistas = {};
        ['musica', 'voz'].forEach(n => {
          trailerPistas[n] = { play() { this.sonando = true; return { catch() {} }; },
                               pause() { this.sonando = false; }, sonando: false,
                               currentTime: 0, volume: 1 };
        });
        trailerConSonido = false; trailerIndice = 0; trailerMarcas = repartoDeVoz(76);
        sonidoTrailer(true);`);
  assert.strictEqual(c.ev('trailerPistas.musica.sonando'), true, 'la música no arrancó');
  assert.strictEqual(c.ev('trailerPistas.voz.sonando'), true, 'la voz no arrancó');
});
