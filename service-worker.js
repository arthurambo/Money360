/* ═══════════════════════════════════════════
   MONEY360 — service-worker.js
   Cache do "app shell" para uso como PWA.
═══════════════════════════════════════════ */
'use strict';

const CACHE_NAME = 'money360-v33';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './categories.js',
  './notification.js',
  './auth.js',
  './sync.js',
  './script.js',
  './eventos.js',
  './ui.js',
  './share.js',
  './help.js',
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

/* ── IndexedDB helpers (SW não acessa localStorage) ── */

function idbAbrir() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('money360-data', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbGet(db, k) {
  return new Promise((res, rej) => {
    const req = db.transaction('kv', 'readonly').objectStore('kv').get(k);
    req.onsuccess = e => res(e.target.result?.v || []);
    req.onerror   = () => rej(req.error);
  });
}

function diasAteVenc(diaVenc) {
  const agora = new Date();
  const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const cand  = new Date(agora.getFullYear(), agora.getMonth(), diaVenc);
  if (diaVenc < agora.getDate()) cand.setMonth(cand.getMonth() + 1);
  return Math.round((cand - hoje) / 86400000);
}

function fmtValor(v) { return 'R$ ' + (v || 0).toFixed(2).replace('.', ','); }

/* ── Periodic Background Sync (Android Chrome + PWA instalado) ── */

self.addEventListener('periodicsync', event => {
  if (event.tag === 'money360-daily') {
    event.waitUntil((async () => {
      try {
        const db          = await idbAbrir();
        const assinaturas = await idbGet(db, 'assinaturas');
        const transacoes  = await idbGet(db, 'transacoes');

        for (const ass of assinaturas) {
          if (!ass.vencimento) continue;
          const diff = diasAteVenc(Number(ass.vencimento));
          if (diff === 0) {
            await self.registration.showNotification(`💳 Cobrança hoje: ${ass.nome}`, {
              body: `${fmtValor(ass.valor)} será cobrado hoje.`,
              icon: './icon.svg', badge: './icon.svg',
              tag: `cob-${ass.id}`, vibrate: [200, 100, 200],
              data: { url: './' },
            });
          } else if (diff === 7) {
            await self.registration.showNotification(`📅 Vence em 7 dias: ${ass.nome}`, {
              body: `${fmtValor(ass.valor)} será cobrado no dia ${ass.vencimento}.`,
              icon: './icon.svg', badge: './icon.svg',
              tag: `prev-${ass.id}`, vibrate: [200, 100, 200],
              data: { url: './' },
            });
          }
        }

        // Motivacional
        const msgs = [];
        const rec  = transacoes.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
        const desp = transacoes.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
        if (rec > 0 && rec > desp) {
          msgs.push(`Você está economizando ${Math.round(((rec - desp) / rec) * 100)}% da sua renda! Continue assim 🎉`);
        }
        if (assinaturas.length) {
          const tot = assinaturas.reduce((a, s) => a + (s.valor || 0), 0);
          msgs.push(`Suas ${assinaturas.length} assinaturas somam ${fmtValor(tot)} por mês. Vale revisar? 🤔`);
        }
        msgs.push('Pequenas economias diárias fazem grandes diferenças no final do mês! 💪');

        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        await self.registration.showNotification('💡 Money360', {
          body: msg, icon: './icon.svg', badge: './icon.svg',
          tag: 'motivacional', data: { url: './' },
        });
      } catch (e) { console.warn('[SW] periodicsync error', e); }
    })());
  }
});

/* ── Mensagem do cliente → mostrar notificação ── */

self.addEventListener('message', event => {
  if (event.data?.type !== 'SHOW_NOTIFICATION') return;
  const { titulo, corpo, opts = {} } = event.data;
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo, icon: './icon.svg', badge: './icon.svg',
      vibrate: [200, 100, 200], ...opts,
    })
  );
});

/* ── Clique na notificação → abre o app ── */

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow(url);
    })
  );
});

/* ── Fetch (cache-first) ── */

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
