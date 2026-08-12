import React from 'react';
import type { Transaction } from '../services/transactionsService';
import { sumTransactions } from '../utils/transactions';
import { LOCALES } from '../utils/helpers';
import type { Language } from '../types';

export type ReportTemplate = 'summary' | 'ledger';

interface Props {
  items: Transaction[];
  from: string;
  to: string;
  template: ReportTemplate;
  buildingName: string;
  t: (key: string) => string;
  lang: Language;
}

const money = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aynı açıklamaya sahip kayıtları tek satırda toplar (özet rapor için). */
const groupByDescription = (items: Transaction[]) => {
  const groups = new Map<string, number>();
  items.forEach((item) => {
    const key = item.description.trim() || '-';
    groups.set(key, (groups.get(key) ?? 0) + Number(item.amount));
  });
  return [...groups.entries()]
    .map(([description, amount]) => ({ description, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Yazdırılabilir rapor. İki şablon:
 *  - summary: gelirler ve giderler alt alta, açıklamaya göre toplanmış özet
 *  - ledger:  işletme hesabı defteri; gelir ve gider AYRI sayfalarda, kalem kalem
 *
 * Ekranda önizleme olarak da gösteriliyor; yazdırmada index.css'teki
 * .print-area kuralları sayfanın geri kalanını gizliyor.
 */
export const FinanceReport: React.FC<Props> = ({
  items, from, to, template, buildingName, t, lang
}) => {
  const incomes = items.filter((x) => x.type === 'income');
  const expenses = items.filter((x) => x.type === 'expense');
  const totals = sumTransactions(items);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(LOCALES[lang]);
  const period = from || to
    ? `${from ? fmtDate(from) : '…'} - ${to ? fmtDate(to) : '…'}`
    : t('all_time');

  const cell = 'border border-black px-2 py-1';
  const num = `${cell} text-right whitespace-nowrap`;

  if (template === 'summary') {
    const expenseGroups = groupByDescription(expenses);

    // Özet tabloda aidatlar TEK satır: kim ne ödedi dökümü bu raporun konusu
    // değil, o bilgi işletme hesabı defterinde kalem kalem duruyor.
    const duesSum = incomes
      .filter((x) => x.source === 'dues')
      .reduce((acc, x) => acc + Number(x.amount), 0);
    const otherIncomes = incomes.filter((x) => x.source !== 'dues');
    const incomeGroups = [
      ...(duesSum > 0 ? [{ description: t('site_dues'), amount: duesSum }] : []),
      ...groupByDescription(otherIncomes)
    ];

    return (
      <div className="text-black text-[13px]">
        <h2 className="text-center font-bold text-base mb-4">
          {buildingName} — {period} {t('report_period_title')}
        </h2>

        {/* Giderler */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr>
              <th className={`${cell} w-10 text-left`}>#</th>
              <th className={`${cell} text-left`}>{t('expenses')}</th>
              <th className={`${cell} w-36 text-right`}>{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {expenseGroups.map((g, i) => (
              <tr key={g.description}>
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{g.description}</td>
                <td className={num}>{money(g.amount)}</td>
              </tr>
            ))}
            {expenseGroups.length === 0 && (
              <tr><td className={cell} colSpan={3}>{t('no_records')}</td></tr>
            )}
            <tr className="font-bold">
              <td className={cell}></td>
              <td className={cell}>{t('total_expense')}</td>
              <td className={num}>{money(totals.expense)}</td>
            </tr>
          </tbody>
        </table>

        {/* Gelirler */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cell} w-10 text-left`}>#</th>
              <th className={`${cell} text-left`}>{t('incomes')}</th>
              <th className={`${cell} w-36 text-right`}>{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {incomeGroups.map((g, i) => (
              <tr key={g.description}>
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{g.description}</td>
                <td className={num}>{money(g.amount)}</td>
              </tr>
            ))}
            {incomeGroups.length === 0 && (
              <tr><td className={cell} colSpan={3}>{t('no_records')}</td></tr>
            )}
            <tr className="font-bold">
              <td className={cell}></td>
              <td className={cell}>{t('total_income')}</td>
              <td className={num}>{money(totals.income)}</td>
            </tr>
            <tr>
              <td className={cell}></td>
              <td className={cell}>{t('total_expense')}</td>
              <td className={num}>{money(totals.expense)}</td>
            </tr>
            <tr className="font-bold">
              <td className={cell}></td>
              <td className={cell}>{t('balance')}</td>
              <td className={num}>{money(totals.balance)}</td>
            </tr>
          </tbody>
        </table>

        {/* İmza alanı - kağıt raporda denetçi imzalıyor */}
        <div className="mt-12 flex justify-between">
          <div>
            <p>{t('auditor')}</p>
            <div className="mt-10 w-56 border-t border-black" />
          </div>
          <div>
            <p>{t('manager_title')}</p>
            <div className="mt-10 w-56 border-t border-black" />
          </div>
        </div>
      </div>
    );
  }

  // İşletme Hesabı Defteri: gelir ve gider ayrı sayfalarda
  const ledgerPage = (rows: Transaction[], heading: string, total: number, position: 'first' | 'second') => (
    <div className={position === 'first' ? 'print-page-break' : 'print-page-start'}>
      <h2 className="text-center font-bold text-base">{t('operating_ledger')}</h2>
      <h3 className="text-center font-bold mb-1">{heading}</h3>
      <p className="text-center text-[11px] mb-3">{buildingName} — {period}</p>

      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className={`${cell} w-12`}>{t('row_no')}</th>
            <th className={`${cell} w-28`}>{t('date')}</th>
            <th className={`${cell} w-24`}>{t('document_no')}</th>
            <th className={`${cell} text-left`}>{t('desc')}</th>
            <th className={`${cell} w-32 text-right`}>{t('amount')} (₺)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={item.id}>
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={`${cell} text-center`}>{fmtDate(item.date)}</td>
              {/* Belge numarası sistemde tutulmuyor; elle doldurulmak üzere boş */}
              <td className={cell}></td>
              <td className={cell}>{item.description}</td>
              <td className={num}>{money(Number(item.amount))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className={cell} colSpan={5}>{t('no_records')}</td></tr>
          )}
          <tr className="font-bold">
            <td className={cell} colSpan={4}>{t('total')}</td>
            <td className={num}>{money(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="text-black text-[13px]">
      {ledgerPage(incomes, t('income').toUpperCase(), totals.income, 'first')}
      {ledgerPage(expenses, t('expense').toUpperCase(), totals.expense, 'second')}
    </div>
  );
};
