// Cache only a generic offline page. Authenticated HTML and API data are never cached.
const cacheName = 'shiftsync-offline-v1'
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.add('/offline.html')))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('shiftsync-offline-') && key !== cacheName).map(key => caches.delete(key)))))
})
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && event.request.method === 'GET') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html').then(response => response || Response.error())))
  }
})
