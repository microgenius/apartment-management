// ==========================================
// ÜLKE TELEFON KODLARI (DIAL CODES)
// ==========================================
// Avrupa (AB/AEA + Birleşik Krallık + İsviçre) ve Türkiye.
// Numarayı "+" veya "00" ile yazan kullanıcı bu seçimi zaten geçersiz kılar;
// liste, kodu yazmayan kullanıcı için doğru varsayılanı seçmeye yarıyor.
// Ana pazarlar (TR, DE, IE) listenin başında, geri kalanı alfabetik.

export interface Country {
  code: string;   // ülke telefon kodu, "+" olmadan
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: '90', name: 'Türkiye', flag: '🇹🇷' },
  { code: '49', name: 'Deutschland', flag: '🇩🇪' },
  { code: '353', name: 'Ireland', flag: '🇮🇪' },

  { code: '43', name: 'Österreich', flag: '🇦🇹' },
  { code: '32', name: 'Belgium', flag: '🇧🇪' },
  { code: '359', name: 'Bulgaria', flag: '🇧🇬' },
  { code: '385', name: 'Hrvatska', flag: '🇭🇷' },
  { code: '357', name: 'Cyprus', flag: '🇨🇾' },
  { code: '420', name: 'Česko', flag: '🇨🇿' },
  { code: '45', name: 'Danmark', flag: '🇩🇰' },
  { code: '372', name: 'Eesti', flag: '🇪🇪' },
  { code: '358', name: 'Suomi', flag: '🇫🇮' },
  { code: '33', name: 'France', flag: '🇫🇷' },
  { code: '30', name: 'Ελλάδα', flag: '🇬🇷' },
  { code: '36', name: 'Magyarország', flag: '🇭🇺' },
  { code: '354', name: 'Ísland', flag: '🇮🇸' },
  { code: '39', name: 'Italia', flag: '🇮🇹' },
  { code: '371', name: 'Latvija', flag: '🇱🇻' },
  { code: '370', name: 'Lietuva', flag: '🇱🇹' },
  { code: '352', name: 'Luxembourg', flag: '🇱🇺' },
  { code: '356', name: 'Malta', flag: '🇲🇹' },
  { code: '31', name: 'Nederland', flag: '🇳🇱' },
  { code: '47', name: 'Norge', flag: '🇳🇴' },
  { code: '48', name: 'Polska', flag: '🇵🇱' },
  { code: '351', name: 'Portugal', flag: '🇵🇹' },
  { code: '40', name: 'România', flag: '🇷🇴' },
  { code: '421', name: 'Slovensko', flag: '🇸🇰' },
  { code: '386', name: 'Slovenija', flag: '🇸🇮' },
  { code: '34', name: 'España', flag: '🇪🇸' },
  { code: '46', name: 'Sverige', flag: '🇸🇪' },
  { code: '41', name: 'Schweiz', flag: '🇨🇭' },
  { code: '44', name: 'United Kingdom', flag: '🇬🇧' }
];
