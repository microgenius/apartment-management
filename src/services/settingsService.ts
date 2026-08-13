import { supabase } from '../lib/supabase';
import { DEFAULT_LATE_FEE, type LateFeeConfig } from '../utils/helpers';

export const settingsService = {
  // Get setting by key
  async get(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data?.value || null;
  },

  // Get meeting date
  async getMeetingDate(): Promise<string> {
    const value = await this.get('meeting_date');
    return value || '2024-07-15';
  },

  // Set setting
  async set(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) throw error;
  },

  // Set meeting date
  async setMeetingDate(date: string): Promise<void> {
    await this.set('meeting_date', date);
  },

  // Get monthly due
  async getMonthlyDue(): Promise<number> {
    const value = await this.get('monthly_due');
    return value ? parseFloat(value) : 0;
  },

  // Set monthly due
  async setMonthlyDue(amount: number): Promise<void> {
    await this.set('monthly_due', amount.toString());
  },

  // Get debt start date
  async getDebtStartDate(): Promise<string> {
    const value = await this.get('debt_start_date');
    return value || '2024-01-01';
  },

  // Set debt start date
  async setDebtStartDate(date: string): Promise<void> {
    await this.set('debt_start_date', date);
  },

  // Gecikme faizi ayarları. Oran yüzde olarak saklanıyor ("5"), kodda
  // ondalığa çevriliyor - ayarlar ekranında yüzde yazmak daha anlaşılır.
  async getLateFeeConfig(): Promise<LateFeeConfig> {
    const [rate, months, days] = await Promise.all([
      this.get('late_fee_rate'),
      this.get('late_fee_grace_months'),
      this.get('late_fee_grace_days')
    ]);

    return {
      rate: rate !== null ? parseFloat(rate) / 100 : DEFAULT_LATE_FEE.rate,
      graceMonths: months !== null ? parseInt(months, 10) : DEFAULT_LATE_FEE.graceMonths,
      graceDays: days !== null ? parseInt(days, 10) : DEFAULT_LATE_FEE.graceDays
    };
  },

  async setLateFeeConfig(config: LateFeeConfig): Promise<void> {
    await this.set('late_fee_rate', String(+(config.rate * 100).toFixed(4)));
    await this.set('late_fee_grace_months', String(config.graceMonths));
    await this.set('late_fee_grace_days', String(config.graceDays));
  },

  // Get all settings
  async getAll(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    const settings: Record<string, string> = {};
    (data || []).forEach(s => {
      settings[s.key] = s.value;
    });

    return settings;
  }
};
