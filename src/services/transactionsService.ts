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

  /**
   * Aidat gelirlerinin toplamı. Sakinler RLS gereği bu satırları tek tek
   * göremiyor (kimin ne ödediği kişisel bilgi), yalnızca toplamı görüyor.
   * Yönetici için de aynı sonucu verir, ayrı bir yol tutmaya gerek yok.
   */
  async getDuesTotal(): Promise<number> {
    const { data, error } = await supabase.rpc('dues_income_total');
    if (error) {
      console.error('Error fetching dues total:', error);
      return 0;
    }
    return Number(data ?? 0);
  },

  async create(input: TransactionInput): Promise<Transaction> {
    // getUser() DEĞİL: o ağ üzerinden token doğruluyor ve süresi dolmuş
    // oturumda supabase-js kullanıcıyı sistemden atıyor. getSession() yereldeki
    // oturumu okur, ağa çıkmaz.
    const { data: auth } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: input.type,
        amount: input.amount,
        description: input.description,
        date: input.date ?? todayISO(),
        source: input.source ?? 'manual',
        resident_id: input.resident_id ?? null,
        created_by: auth?.session?.user?.id ?? null
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
   * Açıklamada daire numarası YOK: kasa defteri artık tüm sakinlere açık,
   * kim hangi daireden ne ödedi bilgisini herkese yaymamak için. Daire
   * bilgisi gerektiğinde resident_id sütunundan izlenebiliyor.
   *
   * Hata fırlatmıyor: tahsilatın kendisi zaten tamamlanmış oluyor, kasa
   * kaydı yazılamadı diye ödemeyi başarısız göstermek yanlış olurdu.
   * Yazılamazsa konsola düşer ve elle eklenebilir.
   */
  async recordDuesIncome(residentId: number, payerName: string, amount: number): Promise<void> {
    try {
      await this.create({
        type: 'income',
        amount,
        description: `Aidat tahsilatı - ${payerName}`,
        source: 'dues',
        resident_id: residentId
      });
    } catch (err) {
      console.error('Tahsilat kasaya yazılamadı:', err);
    }
  }
};
