/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — trailer.js
   El tráiler de la portada: la historia contada en cuarenta segundos, para
   el niño que abre esto por primera vez y todavía no sabe por qué debería
   importarle.

   No es un vídeo. Es una secuencia de escenas hechas con los dibujos que ya
   están en la carpeta `img/`, y eso no es un apaño: es lo que permite que
   funcione en un aula sin wifi —el service worker ya guarda esos nueve
   dibujos—, que no pese ni un kilobyte más de descarga y que no haya que
   pedirle permiso a nadie para enseñárselo a un menor. Un vídeo empotrado de
   YouTube en esta portada le contaría a Google quién entra, y esa misma
   página promete tres bloques más abajo que no se cede nada a terceros.

   Se reproduce SOLO si se pide. Nada arranca por su cuenta: la portada la
   abre un aula entera a la vez y veinticinco tabletas hablando solas no es
   una presentación, es un problema de disciplina.
   ═══════════════════════════════════════════════════════════ */

/* Cuánto dura cada escena CUANDO NO HAY VOZ. Cuatro segundos y medio es lo
   que tarda un niño de segundo en leer dos renglones sin agobio; el que lee
   rápido adelanta tocando, y el que necesita más tiempo tiene la pausa. */
const TRAILER_ESCENA_MS = 4500;

/* ── El sonido ──
   Dos pistas, y las dos opcionales por separado:

     · `musica` — el fondo. Suena bajo y no manda sobre nada.
     · `voz`    — la narración. Cuando la hay, las escenas dejan el reloj y
                  siguen al locutor, que es lo único que casa: si el reloj va
                  por su cuenta, la escena cambia a media frase.

   Van juntas a propósito y no como dos modos excluyentes: un tráiler con
   música Y voz es lo normal, y tenerlas separadas evita reescribir esto el
   día que aparezca la segunda.

   Lo que falte, no existe. Con `src` vacío, o si el archivo no carga, esa
   pista se olvida sin decir nada; si no queda ninguna, el botón del altavoz
   ni se pinta. Un archivo que falta no puede romper la portada.

   La música NO está en la lista de `ASSETS` de sw.js, y es adrede: son 1,5 MB
   —más que los sesenta y siete dibujos juntos— y meterlos en la instalación
   doblaría lo que se descarga la primera vez una tableta de colegio para algo
   que, además, nace apagado. El service worker guarda igualmente lo que se
   descarga bien, así que la primera vez que alguien la pone con wifi queda
   guardada y a partir de ahí suena sin conexión. Y si nunca se ha puesto y no
   hay red, el tráiler va mudo, que es justo lo que hacía ayer. */
const TRAILER_AUDIO = {
  /* `bucle` no es adorno. La pista dura 62,4 s pero la música de verdad se
     acaba antes: se desvanece a partir del segundo 58,9 y deja tres segundos
     y medio de silencio al final. Con el bucle del navegador —que reproduce
     el archivo ENTERO y vuelve a empezar— eso es un agujero de casi cinco
     segundos de nada justo debajo de la escena 7, y luego un arranque. Así
     que se cierra a mano antes de que empiece el desvanecido, volviendo a un
     punto donde la entrada ya ha arrancado. Los dos números salen de medir la
     onda del mp3, no de escucharlo a ojo. */
  musica: { src: 'audio/donde-apunta-la-brujula.mp3', volumen: .38,
            bucle: { hasta: 58.8, vuelveA: 1.2 } },
  voz:    { src: 'audio/voz-trailer.mp3', volumen: 1 }
};

/* Con voz encima, la música baja todavía más: el fondo es fondo. */
const TRAILER_MUSICA_BAJO_VOZ = .18;
/* Y al cerrar se apaga en medio segundo en vez de cortarse en seco, que es la
   diferencia entre que algo termine y que alguien desenchufe el cable. */
const TRAILER_FUNDIDO_MS = 500;

/* Arranca APAGADO y se recuerda por dispositivo. Veinticinco tabletas en un
   aula descubriendo a la vez que esto habla es exactamente el motivo: que
   suene tiene que ser una decisión de alguien, no lo que pasa por defecto. */
const TRAILER_SONIDO_KEY = 'atlas_trailer_sonido_v1';
/* Y si ya se ha visto una vez, para no seguir ofreciéndolo en cada arranque. */
const TRAILER_VISTO_KEY = 'atlas_trailer_visto_v1';

/* Las dos pistas vivas, por nombre: { musica: <Audio>, voz: <Audio> }. Solo
   están las que de verdad han podido cargarse. */
let trailerPistas = {};
let trailerConSonido = false;

/* ── El guion ──
   Nueve escenas: el gancho, el problema, los dos sitios, la rival, los tres
   que te acompañan, la regla del juego, la recompensa y la puerta.

   Cada escena declara CÓMO se mira su dibujo, y no es un capricho de estilo:
   de los sesenta y siete dibujos de la carpeta solo tres son grandes —la
   carta y los dos fondos de yacimiento, de 1100 y 1400 píxeles de ancho—. Los
   demás son recortes de 200 px con el fondo transparente. Estirar un recorte
   de 91 px a media pantalla lo deja borroso, y ponerle sombra de caja a una
   figura recortada dibuja un rectángulo alrededor de algo que no lo tiene.

     · `escenario` — dibujo ancho a sangre, con marco y acercamiento lento.
     · `figura`    — un recorte a su tamaño, con un halo detrás.
     · `fila`      — varios recortes en fila, con su nombre debajo.

   `alt` no es decorativo: si un dibujo no llega, es lo único que queda en
   pantalla, y es lo que lee un lector de pantalla.

   `desde` es el segundo de la narración en el que entra cada escena. No están
   puestos a ojo ni calculados a partir del texto: se sacaron midiendo la onda
   del mp3 —dónde calla el locutor— y colocando cada corte DENTRO de un
   silencio de verdad. Por eso son números con dos decimales y no redondos. La
   diferencia importa: un corte a medio segundo de distancia cae en mitad de
   una palabra, y eso se oye. Si alguna escena entra pronto o tarde, se cambia
   su número aquí y ya está. */
const TRAILER_GUION = [
  { tipo: 'escenario', desde: 0.0, img: 'img/carta.webp',
    alt: 'Una carta del mundo dibujada a mano sobre pergamino, con dunas, ruinas y un oasis',
    titulo: 'Hace cien años',
    texto: 'La Expedición Atlas salió a cartografiar el mundo entero.' },

  { tipo: 'figura', desde: 6.09, img: 'img/fragmento.webp',
    alt: 'Un trozo de mapa con forma de pieza de puzle, con un templo dibujado dentro',
    titulo: 'Nunca volvió',
    texto: 'Solo quedaron sus diarios, rotos en mil pedazos y repartidos bajo tierra.' },

  { tipo: 'escenario', desde: 13.55, img: 'img/fondos/kaldros.webp',
    alt: 'El interior del templo de Kaldros: columnas, engranajes y un haz de luz',
    titulo: 'Ruinas de Kaldros',
    texto: 'Unas páginas están aquí, bajo el templo de los engranajes y los relojes.' },

  { tipo: 'escenario', desde: 23.47, img: 'img/fondos/biblioteca.webp',
    alt: 'Una biblioteca sepultada por la arena, con estanterías medio enterradas',
    titulo: 'Biblioteca de Arena',
    texto: 'Otras, en una biblioteca que se tragó el desierto hace siglos.' },

  { tipo: 'figura', desde: 29.8, img: 'img/vera.webp', tono: 'peligro',
    alt: 'Vera Kovak, con un cuaderno robado bajo el brazo',
    titulo: 'Y no eres el único que las busca',
    texto: 'Vera Kovak quiere venderlas al mejor postor. Se le dan mal las cuentas… ¿sabrás pillarla?' },

  { tipo: 'fila', desde: 41.34, retratos: ['bruno', 'kira', 'tobias'],
    titulo: 'Pero no vas solo',
    texto: 'El Prof. Ocaña, que ya se equivocó antes y peor. Kira, que traduce jeroglíficos. Y Tobías, que huele tesoros.' },

  { tipo: 'figura', desde: 53.1, img: 'img/sello.webp',
    alt: 'Un sello de lacre dorado con una pala y una brújula grabadas',
    titulo: 'Así se excava',
    texto: 'Cada cosa que aprendes de verdad desentierra una página. Equivocarse no quita nada: es parte de cavar.' },

  { tipo: 'fila', desde: 63.83, rangos: true,
    titulo: 'De aprendiz a leyenda',
    texto: 'Página a página, el mapa se dibuja… y tú subes de rango hasta lo más alto.' },

  { tipo: 'cierre', desde: 71.67,
    titulo: 'El mapa lleva cien años esperándote',
    texto: '¿Empezamos?' }
];

/* Dónde estamos y qué relojes hay puestos. Fuera de las funciones porque la
   reproducción la manejan cuatro sitios distintos —el temporizador, el
   teclado, los toques y el botón de pausa— y todos tienen que ver lo mismo. */
let trailerIndice = 0;
let trailerReloj = null;
let trailerEnPausa = false;
let trailerFocoPrevio = null;

/* Los dibujos, pedidos con tiempo. Sin esto la primera escena entra en
   blanco y la segunda da un tirón: son 200 KB que el navegador puede ir
   trayendo mientras el niño lee la portada. Se hace una sola vez. */
let trailerPrecargado = false;
function precargarTrailer() {
  if (trailerPrecargado || typeof Image !== 'function') return;
  trailerPrecargado = true;
  TRAILER_GUION.forEach(e => {
    let fuentes = [];
    if (e.img) fuentes = [e.img];
    else if (e.retratos) fuentes = e.retratos.map(id => (RETRATOS[id] || {}).img);
    else if (e.rangos) fuentes = RANKS.map(r => r.img);
    fuentes.filter(Boolean).forEach(src => { const i = new Image(); i.src = src; });
  });
}

/* ── Pintar una escena ──
   Cuatro moldes, según lo que declare el guion. */
function escenaTrailer(e) {
  let dibujo = '';

  if (e.tipo === 'cierre') {
    return `<div class="tr-escena tr-cierre">
      <div class="tr-crest">${ico('compass', 'ico-lg')}</div>
      <h2 class="tr-titulo">${esc(e.titulo)}</h2>
      <p class="tr-texto">${esc(e.texto)}</p>
      <button type="button" class="btn btn-primary tr-empezar" id="tr-empezar">
        Empezar mi expedición →</button>
    </div>`;
  }

  if (e.tipo === 'fila') {
    /* Los cinco rangos o los tres compañeros. Llevan nombre debajo porque en
       la fila de rangos el nombre ES la escena: cinco medallas doradas sin
       rotular son cinco medallas iguales. */
    const piezas = e.rangos
      ? RANKS.map(r => ({ img: r.img, alt: 'Medalla de ' + r.name, pie: r.name }))
      : (e.retratos || []).map(id => {
          const r = RETRATOS[id] || {};
          return { img: r.img, alt: r.alt, pie: '' };
        });
    dibujo = `<div class="tr-fila${e.rangos ? ' tr-fila-rangos' : ''}">${piezas.map(x => `
      <figure class="tr-pieza">
        <img src="${esc(x.img || '')}" alt="${esc(x.alt || '')}" class="tr-figura">
        ${x.pie ? `<figcaption>${esc(x.pie)}</figcaption>` : ''}
      </figure>`).join('')}</div>`;

  } else if (e.tipo === 'figura') {
    /* Un recorte con el fondo transparente: nada de marco ni sombra de caja,
       que dibujaría un rectángulo alrededor de algo que no lo tiene. El halo
       de detrás es lo que lo despega del oscuro. */
    dibujo = `<div class="tr-halo">
      <img src="${esc(e.img)}" alt="${esc(e.alt || '')}" class="tr-figura tr-figura-sola">
    </div>`;

  } else {
    dibujo = `<img src="${esc(e.img)}" alt="${esc(e.alt || '')}" class="tr-escenario">`;
  }

  return `<div class="tr-escena${e.tono ? ' tr-' + esc(e.tono) : ''}">
    ${dibujo}
    <h2 class="tr-titulo">${esc(e.titulo)}</h2>
    <p class="tr-texto">${esc(e.texto)}</p>
  </div>`;
}

function pintarEscenaTrailer() {
  const lienzo = $('#tr-lienzo');
  if (!lienzo) return;
  const e = TRAILER_GUION[trailerIndice];
  lienzo.innerHTML = escenaTrailer(e);
  /* El botón del cierre es la única salida que lleva a algún sitio, así que
     se le da el foco: quien llegue al final con el teclado lo tiene debajo
     del dedo sin buscarlo. */
  const empezar = $('#tr-empezar');
  if (empezar) {
    empezar.addEventListener('click', () => { cerrarTrailer(); startStudentPath(); });
    if (!menosMovimiento()) empezar.focus({ preventScroll: true });
  }
  /* La barra de arriba: un tramo por escena, como las historias de cualquier
     app que estos niños ya saben usar. */
  $$('#tr-barra .tr-tramo').forEach((t, i) => {
    t.classList.toggle('vista', i < trailerIndice);
    t.classList.toggle('actual', i === trailerIndice);
  });
  const n = $('#tr-cuenta');
  if (n) n.textContent = `${trailerIndice + 1} de ${TRAILER_GUION.length}`;
  /* En la primera no hay atrás y en la última no hay siguiente: allí la única
     salida hacia delante es el botón verde, y dos botones que hacen cosas
     distintas apuntando al mismo sitio confunden. */
  const antes = $('#tr-antes'), luego = $('#tr-luego');
  if (antes) antes.classList.toggle('hidden', trailerIndice === 0);
  if (luego) luego.classList.toggle('hidden', trailerIndice >= TRAILER_GUION.length - 1);
}

/* ── El sonido ──
   Todo lo de aquí abajo está escrito para que la ausencia de un archivo sea
   un caso normal y no un fallo: si no hay `src`, si el navegador no sabe
   reproducirlo o si la descarga falla, esa pista no llega a existir y el
   resto del tráiler ni se entera. */

function pistaDeTrailer(nombre) { return trailerPistas[nombre] || null; }
function hayAudioDeTrailer() {
  return !!(pistaDeTrailer('musica') || pistaDeTrailer('voz'));
}
/* ¿Manda la voz sobre el reloj? Solo si hay narración Y está sonando. Con
   música sola, o en silencio, las escenas siguen yendo por tiempo. */
function vozManda() {
  return !!(pistaDeTrailer('voz') && trailerConSonido);
}

function sonidoGuardado() {
  try { return almacen().getItem(TRAILER_SONIDO_KEY) === '1'; } catch (e) { return false; }
}
function guardarSonido(si) {
  try { almacen().setItem(TRAILER_SONIDO_KEY, si ? '1' : '0'); } catch (e) { /* sin sitio */ }
}

/* El fondo baja cuando hay alguien hablando encima. */
function volumenDeMusica() {
  return pistaDeTrailer('voz') ? TRAILER_MUSICA_BAJO_VOZ : TRAILER_AUDIO.musica.volumen;
}

/* ── Dónde empieza cada escena dentro de la narración ──
   Repartido por la longitud de lo que se lee en cada una, que es la mejor
   aproximación barata a lo que tarda en decirse: una escena con veinticinco
   palabras se cuenta en el doble de tiempo que una de doce.

   No es exacto y no hace falta que lo sea: la escena cambia con un segundo de
   margen y nadie lo nota. Quien quiera afinarlo escribe `desde` en segundos
   en la escena del guion y ese número manda sobre el reparto. */
function repartoDeVoz(duracion) {
  if (!(duracion > 0)) return TRAILER_GUION.map((e, i) => i * (TRAILER_ESCENA_MS / 1000));
  const pesos = TRAILER_GUION.map(e => ((e.titulo || '') + ' ' + (e.texto || '')).length || 1);
  const total = pesos.reduce((a, b) => a + b, 0);
  const marcas = [];
  let acumulado = 0;
  TRAILER_GUION.forEach((e, i) => {
    marcas.push(typeof e.desde === 'number' ? e.desde : (acumulado / total) * duracion);
    acumulado += pesos[i];
  });
  return marcas;
}
let trailerMarcas = [];

/* El locutor va por delante y la escena le sigue. Se escucha el reloj del
   audio en vez de calcular un temporizador por escena porque así pausar,
   rebobinar o que la descarga se atasque un segundo salen gratis: la escena
   es siempre la que toca al tiempo que de verdad va sonando. */
function alSonarLaVoz() {
  const voz = pistaDeTrailer('voz');
  if (!voz || !vozManda()) return;
  const t = voz.currentTime;
  let i = 0;
  while (i + 1 < trailerMarcas.length && t >= trailerMarcas[i + 1]) i++;
  if (i !== trailerIndice) {
    trailerIndice = i;
    pintarEscenaTrailer();
  }
}

/* Cada pista se monta una vez y se queda.

   `preload: 'metadata'` y no `'none'`: con `'none'` el navegador no toca el
   archivo hasta que se le da al play, así que un archivo que no está no da
   error hasta ese momento —y mientras tanto el botón del altavoz sale puesto
   y no hace nada al tocarlo. Con `'metadata'` se baja la cabecera, que son
   unos kilobytes, y ahí se sabe ya si el archivo existe y cuánto dura.

   De ahí que la pista NO se dé por buena hasta que dice cuánto dura: el botón
   solo aparece cuando hay algo que de verdad se puede reproducir. Y como las
   pistas se montan al ABRIR el tráiler y no al cargar la portada, quien nunca
   lo abra no se descarga nada. */
function montarPista(nombre) {
  const cfg = TRAILER_AUDIO[nombre];
  if (!cfg || !cfg.src || typeof Audio !== 'function') return;
  if (trailerPistasPedidas[nombre]) return;
  trailerPistasPedidas[nombre] = true;
  try {
    const a = new Audio();
    a.preload = 'metadata';
    /* Nada de `a.loop`: el navegador reproduce el archivo entero, cola de
       silencio incluida. El cierre lo lleva `cerrarBucleDeMusica`. */
    if (nombre === 'musica' && cfg.bucle) a.addEventListener('timeupdate', cerrarBucleDeMusica);

    a.addEventListener('loadedmetadata', () => {
      trailerPistas[nombre] = a;
      if (nombre === 'voz') trailerMarcas = repartoDeVoz(a.duration);
      /* El fondo se ajusta aquí y no al montarlo: si la voz ha llegado
         después, ahora es cuando hay que apartar la música. */
      const m = pistaDeTrailer('musica');
      if (m) m.volume = volumenDeMusica();
      pintarBotonDeSonido();
      if (trailerConSonido) {
        /* El sonido ya estaba puesto y esta pista acaba de llegar: se suma.
           Sin esto, la que cargara la última se quedaba muda para siempre. */
        arrancarPista(nombre);
        /* Y si la que ha llegado es la voz, el reloj le cede el mando. */
        armarRelojTrailer();
      } else if (sonidoGuardado()) {
        /* Este equipo ya lo tenía encendido. Se enciende ahora y no antes:
           hasta este momento no había nada que reproducir. */
        sonidoTrailer(true);
      }
    });
    if (nombre === 'voz') a.addEventListener('timeupdate', alSonarLaVoz);

    /* Si el archivo no está o el navegador no puede con él, esa pista no
       llega a existir y el tráiler sigue con lo que quede —o mudo, y por
       reloj—, sin avisar de nada: el niño no tiene que enterarse de que falta
       un archivo en el servidor de su colegio. Es también lo que pasa en la
       versión de un solo archivo, que no lleva audio dentro. */
    a.addEventListener('error', () => {
      delete trailerPistas[nombre];
      if (!hayAudioDeTrailer()) trailerConSonido = false;
      pintarBotonDeSonido();
      armarRelojTrailer();
    });

    a.src = cfg.src;
  } catch (e) { delete trailerPistas[nombre]; }
}
let trailerPistasPedidas = {};

/* Volver al principio antes de que la pista se apague, para que el fondo no
   deje nunca un hueco. */
function cerrarBucleDeMusica() {
  const m = pistaDeTrailer('musica');
  const b = TRAILER_AUDIO.musica.bucle;
  if (!m || !b) return;
  if (m.currentTime >= b.hasta) {
    try { m.currentTime = b.vuelveA; } catch (e) {}
  }
}

function prepararAudioTrailer() {
  ['musica', 'voz'].forEach(n => { if (!pistaDeTrailer(n)) montarPista(n); });
}

/* ── Dejarla guardada para el día que no haya wifi ──
   El service worker guarda todo lo que se descarga entero y bien, pero un
   `<audio>` no pide el archivo entero: pide trozos («Range»), y el servidor
   responde 206. Una respuesta parcial no se puede guardar en la caché —la API
   lo prohíbe— así que por el camino de la reproducción esto NUNCA se quedaría
   guardado, y el tráiler volvería a ser mudo en cuanto se fuera la red.

   Se pide entonces una vez, aparte y del tirón, que sí devuelve un 200 y sí se
   guarda. Cuesta una descarga repetida la primera vez que alguien enciende el
   sonido, y a cambio la música ya no depende de la red nunca más. Solo una
   vez por sesión y sin esperar a que termine: si falla, no ha pasado nada. */
let trailerCacheado = false;
function guardarAudioParaSinRed() {
  if (trailerCacheado || typeof fetch !== 'function') return;
  trailerCacheado = true;
  ['musica', 'voz'].forEach(n => {
    const cfg = TRAILER_AUDIO[n];
    if (cfg && cfg.src) fetch(cfg.src).catch(() => {});
  });
}

function pintarBotonDeSonido() {
  const b = $('#tr-sonido');
  if (!b) return;
  /* Sin ninguna pista no hay botón: un altavoz que no hace nada es peor que
     nada. */
  b.classList.toggle('hidden', !hayAudioDeTrailer());
  if (!hayAudioDeTrailer()) return;
  b.innerHTML = trailerConSonido ? ico('sound') + ' Sonido' : ico('mute') + ' Sin sonido';
  b.setAttribute('aria-pressed', String(trailerConSonido));
  b.setAttribute('aria-label', trailerConSonido ? 'Quitar el sonido' : 'Poner el sonido');
}

/* Arrancar una pista sin que un rechazo tumbe nada. `play()` devuelve una
   promesa que el navegador rechaza si decide que no toca sonar; se recoge y
   se apaga el interruptor, que mentir con el botón encendido y nada sonando
   es lo peor de los dos mundos. */
function sonarPista(a, alFallar) {
  if (!a) return;
  try {
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (alFallar) alFallar(); });
  } catch (e) { if (alFallar) alFallar(); }
}

/* Poner en marcha UNA pista, colocada donde toca. Existe porque hay dos
   caminos que arrancan sonido y antes solo uno lo hacía bien: el del botón, y
   el de «este equipo ya lo tenía encendido», que se dispara en cuanto una
   pista termina de cargar. Como la música pesa menos que la voz, cargaba
   antes, encendía el sonido ella sola y la voz —que llegaba después— no la
   arrancaba nadie. Resultado: música sí, narración no, y el reloj y la voz
   mandando a la vez sobre las escenas. */
function arrancarPista(nombre) {
  const a = pistaDeTrailer(nombre);
  if (!a) return;
  if (nombre === 'musica') a.volume = volumenDeMusica();
  if (nombre === 'voz' && trailerMarcas[trailerIndice] != null) {
    /* La narración empieza por donde va la escena, no por el principio: quien
       enciende el sonido en la escena cinco no quiere volver a la uno. */
    try { a.currentTime = trailerMarcas[trailerIndice]; } catch (e) {}
  }
  sonarPista(a, () => {
    /* Si el navegador se niega a reproducir, se apaga el interruptor: mentir
       con el botón encendido y nada sonando es lo peor de los dos mundos. */
    trailerConSonido = false;
    pintarBotonDeSonido();
    armarRelojTrailer();
  });
}

function sonidoTrailer(quiero) {
  if (!hayAudioDeTrailer()) return;
  trailerConSonido = quiero === undefined ? !trailerConSonido : !!quiero;
  guardarSonido(trailerConSonido);
  const musica = pistaDeTrailer('musica');
  const voz = pistaDeTrailer('voz');

  if (trailerConSonido) {
    guardarAudioParaSinRed();
    ['musica', 'voz'].forEach(arrancarPista);
  } else {
    [musica, voz].forEach(a => { if (a) { try { a.pause(); } catch (e) {} } });
  }
  pintarBotonDeSonido();
  armarRelojTrailer();
}

/* Bajar el telón: se apaga en medio segundo y se rebobina. Sin el fundido, al
   dar a «Saltar» la música se corta de golpe en mitad de un compás y suena a
   avería, no a final. */
function callarTrailer() {
  const pistas = ['musica', 'voz'].map(pistaDeTrailer).filter(Boolean);
  pistas.forEach(a => {
    const v0 = a.volume;
    const paso = v0 / Math.max(1, TRAILER_FUNDIDO_MS / 50);
    const baja = setInterval(() => {
      try {
        a.volume = Math.max(0, a.volume - paso);
        if (a.volume <= 0.001) throw new Error('fin');
      } catch (e) {
        clearInterval(baja);
        try { a.pause(); a.currentTime = 0; a.volume = v0; } catch (e2) {}
      }
    }, 50);
  });
}

/* ── El reloj ──
   Se rearma en cada escena en vez de dejar un intervalo suelto: así pausar,
   adelantar y retroceder son todos la misma operación —parar y volver a
   poner— y no hay forma de que se queden dos relojes a la vez. */
function armarRelojTrailer() {
  pararRelojTrailer();
  if (trailerEnPausa) return;
  /* Con narración sonando el reloj sobra: manda el locutor. Dejarlo puesto
     sería tener dos cosas cambiando de escena a destiempo. */
  if (vozManda()) return;
  /* La última escena no pasa sola a ningún sitio: se queda con el botón de
     entrar puesto hasta que el niño decida. */
  if (trailerIndice >= TRAILER_GUION.length - 1) return;
  trailerReloj = setTimeout(() => avanzarTrailer(1), TRAILER_ESCENA_MS);
}

function pararRelojTrailer() {
  if (trailerReloj) { clearTimeout(trailerReloj); trailerReloj = null; }
}

function avanzarTrailer(paso) {
  const destino = trailerIndice + paso;
  if (destino < 0) return;
  if (destino >= TRAILER_GUION.length) { cerrarTrailer(); return; }
  trailerIndice = destino;
  /* Si hay narración, saltar de escena salta también al locutor: si no, la
     voz sigue contando la escena anterior encima de la que ya se ve. */
  if (vozManda() && trailerMarcas[destino] != null) {
    try { pistaDeTrailer('voz').currentTime = trailerMarcas[destino]; } catch (e) {}
  }
  pintarEscenaTrailer();
  armarRelojTrailer();
}

/* Pausar es un requisito, no un adorno: cualquier cosa que se mueva sola más
   de cinco segundos tiene que poder pararse (WCAG 2.2.2). Y en un aula sirve
   para lo de siempre: congelar una escena y hablar encima. */
function pausarTrailer(quieto) {
  trailerEnPausa = quieto === undefined ? !trailerEnPausa : !!quieto;
  const b = $('#tr-pausa');
  if (b) {
    b.innerHTML = trailerEnPausa ? ico('play') + ' Seguir' : ico('pause') + ' Pausa';
    b.setAttribute('aria-pressed', String(trailerEnPausa));
  }
  if (trailerEnPausa) pararRelojTrailer(); else armarRelojTrailer();
  /* Pausar calla al locutor. Es la mitad de para lo que sirve la pausa en un
     aula: congelar la escena y hablar tú encima. */
  if (trailerConSonido) {
    ['musica', 'voz'].map(pistaDeTrailer).filter(Boolean).forEach(a => {
      if (trailerEnPausa) { try { a.pause(); } catch (e) {} }
      else sonarPista(a);
    });
  }
}

function teclasTrailer(ev) {
  if (ev.key === 'Escape')      { ev.preventDefault(); cerrarTrailer(); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); avanzarTrailer(1); }
  else if (ev.key === 'ArrowLeft')  { ev.preventDefault(); avanzarTrailer(-1); }
  else if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); pausarTrailer(); }
  /* El foco no se escapa del tráiler mientras está puesto: por debajo hay una
     portada entera de botones que ahora mismo no se ven. */
  else if (ev.key === 'Tab') {
    const dentro = $$('#trailer button');
    if (!dentro.length) return;
    const primero = dentro[0], ultimo = dentro[dentro.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
  }
}

function abrirTrailer() {
  const caja = $('#trailer');
  if (!caja) return;
  precargarTrailer();
  trailerFocoPrevio = document.activeElement;
  trailerIndice = 0;
  trailerEnPausa = false;
  /* Los tramos de la barra se pintan una vez, que son tantos como escenas. */
  const barra = $('#tr-barra');
  if (barra) barra.innerHTML = TRAILER_GUION.map(() => '<span class="tr-tramo"></span>').join('');
  caja.classList.remove('hidden');
  document.body.classList.add('con-trailer');
  prepararAudioTrailer();
  trailerConSonido = false;
  pintarBotonDeSonido();
  /* En la primera apertura no hay nada cargado todavía y de retomar el
     sonido se encarga cada pista al estar lista. De la segunda en adelante ya
     lo están, y entonces le toca a esto. */
  if (hayAudioDeTrailer() && sonidoGuardado()) sonidoTrailer(true);
  pausarTrailer(false);
  pintarEscenaTrailer();
  armarRelojTrailer();
  /* Verlo cuenta como visto aunque se salga a la mitad: el ofrecimiento
     destacado es para quien no sabe qué es esto, y con haberlo abierto ya lo
     sabe. */
  marcarTrailerVisto();
  document.addEventListener('keydown', teclasTrailer);
}

function cerrarTrailer() {
  const caja = $('#trailer');
  if (!caja) return;
  pararRelojTrailer();
  callarTrailer();
  trailerConSonido = false;
  caja.classList.add('hidden');
  document.body.classList.remove('con-trailer');
  document.removeEventListener('keydown', teclasTrailer);
  /* Devolver el foco a donde estaba. Si no, quien navega con teclado vuelve
     al principio del documento y tiene que recorrer la portada otra vez. */
  if (trailerFocoPrevio && trailerFocoPrevio.focus) {
    try { trailerFocoPrevio.focus({ preventScroll: true }); } catch (e) {}
  }
  trailerFocoPrevio = null;
}

/* ── La primera vez ──
   Quien abre esto por primera vez no sabe qué es, y el cartel del tráiler es
   un renglón más entre otros diez. La primera vez, y solo la primera, se
   destaca: un rótulo de «empieza por aquí» y algo más de presencia.

   Destacar, no abrirse solo. Abrirse solo sería quitarle la pantalla de las
   manos a un niño que a lo mejor venía a seguir excavando donde lo dejó, y en
   un aula sería veinticinco tabletas arrancando a la vez. Se ofrece; lo de
   aceptar es suyo.

   La bandera va por dispositivo, que es lo honesto: es la tableta la que ya
   ha visto el tráiler, y no hay forma de saber si hoy la coge el mismo niño.
   Y va por `almacen()`, así que dentro de la demostración se escribe en el
   cajón de mentira y no toca los datos de la clase de verdad. */
function trailerYaVisto() {
  try { return almacen().getItem(TRAILER_VISTO_KEY) === '1'; } catch (e) { return true; }
}
function marcarTrailerVisto() {
  try { almacen().setItem(TRAILER_VISTO_KEY, '1'); } catch (e) { /* sin sitio */ }
  const cartel = $('#home-trailer');
  if (cartel) cartel.classList.remove('primera-vez');
  const tag = $('#home-trailer-tag');
  if (tag) tag.classList.add('hidden');
}

/* Los botones del tráiler y el cartel que lo abre. Lo llama app.js al
   arrancar, con el resto del cableado de la portada. */
function prepararTrailer() {
  const cartel = $('#home-trailer');
  if (cartel) {
    cartel.addEventListener('click', abrirTrailer);
    /* El fotograma del cartel: el primer escenario del guion, que es lo que
       verá al tocarlo. Puesto desde aquí y no escrito en el HTML, porque la
       versión de un solo archivo incrusta los dibujos buscando su ruta en el
       código; una ruta suelta en el HTML se quedaría sin incrustar y saldría
       rota justo en la versión que se reparte sin carpetas. */
    const lam = $('#home-trailer-lam');
    const primero = TRAILER_GUION.find(e => e.tipo === 'escenario');
    if (lam && primero) {
      const marco = document.createElement('img');
      marco.className = 'home-trailer-fondo';
      marco.alt = '';
      marco.loading = 'lazy';
      marco.decoding = 'async';
      marco.src = primero.img;
      lam.insertBefore(marco, lam.firstChild);
    }
    /* Los dibujos se piden cuando el navegador esté ocioso, no al tocar: así
       la primera escena ya está cargada cuando hace falta. */
    if (typeof requestIdleCallback === 'function') requestIdleCallback(precargarTrailer);
    else setTimeout(precargarTrailer, 2500);
  }
  /* El destacado de la primera vez. Se decide aquí, al arrancar, y se quita
     en cuanto se abre el tráiler una vez. */
  if (cartel && !trailerYaVisto()) {
    cartel.classList.add('primera-vez');
    const tag = $('#home-trailer-tag');
    if (tag) tag.classList.remove('hidden');
  }

  const sonido = $('#tr-sonido');
  if (sonido) sonido.addEventListener('click', () => sonidoTrailer());
  const cerrar = $('#tr-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarTrailer);
  const pausa = $('#tr-pausa');
  if (pausa) pausa.addEventListener('click', () => pausarTrailer());
  const antes = $('#tr-antes');
  if (antes) antes.addEventListener('click', () => avanzarTrailer(-1));
  const luego = $('#tr-luego');
  if (luego) luego.addEventListener('click', () => avanzarTrailer(1));
}
