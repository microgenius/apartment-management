// Gecikme faizi kontrolü. Bileşik faiz gözle doğrulanamaz, hesabın
// doğruluğu buradan takip ediliyor.
// Çalıştırmak için:  node --experimental-strip-types src/utils/latefee.test.ts
import assert from 'node:assert/strict';
import {
  lateFeeMonths, amountWithLateFee, lateFeeOf, remainingOf, isFeeOnlyDebt,
  LATE_FEE_GRACE_MONTHS, LATE_FEE_MONTHLY_RATE
} from './helpers.ts';
import type { LedgerItem } from '../types/index.ts';

const item = (over: Partial<LedgerItem>): LedgerItem => ({
  id: 'x', date: '2026-01-01', desc: 'Ocak Aidatı',
  amount: 300, status: 'unpaid', paid_amount: 0, ...over
});

const yakin = (a: number, b: number, msg: string) =>
  assert.ok(Math.abs(a - b) < 0.01, `${msg} (${a.toFixed(2)} != ${b.toFixed(2)})`);

// --- Tolerans süresi: ilk 3 ay faiz yok ---
assert.equal(LATE_FEE_GRACE_MONTHS, 3);
assert.equal(LATE_FEE_MONTHLY_RATE, 0.05);

// Ocak vadeli borç: Ocak 1., Şubat 2., Mart 3. ay -> faizsiz. Nisan 4. ay -> faiz.
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 0, 15)), 0, 'Ocak (1. ay)');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 1, 15)), 0, 'Şubat (2. ay)');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 2, 15)), 0, 'Mart (3. ay) hâlâ faizsiz');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 3, 15)), 1, 'Nisan (4. ay) ilk faiz');
assert.equal(lateFeeMonths('2026-01-01', new Date(2026, 5, 15)), 3, 'Haziran (6. ay) 3 kez faiz');

// --- Bileşik faiz: her ay önceki tutar üzerinden ---
const ocak = item({});
yakin(amountWithLateFee(ocak, new Date(2026, 2, 15)), 300, 'Mart: faiz yok');
yakin(amountWithLateFee(ocak, new Date(2026, 3, 15)), 315, 'Nisan: 300 x 1.05');
yakin(amountWithLateFee(ocak, new Date(2026, 4, 15)), 330.75, 'Mayıs: bileşik');
yakin(amountWithLateFee(ocak, new Date(2026, 5, 15)), 347.2875, 'Haziran: bileşik');
yakin(lateFeeOf(ocak, new Date(2026, 5, 15)), 47.2875, 'yalnızca faiz kısmı');

// --- Ödenmiş ve planlı kalemlere faiz işlemez ---
yakin(amountWithLateFee(item({ status: 'paid', paid_amount: 300 }), new Date(2027, 0, 1)), 300, 'ödenmişe faiz yok');
yakin(amountWithLateFee(item({ status: 'planned' }), new Date(2027, 0, 1)), 300, 'planlıya faiz yok');

// --- ANA BORÇ ÖDENDİ, FAİZ KALDI ---
// Asıl önemli senaryo: 300 TL ana parayı ödeyen ama faizi ödemeyen kişide
// borç kapanmış GÖRÜNMEMELİ.
const anaParaOdenmis = item({ status: 'partial_paid', paid_amount: 300 });
const haziran = new Date(2026, 5, 15);
yakin(remainingOf(anaParaOdenmis, haziran), 47.2875, 'faiz borcu duruyor');
assert.equal(isFeeOnlyDebt(anaParaOdenmis, haziran), true, 'faiz borcu olarak işaretlenmeli');

// Faizi de ödeyince kapanmalı
const tamOdenmis = item({ status: 'partial_paid', paid_amount: 347.2875 });
yakin(remainingOf(tamOdenmis, haziran), 0, 'tamamı ödenince borç kalmaz');
assert.equal(isFeeOnlyDebt(tamOdenmis, haziran), false);

// Tolerans içindeyken ana parayı ödeyen faiz borçlusu sayılmamalı
const erkenOdenmis = item({ status: 'partial_paid', paid_amount: 300 });
assert.equal(isFeeOnlyDebt(erkenOdenmis, new Date(2026, 2, 15)), false, 'faiz işlememişken borç yok');

// Kısmi ödeme: ana paranın bir kısmı ödenmişse faiz borcu sayılmaz
const kismi = item({ status: 'partial_paid', paid_amount: 100 });
assert.equal(isFeeOnlyDebt(kismi, haziran), false, 'ana para bitmemiş, faiz borcu değil');
yakin(remainingOf(kismi, haziran), 247.2875, 'kalan = faizli tutar - ödenen');

console.log('✓ gecikme faizi kontrolleri geçti');
