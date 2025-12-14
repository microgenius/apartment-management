# 🔐 Authentication Kurulum Rehberi

Bu rehber, Supabase Authentication sistemininin nasıl aktif edileceğini ve yapılandırılacağını açıklar.

## 📋 Supabase Authentication Nedir?

Supabase, built-in bir authentication sistemi sunar:
- Email/Password ile giriş
- Email doğrulama
- Şifre sıfırlama
- Session yönetimi
- JWT token tabanlı güvenlik
- **Rol tabanlı erişim** (user_profiles tablosu ile)

## 🎭 Rol Sistemi

Projede iki rol bulunur:
- **Resident (Site Sakini)**: Kendi borçlarını görüntüleyebilir, talep oluşturabilir
- **Admin (Yönetici)**: Tüm özelliklere erişim, kullanıcı yönetimi, ayarlar

**Önemli:** Roller değiştirilemez! Her kullanıcı kayıt sırasında belirlenen role sahiptir. Admin, Settings sayfasından başka bir kullanıcıya yöneticilik devredebilir.

## 🚀 Kurulum Adımları

### 1. User Profiles Tablosunu Oluştur

Rol yönetimi için `user_profiles` tablosuna ihtiyacınız var:

1. Supabase Dashboard > **SQL Editor**
2. `supabase-user-profiles.sql` dosyasını açın
3. Tüm SQL kodunu kopyalayıp çalıştırın
4. Bu tablo kullanıcı rollerini (resident/admin) saklar

### 2. İlk Admin Kullanıcısını Oluştur

**Önemli:** İlk admin'i manuel oluşturmalısınız:

1. Supabase Dashboard > **Authentication** > **Users**
2. "Add user" butonuna tıklayın
3. Email ve password girin
4. Kullanıcı oluşturulduktan sonra, **SQL Editor**'de:

```sql
-- user_id'yi yukarıda oluşturduğunuz kullanıcının ID'si ile değiştirin
INSERT INTO user_profiles (id, full_name, role, apartment_info) VALUES
  ('your-user-id-here', 'Admin Kullanıcı', 'admin', 'Yönetici');
```

5. Artık bu kullanıcı ile giriş yapabilir ve admin paneline erişebilirsiniz

### 3. Email Provider Ayarları

Supabase Dashboard'a gidin:

1. **Authentication** > **Providers** sekmesine gidin
2. **Email** provider'ı bulun (varsayılan olarak aktif)
3. Ayarları kontrol edin:
   - ✅ Enable email provider
   - ✅ Confirm email (isteğe bağlı - geliştirme aşamasında kapatabilirsiniz)

### 2. Email Doğrulama Ayarları (İsteğe Bağlı)

**Geliştirme için:** Email doğrulamayı kapatabilirsiniz

1. **Authentication** > **Settings** > **Email Auth**
2. **"Confirm email"** seçeneğini devre dışı bırakın
3. Böylece kullanıcılar email doğrulaması yapmadan giriş yapabilir

**Production için:** Mutlaka açık olmalı!

### 3. Email Templates (Opsiyonel)

Varsayılan email şablonlarını özelleştirin:

1. **Authentication** > **Email Templates**
2. Şablonları düzenleyin:
   - Confirm signup
   - Reset password
   - Invite user
   - Magic link

Türkçe içerik için şablonları özelleştirin.

### 4. URL Configuration

Site URL'ini ayarlayın:

1. **Authentication** > **URL Configuration**
2. **Site URL**: `http://localhost:5173` (geliştirme)
3. **Redirect URLs**: Ekleyin:
   - `http://localhost:5173`
   - `http://localhost:5173/**`

Production için gerçek domain'i ekleyin.

## 🔧 Uygulama Yapısı

### Dosya Organizasyonu

```
src/
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── components/
│   └── auth/
│       ├── LoginPage.tsx        # Login/Signup UI
│       └── ProtectedRoute.tsx   # Route protection wrapper
└── main.tsx                     # AuthProvider wrapper
```

### AuthContext Özellikleri

```typescript
const { 
  user,       // Mevcut kullanıcı (User | null)
  session,    // Aktif session (Session | null)
  loading,    // Loading state (boolean)
  signIn,     // Login fonksiyonu
  signUp,     // Signup fonksiyonu
  signOut     // Logout fonksiyonu
} = useAuth();
```

## 💡 Kullanım Örnekleri

### 1. Kullanıcı Bilgisine Erişim

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  
  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>İsim: {user?.user_metadata?.full_name}</p>
    </div>
  );
}
```

### 2. Login/Signup İşlemleri

```typescript
// Login
const { error } = await signIn('user@example.com', 'password123');
if (error) {
  alert('Giriş başarısız');
}

// Signup
const { error } = await signUp('user@example.com', 'password123', 'Ahmet Yılmaz');
if (error) {
  alert('Kayıt başarısız');
}

// Logout
await signOut();
```

### 3. Protected Routes

Tüm uygulama zaten korunuyor. Login olmayan kullanıcılar otomatik olarak LoginPage'e yönlendiriliyor.

```typescript
// App.tsx
return (
  <ProtectedRoute>
    <YourApp />
  </ProtectedRoute>
);
```

## 🎨 Login Sayfası Özellikleri

### Tasarım
- ✅ Mevcut tema ile uyumlu (gradient, renkler)
- ✅ Responsive (mobil uyumlu)
- ✅ Modern UI (glassmorphism, shadows)
- ✅ Tab switcher (Login / Signup)
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling

### Özellikler
- Email/Password login
- Yeni kullanıcı kaydı
- Ad-soyad ekleme (signup)
- Şifre sıfırlama linki (hazır UI)
- Hata mesajları (Türkçe)

## 🔒 Güvenlik

### Session Yönetimi
- JWT token otomatik yönetiliyor
- Token refresh otomatik
- Logout sonrası token siliniyor
- Session 7 gün geçerli (varsayılan)

### Best Practices
1. **Hassas bilgileri client-side'da tutmayın**
2. **API anahtarlarını `.env`'de saklayın**
3. **Production'da email doğrulama aktif olmalı**
4. **Strong password policy kullanın**
5. **Rate limiting ekleyin (Supabase'de mevcut)**

## 🐛 Sorun Giderme

### Hata: "Invalid login credentials"
- Email/password kontrolü yapın
- Email doğrulaması gerekiyorsa, inbox'u kontrol edin
- Supabase dashboard'dan kullanıcıyı manuel onaylayın

### Email Gönderilmiyor
1. Supabase Dashboard > **Authentication** > **Settings**
2. **SMTP Settings** bölümünü kontrol edin
3. Geliştirme için email doğrulamayı kapatın

### Session Kaybolması
- Browser localStorage'ı temizleyin
- Supabase project key'lerini kontrol edin
- `.env` dosyasının doğru olduğundan emin olun

### Redirect Sorunları
- URL Configuration'da localhost ekli mi?
- Port numarası doğru mu? (5173)

## 📊 Test Kullanıcıları Oluşturma

### Manuel Oluşturma
1. Supabase Dashboard > **Authentication** > **Users**
2. "Add user" butonuna tıklayın
3. Email ve password girin
4. "Confirm email" işaretini kaldırın (geliştirme için)

### SQL ile Oluşturma
```sql
-- Test kullanıcısı (email doğrulaması olmadan)
-- Bu işlem Supabase Dashboard'dan yapılmalı
```

## 🚀 Production Checklist

- [ ] Email doğrulama aktif
- [ ] Site URL production domain'e ayarlandı
- [ ] Redirect URLs güncellendi
- [ ] Email templates özelleştirildi (Türkçe)
- [ ] Strong password policy aktif
- [ ] Rate limiting kontrol edildi
- [ ] 2FA opsiyonu değerlendirildi
- [ ] Error logging eklendi

## 🔄 Row Level Security (RLS) Entegrasyonu

Veritabanı tablolarınız için RLS politikaları ekleyebilirsiniz:

```sql
-- Örnek: Sadece kendi verilerini görebilme
CREATE POLICY "Users can view own data" 
ON residents 
FOR SELECT 
USING (auth.uid() = user_id);

-- Örnek: Sadece authenticated kullanıcılar okuyabilir
CREATE POLICY "Authenticated users read" 
ON info 
FOR SELECT 
TO authenticated 
USING (true);
```

**Not:** Şu an RLS kapalı. Production'a geçmeden önce mutlaka aktif edin!

## 📚 Ek Kaynaklar

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Auth UI](https://supabase.com/docs/guides/auth/auth-helpers)
- [JWT Tokens](https://supabase.com/docs/guides/auth/jwts)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

## 🎓 İleri Seviye

### Social Login (Google, GitHub, etc.)
```typescript
// Google ile giriş
await supabase.auth.signInWithOAuth({
  provider: 'google',
});
```

### Magic Link (Passwordless)
```typescript
// Email ile magic link gönder
await supabase.auth.signInWithOtp({
  email: 'user@example.com',
});
```

### Multi-Factor Authentication (MFA)
Supabase dashboard'dan aktif edilebilir.

---

## ✅ Kurulum Tamamlandı!

Artık uygulamanız tam güvenli authentication sistemine sahip:
- 🔐 Login/Signup sayfası
- 🛡️ Protected routes
- 👤 User session management
- 🚪 Logout functionality
