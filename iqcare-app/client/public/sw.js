const CACHE = 'iqcare-shell-v2';
const SHELL = ['/', '/manifest.json', '/favicon.png', '/brand/iqcare-logo.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((resp) => {
            if (resp.ok && e.request.url.startsWith(self.location.origin)) {
              const clone = resp.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
            }
            return resp;
          })
          .catch(() => caches.match('/'))
    )
  );
});
