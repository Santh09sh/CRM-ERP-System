// ─── AI Next Action Engine ──────────────────────────────────────────────────
// Analyzes a lead's stage, activity history, deal data, and timing to produce
// intelligent, contextual next-action recommendations.

import type { ActivityType } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AINextAction {
  action: string;            // e.g. "Send a tailored proposal"
  reason: string;            // why this action
  urgency: "low" | "medium" | "high" | "critical";
  icon: string;              // emoji
  category: "outreach" | "follow_up" | "qualify" | "propose" | "negotiate" | "close" | "recover";
  estimated_impact: number;  // 1-100, how much this action would move the needle
  time_to_act: string;       // "Today", "Within 2 days", "This week"
  script?: string;           // suggested email/call script snippet
}

export interface AILeadAnalysis {
  health_score: number;        // 0-100
  health_label: string;        // "Hot", "Warm", "Cooling", "Cold", "At Risk"
  health_color: string;        // hex color
  momentum: "accelerating" | "steady" | "stalling" | "stalled";
  momentum_icon: string;
  days_in_stage: number;
  days_since_last_activity: number;
  total_activities: number;
  activity_frequency: string;  // "High", "Medium", "Low", "None"
  next_actions: AINextAction[];
  risk_signals: string[];
  win_probability: number;     // 0-100
  stage_benchmark: string;     // "Average leads in this stage convert in 5 days"
  summary: string;             // 1-liner AI summary
}

// ─── Stage Metadata ────────────────────────────────────────────────────────

const STAGE_META: Record<string, {
  order: number;
  avg_days: number;     // average days healthy leads spend here
  base_prob: number;    // base conversion probability
  ideal_actions: ActivityType[];
  stale_days: number;   // after this many days with no activity, it's stale
}> = {
  "New":         { order: 1, avg_days: 3,  base_prob: 15, ideal_actions: ["call", "email"],             stale_days: 3  },
  "Contacted":   { order: 2, avg_days: 5,  base_prob: 30, ideal_actions: ["call", "email", "meeting"],  stale_days: 5  },
  "Qualified":   { order: 3, avg_days: 7,  base_prob: 50, ideal_actions: ["meeting", "email"],          stale_days: 7  },
  "Proposal":    { order: 4, avg_days: 10, base_prob: 65, ideal_actions: ["email", "call"],             stale_days: 8  },
  "Negotiation": { order: 5, avg_days: 14, base_prob: 80, ideal_actions: ["call", "meeting"],           stale_days: 10 },
  "Won":         { order: 6, avg_days: 0,  base_prob: 100, ideal_actions: [],                           stale_days: 999 },
  "Lost":        { order: 7, avg_days: 0,  base_prob: 0,  ideal_actions: [],                            stale_days: 999 },
};

// ─── Action Templates ──────────────────────────────────────────────────────

interface ActionTemplate {
  action: string;
  reason: string;
  icon: string;
  category: AINextAction["category"];
  script?: string;
}

const STAGE_ACTIONS: Record<string, ActionTemplate[]> = {
  "New": [
    {
      action: "Make a warm introduction call within 2 hours",
      reason: "Leads contacted within 2 hours of creation are 7x more likely to convert. Speed is your biggest advantage right now.",
      icon: "📞",
      category: "outreach",
      script: "Hi {contact}, this is {rep} from Saasum. I noticed you showed interest in {title} — I'd love to understand your needs better. Do you have 5 minutes?",
    },
    {
      action: "Send a personalized welcome email with case study",
      reason: "A value-first email builds credibility before the first call. Include a relevant case study from their industry.",
      icon: "✉️",
      category: "outreach",
      script: "Subject: {contact}, here's how we helped {industry} companies like yours\n\nHi {contact},\n\nThanks for your interest. I wanted to share how we recently helped [similar company] achieve [result].\n\nWould love to learn about your specific needs — are you free for a quick 10-min call this week?",
    },
  ],
  "Contacted": [
    {
      action: "Schedule a discovery call to qualify needs",
      reason: "You've made contact — now deepen the relationship. A structured discovery call reveals budget, timeline, and decision-makers.",
      icon: "🎯",
      category: "qualify",
      script: "Hi {contact}, great connecting earlier! I'd love to dive deeper into your requirements. Can we schedule a 20-minute discovery call? I'll prepare some tailored solutions for {company}.",
    },
    {
      action: "Send a follow-up with 3 key questions",
      reason: "If the initial contact didn't lead to a meeting, re-engage with value. Asking smart questions positions you as a consultant, not a seller.",
      icon: "💡",
      category: "follow_up",
    },
  ],
  "Qualified": [
    {
      action: "Prepare and send a tailored proposal",
      reason: "This lead is qualified — don't let momentum die. A proposal within 48 hours of qualification shows professionalism and urgency.",
      icon: "📋",
      category: "propose",
    },
    {
      action: "Schedule a solution demo with the decision-maker",
      reason: "Seeing is believing. A live demo with the actual decision-maker can accelerate the deal by 2-3 weeks.",
      icon: "🎬",
      category: "propose",
    },
  ],
  "Proposal": [
    {
      action: "Follow up on proposal — address specific concerns",
      reason: "Most proposals die from silence, not rejection. A targeted follow-up within 3 days shows you're invested in their success.",
      icon: "🔄",
      category: "follow_up",
      script: "Hi {contact}, just checking in on the proposal I sent for {title}. I'd love to walk you through any sections that need clarification. What questions do you have?",
    },
    {
      action: "Share a testimonial from a similar client",
      reason: "Social proof reduces perceived risk at the proposal stage. Match industry and company size for maximum impact.",
      icon: "⭐",
      category: "propose",
    },
  ],
  "Negotiation": [
    {
      action: "Schedule a final alignment call with stakeholders",
      reason: "You're in the red zone. Get all decision-makers in one room to address final objections and close the deal.",
      icon: "🤝",
      category: "negotiate",
      script: "Hi {contact}, we're close to finalizing! Let's get {decision_maker} on a quick 15-min call to iron out the last details. When works for your team?",
    },
    {
      action: "Prepare a limited-time incentive or early-bird offer",
      reason: "Creating urgency at the negotiation stage can shorten close time by 40%. Offer value, not just discounts.",
      icon: "⚡",
      category: "close",
    },
  ],
  "Won": [
    {
      action: "Send a thank-you note and onboarding checklist",
      reason: "The deal is won, but the relationship is just starting. A smooth onboarding sets the stage for upsells and referrals.",
      icon: "🎉",
      category: "close",
    },
  ],
  "Lost": [
    {
      action: "Send a gracious breakup email — leave the door open",
      reason: "30% of lost deals reopen within 6 months. A classy exit keeps you top of mind.",
      icon: "💌",
      category: "recover",
      script: "Hi {contact}, I understand the timing wasn't right for {title}. No hard feelings — we'd love to reconnect when your needs evolve. Wishing you and {company} all the best.",
    },
  ],
};

// ─── Stale Lead Actions ────────────────────────────────────────────────────

const STALE_ACTIONS: ActionTemplate[] = [
  {
    action: "Send a 'just checking in' re-engagement email",
    reason: "This lead has gone quiet. A friendly check-in can revive stalled conversations without being pushy.",
    icon: "🔔",
    category: "follow_up",
    script: "Hi {contact}, it's been a while since we last connected about {title}. I wanted to see if anything has changed on your end. Happy to pick up where we left off whenever you're ready.",
  },
  {
    action: "Try a different communication channel",
    reason: "If email isn't working, try a call or LinkedIn message. Different channels break through different barriers.",
    icon: "📱",
    category: "follow_up",
  },
];

// ─── Core Analysis Engine ──────────────────────────────────────────────────

export function analyzeLeadForNextAction(
  lead: {
    title: string;
    source: string;
    estimated_value: number;
    priority: number;       // 1-4
    created_at: string;
    updated_at: string;
    stage?: { name: string; color?: string };
    contact?: { first_name?: string; last_name?: string; email?: string };
    company?: { name?: string; industry?: string };
    assigned_user?: { full_name?: string };
  },
  activities: {
    type: string;
    subject: string;
    activity_date: string;
    created_at: string;
  }[],
  stageHistory?: {
    to_stage?: { name: string };
    changed_at: string;
  }[]
): AILeadAnalysis {
  const now = Date.now();
  const stageName = lead.stage?.name || "New";
  const meta = STAGE_META[stageName] || STAGE_META["New"];

  // ─── Timing calculations ─────────────────────────────────────
  const createdAt = new Date(lead.created_at).getTime();
  const leadAgeDays = Math.floor((now - createdAt) / 864e5);

  // Days in current stage
  let stageEntryDate = createdAt;
  if (stageHistory?.length) {
    const currentStageEntry = [...stageHistory]
      .reverse()
      .find(h => h.to_stage?.name === stageName);
    if (currentStageEntry) {
      stageEntryDate = new Date(currentStageEntry.changed_at).getTime();
    }
  }
  const daysInStage = Math.max(0, Math.floor((now - stageEntryDate) / 864e5));

  // Last activity
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
  );
  const lastActivity = sortedActivities[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor((now - new Date(lastActivity.activity_date).getTime()) / 864e5)
    : leadAgeDays;

  // Activity frequency
  const totalActivities = activities.length;
  const activityDensity = leadAgeDays > 0 ? totalActivities / leadAgeDays : totalActivities;
  let activityFrequency: string;
  if (activityDensity >= 0.5) activityFrequency = "High";
  else if (activityDensity >= 0.2) activityFrequency = "Medium";
  else if (totalActivities > 0) activityFrequency = "Low";
  else activityFrequency = "None";

  // Activity type coverage
  const activityTypes = new Set(activities.map(a => a.type));
  const idealCoverage = meta.ideal_actions.length > 0
    ? meta.ideal_actions.filter(t => activityTypes.has(t)).length / meta.ideal_actions.length
    : 1;

  // ─── Health Score (0-100) ─────────────────────────────────────
  let healthScore = meta.base_prob;

  // Boost for high activity
  if (activityFrequency === "High") healthScore += 15;
  else if (activityFrequency === "Medium") healthScore += 8;
  else if (activityFrequency === "None") healthScore -= 20;

  // Boost for ideal action coverage
  healthScore += Math.round(idealCoverage * 10);

  // Penalty for stale leads
  if (daysSinceLastActivity > meta.stale_days) {
    const staleness = Math.min(30, daysSinceLastActivity - meta.stale_days);
    healthScore -= staleness * 2;
  }

  // Penalty for being too long in stage
  if (daysInStage > meta.avg_days * 2) {
    healthScore -= 15;
  } else if (daysInStage > meta.avg_days) {
    healthScore -= 8;
  }

  // Boost for high value
  if (lead.estimated_value > 200000) healthScore += 5;
  if (lead.estimated_value > 500000) healthScore += 5;

  // Boost for priority
  if (lead.priority >= 3) healthScore += 5;
  if (lead.priority >= 4) healthScore += 5;

  // Boost for referral source
  if (lead.source === "referral") healthScore += 8;

  healthScore = Math.max(0, Math.min(100, healthScore));

  // ─── Health Label ─────────────────────────────────────────────
  let healthLabel: string;
  let healthColor: string;
  if (healthScore >= 80) { healthLabel = "Hot"; healthColor = "#22C55E"; }
  else if (healthScore >= 60) { healthLabel = "Warm"; healthColor = "#F59E0B"; }
  else if (healthScore >= 40) { healthLabel = "Cooling"; healthColor = "#F97316"; }
  else if (healthScore >= 20) { healthLabel = "Cold"; healthColor = "#6366F1"; }
  else { healthLabel = "At Risk"; healthColor = "#EF4444"; }

  // ─── Momentum ─────────────────────────────────────────────────
  let momentum: AILeadAnalysis["momentum"];
  let momentumIcon: string;
  if (daysSinceLastActivity <= 1 && totalActivities >= 3) {
    momentum = "accelerating"; momentumIcon = "🚀";
  } else if (daysSinceLastActivity <= meta.stale_days / 2) {
    momentum = "steady"; momentumIcon = "📈";
  } else if (daysSinceLastActivity <= meta.stale_days) {
    momentum = "stalling"; momentumIcon = "⚠️";
  } else {
    momentum = "stalled"; momentumIcon = "🔴";
  }

  // ─── Risk Signals ─────────────────────────────────────────────
  const riskSignals: string[] = [];
  if (daysSinceLastActivity > meta.stale_days) {
    riskSignals.push(`No activity for ${daysSinceLastActivity} days — lead is going cold`);
  }
  if (daysInStage > meta.avg_days * 2) {
    riskSignals.push(`Stuck in "${stageName}" for ${daysInStage} days (avg is ${meta.avg_days}d)`);
  }
  if (totalActivities === 0 && leadAgeDays > 1) {
    riskSignals.push("Zero activities logged — this lead hasn't been touched");
  }
  if (totalActivities > 0 && !activityTypes.has("call") && meta.ideal_actions.includes("call")) {
    riskSignals.push("No phone calls made — personal contact dramatically increases conversion");
  }
  if (lead.priority >= 3 && daysSinceLastActivity > 2) {
    riskSignals.push("High priority lead with recent inactivity");
  }

  // ─── Win Probability ─────────────────────────────────────────
  const winProbability = Math.max(0, Math.min(100, Math.round(
    meta.base_prob * (1 + (healthScore - 50) / 100)
  )));

  // ─── Generate Next Actions ───────────────────────────────────
  const nextActions: AINextAction[] = [];

  // Primary: stage-based actions
  const stageActions = STAGE_ACTIONS[stageName] || STAGE_ACTIONS["New"];
  for (const template of stageActions) {
    const urgency = getUrgency(daysSinceLastActivity, daysInStage, meta, lead.priority);
    const impact = getImpact(template.category, healthScore, daysInStage, meta);
    const timeToAct = getTimeToAct(urgency);

    let script = template.script;
    if (script) {
      script = script
        .replace(/\{contact\}/g, lead.contact?.first_name || "there")
        .replace(/\{title\}/g, lead.title)
        .replace(/\{company\}/g, lead.company?.name || "your company")
        .replace(/\{rep\}/g, lead.assigned_user?.full_name || "our team")
        .replace(/\{industry\}/g, lead.company?.industry || "your industry")
        .replace(/\{decision_maker\}/g, "the key stakeholder");
    }

    nextActions.push({
      action: template.action,
      reason: template.reason,
      urgency,
      icon: template.icon,
      category: template.category,
      estimated_impact: impact,
      time_to_act: timeToAct,
      script,
    });
  }

  // Secondary: stale-specific actions if applicable
  if (daysSinceLastActivity > meta.stale_days && stageName !== "Won" && stageName !== "Lost") {
    for (const template of STALE_ACTIONS) {
      let script = template.script;
      if (script) {
        script = script
          .replace(/\{contact\}/g, lead.contact?.first_name || "there")
          .replace(/\{title\}/g, lead.title)
          .replace(/\{company\}/g, lead.company?.name || "your company");
      }

      nextActions.push({
        action: template.action,
        reason: template.reason,
        urgency: "high",
        icon: template.icon,
        category: template.category,
        estimated_impact: 60,
        time_to_act: "Today",
        script,
      });
    }
  }

  // Sort by estimated_impact descending
  nextActions.sort((a, b) => b.estimated_impact - a.estimated_impact);

  // ─── Stage Benchmark ─────────────────────────────────────────
  const stageBenchmark = `Average leads in "${stageName}" stage convert in ${meta.avg_days} days. This lead has been here ${daysInStage} days.`;

  // ─── Summary ─────────────────────────────────────────────────
  const summary = generateSummary(lead, stageName, healthLabel, momentum, daysSinceLastActivity, daysInStage, nextActions[0]);

  return {
    health_score: healthScore,
    health_label: healthLabel,
    health_color: healthColor,
    momentum,
    momentum_icon: momentumIcon,
    days_in_stage: daysInStage,
    days_since_last_activity: daysSinceLastActivity,
    total_activities: totalActivities,
    activity_frequency: activityFrequency,
    next_actions: nextActions,
    risk_signals: riskSignals,
    win_probability: winProbability,
    stage_benchmark: stageBenchmark,
    summary,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getUrgency(
  daysSinceActivity: number,
  daysInStage: number,
  meta: { stale_days: number; avg_days: number },
  priority: number
): AINextAction["urgency"] {
  if (daysSinceActivity > meta.stale_days * 1.5 || priority >= 4) return "critical";
  if (daysSinceActivity > meta.stale_days || daysInStage > meta.avg_days * 1.5) return "high";
  if (daysSinceActivity > meta.stale_days / 2 || daysInStage > meta.avg_days) return "medium";
  return "low";
}

function getImpact(
  category: AINextAction["category"],
  healthScore: number,
  daysInStage: number,
  meta: { avg_days: number }
): number {
  const baseImpact: Record<string, number> = {
    outreach: 85, qualify: 75, propose: 80, negotiate: 70, close: 90, follow_up: 65, recover: 50,
  };
  let impact = baseImpact[category] || 50;

  // Higher impact when health is low (more room for improvement)
  if (healthScore < 40) impact += 10;
  // Higher impact when overdue in stage
  if (daysInStage > meta.avg_days) impact += 5;

  return Math.min(100, impact);
}

function getTimeToAct(urgency: AINextAction["urgency"]): string {
  switch (urgency) {
    case "critical": return "Immediately";
    case "high": return "Today";
    case "medium": return "Within 2 days";
    default: return "This week";
  }
}

function generateSummary(
  lead: { title: string; estimated_value: number },
  stageName: string,
  healthLabel: string,
  momentum: string,
  daysSinceActivity: number,
  daysInStage: number,
  topAction?: AINextAction
): string {
  const parts: string[] = [];

  if (stageName === "Won") return `🎉 Deal won! Focus on delivering an excellent onboarding experience for ${lead.title}.`;
  if (stageName === "Lost") return `This lead was lost. Consider a re-engagement campaign in 3-6 months.`;

  // Health + momentum
  if (healthLabel === "Hot" || healthLabel === "Warm") {
    parts.push(`${lead.title} is ${healthLabel.toLowerCase()} with ${momentum} momentum.`);
  } else {
    parts.push(`⚠️ ${lead.title} is ${healthLabel.toLowerCase()} — momentum is ${momentum}.`);
  }

  // Timing context
  if (daysSinceActivity > 5) {
    parts.push(`Last activity was ${daysSinceActivity} days ago.`);
  }

  // Top action
  if (topAction) {
    parts.push(`Priority: ${topAction.action.toLowerCase()}.`);
  }

  return parts.join(" ");
}
