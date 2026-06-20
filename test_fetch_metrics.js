const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      task_reminders (*),
      assigned_user:profiles!tasks_assigned_to_fkey(*)
    `)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
  return data;
}

async function getDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select("*, company:companies(*), contact:contacts(*)")
    .order("expected_close_date", { ascending: true });
  if (error) console.error("Error fetching deals:", error);
  return data || [];
}

async function getLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*, company:companies(*), contact:contacts(*), stage:pipeline_stages(*), assigned_user:profiles!leads_assigned_to_fkey(*)")
    .order("priority", { ascending: false });
  if (error) console.error("Error fetching leads:", error);
  return data || [];
}

async function testFetchMetrics() {
  try {
    const [leads, deals, tasks] = await Promise.all([
      getLeads(),
      getDeals(),
      getTasks(),
    ]);

    console.log("Leads count:", leads?.length);
    console.log("Deals count:", deals?.length);
    console.log("Tasks count:", tasks?.length);

    const wonDeals = deals.filter(d => d.status === 'won');
    const openDeals = deals.filter(d => d.status === 'open');
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const wonLeads = leads.filter(l => l.stage?.is_won_stage);
    const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
    const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    console.log("Metrics:", {
      total_leads: leads.length,
      deals_closed: wonDeals.length,
      pipeline_value: pipelineValue,
      tasks_due: pendingTasks.length,
      conversion_rate: parseFloat(conversionRate.toFixed(1)),
    });
  } catch (err) {
    console.error("fetchMetrics error:", err);
  }
}

testFetchMetrics();
