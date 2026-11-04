/* GEM Consult — service worker : site consultable hors connexion (outils de calcul, calendrier). */
const CACHE = 'gem-v3';
const PRE = ['/', '/outils', '/veille', '/js/site.js', '/favicon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;
  if (e.request.mode === 'navigate') {   // pages : réseau d'abord, copie hors connexion
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
    return;
  }
  if (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/assets/') || u.pathname.startsWith('/js/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((n) => { const c = n.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return n; })));
  }
});
