import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvKeys = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key');
  return { url, key };
};

let { url, key } = getEnvKeys();

export let supabase: SupabaseClient | null = (url && key) ? createClient(url, key) : null;

export const setSupabaseKeys = (newUrl: string, newKey: string) => {
  localStorage.setItem('supabase_url', newUrl);
  localStorage.setItem('supabase_key', newKey);
  url = newUrl;
  key = newKey;
  supabase = createClient(url, key);
};

export const hasSupabaseKeys = () => {
  return !!(url && key);
};
