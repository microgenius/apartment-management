import { supabase } from '../lib/supabase';
import type { RequestItem } from '../types';

export const requestsService = {
  // Get all requests
  async getAll(): Promise<RequestItem[]> {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      user: r.user_name,
      user_id: r.user_id,
      date: r.date,
      content: r.content,
      status: r.status as RequestItem['status'],
      inAgenda: r.in_agenda
    }));
  },

  // Get requests in agenda
  async getInAgenda(): Promise<RequestItem[]> {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('in_agenda', true)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      user: r.user_name,
      user_id: r.user_id,
      date: r.date,
      content: r.content,
      status: r.status as RequestItem['status'],
      inAgenda: r.in_agenda
    }));
  },

  // Create request
  async create(request: Omit<RequestItem, 'id'>): Promise<RequestItem> {
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_name: request.user,
        user_id: request.user_id,
        date: request.date,
        content: request.content,
        status: request.status,
        in_agenda: request.inAgenda
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user: data.user_name,
      user_id: data.user_id,
      date: data.date,
      content: data.content,
      status: data.status as RequestItem['status'],
      inAgenda: data.in_agenda
    };
  },

  // Update request
  async update(id: number, updates: Partial<Omit<RequestItem, 'id'>>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.user) dbUpdates.user_name = updates.user;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.inAgenda !== undefined) dbUpdates.in_agenda = updates.inAgenda;

    const { error } = await supabase
      .from('requests')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  // Delete request
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Update request status
  async updateStatus(id: number, status: RequestItem['status']): Promise<void> {
    const { error } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle agenda status
  async toggleAgenda(id: number, inAgenda: boolean): Promise<void> {
    const { error } = await supabase
      .from('requests')
      .update({ in_agenda: inAgenda })
      .eq('id', id);

    if (error) throw error;
  }
};
