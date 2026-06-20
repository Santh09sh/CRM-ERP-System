const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const [leadsRes, dealsRes, tasksRes] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("deals").select("id, value, status"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
  ]);

  console.log("Leads error:", leadsRes.error);
  console.log("Leads count:", leadsRes.count);
  console.log("Deals error:", dealsRes.error);
  console.log("Deals count:", dealsRes.data ? dealsRes.data.length : null);
  console.log("Tasks error:", tasksRes.error);
  console.log("Tasks count:", tasksRes.count);
}

test();
