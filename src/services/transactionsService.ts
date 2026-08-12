import { supabase } from '../lib/supabase';
import { todayISO } from '../utils/helpers';

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'dues';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  source: TransactionSource;
  resident_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  date?: string;
  source?: TransactionSource;
  resident_id?: number | null;
}

export const transactionsService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const { data: auth } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: input.type,
        amount: input.amount,
        description: input.description,
        date: input.date ?? todayISO(),
        source: input.source ?? 'manual',
        resident_id: input.resident_id ?? null,
        created_by: auth?.user?.id ?? null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Tahsilat sırasında otomatik gelir kaydı.
   * Kasa defteri ledgers'tan ayrı: ledgers dairenin borcunu kapatır,
   * burası siteye para girdiğini yazar. Tahsilat ikisine birden yazılmalı.
   *
   * Hata fırlatmıyor: tahsilatın kendisi zaten tamamlanmış oluyor, kasa
   * kaydı yazılamadı diye ödemeyi başarısız göstermek yanlış olurdu.
   * Yazılamazsa konsola düşer ve elle eklenebilir.
   */
  async recordDuesIncome(residentId: number, residentLabel: string, amount: number): Promise<void> {
    try {
      await this.create({
        type: 'income',
        amount,
        description: `Aidat tahsilatı - ${residentLabel}`,
        source: 'dues',
        resident_id: residentId
      });
    } catch (err) {
      console.error('Tahsilat kasaya yazılamadı:', err);
    }
  }
};
