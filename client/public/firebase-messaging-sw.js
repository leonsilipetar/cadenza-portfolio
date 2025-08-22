// Consolidated into main service worker (sw.js). Keeping this file minimal to avoid double SWs.
self.addEventListener('install', (event) => {
  // Skip waiting so it does not interfere
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Immediately claim to ensure no interference
  event.waitUntil(self.clients.claim());
});