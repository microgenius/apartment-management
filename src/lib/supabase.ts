import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  public: {
    Tables: {
      residents: {
        Row: {
          id: number;
          door: string;
          name: string;
          type: 'Kiracı' | 'Ev Sahibi';
          phone: string;
          status: 'Dolu' | 'Boş';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          door: string;
          name: string;
          type: 'Kiracı' | 'Ev Sahibi';
          phone: string;
          status: 'Dolu' | 'Boş';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          door?: string;
          name?: string;
          type?: 'Kiracı' | 'Ev Sahibi';
          phone?: string;
          status?: 'Dolu' | 'Boş';
          created_at?: string;
          updated_at?: string;
        };
      };
      ledgers: {
        Row: {
          id: string;
          resident_id: number;
          date: string;
          description: string;
          amount: number;
          status: 'paid' | 'unpaid' | 'planned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resident_id: number;
          date: string;
          description: string;
          amount: number;
          status: 'paid' | 'unpaid' | 'planned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          resident_id?: number;
          date?: string;
          description?: string;
          amount?: number;
          status?: 'paid' | 'unpaid' | 'planned';
          created_at?: string;
          updated_at?: string;
        };
      };
      requests: {
        Row: {
          id: number;
          user_name: string;
          date: string;
          content: string;
          status: 'status_new' | 'status_review' | 'status_completed';
          in_agenda: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_name: string;
          date?: string;
          content: string;
          status: 'status_new' | 'status_review' | 'status_completed';
          in_agenda?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_name?: string;
          date?: string;
          content?: string;
          status?: 'status_new' | 'status_review' | 'status_completed';
          in_agenda?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      community_posts: {
        Row: {
          id: number;
          user_info: string;
          date: string;
          content: string;
          type: 'general' | 'event' | 'alert' | 'agenda';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_info: string;
          date: string;
          content: string;
          type: 'general' | 'event' | 'alert' | 'agenda';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_info?: string;
          date?: string;
          content?: string;
          type?: 'general' | 'event' | 'alert' | 'agenda';
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: number;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
      info: {
        Row: {
          id: number;
          role: 'manager' | 'assistant' | 'muhtar' | 'municipality';
          name: string;
          phone: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          role: 'manager' | 'assistant' | 'muhtar' | 'municipality';
          name: string;
          phone: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          role?: 'manager' | 'assistant' | 'muhtar' | 'municipality';
          name?: string;
          phone?: string;
          updated_at?: string;
        };
      };
    };
  };
};
