import { createClient } from "./supabase/client";
import type { Task, TaskPriority, TaskStatus } from "./types";
import type { VentureKey } from "./constants";

const supabase = createClient();

// ─── Tasks ──────────────────────────────────────────────────

export async function getTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      task_reminders (*),
      assigned_user:profiles!tasks_assigned_to_fkey(*)
    `)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }

  return data;
}

export async function createTask(taskData: {
  title: string;
  description?: string;
  priority: TaskPriority;
  status?: TaskStatus;
  due_date: string;
  assigned_to: string;
  assigned_email?: string;
  assigned_phone?: string;
  lead_name?: string;
  venture: string;
  value?: number;
}) {
  // Lookup the profile UUID by name
  let assignedUuid = taskData.assigned_to;
  const { data: profile } = await supabase.from("profiles").select("id").eq("full_name", taskData.assigned_to).single();
  if (profile) {
    assignedUuid = profile.id;
  }

  const payload = {
    ...taskData,
    assigned_to: assignedUuid,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select("*, task_reminders(*), assigned_user:profiles!tasks_assigned_to_fkey(*)")
    .single();

  if (error) {
    console.error("Error creating task:", error);
    throw error;
  }

  return data;
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  // Lookup the profile UUID by name if provided
  let assignedUuid = updates.assigned_to;
  if (updates.assigned_to) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("full_name", updates.assigned_to).single();
    if (profile) {
      assignedUuid = profile.id;
    }
  }

  const payload = {
    ...updates,
    ...(assignedUuid && { assigned_to: assignedUuid }),
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select("*, task_reminders(*), assigned_user:profiles!tasks_assigned_to_fkey(*)")
    .single();

  if (error) {
    console.error("Error updating task:", error);
    throw error;
  }

  return data;
}

export async function createTaskReminder(reminderData: {
  task_id: string;
  message: string;
  channels: string[];
  status: string;
}) {
  const { data, error } = await supabase
    .from("task_reminders")
    .insert([reminderData])
    .select()
    .single();

  if (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }

  return data;
}

// ─── Companies ──────────────────────────────────────────────

export async function getCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("*, company_deals:deals(id, value, status), company_contacts:contacts(id), company_invoices:invoices(id, total, status)")
    .order("name", { ascending: true });
  if (error) console.error("Error fetching companies:", error);
  return data || [];
}

export async function createCompany(company: any) {
  const { data, error } = await supabase.from("companies").insert([company]).select().single();
  if (error) throw error;
  return data;
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getCompanyDetails(companyId: string) {
  // Fetch company, deals, invoices, contacts, leads, activities in parallel
  const [companyRes, dealsRes, invoicesRes, contactsRes, leadsRes, activitiesRes] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("deals").select("*, contact:contacts(first_name, last_name)").eq("company_id", companyId).order("expected_close_date", { ascending: false }),
    supabase.from("invoices").select("*, invoice_items(*)").eq("company_id", companyId).order("issue_date", { ascending: false }),
    supabase.from("contacts").select("*").eq("company_id", companyId).order("first_name", { ascending: true }),
    supabase.from("leads").select("*, stage:pipeline_stages(*), assigned_user:profiles!leads_assigned_to_fkey(full_name)").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("activities").select("*, created_by_user:profiles!activities_created_by_fkey(full_name)").order("activity_date", { ascending: false }),
  ]);

  if (companyRes.error) throw companyRes.error;

  // Filter activities to those related to this company's leads
  const leadIds = (leadsRes.data || []).map((l: any) => l.id);
  const companyActivities = (activitiesRes.data || []).filter((a: any) => leadIds.includes(a.lead_id));

  return {
    company: companyRes.data,
    deals: dealsRes.data || [],
    invoices: invoicesRes.data || [],
    contacts: contactsRes.data || [],
    leads: leadsRes.data || [],
    activities: companyActivities,
  };
}

// ─── Contacts ───────────────────────────────────────────────

export async function getContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*, company:companies(*)")
    .order("first_name", { ascending: true });
  if (error) console.error("Error fetching contacts:", error);
  return data || [];
}

export async function createContact(contact: any) {
  const { data, error } = await supabase.from("contacts").insert([contact]).select("*, company:companies(*)").single();
  if (error) throw error;
  return data;
}

// ─── Deals ──────────────────────────────────────────────────

export async function getDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select("*, company:companies(*), contact:contacts(*), assigned_user:profiles!deals_assigned_to_fkey(full_name)")
  if (error) {
    console.error("Error fetching deals:", error);
    throw error;
  }
  return data;
}

export async function createDeal(deal: any) {
  const { data, error } = await supabase.from("deals").insert([deal]).select("*, company:companies(*), contact:contacts(*)").single();
  if (error) throw error;
  return data;
}

export async function updateDeal(id: string, updates: any) {
  const { data, error } = await supabase.from("deals").update(updates).eq("id", id).select("*, company:companies(*), contact:contacts(*)").single();
  if (error) throw error;
  return data;
}

// ─── Pipeline / Leads ───────────────────────────────────────

export async function getPipelineStages() {
  const { data, error } = await supabase.from("pipeline_stages").select("*").order("display_order", { ascending: true });
  if (error) console.error("Error fetching pipeline stages:", error);
  return data || [];
}

export async function getLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*, company:companies(*), contact:contacts(*), stage:pipeline_stages(*), assigned_user:profiles!leads_assigned_to_fkey(*)")
  if (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }
  return data;
}

export async function createLead(lead: any) {
  const { data, error } = await supabase.from("leads").insert([lead]).select("*, company:companies(*), contact:contacts(*), stage:pipeline_stages(*)").single();
  if (error) throw error;
  return data;
}

export async function updateLead(id: string, updates: any) {
  const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select("*, company:companies(*), contact:contacts(*), stage:pipeline_stages(*)").single();
  if (error) throw error;
  return data;
}

// ─── Invoices ───────────────────────────────────────────────

export async function getInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), company:companies(*), contact:contacts(*), deal:deals(venture)")
    .order("created_at", { ascending: false });
  if (error) console.error("Error fetching invoices:", error);
  return data || [];
}

export async function createInvoice(invoice: any, items: any[]) {
  // Insert the invoice
  const { data: invData, error: invError } = await supabase
    .from("invoices")
    .insert([invoice])
    .select()
    .single();
    
  if (invError) throw invError;

  // Insert the items
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({
      ...item,
      invoice_id: invData.id
    }));
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsToInsert);
      
    if (itemsError) throw itemsError;
  }

  // Fetch the full invoice with items
  const { data: finalData, error: fetchError } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invData.id)
    .single();
    
  if (fetchError) throw fetchError;
  return finalData;
}

// ─── Activities ───────────────────────────────────────────────

export async function getActivitiesForLead(leadId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select("*, created_by_user:profiles!activities_created_by_fkey(full_name, avatar_url)")
    .eq("lead_id", leadId)
    .order("activity_date", { ascending: false });
  if (error) console.error("Error fetching activities:", error);
  return data || [];
}

export async function createActivity(activity: any) {
  const { data, error } = await supabase
    .from("activities")
    .insert([activity])
    .select("*, created_by_user:profiles!activities_created_by_fkey(full_name, avatar_url)")
    .single();
  if (error) throw error;
  return data;
}

export async function getLeadById(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      stage:pipeline_stages(*),
      assigned_user:profiles!leads_assigned_to_fkey(id, full_name, email, role, avatar_url, phone, telegram_chat_id, created_at),
      company:companies(*),
      contact:contacts(*)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
// ─── Ambassador / Referral ─────────────────────────────────────

/** Commission tier lookup — pure function, no DB call needed */
export function getCommissionTier(conversions: number): {
  rate: number; label: string; emoji: string; next: number | null; nextRate: number; prevMin: number;
} {
  const tiers = [
    { min: 25, rate: 0.050, label: "Legend",   emoji: "👑", next: null, nextRate: 0.050, prevMin: 25 },
    { min: 15, rate: 0.042, label: "Champion",  emoji: "🏆", next: 25,   nextRate: 0.050, prevMin: 15 },
    { min: 10, rate: 0.035, label: "Elite",     emoji: "💎", next: 15,   nextRate: 0.042, prevMin: 10 },
    { min: 6,  rate: 0.028, label: "Active",    emoji: "⚡", next: 10,   nextRate: 0.035, prevMin: 6  },
    { min: 3,  rate: 0.020, label: "Rising",    emoji: "🚀", next: 6,    nextRate: 0.028, prevMin: 3  },
    { min: 0,  rate: 0.014, label: "Starter",   emoji: "🌱", next: 3,    nextRate: 0.020, prevMin: 0  },
  ];
  return tiers.find((t) => conversions >= t.min)!;
}

export async function getAmbassadorProfile(ambassadorId: string) {
  const { data } = await supabase
    .from("referral_codes")
    .select("*, ambassador:profiles!referral_codes_ambassador_id_fkey(*)")
    .eq("ambassador_id", ambassadorId)
    .eq("is_active", true)
    .single();
  return data;
}

export async function getOrCreateReferralCode(ambassadorId: string, name: string) {
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .single();
  if (existing) return existing;
  const slug = name.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "") + "-" + new Date().getFullYear();
  const { data, error } = await supabase
    .from("referral_codes")
    .insert({ ambassador_id: ambassadorId, code: slug, link_slug: slug, commission_rate: 0.014 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReferralCodeBySlug(slug: string) {
  const { data } = await supabase
    .from("referral_codes")
    .select("*, ambassador:profiles!referral_codes_ambassador_id_fkey(full_name, avatar_url)")
    .eq("link_slug", slug)
    .eq("is_active", true)
    .single();
  return data;
}

export async function getAmbassadorPayouts(ambassadorId: string) {
  const { data } = await supabase
    .from("payouts")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .order("requested_at", { ascending: false });
  return data || [];
}

export async function createPayoutRequest(payout: {
  ambassador_id: string;
  amount: number;
  payment_method_type: "bank" | "upi";
  bank_account_number?: string;
  bank_account_name?: string;
  bank_ifsc?: string;
  upi_id?: string;
  ambassador_notes?: string;
}) {
  const { data, error } = await supabase
    .from("payouts")
    .insert({ ...payout, status: "requested" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPayoutsForAdmin() {
  const { data } = await supabase
    .from("payouts")
    .select("*, ambassador:profiles!payouts_ambassador_id_fkey(full_name, email, phone, avatar_url)")
    .order("requested_at", { ascending: false });
  return data || [];
}

export async function approvePayoutAdmin(payoutId: string, approvedBy: string) {
  const { data, error } = await supabase
    .from("payouts")
    .update({ status: "approved", approved_by: approvedBy, processed_at: new Date().toISOString() })
    .eq("id", payoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectPayoutAdmin(payoutId: string, reason: string) {
  const { data, error } = await supabase
    .from("payouts")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", payoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLeaderboard() {
  const { data } = await supabase
    .from("referral_codes")
    .select("total_clicks, total_conversions, total_earned, ambassador:profiles!referral_codes_ambassador_id_fkey(full_name, avatar_url)")
    .eq("is_active", true)
    .order("total_earned", { ascending: false })
    .limit(10);
  return data || [];
}
