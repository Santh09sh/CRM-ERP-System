import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/webhooks/inbound — Accept external leads (from forms, referral captures, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Get first pipeline stage
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("display_order")
      .limit(1);

    const stageId = stages?.[0]?.id;

    // ── Referral capture format (from Centle homepage) ──
    if (body.source === "referral" && body.contact) {
      const { contact, referral_code, venture, message } = body;
      const name = contact.name || "Unknown";

      // Resolve referral code ID
      let referralCodeId: string | null = null;
      if (referral_code) {
        const { data: rc } = await supabase
          .from("referral_codes")
          .select("id")
          .eq("link_slug", referral_code)
          .single();
        referralCodeId = rc?.id || null;
      }

      // Upsert contact
      let contactId: string | null = null;
      if (contact.email) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", contact.email)
          .single();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const nameParts = name.split(" ");
          const { data: newContact } = await supabase
            .from("contacts")
            .insert({
              first_name: nameParts[0] || name,
              last_name: nameParts.slice(1).join(" ") || "",
              email: contact.email,
              phone: contact.phone || null,
            })
            .select("id")
            .single();
          contactId = newContact?.id || null;
        }
      }

      // Upsert company if provided
      let companyId: string | null = null;
      if (contact.company) {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", contact.company)
          .single();
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabase
            .from("companies")
            .insert({ name: contact.company })
            .select("id")
            .single();
          companyId = newCompany?.id || null;
        }
      }

      // Create lead
      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          title: `${name} — ${venture || "Centle"} Inquiry`,
          description: message || null,
          source: "referral",
          estimated_value: 0,
          priority: 2,
          stage_id: stageId,
          contact_id: contactId,
          company_id: companyId,
          referral_code_id: referralCodeId,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Fire referral_conversion notification (non-blocking)
      if (referralCodeId) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "referral_conversion",
            data: {
              lead_title: lead.title,
              referral_code: referral_code,
              venture,
              contact_name: name,
              contact_email: contact.email,
            },
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
    }

    // ── Generic webhook format ──
    if (!body.title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        title: body.title,
        description: body.description || null,
        source: body.source || "website_form",
        estimated_value: body.estimated_value || 0,
        priority: body.priority || 2,
        stage_id: stageId,
        custom_fields: body.custom_fields || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
