import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  await supabase.from('system_settings').upsert({ key: 'llm_provider', value: 'custom', updated_at: new Date().toISOString() });
  await supabase.from('system_settings').upsert({ key: 'llm_api_base_url', value: 'https://api.armorclub.org/v1', updated_at: new Date().toISOString() });
  await supabase.from('system_settings').upsert({ key: 'llm_api_key', value: '57b8ba885ae46ff44ecdbe3d09cead3a79f563a783c7ab2d0ff5d446801897de', updated_at: new Date().toISOString() });
  await supabase.from('system_settings').upsert({ key: 'llm_model', value: 'claude-3-5-sonnet-latest', updated_at: new Date().toISOString() });
  console.log("Settings updated in Supabase!");
}
main();
