import { supabase } from '../lib/supabase';
import type { CommunityPost } from '../types';

export const communityPostsService = {
  // Get all community posts
  async getAll(): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      user: p.user_info,
      user_id: p.user_id,
      date: p.date,
      content: p.content,
      type: p.type as CommunityPost['type']
    }));
  },

  // Get posts by type
  async getByType(type: CommunityPost['type']): Promise<CommunityPost[]> {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      user: p.user_info,
      user_id: p.user_id,
      date: p.date,
      content: p.content,
      type: p.type as CommunityPost['type']
    }));
  },

  // Create post
  async create(post: Omit<CommunityPost, 'id'>): Promise<CommunityPost> {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_info: post.user,
        user_id: post.user_id,
        date: post.date,
        content: post.content,
        type: post.type
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user: data.user_info,
      user_id: data.user_id,
      date: data.date,
      content: data.content,
      type: data.type as CommunityPost['type']
    };
  },

  // Update post
  async update(id: number, updates: Partial<Omit<CommunityPost, 'id'>>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.user) dbUpdates.user_info = updates.user;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.type) dbUpdates.type = updates.type;

    const { error } = await supabase
      .from('community_posts')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  // Delete post
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
