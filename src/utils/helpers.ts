// ==========================================
// HELPER FUNCTIONS (Yardımcı Fonksiyonlar)
// ==========================================

import type { Resident, LedgerItem, BaseClasses, Language } from '../types';

/**
 * Ledger kayıtlarından toplam borcu hesaplar
 * @param ledgerItems - Ledger kayıtları (getResidentLedgerWithPlanning'den gelen)
 * @returns Toplam borç miktarı
 */
export const calculateTotalDebt = (
  ledgerItems: LedgerItem[],
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number =>
  ledgerItems
    .filter((item) => item.status === 'unpaid' || item.status === 'partial_paid')
    // remainingOf gecikme faizini de kapsıyor: ana parayı ödeyip faizi
    // ödemeyen kişide borç sıfırlanmıyor
    .reduce((acc, item) => acc + remainingOf(item, today, config), 0);

// ==========================================
// GECİKME FAİZİ
// ==========================================
// Genel kurul kararı: vadesinde ödenmeyen aidata, tolerans süresi dolduktan
// sonra her ay BİLEŞİK faiz işler.
//
// Faiz veritabanında satır olarak TUTULMUYOR, vade tarihinden türetiliyor.
// Sebebi: saklansaydı her ay tüm borçlara faiz ekleyen bir zamanlanmış iş
// gerekirdi; o iş bir ay çalışmazsa ya da iki kez çalışırsa borçlar sessizce
// yanlış olurdu. Türetilen faiz her zaman bugünün tarihine göre doğru.
//
// Oran ve süreler settings tablosundan geliyor (bkz. add_late_fee_settings.sql);
// buradaki değerler yalnızca ayarlar okunamazsa devreye giren yedek.

export interface LateFeeConfig {
  /** Aylık faiz oranı, ondalık olarak (0.05 = %5) */
  rate: number;
  /** Faizsiz ay sayısı. Vade ayı 1. ay sayılır. */
  graceMonths: number;
  /** Ay toleransının üstüne eklenen gün sayısı. */
  graceDays: number;
}

export const DEFAULT_LATE_FEE: LateFeeConfig = {
  rate: 0.05,
  graceMonths: 3,
  graceDays: 10
};

/**
 * "YYYY-MM-DD" metnini YEREL tarihe çevirir.
 *
 * new Date('2026-01-01') bu biçimi UTC olarak ayrıştırıyor; yerel saatle
 * (new Date(2026, 0, 1)) karşılaştırıldığında saat dilimi kadar kayma
 * oluşuyor ve gün hesapları bir gün şaşabiliyor. Faiz başlangıcı güne
 * duyarlı olduğu için burada açıkça yerel ayrıştırma yapılıyor.
 */
const parseLocalDate = (iso: string): Date | null => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** İki tarih arasındaki tam ay farkı. */
const monthsBetween = (from: Date, to: Date): number =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

/**
 * Faizin işlemeye başladığı an.
 *
 * graceMonths vade ayını da sayıyor: 3 ay ise Ocak vadeli borç Nisan başında
 * 4. ayına girer. graceDays bunun üstüne biniyor - üç ayda bir ödeme yapanlar
 * birkaç günlük gecikmeyle faize girmesin diye.
 */
export const lateFeeStartDate = (dueDate: string, config: LateFeeConfig = DEFAULT_LATE_FEE): Date | null => {
  const due = parseLocalDate(dueDate);
  if (!due || Number.isNaN(due.getTime())) return null;
  const start = new Date(due);
  start.setMonth(start.getMonth() + config.graceMonths);
  start.setDate(start.getDate() + config.graceDays);
  return start;
};

/** Faiz işlemiş ay sayısı. Tolerans dolmadıysa 0. */
export const lateFeeMonths = (
  dueDate: string,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number => {
  const start = lateFeeStartDate(dueDate, config);
  if (!start || today < start) return 0;
  return 1 + monthsBetween(start, today);
};

/**
 * Faiz başlamasına kalan gün. Faiz zaten işliyorsa ya da tarih geçersizse
 * null döner. "Faize yaklaşan borç" uyarısı bunu kullanıyor.
 */
export const daysUntilLateFee = (
  dueDate: string,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number | null => {
  const start = lateFeeStartDate(dueDate, config);
  if (!start || today >= start) return null;
  const ms = start.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

/** Faiz dahil borç tutarı (ana para + bileşik faiz). */
export const amountWithLateFee = (
  item: LedgerItem,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number => {
  if (item.status === 'paid' || item.status === 'planned') return item.amount;
  const months = lateFeeMonths(item.date, today, config);
  if (months === 0) return item.amount;
  return item.amount * Math.pow(1 + config.rate, months);
};

/** Yalnızca faiz kısmı (raporlamada ana paradan ayırmak için). */
export const lateFeeOf = (
  item: LedgerItem,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number => amountWithLateFee(item, today, config) - item.amount;

/**
 * Bir kalemden geriye kalan borç: faiz dahil tutardan ödenen düşülür.
 *
 * Kritik nokta: ana parayı ödeyip faizi ödemeyen kişide bu değer sıfırdan
 * büyük kalır, yani borç kapanmış görünmez. Ödemeyi yalnızca ana parayla
 * karşılaştırsaydık faiz sessizce silinirdi.
 */
export const remainingOf = (
  item: LedgerItem,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number => Math.max(0, amountWithLateFee(item, today, config) - (item.paid_amount || 0));

/** Ana parası kapanmış ama faizi ödenmemiş kalem mi? */
export const isFeeOnlyDebt = (
  item: LedgerItem,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): boolean =>
  item.status !== 'paid' &&
  (item.paid_amount || 0) >= item.amount &&
  remainingOf(item, today, config) > 0.005;

/**
 * Ödenebilir toplam: açık borç + henüz vadesi gelmemiş planlı aidatlar.
 *
 * calculateTotalDebt'ten farkı 'planned' kalemleri de saymasıdır. Borç
 * göstergesi için o doğru (kimse geleceğe borçlu değil), ama TAHSİLAT için
 * üst sınır bu olmalı: peşin ödeyen sakinin parası planlı aylara dağıtılıyor.
 * Sınırı buraya koymanın sebebi, planlama ufkunun ötesine ödenen paranın
 * uygulanacak bir kalemi olmaması - kasaya girer ama hiçbir ayı kapatmaz.
 */
export const calculatePayableTotal = (
  ledgerItems: LedgerItem[],
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number =>
  ledgerItems
    .filter((item) => item.status !== 'paid')
    .reduce((acc, item) => acc + remainingOf(item, today, config), 0);

/** Bir sakinin toplam gecikme faizi (ana para hariç). */
export const totalLateFee = (
  ledgerItems: LedgerItem[],
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): number =>
  ledgerItems
    .filter((item) => item.status === 'unpaid' || item.status === 'partial_paid')
    .reduce((acc, item) => acc + Math.max(0, lateFeeOf(item, today, config) - Math.max(0, (item.paid_amount || 0) - item.amount)), 0);

/** Ana parası kapanmış ama faizi ödenmemiş kalemler. */
export const feeOnlyDebts = (
  ledgerItems: LedgerItem[],
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): LedgerItem[] => ledgerItems.filter((item) => isFeeOnlyDebt(item, today, config));

/** Faize girmesine az kalan kalemler (uyarı için). */
export const approachingLateFee = (
  ledgerItems: LedgerItem[],
  withinDays: number,
  today: Date = new Date(),
  config: LateFeeConfig = DEFAULT_LATE_FEE
): { item: LedgerItem; days: number }[] =>
  ledgerItems
    .filter((item) => item.status === 'unpaid' || item.status === 'partial_paid')
    .map((item) => ({ item, days: daysUntilLateFee(item.date, today, config) }))
    .filter((x): x is { item: LedgerItem; days: number } => x.days !== null && x.days <= withinDays)
    .sort((a, b) => a.days - b.days);

/**
 * Sakinin ledger'ını planlı ödemelerle birlikte döndürür
 * @param resident - Sakin bilgisi
 * @param meetingDate - Toplantı tarihi
 * @param lang - Dil seçimi
 * @param monthlyDue - Aylık aidat tutarı (settings'den)
 * @param debtStartDate - Borç hesaplama başlangıç tarihi
 * @returns Tüm ledger kayıtları (mevcut + planlı)
 */
export const getResidentLedgerWithPlanning = (
  resident: Resident,
  meetingDate: string,
  lang: Language,
  monthlyDue: number = 1500,
  debtStartDate: string = '2024-01-01'
): LedgerItem[] => {
  const fullLedger = [...resident.ledger];
  const startDate = new Date(debtStartDate);
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const meeting = new Date(meetingDate);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Yönetici / yardımcısı aidattan muaf - ama yalnızca göreve başladığı aydan
  // itibaren. Görevden önceki aylar normal şekilde borç üretmeye devam eder,
  // aksi halde birini yönetici seçmek geçmiş borcunu da silerdi.
  const exemptFrom = resident.duty && resident.duty_since
    ? new Date(resident.duty_since)
    : null;

  // Start planning from the first day of the debt start date month
  // Add 12 hours to prevent timezone issues with date comparison
  const loopDate = new Date(startYear, startMonth, 1, 12, 0, 0, 0);

  while(loopDate <= meeting) {
    // Use first day of month as the due date
    const dateStr = toLocalISODate(loopDate);
    const yearMonth = dateStr.substring(0, 7); // YYYY-MM format

    // Check if there's already a record for this month
    const existingRecord = fullLedger.find((l) => l.date.startsWith(yearMonth));

    const isExemptMonth = exemptFrom !== null && (
      loopDate.getFullYear() > exemptFrom.getFullYear() ||
      (loopDate.getFullYear() === exemptFrom.getFullYear() && loopDate.getMonth() >= exemptFrom.getMonth())
    );

    if (!existingRecord && !isExemptMonth) {
      // No record exists, create a planned one
      // Name it after the month it falls in (e.g., 2025-12-01 = December dues)
      const monthName = loopDate.toLocaleString(LOCALES[lang] ?? LOCALES.en, { month: 'long', year: 'numeric' });
      const dueName = lang === 'tr' ? 'Aidatı' : lang === 'de' ? 'Hausgeld' : 'Monthly Due';
      // If the month has passed (before current month), mark as unpaid, otherwise planned
      const loopMonth = loopDate.getMonth();
      const loopYear = loopDate.getFullYear();
      const isPast = loopYear < currentYear || (loopYear === currentYear && loopMonth < currentMonth);
      const isCurrent = loopYear === currentYear && loopMonth === currentMonth;
      const status = (isPast || isCurrent) ? 'unpaid' : 'planned';
      
      fullLedger.push({
        id: `plan-${resident.id}-${loopDate.getTime()}`,
        date: dateStr, // First day of month
        desc: `${monthName} ${dueName}`,
        amount: monthlyDue,
        status: status as LedgerItem['status'],
        paid_amount: 0
      });
    }
    
    loopDate.setMonth(loopDate.getMonth() + 1);
  }
  
  return fullLedger;
};

/**
 * Custom sorting function for ledger items
 * Order: unpaid -> partial_paid -> planned -> paid (all by date ascending within each group)
 * @param items - Ledger items to sort
 * @returns Sorted ledger items
 */
export const sortLedgerItems = (items: LedgerItem[]): LedgerItem[] => {
  const statusOrder: Record<LedgerItem['status'], number> = {
    unpaid: 1,
    partial_paid: 2,
    planned: 3,
    paid: 4
  };
  
  return [...items].sort((a, b) => {
    // First sort by status priority
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Within same status, sort by date ascending (oldest first)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

/**
 * Dark mode'a göre base CSS classlarını oluşturur
 * @param darkMode - Dark mode aktif mi?
 * @returns Base CSS class nesnesi
 */
export const getBaseClasses = (darkMode: boolean): BaseClasses => ({
  bgMain: darkMode ? 'bg-slate-900' : 'bg-slate-100',
  bgCard: darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
  textMain: darkMode ? 'text-slate-100' : 'text-slate-800',
  textSub: darkMode ? 'text-slate-400' : 'text-slate-600',
  border: darkMode ? 'border-slate-700' : 'border-slate-200',
  input: darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900',
  sidebar: darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100',
  header: darkMode ? 'bg-slate-800 shadow-slate-900/20' : 'bg-white shadow-sm',
  hover: darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
});

/**
 * Tarihi YYYY-MM-DD olarak, KULLANICININ YEREL gününe göre verir.
 *
 * toISOString() kullanmayın: o UTC'ye çevirir. Türkiye UTC+3 olduğu için
 * gece 00:00-03:00 arasında bir önceki günü döndürür ve kayıtlara yanlış
 * tarih yazılır. Almanya/İrlanda için de yaz saatinde aynı risk var.
 */
export const toLocalISODate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Bugünün yerel tarihi (YYYY-MM-DD). */
export const todayISO = (): string => toLocalISODate(new Date());

/**
 * Dil seçimine karşılık gelen ülke telefon kodu.
 * Kullanıcı kitlesi: Türkiye (tr), Almanya (de), İrlanda (en).
 * Kullanıcı numarayı "+" ile yazarsa bu varsayılan devre dışı kalır.
 */
export const DIAL_CODES: Record<Language, string> = {
  tr: '90',
  de: '49',
  en: '353' // İrlanda
};

/**
 * Dil seçimine karşılık gelen tarih/sayı yerel ayarı.
 */
export const LOCALES: Record<Language, string> = {
  tr: 'tr-TR',
  de: 'de-DE',
  en: 'en-IE' // İrlanda: gün/ay/yıl, en-US'ten farklı
};

/**
 * Eski kapı numarasının sıralama değeri. Numara metin olarak tutuluyor
 * ("32", "35-36") ama sıralama sayısal olmalı - aksi halde "10" < "9" çıkar.
 * Birleşik dairelerde ilk numara esas alınır ("35-36" -> 35).
 * Eski numarası olmayan daireler sona düşer.
 */
export const oldDoorSortValue = (oldDoor: string | null | undefined): number => {
  const n = parseInt(String(oldDoor ?? ''), 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};

/** Daireleri eski kapı numarasına göre sayısal sıralar. */
export const sortByOldDoor = <T extends { old_door: string | null }>(items: T[]): T[] =>
  [...items].sort((a, b) => oldDoorSortValue(a.old_door) - oldDoorSortValue(b.old_door));

/**
 * Telefonla giriş için üretilen teknik e-posta alan adı.
 *
 * Supabase telefonla kaydı ("Phone signups are disabled") yalnızca bir SMS
 * sağlayıcısı bağlanmışsa açıyor; bizim kullanım şeklimizde OTP yok, şifreyi
 * yönetici belirliyor ve SMS göndermek istemiyoruz (ücretli + Türkiye A2P
 * mevzuatı). Bu yüzden numaradan sabit bir e-posta üretip Supabase'in
 * e-posta+şifre akışını kullanıyoruz.
 *
 * Bu adrese hiç posta gönderilmez, kullanıcı görmez. Gerçek numara
 * user_profiles.phone alanında insan tarafından okunabilir halde durur.
 */
export const PHONE_LOGIN_DOMAIN = 'phone.aksoysitesi.com';

/**
 * Telefon numarasını giriş için kullanılan teknik e-postaya çevirir.
 * Aynı numara her zaman aynı adrese çözülmeli: kayıt ve giriş bu eşlemenin
 * kararlı olmasına dayanıyor.
 *   "0532 123 45 67" + 90 -> "905321234567@phone.aksoysitesi.com"
 * Numara çözülemezse null döner.
 */
export const phoneToLoginEmail = (phone: string, dialCode?: string): string | null => {
  const e164 = toE164(phone, dialCode);
  if (!e164) return null;
  return `${e164.slice(1)}@${PHONE_LOGIN_DOMAIN}`;
};

/** Bir e-postanın telefondan üretilmiş teknik adres olup olmadığı. */
export const isPhoneLoginEmail = (email: string | null | undefined): boolean =>
  !!email && email.endsWith(`@${PHONE_LOGIN_DOMAIN}`);

/**
 * Girdinin email mi telefon mu olduğunu ayırt eder.
 * Supabase signInWithPassword email ve telefonu ayrı alanlarda bekliyor.
 */
export const isEmail = (input: string): boolean => input.includes('@');

// E.164 en fazla 15 hane; alt sınır kısa/eksik girdileri elemek için
const isValidE164Length = (digits: string) => digits.length >= 8 && digits.length <= 15;

/**
 * Telefon numarasını Supabase'in beklediği E.164 formatına çevirir.
 * Ülkeye özel hane sayısı varsaymaz - kural aynı: baştaki şehirlerarası "0"
 * atılır, yerine ülke kodu gelir.
 *   TR "0507 231 84 20"  + dialCode 90  -> +905072318420
 *   DE "0151 23456789"   + dialCode 49  -> +4915123456789
 *   IE "085 123 4567"    + dialCode 353 -> +353851234567
 *
 * Kullanıcı ülke kodunu kendi yazdıysa dialCode yok sayılır. İki biçim de
 * kabul edilir ve Avrupa'daki her ülke kodu için çalışır:
 *   "+49 151 23456789"  -> +4915123456789
 *   "0049 151 23456789" -> +4915123456789   (00 = uluslararası önek)
 *
 * Çevrilemeyen girdide null döner - sessizce yanlış numara üretmez.
 */
export const toE164 = (input: string, dialCode: string = DIAL_CODES.tr): string | null => {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // Ülke kodu açıkça yazılmışsa olduğu gibi kabul et: "+49..." veya "0049..."
  if (trimmed.startsWith('+')) return isValidE164Length(digits) ? `+${digits}` : null;
  if (digits.startsWith('00')) {
    const international = digits.slice(2);
    return isValidE164Length(international) ? `+${international}` : null;
  }

  // Baştaki rakamlar ülke koduna benziyor diye kırpmak tek başına güvenli değil:
  // bazı milli numaralar kendi ülke koduyla başlar (İtalyan cep "391 234 5678").
  // Sadece uzunluk gerçekten ülke kodu + milli numara olacak kadar fazlaysa kırp;
  // aksi halde numarayı olduğu gibi milli numara say.
  const looksPrefixed =
    digits.startsWith(dialCode) && digits.length >= dialCode.length + 9;

  const national = digits.startsWith('0')
    ? digits.slice(1)
    : looksPrefixed
      ? digits.slice(dialCode.length)
      : digits;

  const full = `${dialCode}${national}`;
  return isValidE164Length(full) ? `+${full}` : null;
};

/**
 * Çeviri fonksiyonu oluşturur
 * @param translations - Çeviri objesi
 * @param lang - Dil
 * @returns Çeviri fonksiyonu
 */
export const createTranslator = (translations: Record<string, Record<string, string>>, lang: string) => {
  return (key: string): string => translations[lang]?.[key] || key;
};
