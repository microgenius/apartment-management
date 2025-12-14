import { supabase } from '../lib/supabase';
import type { InfoItem } from '../types';

export const infoService = {
  // Get all info records
  async getAll(): Promise<InfoItem[]> {
    const { data, error } = await supabase
      .from('info')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return data || [];
  },

  // Get info by role
  async getByRole(role: 'manager' | 'assistant' | 'muhtar' | 'municipality'): Promise<InfoItem | null> {
    const { data, error } = await supabase
      .from('info')
      .select('*')
      .eq('role', role)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  },

  // Update info by id
  async update(id: number, updates: Partial<Pick<InfoItem, 'role' | 'name' | 'phone'>>): Promise<InfoItem> {
    const { data, error } = await supabase
      .from('info')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Create new info record
  async create(role: 'manager' | 'assistant' | 'muhtar' | 'municipality', name: string, phone: string): Promise<InfoItem> {
    const { data, error } = await supabase
      .from('info')
      .insert({
        role,
        name,
        phone
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete info record
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('info')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
