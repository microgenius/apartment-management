import { useState, useEffect } from 'react';
import { residentContactsService, type ResidentContact } from '../services/residentContactsService';

export function useResidentContacts() {
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      setContacts(await residentContactsService.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
      console.error('Error fetching resident contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return { contacts, loading, error, refetch: fetchContacts };
}
