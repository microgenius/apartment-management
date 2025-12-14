import { useState, useEffect } from 'react';
import { residentsService } from '../services/residentsService';
import type { Resident } from '../types';

export function useResidents() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await residentsService.getAll();
      setResidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch residents');
      console.error('Error fetching residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  return {
    residents,
    setResidents,
    loading,
    error,
    refetch: fetchResidents
  };
}
