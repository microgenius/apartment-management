import { supabase } from '../lib/supabase';

/** Dairenin borç takip notu. Yalnızca görevli/admin okuyup yazabilir (RLS). */
export interface ResidentNote {
  id: number;
  resident_id: number;
  note: string;
  /** Notu yazan görevlinin o günkü adı. Eski kayıtlarda boş olabilir. */
  author_name: string | null;
  created_at: string;
}

export const residentNotesService = {
  // Tüm daireler için tek sorgu - borç listesi zaten toplu çekiliyor
  async getAll(): Promise<ResidentNote[]> {
    const { data, error } = await supabase
      .from('resident_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(residentId: number, note: string, authorName: string | null): Promise<ResidentNote> {
    const { data, error } = await supabase
      .from('resident_notes')
      .insert({ resident_id: residentId, note, author_name: authorName })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('resident_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
