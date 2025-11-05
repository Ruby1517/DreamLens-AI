// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/* -------------------- Database types (match the SQL you ran) -------------------- */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          plan: 'free' | 'pro' | 'team';
          is_guest: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };

      assets: {
        Row: {
          id: number;
          owner_id: string;
          media_kind: 'image' | 'video';
          original_url: string;
          width: number | null;
          height: number | null;
          duration_ms: number | null;
          hash: string | null;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          media_kind: 'image' | 'video';
          original_url: string;
          width?: number | null;
          height?: number | null;
          duration_ms?: number | null;
          hash?: string | null;
        };
        Update: Partial<Database['public']['Tables']['assets']['Row']>;
        Relationships: [
          { foreignKeyName: 'assets_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };

      posts: {
        Row: {
          id: number;
          author_id: string;
          asset_id: number;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          author_id: string;
          asset_id: number;
          caption?: string | null;
        };
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
        Relationships: [
          { foreignKeyName: 'posts_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'posts_asset_id_fkey'; columns: ['asset_id']; referencedRelation: 'assets'; referencedColumns: ['id'] }
        ];
      };

      post_likes: {
        Row: {
          post_id: number;
          user_id: string;
          created_at: string;
        };
        Insert: { post_id: number; user_id: string };
        Update: never;
        Relationships: [
          { foreignKeyName: 'post_likes_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
          { foreignKeyName: 'post_likes_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };

      comments: {
        Row: {
          id: number;
          post_id: number;
          author_id: string;
          text: string;
          created_at: string;
        };
        Insert: { post_id: number; author_id: string; text: string };
        Update: Partial<Database['public']['Tables']['comments']['Row']>;
        Relationships: [
          { foreignKeyName: 'comments_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
          { foreignKeyName: 'comments_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };

      jobs: {
        Row: {
          id: number;
          requester_id: string;
          input_asset_id: number | null;
          output_asset_id: number | null;
          style: string | null;
          state: 'queued' | 'processing' | 'completed' | 'failed';
          progress: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          requester_id: string;
          input_asset_id?: number | null;
          output_asset_id?: number | null;
          style?: string | null;
          state?: 'queued' | 'processing' | 'completed' | 'failed';
          progress?: number;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Row']>;
        Relationships: [
          { foreignKeyName: 'jobs_requester_id_fkey'; columns: ['requester_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'jobs_input_asset_id_fkey'; columns: ['input_asset_id']; referencedRelation: 'assets'; referencedColumns: ['id'] },
          { foreignKeyName: 'jobs_output_asset_id_fkey'; columns: ['output_asset_id']; referencedRelation: 'assets'; referencedColumns: ['id'] }
        ];
      };

      challenges: {
        Row: { id: number; title: string; prompt: string; starts_at: string; ends_at: string; created_at: string };
        Insert: { title: string; prompt: string; starts_at: string; ends_at: string };
        Update: Partial<Database['public']['Tables']['challenges']['Row']>;
        Relationships: [];
      };

      challenge_entries: {
        Row: { challenge_id: number; post_id: number; author_id: string; created_at: string };
        Insert: { challenge_id: number; post_id: number; author_id: string };
        Update: never;
        Relationships: [
          { foreignKeyName: 'challenge_entries_challenge_id_fkey'; columns: ['challenge_id']; referencedRelation: 'challenges'; referencedColumns: ['id'] },
          { foreignKeyName: 'challenge_entries_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
          { foreignKeyName: 'challenge_entries_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };

      notifications: {
        Row: { id: number; user_id: string; kind: string; data: Json; is_read: boolean; created_at: string };
        Insert: { user_id: string; kind: string; data?: Json; is_read?: boolean };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
        Relationships: [
          { foreignKeyName: 'notifications_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ];
      };

      /* View */
      v_posts_with_counts: {
        Row: {
          id: number;
          author_id: string;
          asset_id: number;
          caption: string | null;
          created_at: string;
          likes_count: number;
          comments_count: number;
        };
        Relationships: [];
      };
    };

    Functions: {
      toggle_like: {
        Args: { p_post_id: number };
        Returns: { liked: boolean; likes_count: number }[];
      };
      create_post: {
        Args: { p_asset_id: number; p_caption?: string | null };
        Returns: Database['public']['Tables']['posts']['Row'];
      };
    };
  };
};

/* -------------------- Supabase client (React Native–ready) -------------------- */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'pkce',
    detectSessionInUrl: false, // RN has no URL bar
  },
});
