/* Expedición Atlas — service worker: caché de la app shell para uso sin conexión */
const CACHE = 'atlas-shell-v97';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/demo.js',
  './js/content.js',
  './js/generador.js',
  './js/config.js',
  './js/cloud.js',
  './js/state.js',
  './js/game.js',
  './js/classview.js',
  './js/ui.js',
  './js/play.js',
  './js/aula.js',
  './js/teacher.js',
  './js/app.js',
  './icons/icon.svg',
  /* Los retratos de los roles: el niño los ve en su pantalla de Cuadrilla y
     el docente en la lista de clase, red o no. */
  './img/roles/cartografo.png',
  './img/roles/descodificadora.png',
  './img/roles/guardian.png',
  './img/roles/cronometradora.png',
  './img/roles/ilustrador.png',
  './img/roles/intendente.png',
  /* Los tres compañeros y el mapa. Sin esto, en un aula sin wifi el niño ve el
     hueco de una imagen rota donde va Tobías. */
  './img/bruno.webp',
  './img/kira.webp',
  './img/tobias-calma.webp',
  './img/tobias-fiesta.webp',
  './img/carta.webp',
  './img/kaldros.webp',
  './img/biblioteca.webp',
  './img/campamento.webp',
  './img/guardian.webp',
  './img/sello.webp',
  './img/vera.webp',
  './img/fragmento.webp',
  /* El almacén y las medallas de rango. Van a la caché por lo mismo que los
     compañeros: lo que se compra con doblones tiene que verse el día que
     el wifi del centro se cae, que es cualquier día. */
  './img/almacen/sombrero_ala_ancha.webp',
  './img/almacen/salacot.webp',
  './img/almacen/chaqueta_kaldros.webp',
  './img/almacen/mochila_lona.webp',
  './img/almacen/botas_barro.webp',
  './img/almacen/linterna_laton.webp',
  './img/almacen/cantimplora.webp',
  './img/almacen/catalejo.webp',
  './img/almacen/hoguera_grande.webp',
  './img/almacen/tienda_rayas.webp',
  './img/almacen/jeep_oxidado.webp',
  './img/almacen/tendedero_mapas.webp',
  './img/almacen/golosina_tobias.webp',
  './img/rangos/aprendiz.webp',
  './img/rangos/rastreador.webp',
  './img/rangos/cartografo.webp',
  './img/rangos/arqueologo.webp',
  './img/rangos/leyenda.webp',
  /* Los ocho pozos, los cuatro estratos, los cinco hitos de clase y los ocho
     méritos: todo lo que el niño ve al excavar tiene que verse sin wifi. */
  './img/pozos/sendero.webp',
  './img/pozos/numeracion.webp',
  './img/pozos/sumas_llevando.webp',
  './img/pozos/fracciones.webp',
  './img/pozos/decimales.webp',
  './img/pozos/vocabulario.webp',
  './img/pozos/ortografia.webp',
  './img/pozos/comprension.webp',
  './img/estratos/recordar.webp',
  './img/estratos/comprender.webp',
  './img/estratos/aplicar.webp',
  './img/estratos/analizar.webp',
  './img/hitos/campamento.webp',
  './img/hitos/puente.webp',
  './img/hitos/templo.webp',
  './img/hitos/barco.webp',
  './img/hitos/ciudad.webp',
  './img/meritos/ayudar.webp',
  './img/meritos/material.webp',
  './img/meritos/atencion.webp',
  './img/meritos/participar.webp',
  './img/meritos/deberes.webp',
  './img/meritos/lectura.webp',
  './img/meritos/proyecto.webp',
  './img/meritos/especial.webp',
  './img/caras/1.webp',
  './img/caras/2.webp',
  './img/caras/3.webp',
  './img/caras/4.webp',
  './img/caras/5.webp',
  './img/caras/6.webp',
  './img/caras/7.webp',
  './img/caras/8.webp',
  /* Los dos fondos de la pantalla del reto y los dibujos de espera. */
  './img/fondos/kaldros.webp',
  './img/fondos/biblioteca.webp',
  './img/espera-cuaderno.webp',
  './img/espera-banderin.webp',
  /* Las tipografías forman parte de la app shell: sin ellas, en un aula sin
     red la plataforma se vería con la fuente del sistema. */
  './fonts/nunito-latin.woff2',
  './fonts/nunito-italic-latin.woff2',
  './fonts/bree-serif-latin.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* network-first con caída a caché: en el aula la red puede fallar a mitad de sesión */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  /* Solo se toca la app shell de este origen. Las peticiones a la API de
     Appwrite se dejan pasar tal cual: guardar en caché la respuesta que trae
     el diario de un alumno la dejaría en la tablet DESPUÉS de cerrar su
     sesión —cerrar sesión solo borra la sesión, no la caché— y sin red se la
     serviría al siguiente niño que la abriese. Lo mismo vale para el SDK del
     CDN, que además no debe quedar congelado aquí. */
  let mismoOrigen = false;
  try { mismoOrigen = new URL(e.request.url).origin === self.location.origin; }
  catch (err) { mismoOrigen = false; }
  if (!mismoOrigen) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        /* Un 404 o un 500 guardado aquí rompe la app el día que no haya red:
           solo se guarda lo que de verdad sirve para arrancar. */
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(m => {
        if (m) return m;
        /* Solo una navegación puede caer en index.html. Devolvérselo a un
           <script> (el SDK de Appwrite si no hay red) hacía que el navegador
           intentara ejecutar HTML: «Unexpected token '<'» en la consola. */
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
