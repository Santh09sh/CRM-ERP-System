"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, FileText, Share2, Bell, Settings,
  MoreHorizontal, CheckCircle, XCircle, Eye,
  Mail, MessageSquare, Phone, RefreshCw, AlertTriangle,
  TrendingUp, Clock, CheckSquare, X as XIcon, ChevronDown,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";


const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "leads", label: "All Leads", icon: Eye },
  { id: "referrals", label: "Referrals", icon: Share2 },
  { id: "payouts", label: "Payouts", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const SAMPLE_USERS = [
  { id: "u1", name: "Vishnu Reddy", email: "admin@saasum.in", role: "admin", status: "active", leads: 0, deals: 0 },
  { id: "u2", name: "Priya Sharma", email: "priya@saasum.in", role: "sales_rep", status: "active", leads: 24, deals: 8 },
  { id: "u3", name: "Arjun Mehta", email: "arjun@saasum.in", role: "sales_rep", status: "active", leads: 18, deals: 6 },
  { id: "u4", name: "Sneha Reddy", email: "sneha@saasum.in", role: "manager", status: "active", leads: 15, deals: 4 },
  { id: "u5", name: "Rahul Verma", email: "ambassador@saasum.in", role: "ambassador", status: "active", leads: 0, deals: 0 },
  { id: "u6", name: "Kavitha Nair", email: "kavitha@saasum.in", role: "manager", status: "active", leads: 12, deals: 5 },
];

// ─── Payout Management Component ────────────────────────────────────────────

function PayoutsPanel() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts");
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  const handleAction = async (payoutId: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(payoutId);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "Payout approved!" : "Payout rejected");
      setRejectModal(null);
      setRejectReason("");
      loadPayouts();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setProcessing(null);
    }
  };

  const requested = payouts.filter((p) => p.status === "requested");
  const others = payouts.filter((p) => p.status !== "requested");
  const sorted = [...requested, ...others];

  return (
    <div>
      {loading ? (
        <div className="card p-12 text-center"><div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin mx-auto" /></div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center text-zinc-500">No payout requests yet.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((payout) => {
            const isExpanded = expandedId === payout.id;
            return (
              <motion.div key={payout.id} className={cn("card overflow-hidden", payout.status === "requested" && "border-amber-500/20 bg-amber-500/5")} layout>
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : payout.id)}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0">
                    {getInitials(payout.ambassador?.full_name || "A")}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{payout.ambassador?.full_name || "Unknown"}</p>
                      {payout.status === "requested" && <span className="badge badge-warning text-[10px]">Needs Action</span>}
                    </div>
                    <p className="text-zinc-500 text-[11px]">{payout.ambassador?.email}</p>
                  </div>
                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-white font-bold font-mono">{formatCurrency(payout.amount)}</p>
                    <p className="text-zinc-600 text-[10px] font-mono">
                      {new Date(payout.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {/* Status */}
                  <span className={cn(
                    "badge text-xs capitalize w-20 text-center flex-shrink-0",
                    payout.status === "paid" && "badge-success",
                    payout.status === "approved" && "badge-warning",
                    payout.status === "requested" && "bg-zinc-800 text-zinc-300 border border-zinc-700",
                    payout.status === "rejected" && "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    {payout.status}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-zinc-600 transition-transform flex-shrink-0", isExpanded && "rotate-180")} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-zinc-800/50 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                          {/* Payment Details */}
                          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Payment Details</p>
                            {payout.payment_method_type === "bank" ? (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">Method</span>
                                  <span className="text-white text-xs font-semibold">🏦 Bank Transfer</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">Account Holder</span>
                                  <span className="text-white text-xs">{payout.bank_account_name || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">Account No.</span>
                                  <span className="text-white text-xs font-mono">****{(payout.bank_account_number || "").slice(-4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">IFSC</span>
                                  <span className="text-white text-xs font-mono">{payout.bank_ifsc || "—"}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">Method</span>
                                  <span className="text-white text-xs font-semibold">📱 UPI</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 text-xs">UPI ID</span>
                                  <span className="text-white text-xs font-mono">{payout.upi_id || "—"}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes / Status Info */}
                          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Additional Info</p>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-zinc-500 text-xs">Amount</span>
                                <span className="text-emerald-400 text-xs font-bold font-mono">{formatCurrency(payout.amount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500 text-xs">Requested</span>
                                <span className="text-white text-xs font-mono">{new Date(payout.requested_at).toLocaleDateString()}</span>
                              </div>
                              {payout.ambassador_notes && (
                                <div className="mt-3 pt-3 border-t border-zinc-800">
                                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Note from Ambassador</p>
                                  <p className="text-zinc-300 text-xs italic">&quot;{payout.ambassador_notes}&quot;</p>
                                </div>
                              )}
                              {payout.rejection_reason && (
                                <div className="mt-3 pt-3 border-t border-zinc-800">
                                  <p className="text-red-400 text-[10px] uppercase tracking-wider mb-1">Rejection Reason</p>
                                  <p className="text-red-300 text-xs">{payout.rejection_reason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons — only for requested */}
                        {payout.status === "requested" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(payout.id, "approve")}
                              disabled={processing === payout.id}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-sm font-semibold transition-all"
                            >
                              {processing === payout.id ? <div className="w-4 h-4 rounded-full border-2 border-emerald-500/50 border-t-emerald-400 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Approve Payout
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: payout.id, name: payout.ambassador?.full_name || "Ambassador" })}
                              disabled={processing === payout.id}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-sm font-semibold transition-all"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-white font-bold">Reject Payout Request</h3>
                  <p className="text-zinc-500 text-sm mt-1">For <span className="text-white">{rejectModal.name}</span></p>
                </div>
                <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="text-zinc-600 hover:text-white p-1">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-5">
                <label className="block text-xs font-medium text-zinc-400 mb-2">Reason for rejection <span className="text-zinc-600">(required)</span></label>
                <textarea
                  rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incorrect account details, insufficient documentation..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-zinc-600 outline-none resize-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="flex-1 btn-secondary border-zinc-800">
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(rejectModal.id, "reject", rejectReason)}
                  disabled={!rejectReason.trim() || processing === rejectModal.id}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-sm font-semibold transition-all disabled:opacity-40"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Notification Center Types & Helpers ─────────────────────────

type NotifLog = {
  id: string;
  event_type: string;
  channel: string;
  subject: string;
  recipient?: string;
  status: string;
  error?: string;
  created_at: string;
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  lead_assigned: Users,
  stage_changed: TrendingUp,
  deal_won: CheckSquare,
  invoice_generated: FileText,
  referral_conversion: Share2,
  payout_processed: CheckCircle,
  task_due: Clock,
  task_overdue: AlertTriangle,
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  telegram: MessageSquare,
  whatsapp: Phone,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "#3B82F6",
  telegram: "#60A5FA",
  whatsapp: "#22C55E",
};

const EVENT_COLORS: Record<string, string> = {
  lead_assigned: "#A78BFA",
  stage_changed: "#60A5FA",
  deal_won: "#22C55E",
  invoice_generated: "#F59E0B",
  referral_conversion: "#EC4899",
  payout_processed: "#34D399",
  task_due: "#FB923C",
  task_overdue: "#EF4444",
};

function groupByDay(logs: NotifLog[]) {
  const groups: Record<string, NotifLog[]> = {};
  logs.forEach((log) => {
    const date = new Date(log.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let key: string;
    if (date.toDateString() === today.toDateString()) key = "Today";
    else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return groups;
}

// ─── Notification Center Component ───────────────────────────────

function NotificationCenter() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/log");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load notification logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRetry = async (log: NotifLog) => {
    setRetrying(log.id);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: log.event_type,
          data: { subject: log.subject, email: log.recipient },
        }),
      });
      if (res.ok) {
        toast.success("Notification retried successfully");
        fetchLogs();
      } else {
        toast.error("Retry failed");
      }
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const filtered = logs.filter((l) => {
    const matchEvent = eventFilter === "all" || l.event_type === eventFilter;
    const matchChannel = channelFilter === "all" || l.channel === channelFilter;
    return matchEvent && matchChannel;
  });

  const grouped = groupByDay(filtered);
  const delivered = logs.filter((l) => l.status === "delivered").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const simulated = logs.filter((l) => l.status === "simulated").length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Delivered", value: delivered, color: "#22C55E" },
          { label: "Failed", value: failed, color: "#EF4444" },
          { label: "Simulated", value: simulated, color: "#555" },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Refresh */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="text-xs bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[#A3A3A3] focus:outline-none [color-scheme:dark]"
        >
          <option value="all">All Events</option>
          {["lead_assigned","stage_changed","deal_won","invoice_generated","referral_conversion","payout_processed","task_due","task_overdue"].map((e) => (
            <option key={e} value={e}>{e.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="text-xs bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[#A3A3A3] focus:outline-none [color-scheme:dark]"
        >
          <option value="all">All Channels</option>
          <option value="email">Email</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button
          onClick={fetchLogs}
          className="ml-auto flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors px-3 py-2 rounded-lg bg-[#111] border border-[#1A1A1A]"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-[#222] border-t-[#555] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <Bell className="w-8 h-8 text-[#222] mx-auto mb-3" />
          <p className="text-sm text-[#555]">No notifications yet.</p>
          <p className="text-xs text-[#333] mt-1">Trigger an event (move a lead, create an invoice) to see logs here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              <p className="text-[10px] text-[#333] uppercase tracking-widest font-semibold mb-3 px-1">{day}</p>
              <motion.div className="card divide-y divide-[#0D0D0D]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {dayLogs.map((log) => {
                  const EvIcon = EVENT_ICONS[log.event_type] || Bell;
                  const ChIcon = CHANNEL_ICONS[log.channel] || Mail;
                  const evColor = EVENT_COLORS[log.event_type] || "#666";
                  const chColor = CHANNEL_COLORS[log.channel] || "#666";
                  const time = new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const isDelivered = log.status === "delivered";
                  const isFailed = log.status === "failed";

                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#0A0A0A] transition-colors group">
                      {/* Event icon */}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${evColor}15` }}>
                        <EvIcon className="w-3.5 h-3.5" style={{ color: evColor }} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${evColor}10`, color: evColor }}>
                            {log.event_type.replace(/_/g, " ")}
                          </span>
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${chColor}30`, color: chColor, backgroundColor: `${chColor}08` }}>
                            <ChIcon className="w-2.5 h-2.5" /> {log.channel}
                          </span>
                          <span className={`flex items-center gap-1 text-[9px] font-semibold ${isDelivered ? "text-[#22C55E]" : isFailed ? "text-[#EF4444]" : "text-[#555]"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? "bg-[#22C55E]" : isFailed ? "bg-[#EF4444]" : "bg-[#555]"}`} />
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#D4D4D4] truncate">{log.subject}</p>
                        {log.recipient && <p className="text-[10px] text-[#444] mt-0.5">{log.recipient}</p>}
                        {log.error && <p className="text-[10px] text-[#EF4444] mt-0.5 truncate">Error: {log.error}</p>}
                      </div>
                      {/* Time + Retry */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#333]" style={{ fontFamily: "var(--font-mono)" }}>{time}</span>
                        {isFailed && (
                          <button
                            onClick={() => handleRetry(log)}
                            disabled={retrying === log.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] px-2 py-1 rounded border border-[#333] text-[#666] hover:text-white hover:border-[#555] flex items-center gap-1"
                          >
                            <RefreshCw className={`w-2.5 h-2.5 ${retrying === log.id ? "animate-spin" : ""}`} /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="page-container">
      <motion.div className="mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
          Admin Panel
        </h1>
        <p className="text-[#666] text-sm mt-1">Manage users, data, and system settings.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={SAMPLE_USERS.length} icon={Users} index={0} />
        <StatCard label="Pending Payouts" value={0} icon={FileText} index={1} />
        <StatCard label="Active Referrers" value={3} icon={Share2} index={2} />
        <StatCard label="Notification Channels" value={3} icon={Bell} index={3} />
      </div>

      {/* Tab Nav */}
      <motion.div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-[#F5F5F5] text-[#050505] shadow-sm" : "bg-[#111] text-[#666] border border-[#1A1A1A] hover:text-[#D4D4D4] hover:bg-[#151515]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th className="hidden md:table-cell">Leads</th><th className="hidden md:table-cell">Deals</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {SAMPLE_USERS.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[10px] text-[#A3A3A3]">{getInitials(user.name)}</div>
                        <div>
                          <p className="text-sm text-white">{user.name}</p>
                          <p className="text-[10px] text-[#444]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${user.role === "admin" ? "badge-warning" : ""}`}>{user.role.replace("_", " ")}</span></td>
                    <td className="hidden md:table-cell"><span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#A3A3A3]">{user.leads}</span></td>
                    <td className="hidden md:table-cell"><span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#A3A3A3]">{user.deals}</span></td>
                    <td><span className="badge badge-success">{user.status}</span></td>
                    <td><button className="btn-ghost p-1"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <PayoutsPanel />
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <NotificationCenter />
        </motion.div>
      )}

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <motion.div className="card p-8 text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[#666] text-sm">Cross-rep lead management view.</p>
          <p className="text-[#444] text-xs mt-2">All leads from all reps are visible here with reassign and override capabilities.</p>
        </motion.div>
      )}

      {/* Referrals Tab */}
      {activeTab === "referrals" && (
        <motion.div className="card p-8 text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[#666] text-sm">Referral program management.</p>
          <p className="text-[#444] text-xs mt-2">View all ambassadors, set commission rates, manage referral codes.</p>
        </motion.div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card p-5">
            <h3 className="text-sm text-[#A3A3A3] mb-4" style={{ fontFamily: "var(--font-heading)" }}>Pipeline Stages</h3>
            <div className="space-y-2">
              {["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"].map((stage) => (
                <div key={stage} className="flex items-center gap-3 p-2 rounded-md bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className={`w-2 h-2 rounded-full ${stage === "Won" ? "bg-[#22C55E]" : stage === "Lost" ? "bg-[#EF4444]" : "bg-[#A3A3A3]"}`} />
                  <span className="text-sm text-[#D4D4D4]">{stage}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm text-[#A3A3A3] mb-4" style={{ fontFamily: "var(--font-heading)" }}>Notification Channels</h3>
            <div className="space-y-3">
              {[
                { name: "Email (Resend)", status: "Connected", color: "#22C55E", icon: Mail },
                { name: "Telegram Bot", status: "Connected", color: "#22C55E", icon: MessageSquare },
                { name: "WhatsApp Cloud API", status: "Connected", color: "#22C55E", icon: Phone },
              ].map((ch) => (
                <div key={ch.name} className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <ch.icon className="w-3.5 h-3.5 text-[#555]" />
                    <span className="text-sm text-[#D4D4D4]">{ch.name}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: ch.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                    {ch.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm text-[#A3A3A3] mb-4" style={{ fontFamily: "var(--font-heading)" }}>Tax Settings</h3>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#666]">GST Rate</label>
              <input type="number" defaultValue={18} className="input-base w-24" />
              <span className="text-xs text-[#666]">%</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
