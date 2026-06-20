import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase (server-side) ───────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ───────────────────────────────────────────────────────
export type EventType =
  | "lead_assigned"
  | "stage_changed"
  | "deal_won"
  | "invoice_generated"
  | "referral_conversion"
  | "payout_processed"
  | "task_due"
  | "task_overdue";

type SendResult = { channel: string; status: string; subject: string; recipient?: string; error?: string };

// ─── Log helper ──────────────────────────────────────────────────
async function logNotification(entry: Omit<SendResult, "error"> & { error?: string }) {
  try {
    await supabase.from("notification_log").insert({
      event_type: (entry as any).event_type,
      channel: entry.channel,
      subject: entry.subject,
      recipient: entry.recipient || null,
      status: entry.status,
      error: entry.error || null,
    });
  } catch (e) {
    console.error("[LOG ERROR]", e);
  }
}

// ─── Email via Resend ─────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<{ status: string; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { status: "simulated" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Saasum CRM <notifications@saasum.in>",
        to: [to],
        subject,
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; background: #050505; color: #fff; padding: 40px; max-width: 500px; border-radius: 12px;">
            <p style="font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 24px;">Saasum CRM · Centle Group</p>
            <h2 style="font-size: 20px; margin-bottom: 16px; color: #fff; font-weight: 600;">${subject}</h2>
            <div style="background: #111; border: 1px solid #1A1A1A; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #A3A3A3; font-size: 14px; line-height: 1.7; margin: 0;">${body}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #1A1A1A; margin: 24px 0;" />
            <p style="color: #333; font-size: 11px;">This is an automated notification from Saasum CRM.</p>
          </div>
        `,
      }),
    });
    const err = res.ok ? undefined : (await res.json())?.message;
    return { status: res.ok ? "delivered" : "failed", error: err };
  } catch (err) {
    return { status: "failed", error: String(err) };
  }
}

// ─── Telegram via Bot API ────────────────────────────────────────
async function sendTelegram(chatId: string, message: string): Promise<{ status: string; error?: string }> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId || process.env.TELEGRAM_CHANNEL_ID || "";
  if (!BOT_TOKEN || !target) {
    console.log(`[TELEGRAM SIMULATED] ${message}`);
    return { status: "simulated" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: target, text: message, parse_mode: "HTML" }),
    });
    const data = await res.json();
    return { status: res.ok ? "delivered" : "failed", error: data.description };
  } catch (err) {
    return { status: "failed", error: String(err) };
  }
}

// ─── WhatsApp via Meta Cloud API ─────────────────────────────────
async function sendWhatsApp(phone: string, message: string): Promise<{ status: string; error?: string }> {
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!PHONE_ID || !TOKEN) {
    console.log(`[WHATSAPP SIMULATED] ${phone}: ${message}`);
    return { status: "simulated" };
  }
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      }),
    });
    const data = await res.json();
    return { status: res.ok ? "delivered" : "failed", error: data.error?.message };
  } catch (err) {
    return { status: "failed", error: String(err) };
  }
}

// ─── Event → Message Templates ───────────────────────────────────
function buildMessages(event_type: EventType, data: Record<string, any>): {
  subject: string;
  emailBody: string;
  telegramMsg: string;
  whatsappMsg: string;
} {
  const fmt = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  const templates: Record<EventType, { subject: string; emailBody: string; telegram: string; whatsapp: string }> = {
    lead_assigned: {
      subject: `📌 New Lead Assigned: ${data.title || "Unknown"}`,
      emailBody: `A new lead <strong>${data.title}</strong> has been assigned to <strong>${data.assigned_to_name || "you"}</strong>.<br/><br/>Source: ${data.source || "N/A"}<br/>Estimated Value: ${fmt(data.estimated_value || 0)}`,
      telegram: `📌 <b>New Lead Assigned</b>\n\n<b>${data.title}</b>\nAssigned to: ${data.assigned_to_name || "N/A"}\nSource: ${data.source || "N/A"}\nValue: ${fmt(data.estimated_value || 0)}`,
      whatsapp: `📌 *New Lead Assigned*\n\n*${data.title}*\nAssigned to: ${data.assigned_to_name || "N/A"}\nValue: ${fmt(data.estimated_value || 0)}`,
    },
    stage_changed: {
      subject: `🔄 Lead "${data.title}" → ${data.new_stage}`,
      emailBody: `The lead <strong>${data.title}</strong> has been moved from <strong>${data.old_stage || "?"}</strong> to <strong>${data.new_stage}</strong>.`,
      telegram: `🔄 <b>Stage Changed</b>\n\n<b>${data.title}</b>\n${data.old_stage || "?"} → <b>${data.new_stage}</b>`,
      whatsapp: `🔄 *Stage Changed*\n\n*${data.title}*\n${data.old_stage || "?"} → ${data.new_stage}`,
    },
    deal_won: {
      subject: `🎉 Deal Won: ${data.title} — ${fmt(data.value || 0)}`,
      emailBody: `Congratulations! The deal <strong>${data.title}</strong> for <strong>${data.company || "the client"}</strong> has been closed successfully.<br/><br/>Deal Value: <strong>${fmt(data.value || 0)}</strong>`,
      telegram: `🎉 <b>Deal Won!</b>\n\n<b>${data.title}</b>\nCompany: ${data.company || "N/A"}\nValue: <b>${fmt(data.value || 0)}</b>`,
      whatsapp: `🎉 *Deal Won!*\n\n*${data.title}*\nCompany: ${data.company || "N/A"}\nValue: ${fmt(data.value || 0)}`,
    },
    invoice_generated: {
      subject: `📄 Invoice ${data.invoice_number} — ${fmt(data.total || 0)}`,
      emailBody: `A new invoice <strong>${data.invoice_number}</strong> has been generated for <strong>${data.company || "the client"}</strong>.<br/><br/>Amount: <strong>${fmt(data.total || 0)}</strong>`,
      telegram: `📄 <b>Invoice Generated</b>\n\n<b>${data.invoice_number}</b>\nCompany: ${data.company || "N/A"}\nAmount: <b>${fmt(data.total || 0)}</b>`,
      whatsapp: `📄 *Invoice Generated*\n\n*${data.invoice_number}*\nCompany: ${data.company || "N/A"}\nAmount: ${fmt(data.total || 0)}`,
    },
    referral_conversion: {
      subject: `💰 Referral Converted — Commission: ${fmt(data.commission || 0)}`,
      emailBody: `A lead from your referral code has been converted to a deal.<br/><br/>Deal: <strong>${data.deal_title || "N/A"}</strong><br/>Commission: <strong>${fmt(data.commission || 0)}</strong>`,
      telegram: `💰 <b>Referral Converted!</b>\n\nDeal: ${data.deal_title || "N/A"}\nCommission: <b>${fmt(data.commission || 0)}</b>`,
      whatsapp: `💰 *Referral Converted!*\n\nDeal: ${data.deal_title || "N/A"}\nCommission: ${fmt(data.commission || 0)}`,
    },
    payout_processed: {
      subject: `✅ Payout Approved: ${fmt(data.amount || 0)}`,
      emailBody: `Your payout request for <strong>${fmt(data.amount || 0)}</strong> has been approved and is being processed.`,
      telegram: `✅ <b>Payout Approved!</b>\n\nAmount: <b>${fmt(data.amount || 0)}</b>\nAmbassador: ${data.ambassador_name || "N/A"}`,
      whatsapp: `✅ *Payout Approved!*\n\nAmount: ${fmt(data.amount || 0)}\nProcessing in 2-3 business days.`,
    },
    task_due: {
      subject: `⏰ Task Due Soon: ${data.title}`,
      emailBody: `Your task <strong>${data.title}</strong>${data.lead_name ? ` for <strong>${data.lead_name}</strong>` : ""} is due soon.<br/><br/>Due: <strong>${data.due_date || "soon"}</strong>`,
      telegram: `⏰ <b>Task Due Soon</b>\n\n<b>${data.title}</b>${data.lead_name ? `\nRelated to: ${data.lead_name}` : ""}\nDue: ${data.due_date || "soon"}`,
      whatsapp: `⏰ *Task Due Soon*\n\n*${data.title}*${data.lead_name ? `\nRelated to: ${data.lead_name}` : ""}\nDue: ${data.due_date || "soon"}`,
    },
    task_overdue: {
      subject: `🚨 Task Overdue: ${data.title}`,
      emailBody: `Your task <strong>${data.title}</strong> is now overdue! It was due on <strong>${data.due_date}</strong>. Please action this immediately.`,
      telegram: `🚨 <b>Task Overdue!</b>\n\n<b>${data.title}</b>\nWas due: ${data.due_date}`,
      whatsapp: `🚨 *Task Overdue!*\n\n*${data.title}*\nWas due: ${data.due_date}\nPlease action immediately.`,
    },
  };

  const t = templates[event_type] || templates.task_due;
  return { subject: t.subject, emailBody: t.emailBody, telegramMsg: t.telegram, whatsappMsg: t.whatsapp };
}

// ─── POST Handler ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, data } = body as { event_type: EventType; data: Record<string, any> };

    if (!event_type || !data) {
      return NextResponse.json({ error: "Missing event_type or data" }, { status: 400 });
    }

    const { subject, emailBody, telegramMsg, whatsappMsg } = buildMessages(event_type, data);
    const results: SendResult[] = [];

    // ── Email ──
    if (data.email) {
      const r = await sendEmail(data.email, subject, emailBody);
      const entry = { event_type, channel: "email", subject, recipient: data.email, ...r };
      await logNotification(entry);
      results.push(entry);
    }

    // ── Telegram (always to channel) ──
    const tgChatId = data.telegram_chat_id || process.env.TELEGRAM_CHANNEL_ID || "";
    const tgResult = await sendTelegram(tgChatId, telegramMsg);
    const tgEntry = { event_type, channel: "telegram", subject, recipient: tgChatId, ...tgResult };
    await logNotification(tgEntry);
    results.push(tgEntry);

    // ── WhatsApp (only if phone provided) ──
    if (data.phone) {
      const waResult = await sendWhatsApp(data.phone, whatsappMsg);
      const waEntry = { event_type, channel: "whatsapp", subject, recipient: data.phone, ...waResult };
      await logNotification(waEntry);
      results.push(waEntry);
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
