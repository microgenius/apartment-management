# 🏢 Apartment Management System

Modern, full-stack site yönetim uygulaması. React, TypeScript, TailwindCSS ve **Supabase (PostgreSQL)** ile geliştirilmiştir.

## ✨ Özellikler

### 🔐 Authentication Sistemi
- Supabase built-in authentication
- Email/Password ile giriş ve kayıt
- Protected routes (login olmadan erişim yok)
- Session management
- Logout fonksiyonu

### 👤 Çift Rol Sistemi
- **Sakin Modu**: Kendi borçlarını görüntüleme, talep oluşturma
- **Yönetici Modu**: Tüm sakinlerin borçlarını yönetme, tahsilat yapma, talepleri değerlendirme

### 💰 Finansal Yönetim
- Aidat takibi ve borç hesaplama
- Ödeme işleme ve durum güncelleme
- Detaylı cari hesap görüntüleme
- Planlı ödemeler (genel kurul tarihine göre)

### 📋 Talep Yönetimi
- Sakinlerin talep gönderimi
- Talep durum takibi (Yeni / İncelemede / Tamamlandı)
- AI destekli gündem oluşturma (Gemini)
- Gündeme alma sistemi

### 📢 Duyuru Panosu
- Site geneli duyurular
- Etkinlik, uyarı ve genel duyuru tipleri
- Gerçek zamanlı bildirimler

### 🎨 Tema ve Özelleştirme
- 4 renk teması (Mavi, Mor, Yeşil, Turuncu)
- Dark/Light mode
- Türkçe/İngilizce dil desteği
- Responsive tasarım

### 🗄️ **Supabase Database**
- PostgreSQL veritabanı
- 6 tablo (residents, ledgers, requests, community_posts, settings, info)
- Kalıcı veri saklama
- RESTful API

## 🚀 Hızlı Başlangıç

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd apartment-management
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Supabase Kurulumu
**Detaylı kurulum için `SUPABASE_SETUP.md` dosyasını okuyun.**

Kısaca:
1. [supabase.com](https://supabase.com)'da ücretsiz proje oluşturun
2. `supabase-schema.sql` dosyasını SQL Editor'de çalıştırın
3. **Authentication'ı aktif edin** (varsayılan olarak açık)
4. `.env` dosyasını oluşturun:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Authentication kurulumu için:** `AUTHENTICATION_SETUP.md` dosyasına bakın.

### 4. Uygulamayı Çalıştırın
```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

## 📁 Proje Yapısı

```
src/
├── lib/
│   └── supabase.ts              # Supabase client
├── contexts/
│   └── AuthContext.tsx          # Authentication context
├── services/                    # Database CRUD operations
│   ├── residentsService.ts      # Sakinler
│   ├── ledgersService.ts        # Borç kayıtları
│   ├── requestsService.ts       # Talepler
│   ├── communityPostsService.ts # Duyurular
│   ├── settingsService.ts       # Ayarlar
│   └── infoService.ts           # İletişim bilgileri
├── hooks/                       # React custom hooks
│   ├── useResidents.ts
│   ├── useRequests.ts
│   ├── useCommunityPosts.ts
│   ├── useSettings.ts
│   └── useInfo.ts
├── components/
│   ├── auth/                    # Authentication components
│   │   ├── LoginPage.tsx
│   │   └── ProtectedRoute.tsx
│   ├── layout/                  # Layout components
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── views/                   # Page components
│       ├── DashboardView.tsx
│       ├── FinancialsView.tsx
│       ├── RequestBoxView.tsx
│       ├── CommunityBoardView.tsx
│       ├── SettingsView.tsx
│       └── InfoView.tsx
├── types/
│   └── index.ts                 # TypeScript types
├── constants/
│   ├── translations.ts          # i18n
│   ├── themes.ts                # Color themes
│   └── mockData.ts              # (Artık kullanılmıyor)
├── config/
│   └── api.ts                   # Gemini AI config
└── utils/
    └── helpers.ts               # Helper functions
```

## 🛠️ Teknolojiler

- **Frontend**: React 19, TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Build**: Vite
- **Linting**: ESLint

## 📊 Database Şeması

### Tablolar
- `residents`: Sakinler (blok, kapı, isim, telefon, durum)
- `ledgers`: Borç kayıtları (tutar, tarih, durum)
- `requests`: Talepler (içerik, durum, gündem)
- `community_posts`: Duyurular (tür, içerik)
- `settings`: Sistem ayarları (genel kurul tarihi)
- `info`: İletişim bilgileri (yönetici, muhtar, vb.)

### İlişkiler
```
residents (1) -----> (*) ledgers
```

## 🎯 Kullanım

### Rol Değiştirme
Sağ üst köşeden **Sakin** ↔ **Yönetici** arasında geçiş yapabilirsiniz.

### Finansal İşlemler (Yönetici)
1. **Finansal Durum** sekmesine gidin
2. Borçlu sakinleri görün
3. "Tahsil Et" butonuna tıklayın
4. Ödeme tutarını girin ve işleyin

### Talep Oluşturma (Sakin)
1. **İstek Kutusu** sekmesine gidin
2. Talebinizi yazın
3. "Gönder" butonuna tıklayın

### AI Gündem Oluşturma (Yönetici)
1. Talepleri gündeme ekleyin
2. "AI Gündem Oluştur" butonuna tıklayın
3. Gemini AI otomatik gündem metni oluşturur

## 🔑 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anon/public key

# Gemini AI (Opsiyonel)
VITE_GEMINI_API_KEY=        # Google AI Studio API key
```

## 📝 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🚧 Yapılacaklar

- [x] ~~Authentication (Supabase Auth)~~ ✅ Tamamlandı
- [ ] Row Level Security (RLS) politikaları
- [ ] Şifre sıfırlama fonksiyonu
- [ ] Email bildirimleri
- [ ] PDF rapor oluşturma
- [ ] Dosya yükleme (faturalar, belgeler)
- [ ] Grafik ve istatistikler
- [ ] Mobile app (React Native)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

MIT License

## 📞 Destek

Sorular için:
- GitHub Issues
- Email: your-email@example.com

## 🙏 Teşekkürler

- [Supabase](https://supabase.com) - Database & Backend
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide](https://lucide.dev) - Icons
- [Google Gemini](https://ai.google.dev) - AI Integration
