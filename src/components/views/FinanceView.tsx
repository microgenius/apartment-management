import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, FileText, Loader2, X, Printer } from 'lucide-react';
import type { FinanceViewProps } from '../../types';
import { transactionsService, type Transaction, type TransactionType } from '../../services/transactionsService';
import { sumTransactions, filterByDateRange } from '../../utils/transactions';
import { LOCALES, todayISO } from '../../utils/helpers';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ErrorModal } from '../modals/ErrorModal';

const money = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions, refetchTransactions, baseClasses, currentTheme, t, darkMode, lang
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  // Rapor
  const [reportOpen, setReportOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const totals = useMemo(() => sumTransactions(transactions), [transactions]);
  const reportItems = useMemo(
    () => filterByDateRange(transactions, from, to),
    [transactions, from, to]
  );
  const reportTotals = useMemo(() => sumTransactions(reportItems), [reportItems]);

  const incomes = transactions.filter((x) => x.type === 'income');
  const expenses = transactions.filter((x) => x.type === 'expense');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('amount_invalid') });
      return;
    }
    if (!description.trim()) {
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('description_required') });
      return;
    }

    setSaving(true);
    try {
      await transactionsService.create({ type, amount: value, description: description.trim(), date });
      setAmount('');
      setDescription('');
      refetchTransactions();
    } catch (err) {
      console.error('Error creating transaction:', err);
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('transaction_save_failed') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Transaction) => {
    try {
      await transactionsService.delete(item.id);
      refetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('delete_failed') });
    }
  };

  const list = (items: Transaction[], color: string) => (
    <ul className="space-y-2 max-h-80 overflow-y-auto">
      {items.length === 0 && <li className={`text-sm ${baseClasses.textSub}`}>{t('no_records')}</li>}
      {items.map((item) => (
        <li key={item.id} className={`flex items-start justify-between gap-2 border-b pb-2 ${baseClasses.border}`}>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${baseClasses.textMain}`}>{item.description}</p>
            <p className={`text-xs ${baseClasses.textSub}`}>
              {new Date(item.date).toLocaleDateString(LOCALES[lang])}
              {item.source === 'dues' && ` · ${t('auto_record')}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-bold ${color}`}>{money(Number(item.amount))}</span>
            {/* Otomatik aidat kayıtları elle silinmiyor: karşılığı ledgers'ta
                duruyor, buradan silmek kasayı tahsilat kaydıyla çelişkiye sokar */}
            {item.source === 'manual' && (
              <button onClick={() => setConfirmDelete(item)} aria-label={t('delete')} className="text-slate-400 hover:text-red-500">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-4 animate-fade-in space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className={`text-2xl font-bold ${baseClasses.textMain} flex items-center`}>
          <Wallet className={`mr-2 ${currentTheme.text}`} /> {t('finance')}
        </h2>
        <button
          onClick={() => setReportOpen(true)}
          className={`${currentTheme.primary} text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90`}
        >
          <FileText size={18} /> {t('create_report')}
        </button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border ${baseClasses.bgCard}`}>
          <p className={`text-sm ${baseClasses.textSub}`}>{t('total_income')}</p>
          <p className="text-2xl font-bold text-green-600">{money(totals.income)}</p>
        </div>
        <div className={`p-5 rounded-xl border ${baseClasses.bgCard}`}>
          <p className={`text-sm ${baseClasses.textSub}`}>{t('total_expense')}</p>
          <p className="text-2xl font-bold text-red-500">{money(totals.expense)}</p>
        </div>
        <div className={`p-5 rounded-xl border ${baseClasses.bgCard}`}>
          <p className={`text-sm ${baseClasses.textSub}`}>{t('balance')}</p>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {money(totals.balance)}
          </p>
        </div>
      </div>

      {/* Yeni kayıt */}
      <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
        <h3 className={`font-bold mb-4 flex items-center ${baseClasses.textMain}`}>
          <Plus size={18} className="mr-2" /> {t('add_transaction')}
        </h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className={`p-3 rounded-lg border outline-none ${baseClasses.input}`}
          >
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income')}</option>
          </select>
          <input
            type="number" step="0.01" min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('amount')}
            className={`p-3 rounded-lg border outline-none ${baseClasses.input}`}
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('transaction_desc_placeholder')}
            className={`md:col-span-2 p-3 rounded-lg border outline-none ${baseClasses.input}`}
            required
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`flex-1 p-3 rounded-lg border outline-none ${baseClasses.input}`}
            />
            <button
              type="submit" disabled={saving}
              className={`${currentTheme.primary} text-white px-4 rounded-lg font-medium disabled:opacity-50`}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : t('add')}
            </button>
          </div>
        </form>
      </div>

      {/* Listeler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold flex items-center ${baseClasses.textMain}`}>
              <TrendingUp size={18} className="mr-2 text-green-600" /> {t('income')}
            </h3>
            <span className="font-bold text-green-600">{money(totals.income)}</span>
          </div>
          {list(incomes, 'text-green-600')}
        </div>

        <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold flex items-center ${baseClasses.textMain}`}>
              <TrendingDown size={18} className="mr-2 text-red-500" /> {t('expense')}
            </h3>
            <span className="font-bold text-red-500">{money(totals.expense)}</span>
          </div>
          {list(expenses, 'text-red-500')}
        </div>
      </div>

      {/* Rapor */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 print:static print:bg-transparent print:p-0">
          <div className={`${baseClasses.bgCard} rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative print:max-w-none print:max-h-none print:shadow-none`}>
            <button
              onClick={() => setReportOpen(false)}
              className={`absolute top-4 right-4 print:hidden ${baseClasses.textSub} hover:text-red-500`}
            >
              <X size={22} />
            </button>

            <h3 className={`text-xl font-bold mb-1 ${baseClasses.textMain}`}>{t('finance_report')}</h3>
            <p className={`text-sm mb-4 ${baseClasses.textSub}`}>
              {from || to
                ? `${from || '…'} → ${to || '…'}`
                : t('all_time')}
            </p>

            <div className="flex flex-wrap gap-3 mb-4 print:hidden">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className={`p-2 rounded-lg border outline-none ${baseClasses.input}`} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className={`p-2 rounded-lg border outline-none ${baseClasses.input}`} />
              <button onClick={() => { setFrom(''); setTo(''); }}
                className={`px-3 rounded-lg border ${baseClasses.border} ${baseClasses.textMain}`}>
                {t('clear')}
              </button>
              <button onClick={() => window.print()}
                className={`${currentTheme.primary} text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2`}>
                <Printer size={16} /> {t('print')}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`p-3 rounded-lg border ${baseClasses.border}`}>
                <p className={`text-xs ${baseClasses.textSub}`}>{t('total_income')}</p>
                <p className="font-bold text-green-600">{money(reportTotals.income)}</p>
              </div>
              <div className={`p-3 rounded-lg border ${baseClasses.border}`}>
                <p className={`text-xs ${baseClasses.textSub}`}>{t('total_expense')}</p>
                <p className="font-bold text-red-500">{money(reportTotals.expense)}</p>
              </div>
              <div className={`p-3 rounded-lg border ${baseClasses.border}`}>
                <p className={`text-xs ${baseClasses.textSub}`}>{t('balance')}</p>
                <p className={`font-bold ${reportTotals.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {money(reportTotals.balance)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${baseClasses.border} ${baseClasses.textSub}`}>
                    <th className="text-left p-2">{t('date')}</th>
                    <th className="text-left p-2">{t('desc')}</th>
                    <th className="text-left p-2">{t('type')}</th>
                    <th className="text-right p-2">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((item) => (
                    <tr key={item.id} className={`border-b ${baseClasses.border}`}>
                      <td className={`p-2 ${baseClasses.textSub}`}>
                        {new Date(item.date).toLocaleDateString(LOCALES[lang])}
                      </td>
                      <td className={`p-2 ${baseClasses.textMain}`}>{item.description}</td>
                      <td className={`p-2 ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t(item.type)}
                      </td>
                      <td className={`p-2 text-right font-medium ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {money(Number(item.amount))}
                      </td>
                    </tr>
                  ))}
                  {reportItems.length === 0 && (
                    <tr><td colSpan={4} className={`p-4 text-center ${baseClasses.textSub}`}>{t('no_records')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title={t('delete_confirm_title')}
        message={t('delete_confirm_transaction')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onClose={() => setConfirmDelete(null)}
        baseClasses={baseClasses}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        darkMode={darkMode}
      />
    </div>
  );
};
