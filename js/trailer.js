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

/* Cuánto dura cada escena. Cuatro segundos y medio es lo que tarda un niño
   de segundo en leer dos renglones sin agobio; el que lee rápido adelanta
   tocando, y el que necesita más tiempo tiene la pausa. */
const TRAILER_ESCENA_MS = 4500;

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
   pantalla, y es lo que lee un lector de pantalla. */
const TRAILER_GUION = [
  { tipo: 'escenario', img: 'img/carta.webp',
    alt: 'Una carta del mundo dibujada a mano sobre pergamino, con dunas, ruinas y un oasis',
    titulo: 'Hace cien años',
    texto: 'La Expedición Atlas salió a cartografiar el mundo entero.' },

  { tipo: 'figura', img: 'img/fragmento.webp',
    alt: 'Un trozo de mapa con forma de pieza de puzle, con un templo dibujado dentro',
    titulo: 'Nunca volvió',
    texto: 'Solo quedaron sus diarios, rotos en mil pedazos y repartidos bajo tierra.' },

  { tipo: 'escenario', img: 'img/fondos/kaldros.webp',
    alt: 'El interior del templo de Kaldros: columnas, engranajes y un haz de luz',
    titulo: 'Ruinas de Kaldros',
    texto: 'Unas páginas están aquí, bajo el templo de los engranajes y los relojes.' },

  { tipo: 'escenario', img: 'img/fondos/biblioteca.webp',
    alt: 'Una biblioteca sepultada por la arena, con estanterías medio enterradas',
    titulo: 'Biblioteca de Arena',
    texto: 'Otras, en una biblioteca que se tragó el desierto hace siglos.' },

  { tipo: 'figura', img: 'img/vera.webp', tono: 'peligro',
    alt: 'Vera Kovak, con un cuaderno robado bajo el brazo',
    titulo: 'Y no eres el único que las busca',
    texto: 'Vera Kovak quiere venderlas al mejor postor. Se le dan mal las cuentas… ¿sabrás pillarla?' },

  { tipo: 'fila', retratos: ['bruno', 'kira', 'tobias'],
    titulo: 'Pero no vas solo',
    texto: 'El Prof. Ocaña, que ya se equivocó antes y peor. Kira, que traduce jeroglíficos. Y Tobías, que huele tesoros.' },

  { tipo: 'figura', img: 'img/sello.webp',
    alt: 'Un sello de lacre dorado con una pala y una brújula grabadas',
    titulo: 'Así se excava',
    texto: 'Cada cosa que aprendes de verdad desentierra una página. Equivocarse no quita nada: es parte de cavar.' },

  { tipo: 'fila', rangos: true,
    titulo: 'De aprendiz a leyenda',
    texto: 'Página a página, el mapa se dibuja… y tú subes de rango hasta lo más alto.' },

  { tipo: 'cierre',
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

/* ── El reloj ──
   Se rearma en cada escena en vez de dejar un intervalo suelto: así pausar,
   adelantar y retroceder son todos la misma operación —parar y volver a
   poner— y no hay forma de que se queden dos relojes a la vez. */
function armarRelojTrailer() {
  pararRelojTrailer();
  if (trailerEnPausa) return;
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
  pausarTrailer(false);
  pintarEscenaTrailer();
  armarRelojTrailer();
  document.addEventListener('keydown', teclasTrailer);
}

function cerrarTrailer() {
  const caja = $('#trailer');
  if (!caja) return;
  pararRelojTrailer();
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
  const cerrar = $('#tr-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarTrailer);
  const pausa = $('#tr-pausa');
  if (pausa) pausa.addEventListener('click', () => pausarTrailer());
  const antes = $('#tr-antes');
  if (antes) antes.addEventListener('click', () => avanzarTrailer(-1));
  const luego = $('#tr-luego');
  if (luego) luego.addEventListener('click', () => avanzarTrailer(1));
}
