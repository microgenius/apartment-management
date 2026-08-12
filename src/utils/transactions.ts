// Kasa hesapları. Supabase'e bağımlı değil: para hesabı tek yerde ve
// bağımsız test edilebilir olsun diye servisten ayrı tutuluyor.
import type { Transaction } from '../services/transactionsService';

/** Gelir, gider ve bakiye toplamları. */
export const sumTransactions = (items: Transaction[]) => {
  const income = items
    .filter((x) => x.type === 'income')
    .reduce((acc, x) => acc + Number(x.amount), 0);
  const expense = items
    .filter((x) => x.type === 'expense')
    .reduce((acc, x) => acc + Number(x.amount), 0);
  return { income, expense, balance: income - expense };
};

/** Tarih aralığına göre filtreler; sınırlar dahil, boş bırakılan uç serbest. */
export const filterByDateRange = (items: Transaction[], from: string, to: string) =>
  items.filter((x) => (!from || x.date >= from) && (!to || x.date <= to));
