const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), company:companies(*), contact:contacts(*)")
    .order("created_at", { ascending: false });
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("First invoice:", data[0].invoice_number);
  }
}
check();
