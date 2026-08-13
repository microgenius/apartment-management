// Aidat üretimi ve görev muafiyeti kontrolü.
// Kritik nokta: muafiyet göreve BAŞLADIĞI aydan itibaren işlemeli,
// geçmiş borçları silmemeli.
// Çalıştırmak için:  node --experimental-strip-types src/utils/ledger.test.ts
import assert from 'node:assert/strict';
import { getResidentLedgerWithPlanning, calculateTotalDebt, calculatePayableTotal, sortByOldDoor, oldDoorSortValue } from './helpers.ts';
import type { Resident, ResidentDuty } from '../types/index.ts';

const makeResident = (duty: ResidentDuty | null, dutySince: string | null): Resident => ({
  id: 1,
  door: '19-S',
  name: 'Test Sakin',
  type: 'Ev Sahibi',
  phone: '05555555555',
  status: 'Dolu',
  duty,
  duty_since: dutySince,
  ledger: []
});

const DUE = 100;
const START = '2025-01-01';
const MEETING = '2025-12-31';
// Gecikme faizi bugüne göre işlediği için toplamlar sabit bir "bugün" ile
// hesaplanıyor; aksi halde test duvardaki saate göre farklı sonuç verirdi.
const DONEM_ICI = new Date(2025, 0, 15);

// --- Görevi olmayan sakin: 12 ayın hepsi üretilir ---
const normal = getResidentLedgerWithPlanning(makeResident(null, null), MEETING, 'tr', DUE, START);
assert.equal(normal.length, 12, 'görevsiz sakin için 12 ay üretilmeli');
assert.equal(calculateTotalDebt(normal, DONEM_ICI), 1200);

// --- Yılın başından beri yönetici: hiç aidat üretilmez ---
const fullYear = getResidentLedgerWithPlanning(makeResident('manager', START), MEETING, 'tr', DUE, START);
assert.equal(fullYear.length, 0, 'baştan beri görevdeyse hiç aidat üretilmemeli');
assert.equal(calculateTotalDebt(fullYear, DONEM_ICI), 0);

// --- Temmuz'da göreve başladı: Ocak-Haziran borcu DURMALI, Temmuz'dan sonrası muaf ---
const midYear = getResidentLedgerWithPlanning(makeResident('assistant', '2025-07-01'), MEETING, 'tr', DUE, START);
assert.equal(midYear.length, 6, 'göreve başlamadan önceki 6 ay borç olarak kalmalı');
assert.equal(calculateTotalDebt(midYear, DONEM_ICI), 600);
assert.ok(midYear.every((l) => l.date < '2025-07'), 'Temmuz ve sonrası üretilmemeli');

// --- Ayın ortasında göreve başlamak o ayın tamamını muaf yapar ---
const mid = getResidentLedgerWithPlanning(makeResident('manager', '2025-07-15'), MEETING, 'tr', DUE, START);
assert.equal(mid.length, 6, 'göreve başlanan ay komple muaf sayılmalı');

// --- duty var ama duty_since yoksa muafiyet uygulanmaz (veri eksik, borç silinmez) ---
const noSince = getResidentLedgerWithPlanning(makeResident('manager', null), MEETING, 'tr', DUE, START);
assert.equal(noSince.length, 12, 'duty_since yoksa muafiyet uygulanmamalı');

// --- Kaydedilmiş gerçek borçlar muafiyetten etkilenmez ---
const withReal: Resident = {
  ...makeResident('manager', START),
  ledger: [{ id: 'x', date: '2025-03-01', desc: 'Mart Aidatı', amount: 100, status: 'unpaid' }]
};
const kept = getResidentLedgerWithPlanning(withReal, MEETING, 'tr', DUE, START);
assert.equal(kept.length, 1, 'veritabanındaki gerçek kayıt silinmemeli');
assert.equal(calculateTotalDebt(kept, DONEM_ICI), 100);

console.log('✓ aidat üretimi ve görev muafiyeti kontrolleri geçti');

// --- Eski kapı numarasına göre sıralama ---
// Metin sıralaması "10" < "9" verirdi; sayısal olmalı.
const daireler = [
  { old_door: '9' }, { old_door: '35-36' }, { old_door: '2' },
  { old_door: null }, { old_door: '10' }, { old_door: '1' }
];
assert.deepEqual(
  sortByOldDoor(daireler).map((d) => d.old_door),
  ['1', '2', '9', '10', '35-36', null],
  'sayısal sıralanmalı, numarasızlar sona düşmeli'
);

assert.equal(oldDoorSortValue('35-36'), 35, 'birleşik dairede ilk numara esas');
assert.equal(oldDoorSortValue(null), Number.MAX_SAFE_INTEGER);
assert.equal(oldDoorSortValue(''), Number.MAX_SAFE_INTEGER);
assert.equal(oldDoorSortValue('abc'), Number.MAX_SAFE_INTEGER, 'sayı olmayan sona');

console.log('✓ eski kapı numarası sıralaması geçti');

// --- Peşin ödeme: tahsilat sınırı borç değil, ödenebilir toplam olmalı ---
// Borcu olmayan ama gelecek ayları planlı görünen sakin peşin ödeyebilmeli.
const planli = getResidentLedgerWithPlanning(makeResident(null, null), MEETING, 'tr', DUE, START);
const bugun = new Date();
// Tüm aylar açık olduğu için ödenebilir toplam = 12 ay
assert.equal(calculatePayableTotal(planli, DONEM_ICI), 1200, 'planlı aylar da ödenebilir sayılmalı');

// Kısmi ödenmiş kalemde yalnızca KALAN kısım ödenebilir olmalı
const kismi = [
  { id: 'a', date: '2026-01-01', desc: '', amount: 100, status: 'partial_paid' as const, paid_amount: 40 },
  { id: 'b', date: '2026-02-01', desc: '', amount: 100, status: 'planned' as const, paid_amount: 0 },
  { id: 'c', date: '2025-12-01', desc: '', amount: 100, status: 'paid' as const, paid_amount: 100 }
];
assert.equal(calculatePayableTotal(kismi, new Date(2026, 0, 15)), 160, '60 kalan + 100 planlı; ödenmiş sayılmamalı');
// Borç göstergesi planlıyı saymamalı - kimse geleceğe borçlu değil
assert.equal(calculateTotalDebt(kismi, new Date(2026, 0, 15)), 60, 'borç yalnızca vadesi gelmiş kısım');
void bugun;

console.log('✓ peşin ödeme sınırı kontrolleri geçti');
