/* «Дом!» — service worker (офлайн-кэш оболочки) */
const CACHE = 'dom-v15';
/* Firebase SDK — отдельный кэш: адреса с версией никогда не меняются, поэтому он
   переживает бампы CACHE и не перекачивается при каждом деплое. Сменили версию
   SDK в index.html — поменяйте и это имя (старый кэш удалится в activate). */
const LIB = 'dom-lib-fb-10.12.0';
const LIB_PREFIX = 'https://www.gstatic.com/firebasejs/10.12.0/';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  /* cache:'reload' — мимо HTTP-кэша браузера: GitHub Pages отдаёт max-age=600,
     и без этого новый SW мог положить в кэш ПРОШЛУЮ версию страницы */
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LIB).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Сообщаем открытым окнам, что в кэше уже лежит новая версия страницы —
   они перезапустятся сами, когда это никому не помешает (applyUpdate в index.html) */
async function notifyUpdated() {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach(c => c.postMessage({ type: 'page-updated' }));
}

/* Свежая страница из сети. Кладём в кэш только успешный ответ (раньше разовый
   404/500 от GitHub Pages становился офлайн-версией приложения) и собираем
   «чистый» Response: ответ после редиректа нельзя отдавать на навигацию. */
async function fetchPage(url, oldText) {
  const r = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
  if (!r.ok) return null;
  const text = await r.text();
  const fresh = () => new Response(text, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const c = await caches.open(CACHE);
  await c.put('./index.html', fresh());
  if (oldText != null && oldText !== text) await notifyUpdated();
  return fresh();
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  /* Firebase SDK с gstatic: cache-first. Без него каждый запуск на телефоне мог заново
     тянуть ~700 КБ скриптов, а офлайн приложение не стартовало вовсе. */
  if (url.startsWith(LIB_PREFIX)) {
    e.respondWith(caches.open(LIB).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }

  /* Остальное чужое (Firestore, Google) не трогаем: иначе кэш растёт бесконечно,
     а на офлайн-ошибку API вернётся index.html */
  if (new URL(url).origin !== location.origin) return;

  /* Страница: СРАЗУ из кэша (никакого ожидания сети на запуске), а свежая версия
     качается в фоне. Отличается — кэш обновлён и окно получит 'page-updated'.
     Раньше было network-first с таймаутом 3 с: на слабой связи каждый запуск
     начинался с ожидания. Первый визит (кэша нет) — из сети. */
  if (e.request.mode === 'navigate') {
    const cached = caches.open(CACHE).then(c => c.match('./index.html'));
    const update = cached
      .then(hit => hit ? hit.clone().text() : null)
      .then(oldText => fetchPage(url, oldText))
      .catch(() => null);
    e.waitUntil(update);
    e.respondWith(cached.then(hit => hit || update.then(r => r || fetch(e.request))));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
