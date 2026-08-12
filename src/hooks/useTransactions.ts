import { useState, useEffect } from 'react';
import { transactionsService, type Transaction } from '../services/transactionsService';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Sakinler aidat satırlarını göremiyor; toplamı ayrı sorguyla alıyoruz
  const [duesTotal, setDuesTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rows, dues] = await Promise.all([
        transactionsService.getAll(),
        transactionsService.getDuesTotal()
      ]);
      setTransactions(rows);
      setDuesTotal(dues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return { transactions, duesTotal, loading, error, refetch: fetchTransactions };
}
