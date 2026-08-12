# Proje İnceleme Notları

## ✅ Bu turda yapılan değişiklikler (kod)

- `residents.user_id` desteği eklendi: `types/index.ts`, `lib/supabase.ts` (Database tipi), `residentsService.ts` (`linkUser`/`unlinkUser`), `FinancialsView.tsx` (`myResidentRecord` artık önce `user_id` ile eşleştiriyor, sadece linki olmayan eski kayıtlar için isim eşleşmesine düşüyor). Admin, **Ayarlar → Yeni Kullanıcı Oluştur** formunda opsiyonel bir "Sakin Kaydına Bağla" alanından yeni hesabı bir `residents` satırına bağlayabiliyor artık (`SettingsView.tsx`).
- `lib/supabase.ts`'teki `residents.door` tipi `number` → `string` düzeltildi (gerçek şemayla artık tutarlı).
- `supabase-schema.sql`'deki `info` seed'i düzeltildi — unique constraint olmadan `ON CONFLICT (role)` kullanılıyordu, `WHERE NOT EXISTS` pattern'ine çevrildi.
- `AuthContext.tsx` ve `userProfilesService.ts`'teki debug amaçlı `console.log`'lar (kullanıcı email'i, profil verisi sızdıranlar dahil) temizlendi; `App.tsx`'teki her render'da çalışan log satırları kaldırıldı. Gerçek hata yolundaki `console.error`'lar kalıcı olarak korundu.
- **`scripts/add_residents_user_id.sql`** (yeni) — `residents.user_id` kolonunu ekleyen migration (nullable + set edildiğinde unique).
- **`scripts/enable_rls.sql`** (yeni) — tüm tablolarda RLS'i açar. Kapsam bilinçli olarak sınırlı tutuldu: okuma tarafı bugünkü gibi tüm authenticated kullanıcılara açık bırakıldı (uygulama zaten her şeyi çekip client-side filtreliyor, davranış değişmesin diye), yazma tarafı (`INSERT`/`UPDATE`/`DELETE`) admin'e kilitlendi. `residents`/`ledgers` okumasını "sadece kendi kaydın" seviyesine çekmek bir sonraki adım — ama önce mevcut sakinlerin çoğu yeni `user_id` linkine sahip olmadığından (migration'dan hemen sonra herkes `NULL`), bunu şimdi yaparsak hiç kimse kendi borcunu göremez hale gelir. Script içinde bu not var.

**Sizin yapmanız gerekenler (kod değil, Supabase tarafı):**
1. Supabase SQL Editor'de sırayla çalıştırın: `scripts/add_residents_user_id.sql` → `scripts/backfill_residents_user_id.sql` → `scripts/move_link_to_user_profiles.sql` → en son `scripts/enable_rls.sql`. Hepsi idempotent, tekrar çalıştırmak güvenli. (`move_link_to_user_profiles.sql` içindeki STEP 4 bilerek yorum satırı — doğrulamayı yapmadan çalıştırmayın.)
2. `enable_rls.sql`'i prod'a uygulamadan önce mümkünse bir staging/test projede deneyin — RLS politikaları yanlış kurgulanırsa uygulamayı tamamen kilitleyebilir (hard-to-reverse bir adım, geri almak için tabloyu tekrar `DISABLE ROW LEVEL SECURITY` yapmak gerekir).
3. Mevcut (migration öncesi oluşturulmuş) kullanıcılar için **`scripts/backfill_residents_user_id.sql`** yazıldı — isim eşleşmesiyle toplu bağlama yapıyor, ama sadece **tek anlamlı** eşleşmeleri commit ediyor (bir isim tam olarak bir sakin ve bir kullanıcıyla eşleşiyorsa). Belirsiz olanlara dokunmuyor, çünkü yanlış bağlantı bir sakinin borcunu başkasına gösterir. Script üç bölüm: STEP 1 önizleme (hiçbir şeyi değiştirmez), STEP 2 uygulama, STEP 3 elle bağlanması gerekenlerin raporu. **Önce STEP 1'i çalıştırıp çıktıyı gözden geçirin.**

## WhatsApp entegrasyonu — Supabase üzerinden mi?

Kısaca: **evet, ayrı bir sunucuya gerek yok.** Supabase sadece Postgres değil; **Edge Functions** adında Deno tabanlı serverless fonksiyonlar da sunuyor — bunlar tam olarak "backend protokolü" dediğiniz şey: HTTP endpoint olarak çağrılabiliyor, secret/token'ları güvenle (`supabase secrets set`) tutabiliyor, `pg_cron` ile zamanlanabiliyor. Yani WhatsApp gönderimi şöyle kurulabilir:

- WhatsApp'ın kendisini gönderen taraf yine Meta WhatsApp Cloud API ya da Twilio WhatsApp API olacak (Supabase WhatsApp'ı native konuşmuyor) — ama bu API'lerin access token'ı **Supabase Edge Function**'ın içinde secret olarak durur, client'a hiç inmez.
- Tetikleyici de Supabase içinde: `pg_cron` her gün belirli saatte bir Edge Function'ı HTTP ile çağırır (ya da `pg_net` ile doğrudan Postgres'ten dışarı istek atılır), fonksiyon borçlu `residents.phone` listesini çeker ve WhatsApp API'ye gönderir.
- Sonuç: proje için ayrı bir Node/Express sunucusu kurmaya gerek yok, tamamen Supabase proje panelinden yönetilir (Dashboard → Edge Functions).

Gemini API key'inin client'ta açıkta olması sorunu da (aşağıdaki genel bulgular) aynı yöntemle çözülür — `callGemini`'yi de bir Edge Function'ın arkasına almak, WhatsApp fonksiyonuyla aynı altyapı.

## Genel inceleme — kalan noktalar (henüz düzeltilmedi)

- **Şifre politikası zayıf**: `LoginPage.tsx` sadece `minLength={6}` kontrolü yapıyor, Supabase tarafında da ek bir politika yok. Supabase Dashboard → Authentication → Policies'ten güçlendirilebilir, kod değişikliği gerekmiyor.
- `user_profiles` tablosunda **telefon alanı yok** — telefonla giriş özelliği için ayrıca ele alınacak (aşağıya bkz).
- `helpers.ts` içinde `monthlyDue = 1500` ve `debtStartDate = '2024-01-01'` fonksiyon varsayılanı olarak hardcoded; `useSettings` her zaman DB'den değer getirdiği için ölü kod gibi duruyor. Düşük öncelik, dokunmadım.
- `community_posts.date` hâlâ `TEXT`, `ledgers.date`/`requests.date` `DATE` — düşük öncelik, dokunmadım.
- `VITE_GEMINI_API_KEY` client bundle'ında hâlâ açık — Edge Function'a taşınması gerekiyor (yukarıdaki WhatsApp maddesiyle birlikte planlanabilir, henüz kod değişikliği yapmadım çünkü bir Supabase projesi/Edge Function kurulumu gerektiriyor).

## Sıradaki versiyon: Telefon numarasıyla giriş + WhatsApp

### Telefon ile giriş
Supabase Auth'un **Phone Auth**'u (SMS OTP) buna hazır: `supabase.auth.signInWithOtp({ phone })` + `verifyOtp({ phone, token, type: 'sms' })`. Yapılması gerekenler:
1. Supabase Dashboard → Authentication → Providers → **Phone** aç, bir SMS sağlayıcı bağla (Twilio / MessageBird / Vonage).
2. `LoginPage.tsx`'i iki adımlı akışa çevir: telefon gir → OTP kod gir (şu an tek adımlı email/şifre formu var, `AuthContext`'e `signInWithPhoneOtp`/`verifyPhoneOtp` eklenmeli).
3. `user_profiles`'a `phone` kolonu ekle (yeni bir `scripts/*.sql` migration olarak, mevcut pattern'e uyarak) ya da doğrudan `auth.users.phone`'u `userProfilesService.getProfile` sorgusunda kullan.
4. Admin'in Settings'ten yeni kullanıcı oluşturma akışı (`createUser` / `SettingsView`) email yerine/yanında telefon alacak şekilde güncellenmeli.
5. Türkiye numaraları için `+90` formatı/validasyonu (E.164) eklenmeli — şu an hiçbir telefon inputu formatlanmıyor.
6. Açık karar noktası: girilen telefon `residents.phone`'da eşleşiyor ama henüz `user_id` boşsa, otomatik bağlansın mı yoksa admin onayı mı beklesin?

### WhatsApp
İki farklı ihtiyaç olabilir, hangisi hedefse ona göre iş farklı — yukarıdaki "Supabase üzerinden mi?" bölümü ikisi için de geçerli altyapı (Edge Functions):
- **WhatsApp üzerinden OTP ile giriş**: Twilio Verify, SMS kanalının yanında WhatsApp kanalını da destekliyor — aynı Twilio entegrasyonu iki kanalı da tek yapılandırmayla çözebilir.
- **WhatsApp bildirimleri** (aidat hatırlatma, duyuru): Girişten bağımsız ayrı bir özellik, aşağıdaki "Borç bildirimi" maddesiyle örtüşüyor.

**Öneri**: Hangi WhatsApp ihtiyacı öncelikli — giriş kanalı mı, bildirim mi — netleşince kapsamı daraltıp somut bir Edge Function planı çıkarırım.

### Borç bildirimi (ödemeyenlere hatırlatma)
Bu özellik `residents.user_id` bağlantısına bağımlı değil — `residents.phone` zaten her kayıtta var, hesabı olsun olmasın direkt o numaraya WhatsApp/SMS gönderilebilir. `user_id` linki sadece uygulama-içi "kendi borcumu görüntüleme" ve telefonla giriş eşleştirmesi için gerekli. Yani bu iki iş paralel ilerleyebilir, biri diğerini beklemez.

Kabaca akış: `getResidentLedgerWithPlanning` zaten her sakin için `unpaid` ledger kalemlerini üretiyor (`helpers.ts`) → bir Supabase Edge Function, `pg_cron` ile günlük/haftalık tetiklenip bu listeyi tarar → borcu olan her `residents.phone`'a WhatsApp/SMS gönderir (hesabı olan/olmayan farketmez) → tekrar bildirim göndermemek için `ledgers`'a `last_notified_at` gibi bir kolon ya da ayrı bir `notifications` log tablosu gerekir (aynı borç için her gün spam atmamak adına).

## Veritabanı incelemesi — kalan refactor önerileri

**(d) — `settings` key-value (EAV) tablosu, tip güvenliği yok.** `meeting_date`/`monthly_due`/`debt_start_date` hepsi `TEXT` olarak tutulup her yerde manuel `parseFloat`/`new Date` ile çözülüyor. 3 sabit anahtarla şu an sorun çıkarmıyor, ama borç bildirimi için "kaç gün gecikince gönder", "bildirim şablonu" gibi yeni ayarlar eklendikçe büyümeye devam edecek bir pattern. Anahtar sayısı ~6-7'yi geçerse gerçek kolonlu tek satırlık bir `app_settings` tablosuna geçmeyi düşünün — şimdilik dokunmaya gerek yok.

**(e) — `receipt_requests.user_name`/`apartment_info` `user_profiles`'tan denormalize edilmiş.** Muhtemelen bilinçli bir "talep anındaki görünen ad" snapshot'ı — sorun değil, sadece not düşülüyor.
