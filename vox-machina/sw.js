// Service worker: keeps every file of Vox Machina on the device after the
// first visit, so the tool works with no connection. Bump VERSION after edits.
const VERSION = 'vox-machina-v1';
const FILES = ['./', 'index.html', 'app.js', 'engine.js', 'lib/espeak-ng.js',
  'lib/espeak-ng.wasm', 'lib/jszip.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('vox-machina-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Cache first, then network.
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
