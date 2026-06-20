import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "leads";

  let data: Record<string, unknown>[] = [];
  let filename = "export.csv";

  switch (type) {
    case "leads": {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, title, source, estimated_value, priority, created_at, stage:pipeline_stages(name), assigned_user:profiles!leads_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false });
      data = (leads || []).map((l: any) => ({
        Title: l.title,
        Source: l.source,
        Value: l.estimated_value,
        Priority: l.priority,
        Stage: l.stage?.name || "",
        "Assigned To": l.assigned_user?.full_name || "",
        Created: l.created_at,
      }));
      filename = "leads_export.csv";
      break;
    }
    case "deals": {
      const { data: deals } = await supabase
        .from("deals")
        .select("id, title, value, probability, status, expected_close_date, created_at")
        .order("created_at", { ascending: false });
      data = (deals || []).map((d: any) => ({
        Title: d.title,
        Value: d.value,
        Probability: d.probability,
        Status: d.status,
        "Close Date": d.expected_close_date,
        Created: d.created_at,
      }));
      filename = "deals_export.csv";
      break;
    }
    case "invoices": {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("invoice_number, subtotal, tax_amount, total, status, issue_date, due_date, company:companies(name)")
        .order("created_at", { ascending: false });
      data = (invoices || []).map((i: any) => ({
        "Invoice #": i.invoice_number,
        Company: i.company?.name || "",
        Subtotal: i.subtotal,
        Tax: i.tax_amount,
        Total: i.total,
        Status: i.status,
        "Issue Date": i.issue_date,
        "Due Date": i.due_date,
      }));
      filename = "invoices_export.csv";
      break;
    }
  }

  // Convert to CSV
  if (data.length === 0) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(",")
    ),
  ];
  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
