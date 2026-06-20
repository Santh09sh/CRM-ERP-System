import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/referral/init — ensures an ambassador has a referral code, creates one if not
export async function POST(request: NextRequest) {
  try {
    const { user_id, name } = await request.json();
    if (!user_id || !name) {
      return NextResponse.json({ error: "Missing user_id or name" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if already has code
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("ambassador_id", user_id)
      .single();

    if (existing) {
      return NextResponse.json({ code: existing });
    }

    // Generate slug
    const slug = name
      .toUpperCase()
      .replace(/\s+/g, "-")
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 20) + "-" + new Date().getFullYear();

    const { data: created, error } = await supabase
      .from("referral_codes")
      .insert({
        ambassador_id: user_id,
        code: slug,
        link_slug: slug,
        commission_rate: 0.014,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create referral code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: created });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
