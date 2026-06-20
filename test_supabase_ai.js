const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const leads = await supabase.from("leads").select("id, title, estimated_value, created_at, stage:pipeline_stages(name, is_won_stage, is_lost_stage)");
  console.log("Leads error:", leads.error);
  console.log("Leads data length:", leads.data?.length);

  const deals = await supabase.from("deals").select("id, title, value, status, expected_close_date");
  console.log("Deals error:", deals.error);
  console.log("Deals data length:", deals.data?.length);
  
  const tasks = await supabase.from("tasks").select("id, title, status, priority, due_date");
  console.log("Tasks error:", tasks.error);
  console.log("Tasks data length:", tasks.data?.length);
}
test();
