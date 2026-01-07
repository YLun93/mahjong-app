const CACHE_NAME = 'mahjong-v3-cache';
const ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // 僅快取本地資源，跳過外部 CDN 以避免 CORS 錯誤
  if (e.request.url.includes('http')) {
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request))
    );
  }
});
