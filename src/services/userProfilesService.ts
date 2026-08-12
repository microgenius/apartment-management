import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'resident' | 'admin';
  apartment_info: string | null;
  /**
   * Bağlı olduğu sakin kaydı. Bir sakinin birden fazla hesabı olabilir
   * (ev sahibi + eş + kiracı), ama her hesap tek bir daireye bakar.
   * null: henüz bir daireye bağlanmamış.
   */
  resident_id: number | null;
  /** Site görevi. Yetkiyi bu taşır; role='admin' ayrı bir teknik roldür. */
  duty: 'manager' | 'assistant' | null;
  /** Göreve başlama tarihi - aidat muafiyeti bu aydan itibaren işler. */
  duty_since: string | null;
  created_at: string;
  updated_at: string;
}

export const userProfilesService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error.message, error.code);
        return null;
      }

      return data;
    } catch (err) {
      console.error('❌ Exception in getProfile:', err);
      return null;
    }
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }

    return data || [];
  },

  async createProfile(userId: string, fullName: string, role: 'resident' | 'admin', apartmentInfo?: string, residentId?: number | null): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role,
        apartment_info: apartmentInfo || null,
        resident_id: residentId ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  },

  async updateProfile(userId: string, updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  },

  async transferAdmin(currentAdminId: string, newAdminId: string): Promise<boolean> {
    try {
      // Transaction: Eski admin'i resident yap, yeni user'ı admin yap
      const { error: error1 } = await supabase
        .from('user_profiles')
        .update({ role: 'resident' })
        .eq('id', currentAdminId);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', newAdminId);

      if (error2) throw error2;

      return true;
    } catch (error) {
      console.error('Error transferring admin:', error);
      return false;
    }
  },

  // Bir hesabı sakin kaydına bağlar. Aynı sakine birden fazla hesap
  // bağlanabilir (kısıt yok), her hesap tek bir sakine bakar.
  async linkResident(userId: string, residentId: number): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ resident_id: residentId })
      .eq('id', userId);

    if (error) {
      console.error('Error linking resident:', error);
      return false;
    }

    return true;
  },

  async unlinkResident(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ resident_id: null })
      .eq('id', userId);

    if (error) {
      console.error('Error unlinking resident:', error);
      return false;
    }

    return true;
  },

  // Görevi ata. Aynı görevi taşıyan varsa önce bırakır - veritabanındaki
  // kısmi unique index zaten ikincisini reddederdi.
  // duty_since bugüne set ediliyor: aidat muafiyeti bu aydan itibaren işler,
  // görevden önceki aylar borç üretmeye devam eder.
  async setDuty(userId: string, duty: 'manager' | 'assistant'): Promise<boolean> {
    const { error: clearError } = await supabase
      .from('user_profiles')
      .update({ duty: null, duty_since: null })
      .eq('duty', duty);

    if (clearError) {
      console.error('Error clearing previous duty:', clearError);
      return false;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ duty, duty_since: new Date().toISOString().split('T')[0] })
      .eq('id', userId);

    if (error) {
      console.error('Error setting duty:', error);
      return false;
    }

    return true;
  },

  async clearDuty(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ duty: null, duty_since: null })
      .eq('id', userId);

    if (error) {
      console.error('Error clearing duty:', error);
      return false;
    }

    return true;
  },

  // Bir sakine bağlı tüm hesaplar
  async getByResident(residentId: number): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('resident_id', residentId)
      .order('full_name');

    if (error) {
      console.error('Error fetching profiles by resident:', error);
      return [];
    }

    return data || [];
  },

  async deleteProfile(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }

    return true;
  },
};
