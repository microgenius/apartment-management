import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'resident' | 'admin';
  apartment_info: string | null;
  created_at: string;
  updated_at: string;
}

export const userProfilesService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    console.log('🔍 Fetching profile for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('✅ Profile fetched successfully:', data);
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

  async createProfile(userId: string, fullName: string, role: 'resident' | 'admin', apartmentInfo?: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role,
        apartment_info: apartmentInfo || null,
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
