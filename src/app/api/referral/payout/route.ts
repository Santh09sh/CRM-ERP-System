import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/referral/payout — ambassador requests a payout
// Supports both real users (user_id) and demo users (demo_email lookup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      demo_name,
      amount,
      payment_method_type,
      bank_account_name,
      bank_account_number,
      bank_ifsc,
      upi_id,
      ambassador_notes,
    } = body;

    if (!amount || !payment_method_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount < 100) {
      return NextResponse.json({ error: "Minimum payout is Rs.100" }, { status: 400 });
    }

    if (payment_method_type === "bank" && (!bank_account_number || !bank_ifsc)) {
      return NextResponse.json({ error: "Bank account number and IFSC are required" }, { status: 400 });
    }

    if (payment_method_type === "upi" && !upi_id) {
      return NextResponse.json({ error: "UPI ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    let resolvedId: string;

    if (demo_name) {
      // Demo user: look up the real profile row by name (since emails don't match for demo)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", demo_name)
        .single();

      if (error || !profile) {
        return NextResponse.json(
          { error: "Demo ambassador profile not found. Please run the ambassador migration SQL in Supabase first." },
          { status: 404 }
        );
      }
      resolvedId = profile.id;
    } else if (user_id) {
      resolvedId = user_id;
    } else {
      return NextResponse.json({ error: "Missing user_id or demo_name" }, { status: 400 });
    }

    // Check available balance via referral_codes table
    const { data: rc } = await supabase
      .from("referral_codes")
      .select("total_earned")
      .eq("ambassador_id", resolvedId)
      .maybeSingle();

    const { data: existingPayouts } = await supabase
      .from("payouts")
      .select("amount, status")
      .eq("ambassador_id", resolvedId)
      .in("status", ["requested", "approved", "processing", "paid"]);

    const alreadyClaimed = (existingPayouts || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    
    // For demo users, use the mock total earned of 8400. Otherwise, use real DB stats.
    const baseEarned = demo_name ? 8400 : Number(rc?.total_earned || 0);
    const available = baseEarned - alreadyClaimed;

    if (amount > available) {
      return NextResponse.json({ error: `Insufficient balance. Available: Rs.${available.toFixed(0)}` }, { status: 400 });
    }

    const { data: payout, error } = await supabase
      .from("payouts")
      .insert({
        ambassador_id: resolvedId,
        amount,
        status: "requested",
        payment_method_type,
        bank_account_name: bank_account_name || null,
        bank_account_number: bank_account_number || null,
        bank_ifsc: bank_ifsc ? String(bank_ifsc).toUpperCase() : null,
        upi_id: upi_id || null,
        ambassador_notes: ambassador_notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Payout insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payout });
  } catch (err: any) {
    console.error("Payout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
