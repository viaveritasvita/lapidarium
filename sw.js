/* ============================================================
   LAPIDARIUM — Service Worker (PWA)
   Estratégia (para NUNCA servir conteúdo velho onde importa):
   - Navegações (HTML) ........ network-first (cache só como fallback offline)
   - Dados (.json e API_URL) .. network-first (planilha sempre fresca)
   - Estáticos same-origin .... cache-first com revalidação em 2º plano
   - Cross-origin (fontes,
     thumbs do YouTube) ....... cache-first
   Para forçar atualização geral: suba o CACHE_VERSION abaixo.
   ============================================================ */

const CACHE_VERSION = 'lapidarium-v6';
const CACHE_STATIC  = CACHE_VERSION + '-static';
const CACHE_PAGES   = CACHE_VERSION + '-pages';
const CACHE_EXT     = CACHE_VERSION + '-ext';

const APP_SHELL = [
  './',
  'index.html', 'buscar.html', 'urania.html', 'epaminondas.html',
  'video.html', 'calendar.html', 'publicar.html',
  'lapidarium.css', 'app.css',
  'config.js', 'ui.js', 'busca.js', 'app.js', 'fundo.js',
  'tesauro.json', 'videos-urania.json', 'videos-epaminondas.json',
  'manifest.json', 'icon-192.png', 'icon-512.png',
  'urania.png', 'epaminondas.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => Promise.allSettled(APP_SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function ehDado(url) {
  // JSONs do acervo/tesauro e a API do Apps Script: sempre tentar rede primeiro
  return url.pathname.endsWith('.json') ||
         url.hostname.indexOf('script.google.com') >= 0 ||
         url.hostname.indexOf('googleusercontent.com') >= 0;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const home = await caches.match('index.html');
      if (home) return home;
    }
    throw err;
  }
}

async function cacheFirstRevalida(req, cacheName, revalida) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const rede = fetch(req).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
    return resp;
  }).catch(() => null);
  if (hit) { if (revalida) e_ignora(rede); return hit; }
  const resp = await rede;
  if (resp) return resp;
  throw new Error('offline: ' + req.url);
}
function e_ignora(p) { p && p.catch && p.catch(() => {}); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {            // páginas: rede primeiro
    e.respondWith(networkFirst(req, CACHE_PAGES));
    return;
  }
  if (ehDado(url)) {                        // dados: rede primeiro
    e.respondWith(networkFirst(req, CACHE_PAGES));
    return;
  }
  if (url.origin === self.location.origin) { // estáticos: cache + revalida
    e.respondWith(cacheFirstRevalida(req, CACHE_STATIC, true));
    return;
  }
  // cross-origin (fontes do Google, thumbs do YouTube): cache-first
  e.respondWith(cacheFirstRevalida(req, CACHE_EXT, false));
});
