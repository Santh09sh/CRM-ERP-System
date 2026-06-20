// ─── User & Auth ─────────────────────────────────────────────

export type UserRole = "admin" | "sales_rep" | "manager" | "ambassador";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
  created_at: string;
}

// ─── Companies & Contacts ────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  company_id: string | null;
  created_by: string;
  created_at: string;
  company?: Company;
}

// ─── Pipeline & Leads ────────────────────────────────────────

export interface PipelineStage {
  id: string;
  name: string;
  display_order: number;
  color: string;
  is_won_stage: boolean;
  is_lost_stage: boolean;
}

export type LeadSource =
  | "referral"
  | "ads"
  | "organic"
  | "event"
  | "cold_call"
  | "website_form"
  | "manual";

export interface Lead {
  id: string;
  title: string;
  description: string | null;
  source: LeadSource;
  contact_id: string | null;
  company_id: string | null;
  stage_id: string;
  assigned_to: string | null;
  referral_code_id: string | null;
  estimated_value: number;
  priority: number; // 1-4 (low to urgent)
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact;
  company?: Company;
  stage?: PipelineStage;
  assigned_user?: Profile;
}

export interface StageHistory {
  id: string;
  lead_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string;
  notes: string | null;
  changed_at: string;
  from_stage?: PipelineStage;
  to_stage?: PipelineStage;
  changed_by_user?: Profile;
}

// ─── Deals ───────────────────────────────────────────────────

export type DealStatus = "open" | "won" | "lost";

export interface Deal {
  id: string;
  title: string;
  lead_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  assigned_to: string | null;
  value: number;
  probability: number;
  expected_close_date: string;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  // Joined
  contact?: Contact;
  company?: Company;
  lead?: Lead;
  assigned_user?: Profile;
}

// ─── Activities ──────────────────────────────────────────────

export type ActivityType = "call" | "email" | "meeting" | "note" | "task";

export interface Activity {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_by: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  activity_date: string;
  created_at: string;
  created_by_user?: Profile;
}

// ─── Tasks ───────────────────────────────────────────────────

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  lead_id: string | null;
  deal_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  assigned_user?: Profile;
  lead?: Lead;
  deal?: Deal;
}

// ─── Invoices ────────────────────────────────────────────────

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  created_by: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  items?: InvoiceItem[];
  company?: Company;
  contact?: Contact;
  deal?: Deal;
}

// ─── Referrals ───────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  ambassador_id: string;
  code: string;
  link_slug: string;
  total_clicks: number;
  total_conversions: number;
  commission_rate: number;
  total_earned: number;
  is_active: boolean;
  created_at: string;
  ambassador?: Profile;
}

export interface ReferralClick {
  id: string;
  referral_code_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer_url: string | null;
  clicked_at: string;
}

export type ConversionStatus = "pending" | "approved" | "paid";

export interface ReferralConversion {
  id: string;
  referral_code_id: string;
  lead_id: string | null;
  deal_id: string | null;
  deal_value: number;
  commission_amount: number;
  status: ConversionStatus;
  converted_at: string;
  lead?: Lead;
  deal?: Deal;
}

export type PayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected";

export interface Payout {
  id: string;
  ambassador_id: string;
  amount: number;
  status: PayoutStatus;
  payment_method: string | null;
  transaction_ref: string | null;
  approved_by: string | null;
  requested_at: string;
  processed_at: string | null;
  ambassador?: Profile;
}

// ─── Notifications ───────────────────────────────────────────

export type NotificationChannel = "email" | "telegram" | "whatsapp";

export interface NotificationLog {
  id: string;
  user_id: string | null;
  channel: NotificationChannel;
  event_type: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "simulated";
  error_message: string | null;
  sent_at: string;
}

// ─── Homepage ────────────────────────────────────────────────

export interface HomepageVisit {
  id: string;
  visitor_id: string;
  answers: Record<string, string>;
  routed_to: string;
  ip_address: string | null;
  visited_at: string;
}

// ─── Dashboard ───────────────────────────────────────────────

export interface DashboardMetrics {
  total_leads: number;
  conversion_rate: number;
  pipeline_value: number;
  deals_closed_this_month: number;
  referral_revenue: number;
  total_tasks_due: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  value: number;
  color: string;
}

// ─── AI ──────────────────────────────────────────────────────

export interface AILeadInsight {
  conversion_probability: number;
  score_factors: {
    factor: string;
    impact: number; // positive or negative percentage
  }[];
  suggested_action: string;
  suggested_action_reason: string;
  risk_factors: string[];
  summary: string;
}
