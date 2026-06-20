const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*, company:companies(*), contact:contacts(*), stage:pipeline_stages(*), assigned_user:profiles!leads_assigned_to_fkey(*)")
    .order("priority", { ascending: false });
    
  if (leadsError) console.error("leads error:", leadsError);
  console.log("leads length:", leads?.length);
}
test();
