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
  },

  /**
   * Tahsilatı tek veritabanı işleminde uygular: ledger satırları ve kasa
   * kaydı birlikte yazılır ya da hiçbiri yazılmaz.
   *
   * Önceden bunlar client'tan tek tek yapılıyordu; arada oturum düşünce
   * dairenin borcu kapanmış ama kasaya para girmemiş oluyordu, yönetici
   * tekrar deneyince de ledger'da mükerrer kayıt çıkıyordu.
   */
  async recordPayment(
    residentId: number,
    amount: number,
    payerName: string,
    ops: LedgerOperation[]
  ): Promise<void> {
    const { error } = await supabase.rpc('record_dues_payment', {
      p_resident_id: residentId,
      p_amount: amount,
      p_payer: payerName,
      p_ops: ops
    });

    if (error) throw error;
  }
};

/** Tahsilatın ledger'a yansıması: mevcut satırı güncelle ya da yeni ekle */
export type LedgerOperation =
  | { op: 'update'; id: string; status: LedgerItem['status']; paid_amount: number }
  | {
      op: 'insert';
      date: string;
      description: string;
      amount: number;
      status: LedgerItem['status'];
      paid_amount: number;
    };
