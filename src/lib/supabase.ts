import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvKeys = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

export const { url, key } = getEnvKeys();

export const supabase: SupabaseClient | null = (url && key) ? createClient(url, key) : null;

export const hasSupabaseKeys = () => {
  return !!(url && key);
};
