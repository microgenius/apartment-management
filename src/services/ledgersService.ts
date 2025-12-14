import { supabase } from '../lib/supabase';
import type { LedgerItem } from '../types';

export const ledgersService = {
  // Get ledgers by resident ID
  async getByResidentId(residentId: number): Promise<LedgerItem[]> {
    const { data, error } = await supabase
      .from('ledgers')
      .select('*')
      .eq('resident_id', residentId)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(l => ({
      id: l.id,
      date: l.date,
      desc: l.description,
      amount: l.amount,
      status: l.status as LedgerItem['status'],
      paid_amount: l.paid_amount ?? undefined
    }));
  },

  // Create ledger entry
  async create(residentId: number, ledger: Omit<LedgerItem, 'id'>): Promise<LedgerItem> {
    const insertData: any = {
      resident_id: residentId,
      date: ledger.date,
      description: ledger.desc,
      amount: ledger.amount,
      status: ledger.status
    };
    
    if (ledger.paid_amount !== undefined) {
      insertData.paid_amount = ledger.paid_amount;
    }

    const { data, error } = await supabase
      .from('ledgers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      date: data.date,
      desc: data.description,
      amount: data.amount,
      status: data.status as LedgerItem['status'],
      paid_amount: data.paid_amount ?? undefined
    };
  },

  // Update ledger entry
  async update(id: string, updates: Partial<Omit<LedgerItem, 'id'>>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.desc) dbUpdates.description = updates.desc;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.paid_amount !== undefined) dbUpdates.paid_amount = updates.paid_amount;

    const { error } = await supabase
      .from('ledgers')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  // Delete ledger entry
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ledgers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Update ledger status (for payment)
  async updateStatus(id: string, status: LedgerItem['status']): Promise<void> {
    const { error } = await supabase
      .from('ledgers')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }
};
