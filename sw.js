self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.registration.unregister()
    ])
  );
});

self.addEventListener('fetch', function(event) {
});
