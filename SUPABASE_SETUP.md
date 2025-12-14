# Supabase Kurulum Rehberi

Bu döküman, apartment-management projesine Supabase veritabanı entegrasyonunun nasıl yapılacağını adım adım açıklar.

## 📋 Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn
- Supabase hesabı (ücretsiz)

## 🚀 Kurulum Adımları

### 1. Supabase Projesi Oluşturma

1. [supabase.com](https://supabase.com) adresine gidin
2. "Start your project" butonuna tıklayın
3. GitHub, Google veya email ile giriş yapın
4. "New Project" butonuna tıklayın
5. Proje bilgilerini doldurun:
   - **Name**: apartment-management (veya istediğiniz isim)
   - **Database Password**: Güçlü bir şifre seçin (kaydedin!)
   - **Region**: En yakın bölgeyi seçin (Europe - Frankfurt önerilir)
   - **Pricing Plan**: Free tier seçin
6. "Create new project" butonuna tıklayın
7. Proje oluşturulurken 2-3 dakika bekleyin

### 2. Database Şemasını Oluşturma

1. Supabase dashboard'da sol menüden **"SQL Editor"** seçin
2. "+ New query" butonuna tıklayın
3. Proje klasöründeki `supabase-schema.sql` dosyasını açın
4. Tüm SQL kodunu kopyalayıp SQL Editor'e yapıştırın
5. Sağ alttaki **"Run"** butonuna tıklayın
6. "Success" mesajını görmelisiniz

**Alternatif Yöntem:**
```bash
# SQL dosyasını çalıştır
psql -h [YOUR_DB_HOST] -U postgres -d postgres -f supabase-schema.sql
```

### 3. API Keys Alma

1. Supabase dashboard'da sol menüden **"Settings"** > **"API"** seçin
2. İki önemli değeri kopyalayın:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **anon public key**: `eyJ...` ile başlayan uzun bir string

### 4. Environment Variables Ayarlama

1. Proje klasöründe `.env` dosyasını açın
2. API bilgilerinizi ekleyin:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

⚠️ **ÖNEMLİ**: `.env` dosyası `.gitignore`'da olduğu için git'e commit edilmeyecektir.

### 5. Bağımlılıkları Yükleme

```bash
npm install
```

Supabase client zaten `package.json`'a eklenmiştir.

### 6. Uygulamayı Çalıştırma

```bash
npm run dev
```

Tarayıcınızda `http://localhost:5173` adresini açın.

## 🗄️ Veritabanı Yapısı

### Tablolar

1. **residents** - Sakinler
   - Daire bilgileri (blok, kapı, isim, telefon, durum)
   
2. **ledgers** - Borç Kayıtları
   - Her sakine ait aidat ve ödeme kayıtları
   
3. **requests** - Talepler
   - Sakinlerin talep ve şikayetleri
   
4. **community_posts** - Duyurular
   - Site duyuru panosu gönderileri
   
5. **settings** - Ayarlar
   - Genel kurul tarihi gibi sistem ayarları
   
6. **info** - İletişim Bilgileri
   - Yönetici, asistan, muhtar, belediye bilgileri

### İlişkiler

```
residents (1) -----> (*) ledgers
  └─ Her sakin birden fazla borç kaydına sahip olabilir
```

## 🔧 Proje Yapısı

```
src/
├── lib/
│   └── supabase.ts           # Supabase client ve type definitions
├── services/                 # Database CRUD işlemleri
│   ├── residentsService.ts
│   ├── ledgersService.ts
│   ├── requestsService.ts
│   ├── communityPostsService.ts
│   ├── settingsService.ts
│   └── infoService.ts
├── hooks/                    # React custom hooks
│   ├── useResidents.ts
│   ├── useRequests.ts
│   ├── useCommunityPosts.ts
│   ├── useSettings.ts
│   └── useInfo.ts
└── components/views/         # UI components (DB entegre)
```

## 📝 Kullanım Örnekleri

### Veri Çekme

```typescript
// Otomatik olarak tüm residents'ları çeker
const { residents, loading, error } = useResidents();
```

### Veri Ekleme

```typescript
// Yeni talep oluşturma
await requestsService.create({
  user: 'Ahmet Yılmaz',
  date: '2024-06-10',
  content: 'Asansör arızalı',
  status: 'status_new',
  inAgenda: false
});
```

### Veri Güncelleme

```typescript
// Borç durumunu güncelleme
await ledgersService.updateStatus('ledger-id', 'paid');
```

## 🔐 Güvenlik (Row Level Security)

Şu an RLS kapalı durumda (geliştirme kolaylığı için). Production'a geçmeden önce RLS politikalarını aktif etmeniz önerilir:

```sql
-- RLS'i aktif et
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
-- diğer tablolar için de...

-- Örnek politika: Herkes okuyabilir
CREATE POLICY "Public read access" 
  ON residents FOR SELECT 
  USING (true);
```

## 🐛 Sorun Giderme

### Hata: "Invalid API key"
- `.env` dosyasındaki API key'i kontrol edin
- Supabase dashboard'dan key'i tekrar kopyalayın
- Uygulamayı yeniden başlatın (`npm run dev`)

### Hata: "Failed to fetch"
- İnternet bağlantınızı kontrol edin
- Supabase projesinin aktif olduğundan emin olun
- Browser console'da detaylı hata mesajını kontrol edin

### Veriler Görünmüyor
- SQL script'in başarıyla çalıştığından emin olun
- Supabase Table Editor'den verileri manuel kontrol edin
- Browser DevTools > Network tab'dan API isteklerini inceleyin

### Connection Timeout
- Supabase free tier'da 1 saat boyunca kullanılmazsa database uyku moduna geçer
- İlk istekte 5-10 saniye gecikmesi normaldir
- Dashboard'dan projeyi manuel uyandırabilirsiniz

## 📊 Veri Yönetimi

### Table Editor ile Manuel Düzenleme

1. Supabase dashboard > **"Table Editor"**
2. İstediğiniz tabloyu seçin
3. Satır ekle/düzenle/sil

### SQL Editor ile Toplu İşlemler

```sql
-- Tüm borçları ödendi olarak işaretle
UPDATE ledgers SET status = 'paid' WHERE status = 'unpaid';

-- Belirli bir dairenin borçlarını listele
SELECT * FROM ledgers 
WHERE resident_id = 101 
ORDER BY date DESC;
```

## 🚀 Production Checklist

- [ ] Environment variables production'a aktarıldı
- [ ] RLS politikaları oluşturuldu
- [ ] Database backup stratejisi belirlendi
- [ ] API rate limiting kontrol edildi
- [ ] Error monitoring eklendi (Sentry vb.)

## 📚 Ek Kaynaklar

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

## 🆘 Yardım

Sorun yaşarsanız:
1. Browser console'u kontrol edin
2. Network tab'dan API isteklerini inceleyin
3. Supabase logs'u kontrol edin (Dashboard > Logs)
4. GitHub Issues'da benzer sorunları arayın
