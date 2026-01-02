import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GameRoom {
  id: string;
  host_name: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  player_count: number;
  max_players: number;
  created_at: string;
  updated_at: string;
}
