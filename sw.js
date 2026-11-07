const BUILD = '2ecd371018d5925d';
const SCOPE = self.registration.scope;
const ASSETS = ["apple-touch-icon.png","assets/cormorant-garamond-cyrillic-500-italic-C9gO-8KC.woff","assets/cormorant-garamond-cyrillic-500-italic-DVnfXoMy.woff2","assets/cormorant-garamond-cyrillic-500-normal-CyAY5ZLS.woff2","assets/cormorant-garamond-cyrillic-500-normal-DkJXBcIH.woff","assets/cormorant-garamond-cyrillic-600-normal-C2atO-64.woff2","assets/cormorant-garamond-cyrillic-600-normal-FNmA3REe.woff","assets/cormorant-garamond-latin-500-italic-DhNIfkTX.woff","assets/cormorant-garamond-latin-500-italic-Y14P-dkT.woff2","assets/cormorant-garamond-latin-500-normal-BsRWmXhO.woff2","assets/cormorant-garamond-latin-500-normal-zIXX3Q-H.woff","assets/cormorant-garamond-latin-600-normal-2CBVLo0M.woff","assets/cormorant-garamond-latin-600-normal-Co1r35X9.woff2","assets/index-B-gfbC3z.js","assets/index-B4iko789.css","assets/manrope-cyrillic-wght-normal-Dvxsihut.woff2","assets/manrope-greek-wght-normal-DL7QRZyv.woff2","assets/manrope-latin-ext-wght-normal-Ch3YOpNY.woff2","assets/manrope-latin-wght-normal-DHIcAJRg.woff2","assets/manrope-vietnamese-wght-normal-usUDDRr7.woff2","dolls/catrine-shriek-wrecked.jpg","dolls/clawdeen-dawn-2026.jpg","dolls/cleo-dawn-2026.jpg","dolls/draculaura-2024.jpg","dolls/draculaura-dawn-2026.jpg","dolls/gigi-13-wishes.jpg","dolls/jinafire-g3.jpg","dolls/lagoona-dawn-2026.jpg","dolls/nefera-g3.jpg","dolls/robecca-2026.jpg","dolls/rochelle-2026.jpg","dolls/spectra-party-lounge.jpg","dolls/venus-2026.jpg","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","placeholder.svg"].map(path => new URL(path, SCOPE).href);
const INDEX = new URL('index.html', SCOPE).href;
const names = crypto.subtle.digest('SHA-256', new TextEncoder().encode(SCOPE)).then(buffer => {
  const scopeHash = Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  const prefix = 'lolyahigh-scope-' + scopeHash + '-';
  return { prefix, cache: prefix + BUILD };
});
async function currentCache() {
  return caches.open((await names).cache);
}
async function cacheComplete() {
  const cache = await currentCache();
  const cached = await Promise.all(ASSETS.map(url => cache.match(url, { ignoreVary: true })));
  return cached.every(Boolean);
}
self.addEventListener('install', event => {
  // Upgrades wait until accepted, or until all tabs running the old version close.
  event.waitUntil(currentCache().then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const { prefix, cache } = await names;
    // An accepted update can coexist with another tab's unsaved old UI. Retain
    // its assets until a later activation after all old windows have closed.
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(client => client.url.startsWith(SCOPE));
    if (!windows.length) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cache).map(key => caches.delete(key)));
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (['PWA_STATUS', 'PWA_PREPARE_OFFLINE'].includes(event.data?.type) && event.ports[0]) {
    const prepare = event.data.type === 'PWA_PREPARE_OFFLINE' ? currentCache().then(cache => cache.addAll(ASSETS)) : Promise.resolve();
    event.waitUntil(prepare.then(cacheComplete).then(offlineReady => event.ports[0].postMessage({ type: 'PWA_STATUS', offlineReady, build: BUILD, scope: SCOPE })).catch(() => event.ports[0].postMessage({ type: 'PWA_STATUS', offlineReady: false, build: BUILD, scope: SCOPE })));
  }
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    if (!url.href.startsWith(SCOPE)) return;
    // Keep HTML and its versioned assets together until an update is accepted.
    event.respondWith(currentCache().then(cache => cache.match(INDEX, { ignoreVary: true })).then(cached => cached || fetch(request)));
    return;
  }
  url.search = '';
  url.hash = '';
  if (!ASSETS.includes(url.href)) {
    if (!url.href.startsWith(new URL('assets/', SCOPE).href)) return;
    event.respondWith((async () => {
      const { prefix } = await names;
      const keys = (await caches.keys()).filter(key => key.startsWith(prefix));
      for (const key of keys) {
        const cached = await (await caches.open(key)).match(url.href, { ignoreVary: true });
        if (cached) return cached;
      }
      return fetch(request);
    })());
    return;
  }
  // Public immutable build assets are identical for every Origin header.
  // Module requests include Origin, while install-time cache.addAll does not.
  event.respondWith(currentCache().then(cache => cache.match(url.href, { ignoreVary: true })).then(cached => cached || fetch(request)));
});
