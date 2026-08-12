import { supabase } from '../lib/supabase';

export type ContactType = 'owner' | 'tenant' | 'emergency' | 'other';

export interface ResidentContact {
  id: number;
  resident_id: number;
  type: ContactType;
  name: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactInput = Pick<ResidentContact, 'type' | 'name' | 'phone'> &
  Partial<Pick<ResidentContact, 'email' | 'is_primary' | 'note'>>;

export const residentContactsService = {
  // Tüm daireler için tek sorgu - daire listesi zaten toplu çekiliyor
  async getAll(): Promise<ResidentContact[]> {
    const { data, error } = await supabase
      .from('resident_contacts')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getByResident(residentId: number): Promise<ResidentContact[]> {
    const { data, error } = await supabase
      .from('resident_contacts')
      .select('*')
      .eq('resident_id', residentId)
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(residentId: number, contact: ContactInput): Promise<ResidentContact> {
    // Birincil işaretlenirse aynı dairedeki eski birincil bırakılmalı;
    // veritabanındaki kısmi unique index aksi halde ikincisini reddeder.
    if (contact.is_primary) await this.clearPrimary(residentId);

    const { data, error } = await supabase
      .from('resident_contacts')
      .insert({ ...contact, resident_id: residentId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: number, residentId: number, updates: Partial<ContactInput>): Promise<void> {
    if (updates.is_primary) await this.clearPrimary(residentId, id);

    const { error } = await supabase
      .from('resident_contacts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('resident_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Daire içindeki birincil işaretini kaldırır (exceptId hariç)
  async clearPrimary(residentId: number, exceptId?: number): Promise<void> {
    let query = supabase
      .from('resident_contacts')
      .update({ is_primary: false })
      .eq('resident_id', residentId)
      .eq('is_primary', true);

    if (exceptId != null) query = query.neq('id', exceptId);

    const { error } = await query;
    if (error) throw error;
  }
};
