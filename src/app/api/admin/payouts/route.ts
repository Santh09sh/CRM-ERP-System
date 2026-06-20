import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/payouts — list all payouts for admin
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*, ambassador:profiles!payouts_ambassador_id_fkey(full_name, email, phone, avatar_url)")
    .order("requested_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// PATCH /api/admin/payouts — approve or reject a payout
export async function PATCH(request: NextRequest) {
  try {
    const { payout_id, action, reason } = await request.json();

    if (!payout_id || !action) {
      return NextResponse.json({ error: "Missing payout_id or action" }, { status: 400 });
    }

    const supabase = await createClient();

    if (action === "approve") {
      const { data, error } = await supabase
        .from("payouts")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", payout_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ payout: data });
    }

    if (action === "reject") {
      const { data, error } = await supabase
        .from("payouts")
        .update({ status: "rejected", rejection_reason: reason || "Rejected by admin" })
        .eq("id", payout_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ payout: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
