// Kasa toplamları ve tarih filtresi kontrolü - para hesabı, tek yerde tutulmalı.
// Çalıştırmak için:  node --experimental-strip-types src/utils/transactions.test.ts
import assert from 'node:assert/strict';
import { sumTransactions, filterByDateRange } from './transactions.ts';
import type { Transaction } from '../services/transactionsService.ts';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 1, type: 'income', amount: 100, description: '', date: '2026-08-01',
  source: 'manual', resident_id: null, created_by: null,
  created_at: '', updated_at: '', ...over
});

const items = [
  tx({ id: 1, type: 'income', amount: 1000, date: '2026-08-01' }),
  tx({ id: 2, type: 'income', amount: 500, date: '2026-08-15' }),
  tx({ id: 3, type: 'expense', amount: 2600, date: '2026-08-10' }),
  tx({ id: 4, type: 'expense', amount: 400, date: '2026-09-01' })
];

const { income, expense, balance } = sumTransactions(items);
assert.equal(income, 1500);
assert.equal(expense, 3000);
assert.equal(balance, -1500, 'gider gelirden fazlaysa bakiye eksi olmalı');

// Supabase NUMERIC alanları metin olarak dönebiliyor; toplama yine sayısal olmalı
const asText = [tx({ amount: '1000' as unknown as number }), tx({ amount: '500' as unknown as number })];
assert.equal(sumTransactions(asText).income, 1500, 'metin gelen tutarlar birleştirilmemeli');

// Tarih aralığı - sınırlar dahil
assert.equal(filterByDateRange(items, '2026-08-01', '2026-08-31').length, 3);
assert.equal(filterByDateRange(items, '2026-08-10', '2026-08-10').length, 1, 'tek gün, sınırlar dahil');
assert.equal(filterByDateRange(items, '', '').length, 4, 'boş aralık hepsini döndürmeli');
assert.equal(filterByDateRange(items, '2026-09-01', '').length, 1, 'yalnızca alt sınır');

console.log('✓ kasa toplamı ve tarih filtresi kontrolleri geçti');
