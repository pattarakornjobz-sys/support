// ครัวหมุนเวียน — service worker
// เปลี่ยน CACHE_VERSION ทุกครั้งที่อัปเดตไฟล์หน้าเว็บ เพื่อให้เครื่องผู้ใช้โหลดหน้าใหม่
const CACHE_VERSION = 'rk-v2-2026-10-09e';
const CORE = [
  'rk_vote.html',
  'rk_feedback.html',
  'rk_admin.html',
  'rk_admin_results.html',
  'manifest.json',
  'favicon.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(CORE.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // ไม่แคชข้อมูลจาก Supabase / API ภายนอก — ต้องสดเสมอ
  if (url.origin !== self.location.origin) return;

  // หน้า HTML: เอาจากเน็ตก่อน ถ้าออฟไลน์ค่อยใช้แคช
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ไฟล์อื่น (ไอคอน, manifest): ใช้แคชก่อน แล้วอัปเดตเบื้องหลัง
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
