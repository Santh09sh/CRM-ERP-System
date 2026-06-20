const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: p } = await supabase.from('profiles').select('id');
  const { data: c } = await supabase.from('contacts').select('id');
  console.log("Profiles:", p ? p.length : 0);
  console.log("Contacts:", c ? c.length : 0);
}
check();
