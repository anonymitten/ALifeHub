// Service worker for Kalender — cacher KUN kalenderens egne filer.
// LifeHub.html og alt annet under /ALifeHub/ røres ikke (går rett til nett).
const CACHE = "kalender-v3";

// Kun disse stiene håndteres av service workeren:
const EGNE_FILER = [
  "/ALifeHub/kalender.html",
  "/ALifeHub/kalender-manifest.json",
  "/ALifeHub/icon-192.png",
  "/ALifeHub/icon-512.png",
];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([...EGNE_FILER, ...CDN]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const path = url.pathname;

  const erEgenFil = EGNE_FILER.includes(path);
  const erCdn = CDN.includes(e.request.url);

  // Alt annet (inkl. LifeHub.html og LifeHubs data) — la nettleseren håndtere som normalt.
  if (!erEgenFil && !erCdn) return;

  // CDN-biblioteker: cache-first (versjonspinnet, endres aldri).
  if (erCdn) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Kalenderens egne filer: network-first, fall tilbake til cache offline.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
