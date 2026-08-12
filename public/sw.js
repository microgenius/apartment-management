// Service worker - yalnızca kurulabilirlik için.
//
// BİLEREK ÖNBELLEK YOK. Sebep: uygulamadaki her şey (borçlar, duyurular,
// kasa) Supabase'den anlık geliyor; çevrimdışı önbellek zaten boş bir
// kabuk gösterirdi. Buna karşılık varlıkları önbelleğe alan bir service
// worker, yeni sürüm yayınladığımızda kullanıcıyı eski sürümde bırakma
// riski taşır - bu projede sık deploy ettiğimiz için gerçek bir risk.
//
// Tarayıcıların "ana ekrana ekle" özelliğini sunması için fetch olayını
// dinleyen bir service worker gerekiyor; burada isteği olduğu gibi ağa
// geçiriyoruz.

self.addEventListener('install', () => {
  // Yeni sürüm beklemeden devreye girsin
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Geçmişte önbellek bırakıldıysa temizle
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', () => {
  // Pass-through: yanıt vermiyoruz, tarayıcı normal ağ isteğini yapıyor.
});
