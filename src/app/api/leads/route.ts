import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const stage = searchParams.get("stage");
  const source = searchParams.get("source");
  const assigned = searchParams.get("assigned_to");
  const search = searchParams.get("search");

  let query = supabase
    .from("leads")
    .select(`
      *,
      stage:pipeline_stages(*),
      assigned_user:profiles!leads_assigned_to_fkey(id, full_name, email, role, avatar_url),
      company:companies(id, name),
      contact:contacts(id, first_name, last_name, email)
    `)
    .order("created_at", { ascending: false });

  if (stage) query = query.eq("stage_id", stage);
  if (source) query = query.eq("source", source);
  if (assigned) query = query.eq("assigned_to", assigned);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get first pipeline stage
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id")
    .order("display_order")
    .limit(1);

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...body,
      stage_id: body.stage_id || stages?.[0]?.id,
      assigned_to: body.assigned_to || user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Log stage history
  if (data) {
    await supabase.from("stage_history").insert({
      lead_id: data.id,
      to_stage_id: data.stage_id,
      changed_by: user.id,
      notes: "Lead created",
    });
  }

  return NextResponse.json(data, { status: 201 });
}
