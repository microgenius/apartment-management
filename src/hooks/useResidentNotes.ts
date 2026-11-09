import { useState, useEffect } from 'react';
import { residentNotesService, type ResidentNote } from '../services/residentNotesService';

export function useResidentNotes() {
  const [notes, setNotes] = useState<ResidentNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sakin hesaplarında RLS satırları süzüyor, yani liste boş dönüyor - hata
  // değil. Bu yüzden ekran bu veriyi beklemiyor, yalnızca yönetici panelinde
  // kullanılıyor.
  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotes(await residentNotesService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resident notes');
      console.error('Error fetching resident notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return { notes, loading, error, refetch: fetchNotes };
}
