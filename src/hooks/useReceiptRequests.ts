import { useState, useEffect } from 'react';
import { receiptRequestsService } from '../services/receiptRequestsService';
import type { ReceiptRequest } from '../services/receiptRequestsService';

export function useReceiptRequests(userId?: string) {
  const [receiptRequests, setReceiptRequests] = useState<ReceiptRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceiptRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = userId 
        ? await receiptRequestsService.getByUser(userId)
        : await receiptRequestsService.getAll();
      setReceiptRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch receipt requests');
      console.error('Error fetching receipt requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceiptRequests();
  }, [userId]);

  return {
    receiptRequests,
    loading,
    error,
    refetch: fetchReceiptRequests
  };
}
