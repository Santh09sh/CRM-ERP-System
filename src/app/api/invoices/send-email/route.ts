import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Currency formatter
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Gmail transporter (reused across requests)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { to, message, invoice } = await req.json();

    if (!to || !invoice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build line items HTML
    const lineItemsHTML = invoice.items
      .map(
        (item: { description: string; quantity: number; unit_price: number; total: number }) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#d4d4d4;font-size:14px;">${item.description}</td>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:14px;text-align:right;">${item.quantity}</td>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#888;font-size:14px;text-align:right;">${formatCurrency(item.unit_price)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#a3a3a3;font-size:14px;text-align:right;font-family:monospace;">${formatCurrency(item.total)}</td>
        </tr>`
      )
      .join("");

    const statusColors: Record<string, string> = {
      paid: "#22c55e", sent: "#f59e0b", overdue: "#ef4444", draft: "#666",
    };
    const statusColor = statusColors[invoice.status] ?? "#666";

    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
      <div>
        <p style="color:#555;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 4px;">Invoice</p>
        <p style="color:#fff;font-size:22px;font-weight:700;font-family:monospace;margin:0;">${invoice.invoice_number}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">SAASUM</p>
        <p style="color:#555;font-size:11px;margin:4px 0 0;">Centle Group · Hyderabad, India</p>
      </div>
    </div>

    <div style="border-top:1px solid #1a1a1a;margin-bottom:28px;"></div>

    <!-- Bill To + Dates -->
    <div style="display:flex;justify-content:space-between;margin-bottom:28px;">
      <div>
        <p style="color:#555;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px;">Bill To</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 4px;">${invoice.company}</p>
        <p style="color:#888;font-size:13px;margin:0;">${invoice.contact}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:#666;font-size:12px;margin:0 0 4px;">Issue: <span style="color:#a3a3a3;font-family:monospace;">${formatDate(invoice.issue_date)}</span></p>
        <p style="color:#666;font-size:12px;margin:0 0 4px;">Due: <span style="color:#a3a3a3;font-family:monospace;">${formatDate(invoice.due_date)}</span></p>
        <p style="color:#666;font-size:12px;margin:0 0 10px;">Deal: <span style="color:#a3a3a3;">${invoice.deal}</span></p>
        <span style="background:${statusColor}22;color:${statusColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.1em;">${invoice.status}</span>
      </div>
    </div>

    ${message ? `<div style="background:#111;border:1px solid #1a1a1a;border-radius:10px;padding:16px 20px;margin-bottom:24px;"><p style="color:#a3a3a3;font-size:13px;line-height:1.7;margin:0;white-space:pre-line;">${message}</p></div>` : ""}

    <!-- Line Items -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr>
          <th style="text-align:left;color:#444;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;padding:0 0 10px;border-bottom:1px solid #222;font-weight:500;">Description</th>
          <th style="text-align:right;color:#444;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;padding:0 0 10px;border-bottom:1px solid #222;font-weight:500;">Qty</th>
          <th style="text-align:right;color:#444;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;padding:0 0 10px;border-bottom:1px solid #222;font-weight:500;">Unit Price</th>
          <th style="text-align:right;color:#444;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;padding:0 0 10px;border-bottom:1px solid #222;font-weight:500;">Amount</th>
        </tr>
      </thead>
      <tbody>${lineItemsHTML}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:36px;">
      <div style="width:260px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a;">
          <span style="color:#666;font-size:13px;">Subtotal</span>
          <span style="color:#a3a3a3;font-size:13px;font-family:monospace;">${formatCurrency(invoice.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a;">
          <span style="color:#666;font-size:13px;">GST (18%)</span>
          <span style="color:#a3a3a3;font-size:13px;font-family:monospace;">${formatCurrency(invoice.tax_amount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;">
          <span style="color:#fff;font-size:15px;font-weight:700;">Total</span>
          <span style="color:#fff;font-size:15px;font-weight:700;font-family:monospace;">${formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1a1a1a;padding-top:20px;text-align:center;">
      <p style="color:#333;font-size:11px;margin:0;">Sent from <strong style="color:#555;">Saasum CRM</strong> · Centle Group, Hyderabad</p>
      <p style="color:#222;font-size:10px;margin:6px 0 0;">Reply to this email if you have any questions.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Saasum Invoices" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Invoice ${invoice.invoice_number} from Saasum — ${invoice.company}`,
      html: emailHTML,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Send invoice error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
