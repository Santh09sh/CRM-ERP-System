import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/referral/[code] — returns ambassador name + tier info for the landing page "referred by" banner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("referral_codes")
    .select("total_conversions, ambassador:profiles!referral_codes_ambassador_id_fkey(full_name)")
    .eq("link_slug", code)
    .eq("is_active", true)
    .single();

  if (!data) return NextResponse.json({ found: false }, { status: 404 });

  const conversions = data.total_conversions || 0;
  const tiers = [
    { min: 25, label: "Legend",   emoji: "👑" },
    { min: 15, label: "Champion", emoji: "🏆" },
    { min: 10, label: "Elite",    emoji: "💎" },
    { min: 6,  label: "Active",   emoji: "⚡" },
    { min: 3,  label: "Rising",   emoji: "🚀" },
    { min: 0,  label: "Starter",  emoji: "🌱" },
  ];
  const tier = tiers.find((t) => conversions >= t.min)!;

  return NextResponse.json({
    found: true,
    ambassador_name: (data.ambassador as any)?.full_name || "a Centle Ambassador",
    tier_label: tier.label,
    tier_emoji: tier.emoji,
  });
}
