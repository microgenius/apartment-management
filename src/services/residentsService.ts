import { supabase } from '../lib/supabase';
import type { Resident, LedgerItem, ResidentDuty } from '../types';
import { sortByOldDoor } from '../utils/helpers';

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

    // Görev artık kişide (user_profiles) duruyor; aidat muafiyeti ise daireye
    // uygulanıyor. Görevlinin bağlı olduğu daireyi muaf olarak işaretliyoruz,
    // böylece helpers.ts'teki üretim mantığı değişmeden çalışmaya devam ediyor.
    const { data: dutyHolders } = await supabase
      .from('user_profiles')
      .select('resident_id, duty, duty_since')
      .not('duty', 'is', null);

    const dutyByResident = new Map<number, { duty: ResidentDuty; since: string | null }>();
    (dutyHolders || []).forEach(h => {
      if (h.resident_id != null) {
        dutyByResident.set(h.resident_id, { duty: h.duty as ResidentDuty, since: h.duty_since });
      }
    });

    return sortByOldDoor(residents.map(resident => ({
      id: resident.id,
      door: resident.door,
      old_door: resident.old_door,
      name: resident.name,
      type: resident.type,
      phone: resident.phone,
      status: resident.status,
      duty: dutyByResident.get(resident.id)?.duty ?? null,
      duty_since: dutyByResident.get(resident.id)?.since ?? null,
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
    })));
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

    const { data: dutyHolder } = await supabase
      .from('user_profiles')
      .select('duty, duty_since')
      .eq('resident_id', id)
      .not('duty', 'is', null)
      .maybeSingle();

    return {
      id: resident.id,
      door: resident.door,
      old_door: resident.old_door,
      name: resident.name,
      type: resident.type,
      phone: resident.phone,
      status: resident.status,
      duty: (dutyHolder?.duty as ResidentDuty) ?? null,
      duty_since: dutyHolder?.duty_since ?? null,
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
  async create(resident: Omit<Resident, 'id' | 'ledger' | 'duty' | 'duty_since'>): Promise<Resident> {
    const { data, error } = await supabase
      .from('residents')
      .insert({
        door: resident.door,
        old_door: resident.old_door,
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
  async update(id: number, updates: Partial<Omit<Resident, 'id' | 'ledger' | 'duty' | 'duty_since'>>): Promise<void> {
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
