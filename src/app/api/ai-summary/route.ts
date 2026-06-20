import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const { mode, question } = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch real data from Supabase
    const [leadsRes, dealsRes, tasksRes, companiesRes] = await Promise.all([
      supabase.from("leads").select("id, title, estimated_value, created_at, venture, stage:pipeline_stages(name, is_won_stage, is_lost_stage)"),
      supabase.from("deals").select("id, title, value, status, expected_close_date, lead_id"),
      supabase.from("tasks").select("id, title, status, priority, due_date, venture"),
      supabase.from("companies").select("id, name, industry"),
    ]);

    const leads = leadsRes.data || [];
    const deals = dealsRes.data || [];
    const tasks = tasksRes.data || [];
    const companies = companiesRes.data || [];

    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate key metrics
    const openDeals = deals.filter((d: any) => d.status === "open");
    const wonDeals = deals.filter((d: any) => d.status === "won");
    const pipelineValue = openDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
    const pendingTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in_progress");
    const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < today && t.status !== "completed");
    const expiringSoonDeals = openDeals.filter((d: any) => d.expected_close_date && new Date(d.expected_close_date) <= oneWeekFromNow);

    // Venture Breakdown Logic
    const ventureLeads: Record<string, number> = {};
    const leadIdToVenture: Record<string, string> = {};
    
    leads.forEach((l: any) => {
      const v = l.venture || "Unknown";
      ventureLeads[v] = (ventureLeads[v] || 0) + 1;
      if (l.id) leadIdToVenture[l.id] = v;
    });

    let maxVenture = "N/A";
    let maxLeads = 0;
    for (const [v, count] of Object.entries(ventureLeads)) {
      if (count > maxLeads) {
        maxLeads = count;
        maxVenture = v;
      }
    }
    const topVenture = maxLeads > 0 ? [maxVenture, maxLeads] : null;

    const venturePipeline: Record<string, number> = {};
    openDeals.forEach((d: any) => {
      const v = leadIdToVenture[d.lead_id] || "Unknown";
      venturePipeline[v] = (venturePipeline[v] || 0) + Number(d.value || 0);
    });
    
    const venturePipelineStr = Object.entries(venturePipeline)
      .map(([v, val]) => `${v}: ₹${(val / 10000000).toFixed(2)}Cr`)
      .join(", ");
      
    const ventureLeadsStr = Object.entries(ventureLeads)
      .map(([v, val]) => `${v}: ${val}`)
      .join(", ");

    const contextData = {
      totalLeads: leads.length,
      totalDeals: deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      pipelineValueCr: (pipelineValue / 10000000).toFixed(2),
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      expiringSoonDeals: expiringSoonDeals.length,
      topVenture: topVenture ? `${topVenture[0]} (${topVenture[1]} leads)` : "N/A",
      venturePipelineStr,
      ventureLeadsStr,
      totalCompanies: companies.length,
      conversionRate: leads.length > 0 ? ((wonDeals.length / leads.length) * 100).toFixed(1) : "0",
    };

    if (mode === "chat") {
      const prompt = `You are an intelligent CRM assistant for Saasum, an Indian business ecosystem with ventures: Skill Tank, Saasum, Maceco, Tobofu, Vriddhi, and Promtal.

Current CRM data:
- Total leads: ${contextData.totalLeads}
- Open deals: ${contextData.openDeals}, Won deals: ${contextData.wonDeals}
- Pipeline value: ₹${contextData.pipelineValueCr} Cr
- Pending tasks: ${contextData.pendingTasks}, Overdue: ${contextData.overdueTasks}
- Deals expiring this week: ${contextData.expiringSoonDeals}
- Top venture by leads: ${contextData.topVenture}
- Leads per Venture: ${contextData.ventureLeadsStr}
- Pipeline value per Venture: ${contextData.venturePipelineStr}
- Conversion rate: ${contextData.conversionRate}%
- Total companies: ${contextData.totalCompanies}

Answer this question concisely (2-3 sentences max), be specific and data-driven. Use Indian currency formatting (₹, Cr, L):
"${question}"`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      const text = completion.choices[0]?.message?.content || "I couldn't generate an answer.";
      return NextResponse.json({ answer: text });
    }

    // Default: executive summary mode
    const prompt = `You are an AI executive assistant for Saasum, an Indian B2B CRM ecosystem. Generate a sharp, insightful executive summary.

Real-time CRM snapshot:
- Total leads: ${contextData.totalLeads}
- Open deals: ${contextData.openDeals} worth ₹${contextData.pipelineValueCr} Cr pipeline
- Deals won this period: ${contextData.wonDeals}
- Conversion rate: ${contextData.conversionRate}%
- Pending tasks: ${contextData.pendingTasks} (${contextData.overdueTasks} overdue)
- Deals closing this week: ${contextData.expiringSoonDeals}
- Top performing venture: ${contextData.topVenture}
- Total companies tracked: ${contextData.totalCompanies}

Generate a JSON response with exactly this structure:
{
  "headline": "One sharp sentence about ecosystem health (max 12 words, be specific with numbers)",
  "sentiment": "positive" | "neutral" | "warning",
  "metrics": [
    {"label": "metric name", "value": "specific value with % or ₹", "trend": "up" | "down" | "flat"},
    {"label": "metric name", "value": "specific value with % or ₹", "trend": "up" | "down" | "flat"},
    {"label": "metric name", "value": "specific value with % or ₹", "trend": "up" | "down" | "flat"},
    {"label": "metric name", "value": "specific value with % or ₹", "trend": "up" | "down" | "flat"}
  ],
  "actions": [
    {"priority": "high" | "medium" | "low", "text": "specific action with numbers", "link": "/deals" | "/leads" | "/tasks" | "/pipeline"},
    {"priority": "high" | "medium" | "low", "text": "specific action with numbers", "link": "/deals" | "/leads" | "/tasks" | "/pipeline"},
    {"priority": "high" | "medium" | "low", "text": "specific action with numbers", "link": "/deals" | "/leads" | "/tasks" | "/pipeline"}
  ],
  "forecast": "One sentence revenue forecast for the quarter based on current pipeline velocity"
}

Only return valid JSON object matching this structure. No markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = completion.choices[0]?.message?.content || "{}";

    let summary;
    try {
      summary = JSON.parse(text);
    } catch {
      summary = {
        headline: `${contextData.wonDeals} deals closed — ₹${contextData.pipelineValueCr}Cr pipeline active`,
        sentiment: "positive",
        metrics: [
          { label: "Pipeline", value: `₹${contextData.pipelineValueCr}Cr`, trend: "up" },
          { label: "Conversion", value: `${contextData.conversionRate}%`, trend: "up" },
          { label: "Open Deals", value: `${contextData.openDeals}`, trend: "flat" },
          { label: "Tasks Due", value: `${contextData.pendingTasks}`, trend: "down" },
        ],
        actions: [
          { priority: "high", text: `${contextData.expiringSoonDeals} deals closing this week — review now`, link: "/deals" },
          { priority: "medium", text: `${contextData.overdueTasks} overdue tasks need attention`, link: "/tasks" },
          { priority: "low", text: `${contextData.totalLeads} leads in pipeline — qualify top prospects`, link: "/leads" },
        ],
        forecast: `At current velocity, pipeline closure rate suggests strong Q performance.`,
      };
    }

    return NextResponse.json({ summary, context: contextData });
  } catch (err: any) {
    console.error("AI Summary error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
