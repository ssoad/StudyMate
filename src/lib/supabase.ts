import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvKeys = () => {
  // When running in the browser, always use the active server's origin (100% local self-hosted backend)
  if (typeof window !== 'undefined') {
    const url = window.location.origin;
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2Fub24iLCJpc3MiOiJzdHVkeW1hdGUtbG9jYWwiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjUwMDAwMDAwMH0.hpayDbLaCLWFAbZgM_5WOFmopfB3qqFlP-v2yhFwoTM';
    return { url, key };
  }

  return {
    url: 'http://localhost:5173',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2Fub24iLCJpc3MiOiJzdHVkeW1hdGUtbG9jYWwiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjUwMDAwMDAwMH0.hpayDbLaCLWFAbZgM_5WOFmopfB3qqFlP-v2yhFwoTM',
  };
};

export const { url, key } = getEnvKeys();

export const supabase: SupabaseClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const hasSupabaseKeys = () => {
  return true;
};
