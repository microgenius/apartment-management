import { supabase } from '../lib/supabase';
import type { Resident, LedgerItem } from '../types';

export const residentsService = {
  // Get all residents with their ledgers
  async getAll(): Promise<Resident[]> {
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select('*')
      .order('door', { ascending: true });

    if (residentsError) throw residentsError;

    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('*')
      .order('date', { ascending: true });

    if (ledgersError) throw ledgersError;

    return residents.map(resident => ({
      id: resident.id,
      door: resident.door,
      name: resident.name,
      type: resident.type,
      phone: resident.phone,
      status: resident.status,
      ledger: (ledgers || [])
        .filter(l => l.resident_id === resident.id)
        .map(l => ({
          id: l.id,
          date: l.date,
          desc: l.description,
          amount: l.amount,
          status: l.status as LedgerItem['status'],
          paid_amount: l.paid_amount ?? undefined
        }))
    }));
  },

  // Get single resident by ID
  async getById(id: number): Promise<Resident | null> {
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single();

    if (residentError) throw residentError;
    if (!resident) return null;

    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('*')
      .eq('resident_id', id)
      .order('date', { ascending: true });

    if (ledgersError) throw ledgersError;

    return {
      id: resident.id,
      door: resident.door,
      name: resident.name,
      type: resident.type,
      phone: resident.phone,
      status: resident.status,
      ledger: (ledgers || []).map(l => ({
        id: l.id,
        date: l.date,
        desc: l.description,
        amount: l.amount,
        status: l.status as LedgerItem['status'],
        paid_amount: l.paid_amount ?? undefined
      }))
    };
  },

  // Create new resident
  async create(resident: Omit<Resident, 'id' | 'ledger'>): Promise<Resident> {
    const { data, error } = await supabase
      .from('residents')
      .insert({
        door: resident.door,
        name: resident.name,
        type: resident.type,
        phone: resident.phone,
        status: resident.status
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      ledger: []
    };
  },

  // Update resident
  async update(id: number, updates: Partial<Omit<Resident, 'id' | 'ledger'>>): Promise<void> {
    const { error } = await supabase
      .from('residents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Delete resident
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('residents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
