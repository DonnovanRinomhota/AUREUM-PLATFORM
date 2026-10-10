/* AUREUM service worker — makes the Back Office and POS installable and usable with no internet.
   What it does:
     • keeps a copy of the app screens, icons, fonts and libraries on the device;
     • on every open it asks the network FIRST for the app screens, so people always get the latest version
       when online, and falls back to the saved copy only when offline;
   What it never does:
     • it never touches your data. Anything going to Supabase, Stripe, Paynow or any other site (and every
       non-GET request) is left completely alone — data is kept offline by the app itself, not by this file.
   Bump VERSION on each release so old copies are cleared. */
const VERSION = 'aureum-v39';
const SHELL = [
  '/offline.html', '/backoffice.html', '/pos-checkout.html', '/fiscal/fiscal-core.js', '/fiscal/countries/zw.js', '/fiscal/devices/zw-virtual-fdms.js',
  '/manifest.webmanifest', '/manifest-pos.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-32.png', '/icons/favicon.svg',
  '/vendor/supabase.js', '/vendor/xlsx.full.min.js', '/vendor/fonts/fonts.css', '/vendor/fonts/fonts-serif.css',
  '/vendor/fonts/inter-latin-400-normal.woff2', '/vendor/fonts/inter-latin-500-normal.woff2', '/vendor/fonts/inter-latin-600-normal.woff2',
  '/vendor/fonts/inter-latin-700-normal.woff2', '/vendor/fonts/inter-latin-800-normal.woff2',
  '/vendor/fonts/jetbrains-mono-latin-400-normal.woff2', '/vendor/fonts/jetbrains-mono-latin-500-normal.woff2', '/vendor/fonts/jetbrains-mono-latin-600-normal.woff2',
  '/vendor/fonts/fraunces-latin-300-normal.woff2', '/vendor/fonts/fraunces-latin-500-normal.woff2', '/vendor/fonts/fraunces-latin-600-normal.woff2', '/vendor/fonts/fraunces-latin-500-italic.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // one missing file must not stop the rest being saved
    await Promise.allSettled(SHELL.map(url => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for(const key of await caches.keys()) if(key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => { if(event.data === 'SKIP_WAITING') self.skipWaiting(); });

const keyFor = url => new Request(url.origin + url.pathname);          // ignore ?source=pwa etc. when saving

async function networkFirst(request, url){
  const cache = await caches.open(VERSION);
  try{
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow network')), 6000))   // a dead connection shouldn't hang the till
    ]);
    if(response && response.ok && !response.redirected) cache.put(keyFor(url), response.clone());
    return response;
  }catch(err){
    const saved = (await cache.match(url.origin + url.pathname)) || (url.pathname === '/' ? await cache.match(url.origin + '/backoffice.html') : null);
    if(saved) return saved;
    if(request.mode === 'navigate') return (await cache.match('/offline.html')) || Response.error();
    return Response.error();
  }
}
async function staleWhileRevalidate(request, url){
  const cache = await caches.open(VERSION);
  const saved = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request).then(response => { if(response && response.ok) cache.put(request, response.clone()); return response; }).catch(() => null);
  return saved || (await refresh) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;                                  // sales, saves, sign-ins are never intercepted
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;                       // Supabase, Stripe, Paynow… untouched
  if(url.pathname === '/sw.js' || url.pathname.startsWith('/functions/')) return;
  if(request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/'){
    event.respondWith(networkFirst(request, url));
  } else {
    event.respondWith(staleWhileRevalidate(request, url));
  }
});
