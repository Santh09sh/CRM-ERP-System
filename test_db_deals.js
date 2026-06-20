const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("*, company:companies(*), contact:contacts(*)")
    .order("expected_close_date", { ascending: true });
    
  if (dealsError) console.error("deals error:", dealsError);
  console.log("deals length:", deals?.length);
  
  const openDeals = (deals || []).filter(d => d.status === 'open');
  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  console.log("pipelineValue:", pipelineValue);
}
test();
