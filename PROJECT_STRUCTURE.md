# Proje Yapısı

Bu dokümantasyon, apartment-management projesinin yeni klasör yapısını ve organizasyonunu açıklar.

## 📁 Klasör Yapısı

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Sol menü navigasyon
│   │   └── Header.tsx         # Üst başlık (dil, tema, rol değiştirme)
│   └── views/
│       ├── DashboardView.tsx       # Anasayfa - Daire haritası
│       ├── FinancialsView.tsx      # Finansal durum - Borç yönetimi
│       ├── CommunityBoardView.tsx  # Duyuru panosu
│       ├── RequestBoxView.tsx      # İstek kutusu + AI asistan
│       ├── SettingsView.tsx        # Ayarlar (Admin)
│       └── InfoView.tsx            # İletişim bilgileri
├── types/
│   └── index.ts              # Tüm TypeScript tip tanımları
├── constants/
│   ├── translations.ts       # Çok dilli metinler (TR/EN)
│   ├── themes.ts            # Renk temaları
│   └── mockData.ts          # Test verileri
├── config/
│   └── api.ts               # API konfigürasyonu (Gemini AI)
├── utils/
│   └── helpers.ts           # Yardımcı fonksiyonlar
├── App.tsx                  # Ana uygulama
└── main.tsx                 # Uygulama giriş noktası
```

## 🗂️ Dosya Açıklamaları

### `types/index.ts`
Tüm TypeScript interface ve type tanımları:
- `Language`, `UserRole`, `ThemeName` - Temel tipler
- `Resident`, `LedgerItem`, `RequestItem`, `CommunityPost` - Veri modelleri
- `Theme`, `BaseClasses` - UI tipleri
- Component props interface'leri

### `constants/`
- **translations.ts**: Türkçe ve İngilizce dil çevirileri
- **themes.ts**: Blue, Purple, Green, Orange renk temaları
- **mockData.ts**: 
  - `INITIAL_RESIDENTS` - Sakinler ve borç kayıtları
  - `MOCK_INFO` - İletişim bilgileri
  - `INITIAL_REQUESTS` - Örnek talepler
  - `INITIAL_COMMUNITY_POSTS` - Örnek duyurular

### `config/api.ts`
Gemini AI API entegrasyonu:
- `GEMINI_API_KEY` - API anahtarı (buraya eklenecek)
- `GEMINI_API_URL` - API endpoint
- `callGemini()` - API çağrı fonksiyonu

### `utils/helpers.ts`
Yardımcı fonksiyonlar:
- `calculateTotalDebt()` - Borç hesaplama
- `getResidentLedgerWithPlanning()` - Planlı ödeme hesaplama
- `getBaseClasses()` - Dark mode CSS sınıfları
- `createTranslator()` - Çeviri fonksiyonu
- `getCurrentUser()` - Mevcut kullanıcı bilgisi

### `components/layout/`
Layout componentleri:
- **Sidebar.tsx**: Sol navigasyon menüsü
  - Dinamik menü öğeleri (admin için settings görünür)
  - Kullanıcı profil bilgisi
  - Logout butonu

- **Header.tsx**: Üst başlık
  - Dil değiştirme (TR/EN)
  - Dark mode toggle
  - Tema seçici (4 renk)
  - Rol değiştirme (Sakin/Yönetici)

### `components/views/`
Sayfa componentleri:

- **DashboardView.tsx**: Daire haritası
  - Admin: Borç durumları renkli gösterim
  - Sakin: Sadece iletişim bilgileri
  - Modal ile detay görüntüleme

- **FinancialsView.tsx**: Finansal yönetim
  - Admin: Tüm borçlar, tahsilat yapma
  - Sakin: Kendi borçları, ödeme bildirimi

- **RequestBoxView.tsx**: Talep sistemi
  - Yeni talep oluşturma
  - Admin: AI gündem oluşturma, durum güncelleme
  - Sakin: Kendi taleplerini görme

- **CommunityBoardView.tsx**: Duyuru panosu
  - Post oluşturma (Genel, Etkinlik, Uyarı)
  - Tüm duyuruları listeleme

- **SettingsView.tsx**: Ayarlar (Admin)
  - Genel kurul tarihi ayarlama

- **InfoView.tsx**: İletişim bilgileri
  - Yönetici, asistan, muhtar, belediye

## 🔧 Kullanılan Teknolojiler

- **React** - UI framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Styling
- **Lucide React** - İkonlar
- **Gemini AI** - Yapay zeka entegrasyonu

## 🚀 Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build
```

## 📝 Önemli Notlar

1. **API Key**: `src/config/api.ts` dosyasındaki `GEMINI_API_KEY` değişkenine Gemini API anahtarınızı ekleyin.

2. **Tip Güvenliği**: Tüm componentler TypeScript ile tip güvenli şekilde yazılmıştır.

3. **Modülerlik**: Her component bağımsız çalışır ve kolayca test edilebilir.

4. **Yeniden Kullanılabilirlik**: Yardımcı fonksiyonlar ve sabitler merkezi bir yerden yönetilir.

## 🎨 Tema Özelleştirme

Yeni tema eklemek için `src/constants/themes.ts` dosyasına yeni bir tema objesi ekleyin:

```typescript
myTheme: {
  name: 'Tema Adı',
  primary: 'bg-color-600',
  hover: 'hover:bg-color-700',
  text: 'text-color-600',
  border: 'border-color-200',
  gradient: 'from-color-500 to-color-600',
  ring: 'focus:ring-color-500',
  light: 'bg-color-50'
}
```

## 🌍 Çok Dilli Destek

Yeni dil eklemek için `src/constants/translations.ts` dosyasına yeni bir dil objesi ekleyin.
