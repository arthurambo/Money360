/* ═══════════════════════════════════════════
   MONEY360 — service-worker.js
   Cache do "app shell" para uso como PWA.
═══════════════════════════════════════════ */
'use strict';

const CACHE_NAME = 'money360-v2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './auth.js',
  './sync.js',
  './script.js',
  './ui.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        // cache:'reload' garante que peguemos a versão mais recente de cada
        // arquivo (e não uma cópia antiga guardada no cache HTTP do navegador)
        ASSETS.map(url => fetch(url, { cache: 'reload' }).then(resp => cache.put(url, resp)))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Não intercepta chamadas externas (Supabase, fontes, CDN)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
