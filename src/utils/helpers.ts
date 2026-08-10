// ==========================================
// HELPER FUNCTIONS (Yardımcı Fonksiyonlar)
// ==========================================

import type { Resident, LedgerItem, BaseClasses, Language } from '../types';

/**
 * Ledger kayıtlarından toplam borcu hesaplar
 * @param ledgerItems - Ledger kayıtları (getResidentLedgerWithPlanning'den gelen)
 * @returns Toplam borç miktarı
 */
export const calculateTotalDebt = (ledgerItems: LedgerItem[]): number => {
  return ledgerItems
    .filter((item) => item.status === 'unpaid' || item.status === 'partial_paid')
    .reduce((acc, item) => {
      if (item.status === 'partial_paid') {
        // For partial payments, calculate remaining amount
        const remaining = item.amount - (item.paid_amount || 0);
        return acc + remaining;
      }
      return acc + item.amount;
    }, 0);
};

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
  let fullLedger = [...resident.ledger];
  const startDate = new Date(debtStartDate);
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const meeting = new Date(meetingDate);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Start planning from the first day of the debt start date month
  // Add 12 hours to prevent timezone issues with date comparison
  let loopDate = new Date(startYear, startMonth, 1, 12, 0, 0, 0);
  
  while(loopDate <= meeting) {
    // Use first day of month as the due date
    const dateStr = loopDate.toISOString().split('T')[0];
    const yearMonth = dateStr.substring(0, 7); // YYYY-MM format
    
    // Check if there's already a record for this month
    const existingRecord = fullLedger.find((l) => l.date.startsWith(yearMonth));
    
    if (!existingRecord) {
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
