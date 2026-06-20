import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /r/[code] — Track click and redirect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  // Find referral code
  const { data: referral } = await supabase
    .from("referral_codes")
    .select("id, ambassador_id")
    .eq("link_slug", code)
    .eq("is_active", true)
    .single();

  if (!referral) {
    // Redirect to homepage if code not found
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Track click
  await supabase.from("referral_clicks").insert({
    referral_code_id: referral.id,
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
    referrer_url: request.headers.get("referer") || null,
  });

  // Increment click count
  await supabase.rpc("increment_referral_clicks", { code_id: referral.id });

  // Redirect to homepage with referral param
  return NextResponse.redirect(new URL(`/?ref=${code}`, request.url));
}
