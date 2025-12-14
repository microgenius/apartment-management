import { useState, useEffect } from 'react';
import { infoService } from '../services/infoService';
import type { InfoItem } from '../types';

export function useInfo() {
  const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      // Clear state before fetching new data
      setInfoItems([]);
      const data = await infoService.getAll();
      setInfoItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch info');
      console.error('Error fetching info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear state on component mount (page refresh)
    setInfoItems([]);
    fetchInfo();
    
    // Cleanup function: clear state on unmount
    return () => {
      setInfoItems([]);
      setLoading(true);
      setError(null);
    };
  }, []);

  return {
    infoItems,
    loading,
    error,
    refetch: fetchInfo
  };
}
