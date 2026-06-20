const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*, task_reminders(*), assigned_user:profiles!tasks_assigned_to_fkey(*)")
    .order("due_date", { ascending: true });
    
  if (tasksError) console.error("tasks error:", tasksError);
  console.log("tasks length:", tasks?.length);
}
test();
