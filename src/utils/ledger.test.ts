// Aidat üretimi ve görev muafiyeti kontrolü.
// Kritik nokta: muafiyet göreve BAŞLADIĞI aydan itibaren işlemeli,
// geçmiş borçları silmemeli.
// Çalıştırmak için:  node --experimental-strip-types src/utils/ledger.test.ts
import assert from 'node:assert/strict';
import { getResidentLedgerWithPlanning, calculateTotalDebt, sortByOldDoor, oldDoorSortValue } from './helpers.ts';
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

// --- Görevi olmayan sakin: 12 ayın hepsi üretilir ---
const normal = getResidentLedgerWithPlanning(makeResident(null, null), MEETING, 'tr', DUE, START);
assert.equal(normal.length, 12, 'görevsiz sakin için 12 ay üretilmeli');
assert.equal(calculateTotalDebt(normal), 1200);

// --- Yılın başından beri yönetici: hiç aidat üretilmez ---
const fullYear = getResidentLedgerWithPlanning(makeResident('manager', START), MEETING, 'tr', DUE, START);
assert.equal(fullYear.length, 0, 'baştan beri görevdeyse hiç aidat üretilmemeli');
assert.equal(calculateTotalDebt(fullYear), 0);

// --- Temmuz'da göreve başladı: Ocak-Haziran borcu DURMALI, Temmuz'dan sonrası muaf ---
const midYear = getResidentLedgerWithPlanning(makeResident('assistant', '2025-07-01'), MEETING, 'tr', DUE, START);
assert.equal(midYear.length, 6, 'göreve başlamadan önceki 6 ay borç olarak kalmalı');
assert.equal(calculateTotalDebt(midYear), 600);
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
assert.equal(calculateTotalDebt(kept), 100);

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
