# 🎭 Rol Sistemi Dokümantasyonu

## Genel Bakış

Uygulama iki farklı rol ile çalışır: **Site Sakini (Resident)** ve **Yönetici (Admin)**. Her kullanıcı yalnızca bir role sahip olabilir ve bu rol, kullanıcının erişebildiği özellikleri belirler.

## 🔑 Rol Tipleri

### Site Sakini (Resident)
**Erişim:**
- ✅ Dashboard (kendi daire bilgileri)
- ✅ Finansal Durum (kendi borçları)
- ✅ İstek Kutusu (talep oluşturma ve görüntüleme)
- ✅ Duyuru Panosu (okuma ve yazma)
- ✅ İletişim Bilgileri

**Yapabilecekleri:**
- Kendi borç durumunu görüntüleme
- Talep/şikayet gönderme
- Duyuru paylaşma
- Site yöneticileri ile iletişim

### Yönetici (Admin)
**Erişim:**
- ✅ Tüm Resident özellikleri +
- ✅ **Tüm sakinlerin bilgileri**
- ✅ Tahsilat işlemleri
- ✅ Talep yönetimi (durum güncelleme, gündeme alma)
- ✅ AI destekli gündem oluşturma
- ✅ **Ayarlar** (Admin özel)

**Yapabilecekleri:**
- Tüm sakinlerin borçlarını görüntüleme ve tahsilat yapma
- Talepleri değerlendirme, durum değiştirme, gündeme alma
- Genel kurul tarihi belirleme
- **Yeni kullanıcı oluşturma**
- **Yöneticilik devretme**

## 🚫 Değişiklikler

### Önceki Sistem (Kaldırıldı)
- ❌ Header'da rol değiştirme butonu vardı
- ❌ Kullanıcılar sakin ↔ yönetici arası geçiş yapabiliyordu
- ❌ Login sayfasında "Kayıt Ol" sekmesi vardı

### Yeni Sistem
- ✅ Roller sabit ve değiştirilemez
- ✅ Sadece admin, Settings'ten yeni kullanıcı ekleyebilir
- ✅ Header'da sadece mevcut rol görünür (badge)
- ✅ Login sayfasında yalnızca giriş formu var

## 📊 Database Yapısı

### `user_profiles` Tablosu

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('resident', 'admin')),
  apartment_info TEXT, -- "A Blok - Daire 101"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### İlişki
- `auth.users` (Supabase built-in) ↔ `user_profiles` (custom)
- Her auth user, bir profile sahip
- Profile role bilgisini tutar

## 🔧 Yeni Kullanıcı Ekleme

### Admin Paneli (Settings)

Admin, Settings sayfasından yeni kullanıcı ekleyebilir:

1. **Ayarlar** sekmesine git (sadece admin görür)
2. **Yeni Kullanıcı Oluştur** bölümünü doldur:
   - Ad Soyad
   - Email
   - Şifre (min 6 karakter)
   - Daire Bilgisi (opsiyonel)
   - Rol (Resident / Admin)
3. "Kullanıcı Oluştur" butonuna tıkla

**Arka planda:**
```typescript
// 1. Supabase Auth'da kullanıcı oluştur
await supabase.auth.signUp({ email, password });

// 2. user_profiles'a ekle
await supabase
  .from('user_profiles')
  .insert({ id: user.id, full_name, role, apartment_info });
```

### Otomatik Trigger

Yeni bir auth.users kaydı oluşturulduğunda, otomatik olarak varsayılan `resident` rolü ile profile oluşturulur:

```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

## 🔄 Admin Devretme

### İşleyiş

Admin, yöneticiliği başka bir **site sakini**ne devredebilir:

1. **Settings** > **Yöneticilik Devri**
2. Listeden bir sakin seç
3. "Devret" butonuna tıkla
4. Onay ekranında "Evet, Devret"
5. **Mevcut admin → resident olur**
6. **Seçilen sakin → admin olur**
7. Sayfa yenilenir, oturum güncellenir

**Uyarı:** Bu işlem geri alınamaz! Eski admin tüm yetkilerini kaybeder.

### Kod

```typescript
const transferAdmin = async (currentAdminId, newAdminId) => {
  // Transaction benzeri: İkisini de güncelle
  await supabase
    .from('user_profiles')
    .update({ role: 'resident' })
    .eq('id', currentAdminId);

  await supabase
    .from('user_profiles')
    .update({ role: 'admin' })
    .eq('id', newAdminId);
};
```

## 🎯 Kullanım Örnekleri

### Rol Kontrolü (Component)

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { userRole } = useAuth();

  if (userRole !== 'admin') {
    return <p>Bu sayfaya erişim yetkiniz yok</p>;
  }

  return <AdminPanel />;
}
```

### App.tsx'te Conditional Rendering

```typescript
{activeTab === 'settings' && userRole === 'admin' && (
  <SettingsView {...props} />
)}
```

### Sidebar'da Menu Filtering

```typescript
const menuItems = [
  'dashboard',
  'financials',
  'community',
  'requests',
  'info',
  ...(userRole === 'admin' ? ['settings'] : [])
];
```

## 🔐 Güvenlik

### Client-Side
- Rol kontrolü UI'da yapılıyor
- Admin özellikleri yalnızca admin görürse gösteriliyor

### Server-Side (Önerilen)
Production için **Row Level Security (RLS)** ekleyin:

```sql
-- Sadece kendi verilerini görebilme
CREATE POLICY "Users see own data"
ON residents
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  ) OR id = auth.uid()
);

-- Sadece admin yazabilir
CREATE POLICY "Only admin can write"
ON residents
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);
```

## 📝 Best Practices

### ✅ Yapılması Gerekenler
1. İlk admin'i manuel oluştur (SQL ile)
2. Her zaman en az 1 admin bulundur
3. Admin devrinden önce kullanıcıyı onayla
4. RLS politikalarını production'da aktif et
5. Audit log tut (kim ne zaman devredildi)

### ❌ Yapılmaması Gerekenler
1. Client-side rol kontrolüne güvenme (sadece UI için)
2. Tüm admin'leri silme (en az 1 olmalı)
3. Rol değiştirmeyi kullanıcıya açma
4. Email doğrulamasız admin oluşturma

## 🐛 Sorun Giderme

### "Settings menüsü görünmüyor"
- Kullanıcının rolü admin mi? Kontrol et:
  ```sql
  SELECT role FROM user_profiles WHERE id = 'user-id';
  ```
- Sidebar'da `userRole === 'admin'` kontrolü var mı?

### "Yeni kullanıcı oluşturamıyorum"
- Admin olarak giriş yaptınız mı?
- Supabase email ayarları doğru mu?
- Console'da hata var mı?

### "Admin devri çalışmıyor"
- Her iki kullanıcı da var mı?
- Seçilen kullanıcı `resident` mi?
- Transaction başarılı oldu mu? (SQL logs)

## 🚀 Gelecek Geliştirmeler

- [ ] Multi-admin desteği (birden fazla admin)
- [ ] Geçici admin yetkilendirme (expiry date)
- [ ] Rol bazlı izinler (permissions sistem)
- [ ] Audit log (rol değişiklik geçmişi)
- [ ] Email bildirimleri (admin devri, yeni kullanıcı)

---

## 📞 Yardım

Sorular için:
- `AUTHENTICATION_SETUP.md` - Auth genel kurulum
- `SUPABASE_SETUP.md` - Database kurulum
- GitHub Issues
