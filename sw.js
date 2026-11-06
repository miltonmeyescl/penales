// ============================================================
// sw.js — Service worker del juego de penales
// Cachea todos los archivos para que la app abra al instante
// y funcione sin internet una vez instalada.
//
// IMPORTANTE: al publicar una versión nueva del juego, cambia
// el número de CACHE (v1 → v2) para que los usuarios reciban
// la actualización.
// ============================================================

const CACHE = 'penales-curi-v44';

// archivos esenciales del juego
const CORE = [
  './',
  './index.html',
  './index.html?v=912',
  './styles.css?v=912',
  './game.js?v=912',
  './teams.js?v=912',
  './teams_custom.js?v=912',
  './audio_config.js?v=912',
  './manifest.json?v=912',
  './icon-192.png?v=912',
  './icon-512.png?v=912'
];

// escudos: opcionales — si alguno falta, la instalación no falla
const OPTIONAL = [
  './insignias/curico.png',
  './insignias/1.png',
  './insignias/2.png',
  './insignias/3.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(async c => {
        await c.addAll(CORE);
        await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})));
      })
      .then(() => self.skipWaiting())
  );
});

// al activarse, borra los cachés de versiones anteriores
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// estrategia "caché primero": responde desde el caché y, si no está,
// va a la red y guarda la respuesta para la próxima vez
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;

  const url = new URL(ev.request.url);
  const dynamic = url.pathname.endsWith('/teams_custom.js') ||
                  url.pathname.endsWith('/admin.php') ||
                  url.pathname.endsWith('/admin_config.php') ||
                  url.pathname.endsWith('/admin_teams.json');

  // La administración y la configuración editable nunca se guardan en caché.
  if (dynamic) {
    ev.respondWith(fetch(ev.request, { cache: 'no-store' }));
    return;
  }

  // Las navegaciones usan red primero para forzar que el HTML más reciente llegue
  // al usuario y dispare la actualización del resto de assets.
  if (ev.request.mode === 'navigate' || ev.request.destination === 'document') {
    ev.respondWith(
      fetch(ev.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(ev.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then(hit =>
      hit ||
      fetch(ev.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copy)).catch(() => {});
        return res;
      })
    )
  );
});

self.addEventListener('message', ev => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});
