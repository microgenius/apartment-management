// Gecikme faizi kontrolü. Bileşik faiz gözle doğrulanamaz, hesabın
// doğruluğu buradan takip ediliyor.
// Çalıştırmak için:  node --experimental-strip-types src/utils/latefee.test.ts
import assert from 'node:assert/strict';
import {
  lateFeeMonths, amountWithLateFee, lateFeeOf, remainingOf, isFeeOnlyDebt,
  lateFeeStartDate, daysUntilLateFee, approachingLateFee, DEFAULT_LATE_FEE,
  type LateFeeConfig
} from './helpers.ts';
import type { LedgerItem } from '../types/index.ts';

const item = (over: Partial<LedgerItem>): LedgerItem => ({
  id: 'x', date: '2026-01-01', desc: 'Ocak Aidatı',
  amount: 300, status: 'unpaid', paid_amount: 0, ...over
});

const yakin = (a: number, b: number, msg: string) =>
  assert.ok(Math.abs(a - b) < 0.01, `${msg} (${a.toFixed(2)} != ${b.toFixed(2)})`);

// Gün toleransı olmadan: eski davranış (ay sınırında başlar)
const AYSIZ: LateFeeConfig = { rate: 0.05, graceMonths: 3, graceDays: 0 };

// --- Tolerans süresi ---
// Ocak vadeli borç: Ocak 1., Şubat 2., Mart 3. ay -> faizsiz. Nisan 4. ay -> faiz.
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 0, 15), AYSIZ), 0, 'Ocak (1. ay)');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 1, 15), AYSIZ), 0, 'Şubat (2. ay)');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 2, 15), AYSIZ), 0, 'Mart (3. ay) hâlâ faizsiz');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 3, 15), AYSIZ), 1, 'Nisan (4. ay) ilk faiz');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 5, 15), AYSIZ), 3, 'Haziran (6. ay) 3 kez faiz');

// --- Bileşik faiz: her ay önceki tutar üzerinden ---
const ocak = item({});
yakin(amountWithLateFee(ocak, new Date(2026, 2, 15), AYSIZ), 300, 'Mart: faiz yok');
yakin(amountWithLateFee(ocak, new Date(2026, 3, 15), AYSIZ), 315, 'Nisan: 300 x 1.05');
yakin(amountWithLateFee(ocak, new Date(2026, 4, 15), AYSIZ), 330.75, 'Mayıs: bileşik');
yakin(amountWithLateFee(ocak, new Date(2026, 5, 15), AYSIZ), 347.2875, 'Haziran: bileşik');
yakin(lateFeeOf(ocak, new Date(2026, 5, 15), AYSIZ), 47.2875, 'yalnızca faiz kısmı');

// --- Ödenmiş ve planlı kalemlere faiz işlemez ---
yakin(amountWithLateFee(item({ status: 'paid', paid_amount: 300 }), new Date(2027, 0, 1), AYSIZ), 300, 'ödenmişe faiz yok');
yakin(amountWithLateFee(item({ status: 'planned' }), new Date(2027, 0, 1), AYSIZ), 300, 'planlıya faiz yok');

// --- ANA BORÇ ÖDENDİ, FAİZ KALDI ---
// Asıl önemli senaryo: 300 TL ana parayı ödeyen ama faizi ödemeyen kişide
// borç kapanmış GÖRÜNMEMELİ.
const anaParaOdenmis = item({ status: 'partial_paid', paid_amount: 300 });
const haziran = new Date(2026, 5, 15);
yakin(remainingOf(anaParaOdenmis, haziran, AYSIZ), 47.2875, 'faiz borcu duruyor');
assert.equal(isFeeOnlyDebt(anaParaOdenmis, haziran, AYSIZ), true, 'faiz borcu olarak işaretlenmeli');

// Faizi de ödeyince kapanmalı
const tamOdenmis = item({ status: 'partial_paid', paid_amount: 347.2875 });
yakin(remainingOf(tamOdenmis, haziran, AYSIZ), 0, 'tamamı ödenince borç kalmaz');
assert.equal(isFeeOnlyDebt(tamOdenmis, haziran, AYSIZ), false);

// Tolerans içindeyken ana parayı ödeyen faiz borçlusu sayılmamalı
const erkenOdenmis = item({ status: 'partial_paid', paid_amount: 300 });
assert.equal(isFeeOnlyDebt(erkenOdenmis, new Date(2026, 2, 15), AYSIZ), false, 'faiz işlememişken borç yok');

// Kısmi ödeme: ana paranın bir kısmı ödenmişse faiz borcu sayılmaz
const kismi = item({ status: 'partial_paid', paid_amount: 100 });
assert.equal(isFeeOnlyDebt(kismi, haziran, AYSIZ), false, 'ana para bitmemiş, faiz borcu değil');
yakin(remainingOf(kismi, haziran, AYSIZ), 247.2875, 'kalan = faizli tutar - ödenen');

// --- 10 GÜNLÜK EK TOLERANS ---
// Aidatını üç ayda bir ödeyenler birkaç günlük gecikmeyle faize girmesin.
// Varsayılan yapılandırma: 3 ay + 10 gün.
const varsayilan = DEFAULT_LATE_FEE;
assert.equal(varsayilan.graceDays, 10);

// Ocak vadeli borç: faiz 11 Nisan'da başlar, 1 Nisan'da değil
const baslangic = lateFeeStartDate('2026-01-01', varsayilan)!;
assert.equal(baslangic.getMonth(), 3, 'Nisan');
assert.equal(baslangic.getDate(), 11, "ayın 11'i");

assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 3, 5), varsayilan), 0,
  '5 Nisan: tolerans içinde, memur henüz faize girmedi');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 3, 10), varsayilan), 0,
  '10 Nisan: son gün, hâlâ faizsiz');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 3, 15), varsayilan), 1,
  '15 Nisan: tolerans doldu, faiz başladı');
yakin(amountWithLateFee(ocak, new Date(2026, 3, 5), varsayilan), 300, 'toleransta tutar artmaz');
yakin(amountWithLateFee(ocak, new Date(2026, 3, 15), varsayilan), 315, 'tolerans sonrası ilk faiz');

// --- FAİZE YAKLAŞAN BORÇ ---
assert.equal(daysUntilLateFee('2026-01-01', new Date(2026, 3, 1), varsayilan), 10, '10 gün kaldı');
assert.equal(daysUntilLateFee('2026-01-01', new Date(2026, 3, 15), varsayilan), null,
  'faiz zaten işliyorsa uyarı yok');

const yaklasan = approachingLateFee([ocak], 15, new Date(2026, 3, 1), varsayilan);
assert.equal(yaklasan.length, 1, 'uyarı listesinde olmalı');
assert.equal(yaklasan[0].days, 10);

// Daha erken bir tarihte uyarı penceresinin dışında
assert.equal(approachingLateFee([ocak], 15, new Date(2026, 0, 5), varsayilan).length, 0,
  'çok erken, henüz uyarma');

// Ödenmiş kalem uyarılmaz
assert.equal(
  approachingLateFee([item({ status: 'paid', paid_amount: 300 })], 15, new Date(2026, 3, 1), varsayilan).length,
  0, 'ödenmiş kalem uyarılmaz'
);

console.log('✓ gecikme faizi kontrolleri geçti (tolerans ve uyarı dahil)');
