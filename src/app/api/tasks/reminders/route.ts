import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ─── Email via Resend ────────────────────────────────────────

async function sendEmail(to: string, subject: string, body: string) {
  const htmlContent = `
    <div style="font-family: 'Inter', system-ui, sans-serif; background: #050505; color: #fff; padding: 40px; max-width: 560px; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <span style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">Saasum CRM · Task Reminder</span>
      </div>
      <h2 style="font-size: 20px; margin-bottom: 16px; color: #fff; font-weight: 600;">${subject}</h2>
      <div style="background: #111; border: 1px solid #222; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="color: #A3A3A3; font-size: 14px; line-height: 1.7; margin: 0;">${body}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #1A1A1A; margin: 24px 0;" />
      <p style="color: #444; font-size: 11px; margin: 0;">Centle Group · Saasum CRM — Automated reminder</p>
    </div>
  `;

  // 1. Try Gmail (Nodemailer) First
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Saasum CRM" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
      });

      return { status: "sent" as const, channel: "email" as const };
    } catch (err) {
      console.error("[GMAIL ERROR]", err);
      return { status: "failed" as const, channel: "email" as const, error: String(err) };
    }
  }

  // 2. Fallback to Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith("re_") === false) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { status: "simulated" as const, channel: "email" as const };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Saasum CRM <notifications@saasum.in>",
        to: [to],
        subject,
        html: htmlContent,
      }),
    });
    return { status: res.ok ? ("sent" as const) : ("failed" as const), channel: "email" as const };
  } catch (err) {
    console.error("[RESEND ERROR]", err);
    return { status: "failed" as const, channel: "email" as const, error: String(err) };
  }
}

// ─── WhatsApp via Twilio ──────────────────────────────────────

async function sendWhatsApp(phone: string, message: string) {
  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!ACCOUNT_SID || !AUTH_TOKEN || !TWILIO_NUMBER || ACCOUNT_SID.startsWith("your_")) {
    console.log(`[WHATSAPP SIMULATED (Twilio)] Phone: ${phone} | Message: ${message}`);
    return { status: "simulated" as const, channel: "whatsapp" as const };
  }

  try {
    // Clean phone number — remove spaces, dashes, ensure + country code
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone.startsWith("+")) cleanPhone = "+" + cleanPhone;

    const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
    
    const params = new URLSearchParams();
    params.append("To", `whatsapp:${cleanPhone}`);
    params.append("From", `whatsapp:${TWILIO_NUMBER}`);
    params.append("Body", message);

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await res.json();
    return {
      status: res.ok ? ("sent" as const) : ("failed" as const),
      channel: "whatsapp" as const,
      ...(data.message ? { error: data.message } : {}),
    };
  } catch (err) {
    console.error("[TWILIO ERROR]", err);
    return { status: "failed" as const, channel: "whatsapp" as const, error: String(err) };
  }
}

// ─── Telegram via Bot API ───────────────────────────────────

async function sendTelegram(chatId: string, message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN || BOT_TOKEN.startsWith("your_")) {
    console.log(`[TELEGRAM SIMULATED] ChatId: ${chatId} | Message: ${message}`);
    return { status: "simulated" as const, channel: "telegram" as const };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId || process.env.TELEGRAM_CHANNEL_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await res.json();
    
    if (!res.ok) {
      console.error("[TELEGRAM API FAILED]", data);
    }

    return {
      status: res.ok ? ("sent" as const) : ("failed" as const),
      channel: "telegram" as const,
      ...(data.description ? { error: data.description } : {}),
    };
  } catch (err) {
    console.error("[TELEGRAM ERROR]", err);
    return { status: "failed" as const, channel: "telegram" as const, error: String(err) };
  }
}

// ─── POST Handler ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_title, message, channels, recipient, due_date } = body;

    if (!task_title || !message || !channels?.length || !recipient) {
      return NextResponse.json(
        { error: "Missing required fields: task_title, message, channels, recipient" },
        { status: 400 }
      );
    }

    const results: { channel: string; status: string; error?: string }[] = [];

    // Format the reminder message
    const emailSubject = `⏰ Reminder: ${task_title}`;
    const dueLine = due_date ? `\nDue: ${new Date(due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "";

    // ─── Email ───
    if (channels.includes("email") && recipient.email) {
      const emailBody = `${message}${dueLine ? `<br/><br/><strong>Due date:</strong> ${dueLine.replace("\nDue: ", "")}` : ""}`;
      const result = await sendEmail(recipient.email, emailSubject, emailBody);
      results.push(result);
    }

    // ─── WhatsApp ───
    if (channels.includes("whatsapp") && recipient.phone) {
      const waMessage = `📋 *Task Reminder — Saasum CRM*\n\n*${task_title}*\n\n${message}${dueLine}\n\n— Saasum CRM`;
      const result = await sendWhatsApp(recipient.phone, waMessage);
      results.push(result);
    }

    // ─── Telegram ───
    if (channels.includes("telegram")) {
      const tgChatId = recipient.telegram_chat_id || process.env.TELEGRAM_CHANNEL_ID || "";
      const tgMessage = `⏰ <b>Task Reminder</b>\n\n<b>${task_title}</b>\n\n${message}${dueLine}\n\n— Saasum CRM`;
      const result = await sendTelegram(tgChatId, tgMessage);
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[REMINDER API ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
