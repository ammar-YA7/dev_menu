// DEV MENU — Service Worker: إشعار "طلبك جاهز" للبيجر، و"تعليق جديد في قوقل ماب" لصاحب المطعم، حتى لو الصفحة مسكّرة
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: event.data && event.data.text() }; }
  const title = d.title || '🔔 جاء دورك!';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'تفضّل للموظف',
    tag: d.tag || 'pager',
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 800],
    icon: d.icon || '/images/logo-web.jpg',
    badge: '/images/logo-web.jpg',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // نفس الصفحة مفتوحة (البيجر أو لوحة التحكم) ← نرجع لها، وإلا نفتح الرابط
    const path = new URL(url, self.location.origin).pathname;
    const open = all.find(c => new URL(c.url).pathname === path);
    if (open && 'navigate' in open && url.includes('#')) { await open.navigate(url).catch(() => {}); return open.focus(); }
    if (open) return open.focus();
    return self.clients.openWindow(url);
  })());
});

// =====================================================================
// المنيو بدون شبكة: يتحفظ في الجهاز بعد أول فتح (الصفحة وبيانات المنيو والصور)، ويفتح حتى لو الشبكة ضعيفة أو مقطوعة
//   صفحة المنيو وبياناته: الشبكة أول (أحدث نسخة)، ولو تأخرت 4 ثواني أو انقطعت نرجّع المحفوظة
//   ملفات الموقع (js / css / الخطوط / الصور): الشبكة أول، والمحفوظة لو انقطعت أو تأخرت ثانيتين ونص
//   صور الأطباق من Supabase: المحفوظة فوراً (ما تتغير روابطها)
//   الطلب والمساعد والتتبع: ما نلمسها (تحتاج شبكة)
// =====================================================================
const OFF_V = 'v1';
const PAGE_CACHE = `dm-menu-pages-${OFF_V}`, DATA_CACHE = `dm-menu-data-${OFF_V}`, ASSET_CACHE = `dm-assets-${OFF_V}`, IMG_CACHE = `dm-images-${OFF_V}`;
const KEEP = [PAGE_CACHE, DATA_CACHE, ASSET_CACHE, IMG_CACHE];
const IMG_MAX = 400;

self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dm-') && !KEEP.includes(k)).map(k => caches.delete(k))))));

// نطاق المحل (hataba-sa.devmenu.digital) يفتح المنيو من «/»
const storeHost = (h) => /\.devmenu\.digital$/.test(h) && !/^(www|app)\./.test(h);
const isMenuPage = (u) => u.pathname === '/menu.html' || u.pathname === '/menu' || (u.pathname === '/' && storeHost(u.hostname));
const isAsset = (u) => /^\/(js|css|fonts|images)\//.test(u.pathname);
const isStorageImg = (u) => /\.supabase\.co$/.test(u.hostname) && u.pathname.includes('/storage/v1/') && !/\.(mp4|webm|mov)$/i.test(u.pathname);

async function networkFirst(req, cacheName, key, wait = 4000) {
  const cache = await caches.open(cacheName);
  const net = fetch(req).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; });
  const saved = await cache.match(key);
  if (!saved) return net;
  // الشبكة بطيئة: المحفوظة بعد 4 ثواني، والجديدة تنحفظ للمرة الجاية
  const timer = new Promise(ok => setTimeout(() => ok(saved), wait));
  try { return await Promise.race([net, timer]); } catch { return saved; }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) {
    await cache.put(req, res.clone());
    cache.keys().then(keys => { if (keys.length > IMG_MAX) keys.slice(0, keys.length - IMG_MAX).forEach(k => cache.delete(k)); });
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate') { if (isMenuPage(u)) e.respondWith(networkFirst(req, PAGE_CACHE, u.origin + u.pathname + u.search)); return; }
    if (u.pathname === '/api/public' && u.searchParams.get('action') === 'menu') {
      // مفتاح واحد لكل محل (بدون رقم النسخة v=)
      const key = `${u.origin}/api/public?action=menu&slug=${encodeURIComponent(u.searchParams.get('slug') || '')}`;
      e.respondWith(networkFirst(req, DATA_CACHE, key));
      return;
    }
    // الشبكة أول (عشان التحديثات توصل على طول)، والمحفوظة لو انقطعت أو تأخرت
    if (isAsset(u)) e.respondWith(networkFirst(req, ASSET_CACHE, req.url, 2500));
    return;
  }
  if (isStorageImg(u)) e.respondWith(cacheFirst(req, IMG_CACHE).catch(() => fetch(req)));
});
