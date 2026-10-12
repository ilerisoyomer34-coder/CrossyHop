// The previous game on this site (Crossy Hop) registered a cache-first service worker at this
// scope. Returning visitors would keep seeing the old game from that cache, so this replacement
// retires it: it deletes the old caches, unregisters itself and reloads open pages so they load
// CEVHER from the network. CEVHER does not use a service worker yet (its PWA arrives in Phase 1).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('crossy-hop')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) client.navigate(client.url);
    })(),
  );
});
