/* Expedición Atlas — service worker: caché de la app shell para uso sin conexión */
const CACHE = 'atlas-shell-v34';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
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
