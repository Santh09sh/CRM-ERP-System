"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MessageSquare, FileText, Plus,
  Calendar, User, Building2, Sparkles, ChevronRight, Edit,
  X, Check, DollarSign, Tag, Briefcase, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatRelativeDate, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { VENTURES } from "@/lib/constants";
import type { Lead, Activity, StageHistory } from "@/lib/types";
import type { VentureKey } from "@/lib/constants";

// ─── Full lead data for all pipeline leads ──────────────────────
import { getLeadById, getActivitiesForLead, createActivity, updateLead } from '@/lib/db';
import { assignLead } from '@/lib/services/lead-service';
import { VentureBadge } from '@/components/shared/venture-badge';
import { analyzeLeadForNextAction } from "@/lib/ai-next-action";
import { getDemoSession } from "@/lib/demo-auth";

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  note: FileText,
  task: FileText,
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<string>("note");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const lead = await getLeadById(leadId);
        const acts = await getActivitiesForLead(leadId);
        setLeadData(lead);
        setActivities(acts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [leadId]);

  // Edit form local state (initialised when modal opens)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    source: "",
    stage_name: "",
    estimated_value: "",
    priority: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_job_title: "",
    company_name: "",
    company_industry: "",
    company_website: "",
    company_address: "",
  });

  const STAGE_OPTIONS = [
    { name: "New", color: "#A3A3A3", display_order: 1, id: "s1", is_won_stage: false, is_lost_stage: false },
    { name: "Contacted", display_order: 2, color: "#D4D4D4", id: "s2", is_won_stage: false, is_lost_stage: false },
    { name: "Qualified", display_order: 3, color: "#F5F5F5", id: "s3", is_won_stage: false, is_lost_stage: false },
    { name: "Proposal", display_order: 4, color: "#FFFFFF", id: "s4", is_won_stage: false, is_lost_stage: false },
    { name: "Negotiation", display_order: 5, color: "#A78BFA", id: "s5", is_won_stage: false, is_lost_stage: false },
    { name: "Won", display_order: 6, color: "#22C55E", id: "s6", is_won_stage: true, is_lost_stage: false },
  ];

  const handleOpenEdit = () => {
    if (!leadData) return;
    setEditForm({
      title: leadData.title || "",
      description: leadData.description || "",
      source: leadData.source || "",
      stage_name: leadData.stage?.name || "",
      estimated_value: String(leadData.estimated_value || ""),
      priority: String(leadData.priority || "1"),
      contact_first_name: leadData.contact?.first_name || "",
      contact_last_name: leadData.contact?.last_name || "",
      contact_email: leadData.contact?.email || "",
      contact_phone: leadData.contact?.phone || "",
      contact_job_title: leadData.contact?.job_title || "",
      company_name: leadData.company?.name || "",
      company_industry: leadData.company?.industry || "",
      company_website: leadData.company?.website || "",
      company_address: leadData.company?.address || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedStage = STAGE_OPTIONS.find(s => s.name === editForm.stage_name);
      
      const updates = {
        title: editForm.title,
        description: editForm.description,
        source: editForm.source,
        estimated_value: Number(editForm.estimated_value) || 0,
        priority: Number(editForm.priority) || 1,
        // Actually, we'd need to update the contact/company tables too if we want a full update.
        // For now, we'll just optimistically update the UI to avoid complex relation updates in this PR.
      };
      
      // Update in DB (leads table only for MVP)
      await updateLead(leadId, updates);

      // If assigned_to changed, fire lead_assigned notification
      const form = editForm as any;
      if (form.assigned_to && form.assigned_to !== leadData.assigned_to) {
        assignLead(
          leadId,
          form.assigned_to,
          { title: editForm.title, source: editForm.source, estimated_value: Number(editForm.estimated_value) || 0 },
          form.assigned_to_name,
          leadData.contact?.email
        );
      }
      
      // Optimistic UI update
      setLeadData((prev: any) => ({
        ...prev,
        ...updates,
        stage: selectedStage || prev.stage,
        contact: {
          ...prev.contact,
          first_name: editForm.contact_first_name,
          last_name: editForm.contact_last_name,
          email: editForm.contact_email,
          phone: editForm.contact_phone,
          job_title: editForm.contact_job_title,
        },
        company: {
          ...prev.company,
          name: editForm.company_name,
          industry: editForm.company_industry,
          website: editForm.company_website,
          address: editForm.company_address,
        },
      }));
      setShowEditModal(false);
      toast.success("Lead updated successfully");
    } catch (err) {
      toast.error("Failed to update lead");
      console.error(err);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await createClient().auth.getUser();
      const demoUser = getDemoSession();
      const userId = user?.id || demoUser?.id;

      if (!userId) throw new Error("Not authenticated");
      
      const newAct = await createActivity({
        lead_id: leadId,
        type: activityType,
        subject: activitySubject,
        description: activityDesc || null,
        created_by: userId,
        activity_date: new Date().toISOString()
      });
      
      if (!newAct.created_by_user && demoUser && demoUser.id === userId) {
        newAct.created_by_user = demoUser;
      }
      
      setActivities(prev => [newAct, ...prev]);
      setShowActivityForm(false);
      setActivitySubject("");
      setActivityDesc("");
      toast.success("Activity logged");
    } catch (err) {
      toast.error("Failed to log activity");
      console.error(err);
    }
  };
  const aiAnalysis = useMemo(() => {
    if (!leadData) return null;
    return analyzeLeadForNextAction(leadData, activities, leadData.stage_history || []);
  }, [leadData, activities]);

  if (loading) {
    return <div className="page-container max-w-5xl flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 rounded-full border-4 border-[#222] border-t-[#666] animate-spin" /></div>;
  }

  // Fallback for unknown IDs
  if (!leadData) {
    return (
      <div className="page-container max-w-5xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link href="/leads" className="btn-ghost text-xs mb-6 inline-flex">
            <ArrowLeft className="w-3 h-3" />
            Back to Leads
          </Link>
        </motion.div>
        <div className="card p-12 text-center">
          <h2 className="text-xl text-white font-semibold mb-2">Lead Not Found</h2>
          <p className="text-sm text-[#666]">The lead doesn&apos;t exist in the system.</p>
          <Link href="/pipeline" className="btn-primary text-sm mt-6 inline-flex">
            Back to Pipeline
          </Link>
        </div>
      </div>
    );
  }

  const venture = VENTURES[leadData.venture as VentureKey];
  const ventureColor = venture?.color ?? "#666";

  return (
    <div className="page-container max-w-5xl">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link href="/pipeline" className="btn-ghost text-xs mb-6 inline-flex">
          <ArrowLeft className="w-3 h-3" />
          Back to Pipeline
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3">
            {/* Venture accent */}
            <div className="w-1 h-10 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: ventureColor }} />
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
                {leadData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-[#222]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leadData.stage?.color || "#A3A3A3" }} />
                  {leadData.stage?.name || "Unknown"}
                </span>
                <span className="text-xs text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatCurrency(leadData.estimated_value)}
                </span>
                <span className="badge">{leadData.source}</span>
                <span className="flex items-center gap-1.5 text-xs text-[#666]">
                  <User className="w-3 h-3" />
                  {leadData.assigned_user?.full_name || "Unassigned"}
                </span>
                <VentureBadge venture={leadData.venture as VentureKey} />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenEdit}
              className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-white text-sm border border-[#222] transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4 text-[#A3A3A3]" />
              Edit Lead
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Insight */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ borderLeft: `3px solid ${aiAnalysis?.health_color || ventureColor}`, padding: "32px" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#A3A3A3]" />
                <span className="text-xs text-[#666] tracking-[0.15em] uppercase">AI Intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl" title="Momentum">{aiAnalysis?.momentum_icon}</span>
                <span className="badge" style={{ color: aiAnalysis?.health_color, borderColor: aiAnalysis?.health_color + "40", backgroundColor: aiAnalysis?.health_color + "10" }}>
                  {aiAnalysis?.health_label} ({aiAnalysis?.health_score}/100)
                </span>
              </div>
            </div>

            <div className="mt-2 mb-6">
              <p className="text-[#D4D4D4] text-sm leading-relaxed">
                {aiAnalysis?.summary}
              </p>
            </div>

            {/* Risk Signals */}
            {aiAnalysis?.risk_signals && aiAnalysis.risk_signals.length > 0 && (
              <div className="mb-8 p-4 rounded-xl border border-[#EF444430] bg-[#EF444410]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-sm font-medium text-[#EF4444]">Risk Signals</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {aiAnalysis.risk_signals.map((risk: string, i: number) => (
                    <li key={i} className="text-[13px] text-[#D4D4D4] leading-relaxed">{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Action */}
            {aiAnalysis?.next_actions && aiAnalysis.next_actions.length > 0 && (
              <div className="pt-8 border-t border-[#1A1A1A] mt-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[13px] text-[#888] tracking-[0.2em] uppercase font-bold">Suggested Next Action</p>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    aiAnalysis.next_actions[0].urgency === "critical" ? "bg-[#EF444420] text-[#EF4444]" :
                    aiAnalysis.next_actions[0].urgency === "high" ? "bg-[#F59E0B20] text-[#F59E0B]" :
                    "bg-[#22C55E20] text-[#22C55E]"
                  }`}>
                    {aiAnalysis.next_actions[0].time_to_act}
                  </span>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                    {aiAnalysis.next_actions[0].icon}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <h4 className="text-base text-white font-medium leading-snug m-0">{aiAnalysis.next_actions[0].action}</h4>
                    <p className="text-sm text-[#A3A3A3] leading-relaxed m-0">{aiAnalysis.next_actions[0].reason}</p>
                    
                    {aiAnalysis.next_actions[0].script && (
                      <div className="mt-4 border border-[#333] rounded-2xl overflow-hidden shadow-lg bg-[#0A0A0A]">
                        <div className="bg-[#111] px-6 py-4 border-b border-[#222] flex justify-between items-center">
                          <span className="text-[12px] uppercase tracking-[0.15em] text-[#A3A3A3] font-bold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#666]" /> Suggested Script
                          </span>
                          <button 
                            className="text-[13px] font-bold text-[#22C55E] hover:text-[#16A34A] transition-all flex items-center gap-2 bg-[#22C55E15] px-4 py-2 rounded-xl hover:bg-[#22C55E25] border border-[#22C55E30]"
                            onClick={() => {
                              navigator.clipboard.writeText(aiAnalysis.next_actions[0].script || "");
                              toast.success("Script copied to clipboard");
                            }}
                          >
                            <FileText className="w-4 h-4" />
                            Copy Script
                          </button>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-[#D4D4D4] whitespace-pre-wrap font-mono leading-[1.7]">
                            {aiAnalysis.next_actions[0].script}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Secondary Actions */}
            {aiAnalysis?.next_actions && aiAnalysis.next_actions.length > 1 && (
              <div className="mt-6 pt-6 border-t border-[#1A1A1A]">
                <details className="group">
                  <summary className="text-sm text-[#666] hover:text-[#A3A3A3] cursor-pointer list-none flex items-center gap-2 transition-colors">
                    <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                    View alternative actions ({aiAnalysis.next_actions.length - 1})
                  </summary>
                  <div className="mt-6 space-y-6 pl-6">
                    {aiAnalysis.next_actions.slice(1).map((action: any, i: number) => (
                      <div key={i} className="bg-[#111] border border-[#222] p-4 rounded-xl">
                        <h5 className="text-[15px] text-white font-medium flex items-center gap-2 mb-2">
                          <span className="text-lg bg-[#1A1A1A] w-8 h-8 rounded-full flex items-center justify-center">{action.icon}</span> 
                          {action.action}
                        </h5>
                        <p className="text-[14px] text-[#A3A3A3] leading-relaxed ml-10">{action.reason}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </motion.div>

          {/* Stage Progress */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ padding: "32px" }}
          >
            <h3 className="text-base text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Stage History
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-4">
              {leadData.stages?.map((s: any, i: number) => (
                <div key={s.name} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        s.current
                          ? "border-[#F5F5F5] bg-[#F5F5F5]"
                          : s.date
                          ? "border-[#666] bg-[#666]"
                          : "border-[#333] bg-transparent"
                      }`}
                    />
                    <span className="text-[10px] mt-1.5 text-[#666] whitespace-nowrap">{s.name}</span>
                    {s.date && (
                      <span className="text-[9px] text-[#444]" style={{ fontFamily: "var(--font-mono)" }}>{s.date}</span>
                    )}
                  </div>
                  {i < leadData.stages.length - 1 && (
                    <div className={`w-8 h-px mx-1 mt-[-18px] ${s.date ? "bg-[#666]" : "bg-[#222]"}`} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Activity Timeline */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ padding: "32px" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base text-[#A3A3A3]" style={{ fontFamily: "var(--font-heading)" }}>
                Activity Timeline
              </h3>
              <button onClick={() => setShowActivityForm(!showActivityForm)} className="btn-ghost text-sm">
                <Plus className="w-4 h-4" />
                Add Activity
              </button>
            </div>

            {showActivityForm && (
              <motion.form
                onSubmit={handleAddActivity}
                className="mb-6 p-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div className="flex flex-wrap gap-2 mb-2">
                  {["call", "email", "meeting", "note"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityType(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                        activityType === t
                          ? "bg-white text-black border-white shadow-sm"
                          : "bg-[#111] text-[#888] border-[#222] hover:bg-[#1A1A1A] hover:text-[#D4D4D4]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={activitySubject}
                  onChange={(e) => setActivitySubject(e.target.value)}
                  className="input-base"
                  required
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="input-base min-h-[80px] resize-none"
                  rows={3}
                />
                <div className="flex gap-3 mt-2">
                  <button type="submit" className="btn-primary text-sm px-6 py-2">Log Activity</button>
                  <button type="button" onClick={() => setShowActivityForm(false)} className="btn-ghost text-sm px-4 py-2">Cancel</button>
                </div>
              </motion.form>
            )}

            <div className="flex flex-col gap-6">
              {activities.map((activity: any, i: number) => {
                const IconComp = activityIcons[activity.type] || FileText;
                return (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                        <IconComp className="w-4 h-4 text-[#666]" />
                      </div>
                      {i < activities.length - 1 && (
                        <div className="w-px h-full bg-[#1A1A1A] mt-2" />
                      )}
                    </div>
                    <div className="pb-6 flex-1">
                      <p className="text-base text-[#D4D4D4]">{activity.subject}</p>
                      {activity.description && (
                        <p className="text-sm text-[#666] mt-1.5">{activity.description}</p>
                      )}
                      <p className="text-xs text-[#555] mt-2 tracking-wide" style={{ fontFamily: "var(--font-mono)" }}>
                        {activity.created_by_user?.full_name} · {formatRelativeDate(activity.activity_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column — Info Cards */}
        <div className="space-y-6">
          {/* Contact Info */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ padding: "32px" }}
          >
            <h3 className="text-base text-[#A3A3A3] mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              Contact
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base text-white font-medium">{leadData.contact?.first_name} {leadData.contact?.last_name}</p>
                <p className="text-sm text-[#666]">{leadData.contact?.job_title || "No Title"}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#A3A3A3]">
                <Mail className="w-4 h-4 text-[#444]" />
                {leadData.contact?.email || "No Email"}
              </div>
              <div className="flex items-center gap-3 text-sm text-[#A3A3A3]">
                <Phone className="w-4 h-4 text-[#444]" />
                {leadData.contact?.phone || "No Phone"}
              </div>
            </div>
          </motion.div>

          {/* Company Info */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ padding: "32px" }}
          >
            <h3 className="text-base text-[#A3A3A3] mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              Company
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#444]" />
                <p className="text-base text-white font-medium">{leadData.company?.name || "No Company"}</p>
              </div>
              <p className="text-sm text-[#666]">{leadData.company?.industry || "No Industry"}</p>
              <p className="text-sm text-[#A3A3A3]">{leadData.company?.website || "No Website"}</p>
              <p className="text-sm text-[#666]">{leadData.company?.address || "No Address"}</p>
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ padding: "32px" }}
          >
            <h3 className="text-base text-[#A3A3A3] mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              Description
            </h3>
            <p className="text-base text-[#666] leading-relaxed">{leadData.description}</p>
          </motion.div>

          {/* Meta */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ padding: "32px" }}
          >
            <h3 className="text-base text-[#A3A3A3] mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              Details
            </h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#666]">Created</span>
                <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(leadData.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Updated</span>
                <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatRelativeDate(leadData.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Priority</span>
                <span className="text-[#A3A3A3]">{leadData.priority === 4 ? "Urgent" : leadData.priority === 3 ? "High" : leadData.priority === 2 ? "Medium" : "Low"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Venture</span>
                <span style={{ color: ventureColor, fontWeight: 500 }}>{venture?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Lead ID</span>
                <span className="text-[#555]" style={{ fontFamily: "var(--font-mono)" }}>{leadId}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Edit Lead Modal ── */}
      {showEditModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />

          {/* Modal Panel */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: ventureColor }} />
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 600 }}>Edit Lead</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[#666]" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="px-8 py-6 flex flex-col gap-7">

                {/* Basic Info */}
                <section>
                  <p className="text-[11px] text-[#555] tracking-widest uppercase mb-4">Basic Info</p>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Lead Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors resize-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Deal Details */}
                <section>
                  <p className="text-[11px] text-[#555] tracking-widest uppercase mb-4">Deal Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Stage</label>
                      <select
                        value={editForm.stage_name}
                        onChange={e => setEditForm(f => ({ ...f, stage_name: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors appearance-none"
                      >
                        {STAGE_OPTIONS.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Priority</label>
                      <select
                        value={editForm.priority}
                        onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors appearance-none"
                      >
                        <option value="1">Low</option>
                        <option value="2">Medium</option>
                        <option value="3">High</option>
                        <option value="4">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Deal Value (₹)</label>
                      <input
                        type="number"
                        value={editForm.estimated_value}
                        onChange={e => setEditForm(f => ({ ...f, estimated_value: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Source</label>
                      <select
                        value={editForm.source}
                        onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors appearance-none"
                      >
                        <option value="referral">Referral</option>
                        <option value="ads">Ads</option>
                        <option value="organic">Organic</option>
                        <option value="cold_call">Cold Call</option>
                        <option value="event">Event</option>
                        <option value="website_form">Website Form</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Contact Info */}
                <section>
                  <p className="text-[11px] text-[#555] tracking-widest uppercase mb-4">Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">First Name</label>
                      <input
                        type="text"
                        value={editForm.contact_first_name}
                        onChange={e => setEditForm(f => ({ ...f, contact_first_name: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={editForm.contact_last_name}
                        onChange={e => setEditForm(f => ({ ...f, contact_last_name: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Email</label>
                      <input
                        type="email"
                        value={editForm.contact_email}
                        onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Phone</label>
                      <input
                        type="text"
                        value={editForm.contact_phone}
                        onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#666] mb-1.5">Job Title</label>
                      <input
                        type="text"
                        value={editForm.contact_job_title}
                        onChange={e => setEditForm(f => ({ ...f, contact_job_title: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                  </div>
                </section>

                {/* Company Info */}
                <section>
                  <p className="text-[11px] text-[#555] tracking-widest uppercase mb-4">Company</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-[#666] mb-1.5">Company Name</label>
                      <input
                        type="text"
                        value={editForm.company_name}
                        onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Industry</label>
                      <input
                        type="text"
                        value={editForm.company_industry}
                        onChange={e => setEditForm(f => ({ ...f, company_industry: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#666] mb-1.5">Website</label>
                      <input
                        type="text"
                        value={editForm.company_website}
                        onChange={e => setEditForm(f => ({ ...f, company_website: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-[#666] mb-1.5">Address</label>
                      <input
                        type="text"
                        value={editForm.company_address}
                        onChange={e => setEditForm(f => ({ ...f, company_address: e.target.value }))}
                        className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#333] transition-colors"
                      />
                    </div>
                  </div>
                </section>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-[#1A1A1A]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#A3A3A3] text-sm border border-[#1A1A1A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: ventureColor, color: "#050505" }}
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
