import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lxcustacsvamlrtiqkvi.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3VzdGFjc3ZhbWxydGlxa3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1OTQyMCwiZXhwIjoyMDg5MzM1NDIwfQ.16_EbPClrkf73zp2Skvg_wzxndWySe8egRgQ6NVTpdo';

async function test() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('Testing Supabase Connection...');
  
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.error('❌ Table "categories" does not exist. Schema migration is REQUIRED.');
    } else {
      console.error('❌ Supabase error:', error.message);
    }
  } else {
    console.log('✅ Connection successful!');
    console.log('Data sample:', data);
  }
}

test();
