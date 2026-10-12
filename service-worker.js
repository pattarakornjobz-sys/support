// Service worker สำหรับระบบ "ครัวหมุนเวียน" (RK) — ทำให้ติดตั้งเป็นแอป (PWA) ได้ทั้งบน Android และ iPhone
// หลักการ: แคช "เปลือกแอป" (ไฟล์หน้าเว็บ/ไอคอนของเราเอง) ไว้ให้เปิดได้แม้เน็ตหลุดชั่วคราว
// แต่ "ข้อมูลจริง" ทุกอย่าง (โหวต เมนู ผลสรุป ข้อความ) ที่ไปดึงจาก Supabase จะปล่อยให้วิ่งผ่านเน็ตสดเสมอ
// ไม่แคชเด็ดขาด — ป้องกันแอดมิน/ผู้บริหารเห็นผลโหวตเก่าค้างจากแคช

const CACHE_NAME = 'rk-app-shell-v4';
const APP_SHELL = [
  './rk_vote.html',
  './rk_admin.html',
  './rk_admin_results.html',
  './rk_feedback.html',
  './manifest.json',
  './manifest-admin.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './icon-admin-192.png',
  './icon-admin-512.png',
  './icon-admin-maskable-192.png',
  './icon-admin-maskable-512.png',
  './apple-touch-icon-admin.png',
  './favicon-admin.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ข้ามทุกอย่างที่ไม่ใช่ GET (เช่น POST ไป Supabase) และข้ามทุกโดเมนอื่น (Supabase API, CDN ฟอนต์/ไลบรารี)
  // ให้วิ่งตรงผ่านเน็ตปกติ ไม่ยุ่งเกี่ยวใดๆ — สำคัญมากเพื่อไม่ให้ข้อมูลโหวต/ผลสรุปถูกแคชค้าง
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // ไม่ call respondWith = ปล่อยให้เบราว์เซอร์จัดการตามปกติ
  }

  // ไฟล์เปลือกแอปของเราเอง (หน้า html/ไอคอน/manifest): network-first แล้วอัปเดตแคชเงียบๆ
  // ถ้าออฟไลน์จริงๆค่อย fallback ไปแคชที่เคยเก็บไว้ (เปิดแอปได้ แต่ข้อมูลในหน้าจะยังไม่อัปเดตจนกว่าเน็ตจะกลับมา)
  event.respondWith(
    // cache:'no-store' กันเบราว์เซอร์/โฮสต์แอบคืน HTTP cache เก่าให้ fetch() เฉยๆ
    // (ถ้าไม่กันไว้ ต่อให้โค้ดเป็น network-first ก็อาจได้ไฟล์เก่าค้างอยู่ดี — นี่คือสาเหตุหลักที่หน้าแอดมินไม่อัปเดตตามโค้ดใหม่)
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      // ออฟไลน์จริงๆ: คืนไฟล์เดิมที่ขอจากแคช (ไม่เดาส่งไปหน้าอื่น เช่นหน้าแอดมินต้องไม่ถูกเด้งไปหน้าโหวต)
      .catch(() => caches.match(req))
  );
});
