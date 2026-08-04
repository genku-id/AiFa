const CACHE_NAME = "aifa-cache-v17";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
      // If network fetch is successful, clone and update cache
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // If network fails, fallback to cache
      return caches.match(event.request);
    })
  );
});

self.addEventListener("activate", event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ── Daily reminder (IndexedDB) ──
function openReminderDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aifa-reminder", 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("kv")) req.result.createObjectStore("kv"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function reminderGet(key) {
  return openReminderDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  })).catch(() => null);
}
function reminderPut(key, value) {
  return openReminderDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(() => {});
}

self.addEventListener("periodicsync", event => {
  if (event.tag === "daily-reminder") {
    event.waitUntil(handleDailyReminder());
  }
});

async function handleDailyReminder() {
  const cfg = await reminderGet("config");
  if (!cfg || !cfg.enabled || !cfg.time) return;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  if (hhmm !== cfg.time) return;
  const today = now.toISOString().slice(0, 10);
  const last = await reminderGet("lastShown:" + cfg.email);
  if (last === today) return;
  await reminderPut("lastShown:" + cfg.email, today);
  return self.registration.showNotification("AiFa - Jangan lupa catat!", {
    body: "Catat pengeluaran hari ini agar tidak lupa!",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "aifa-daily",
    data: { url: "./" }
  });
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ("focus" in c) { c.focus(); return; }
      }
      return self.clients.openWindow((event.notification.data && event.notification.data.url) || "./");
    })
  );
});
