// Service worker mínimo, só para permitir "Adicionar à tela inicial" (PWA)
// e deixar o carregamento do app um pouco mais rápido/resiliente.
// Propositalmente NÃO mexe em chamadas para o Supabase (auth, banco, storage)
// nem em domínios externos — só cuida dos arquivos do próprio app.

const CACHE_NAME = 'fin-app-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Nunca intercepta nada fora do próprio domínio (Supabase, CDNs, fontes, etc.)
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): tenta rede primeiro, cai pro cache se estiver offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put('/index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Arquivos estáticos do próprio app shell: cache-first.
  if (APP_SHELL.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});
