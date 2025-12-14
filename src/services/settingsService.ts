import { supabase } from '../lib/supabase';

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
