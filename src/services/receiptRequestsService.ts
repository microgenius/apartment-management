import { supabase } from '../lib/supabase';

export interface ReceiptRequest {
  id: number;
  user_id: string;
  user_name: string;
  apartment_info: string | null;
  amount: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const receiptRequestsService = {
  // Get all receipt requests (admin only)
  async getAll(): Promise<ReceiptRequest[]> {
    const { data, error } = await supabase
      .from('receipt_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get receipt requests for current user
  async getByUser(userId: string): Promise<ReceiptRequest[]> {
    const { data, error } = await supabase
      .from('receipt_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create new receipt request
  async create(
    userId: string,
    userName: string,
    apartmentInfo: string | null,
    amount: number,
    message: string
  ): Promise<ReceiptRequest> {
    const { data, error } = await supabase
      .from('receipt_requests')
      .insert({
        user_id: userId,
        user_name: userName,
        apartment_info: apartmentInfo,
        amount,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update receipt request status (admin only)
  async updateStatus(
    id: number,
    status: 'approved' | 'rejected'
  ): Promise<ReceiptRequest> {
    const { data, error } = await supabase
      .from('receipt_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete receipt request
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('receipt_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
