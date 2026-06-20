import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/referral/dashboard — returns ambassador profile, conversions, payouts, leaderboard
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get current user from cookie/session (demo auth uses localStorage, so we read the user_id from a query param for now)
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Profile (referral code for this ambassador)
  const { data: profile } = await supabase
    .from("referral_codes")
    .select("*, ambassador:profiles!referral_codes_ambassador_id_fkey(*)")
    .eq("ambassador_id", userId)
    .single();

  // Conversions
  const { data: conversions } = await supabase
    .from("referral_conversions")
    .select("*, lead:leads(title, company:companies(name)), deal:deals(title, value)")
    .eq("referral_code_id", profile?.id ?? "")
    .order("converted_at", { ascending: false });

  // Payouts
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("ambassador_id", userId)
    .order("requested_at", { ascending: false });

  // Leaderboard
  const { data: leaderboard } = await supabase
    .from("referral_codes")
    .select("total_clicks, total_conversions, total_earned, ambassador:profiles!referral_codes_ambassador_id_fkey(full_name, avatar_url)")
    .eq("is_active", true)
    .order("total_earned", { ascending: false })
    .limit(10);

  return NextResponse.json({
    profile: profile || null,
    conversions: conversions || [],
    payouts: payouts || [],
    leaderboard: leaderboard || [],
  });
}
