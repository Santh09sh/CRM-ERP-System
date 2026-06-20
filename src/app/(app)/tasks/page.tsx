"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  X,
  Search,
  Send,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  User,
  FileText,
  ChevronRight,
  Zap,
  Bell,
  CheckSquare,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { formatRelativeDate, formatCurrency, formatDate } from "@/lib/utils";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { VENTURES, type VentureKey } from "@/lib/constants";
import { toast } from "sonner";
import { getTasks, createTask, updateTask, createTaskReminder } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "pending" | "in_progress" | "completed";

interface TaskReminder {
  id: string;
  message: string;
  channels: string[];
  sent_at: string;
  status: "sent" | "simulated" | "failed";
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  assigned: string;
  assigned_email: string;
  assigned_phone: string;
  lead: string | null;
  venture: VentureKey;
  value: number;
  reminders: TaskReminder[];
}

// ─── DB Mapping Helper ──────────────────────────────────────

function mapToTaskItem(dbTask: any): TaskItem {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || "",
    priority: dbTask.priority,
    status: dbTask.status,
    due_date: dbTask.due_date,
    assigned: dbTask.assigned_user?.full_name || dbTask.assigned_to || "",
    assigned_email: dbTask.assigned_user?.email || dbTask.assigned_email || "",
    assigned_phone: dbTask.assigned_user?.phone || dbTask.assigned_phone || "",
    lead: dbTask.lead_name || null,
    venture: (dbTask.venture || "core") as VentureKey,
    value: dbTask.value || 0,
    reminders: (dbTask.task_reminders || []).map((r: any) => ({
      id: r.id,
      message: r.message,
      channels: r.channels || [],
      sent_at: r.sent_at,
      status: r.status,
    })),
  };
}


// ─── Priority Helpers ───────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "Urgent", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
  high: { label: "High", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  medium: { label: "Medium", color: "#A3A3A3", bg: "rgba(163,163,163,0.10)", border: "rgba(163,163,163,0.20)" },
  low: { label: "Low", color: "#666666", bg: "rgba(102,102,102,0.10)", border: "rgba(102,102,102,0.20)" },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#60A5FA" },
  completed: { label: "Completed", color: "#22C55E" },
};

function getDueLabel(dueDate: string): { text: string; color: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < -24) return { text: `${Math.abs(Math.floor(diffHours / 24))}d overdue`, color: "#EF4444" };
  if (diffHours < 0) return { text: `${Math.abs(Math.floor(diffHours))}h overdue`, color: "#EF4444" };
  if (diffHours < 1) return { text: "Due now", color: "#F59E0B" };
  if (diffHours < 24) return { text: `Due in ${Math.floor(diffHours)}h`, color: "#F59E0B" };
  if (diffHours < 48) return { text: "Due tomorrow", color: "#A3A3A3" };
  return { text: `Due in ${Math.floor(diffHours / 24)}d`, color: "#666" };
}

// ─── Add Task Modal ─────────────────────────────────────────

function AddTaskModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (task: TaskItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [assigned, setAssigned] = useState("");
  const [lead, setLead] = useState("");
  const [venture, setVenture] = useState<VentureKey>("saasum");
  const [value, setValue] = useState("");

  const TEAM = [
    { name: "Priya Sharma", email: "manager@saasum.in", phone: "+91 98765 43211" },
    { name: "Arjun Mehta", email: "rep@saasum.in", phone: "+91 98765 43212" },
    { name: "Sneha Reddy", email: "ambassador@saasum.in", phone: "+91 98765 43213" },
    { name: "Vishnu Reddy", email: "admin@saasum.in", phone: "+91 98765 43210" },
  ];

  const selectedMember = TEAM.find((m) => m.name === assigned);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newTask: TaskItem = {
      id: `t_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "pending",
      due_date: new Date(`${dueDate}T${dueTime}`).toISOString(),
      assigned: assigned || "Unassigned",
      assigned_email: selectedMember?.email || "",
      assigned_phone: selectedMember?.phone || "",
      lead: lead.trim() || null,
      venture,
      value: Number(value) || 0,
      reminders: [],
    };
    onSave(newTask);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-xl rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <p className="text-base font-semibold text-white">Create New Task</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#666]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="add-task-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Task Title <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all"
                  placeholder="e.g. Follow up with IIT Hyderabad"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all resize-none"
                  placeholder="Add details about this task..."
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                        style={{
                          backgroundColor: priority === p ? cfg.bg : "transparent",
                          borderColor: priority === p ? cfg.border : "#222",
                          color: priority === p ? cfg.color : "#666",
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Assign To
                </label>
                <select
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none appearance-none transition-all cursor-pointer"
                >
                  <option value="">Select team member</option>
                  {TEAM.map((m) => (
                    <option key={m.email} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Due Date <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all [color-scheme:dark]"
                />
              </div>

              {/* Due Time */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all [color-scheme:dark]"
                />
              </div>

              {/* Lead / Company */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Related Lead / Company
                </label>
                <input
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all"
                  placeholder="e.g. Razorpay"
                />
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Opportunity Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-all"
                  placeholder="e.g. 500000"
                />
              </div>

              {/* Venture */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">
                  Venture
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(VENTURES) as VentureKey[]).map((v) => {
                    const vent = VENTURES[v];
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVenture(v)}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all"
                        style={{
                          borderColor: venture === v ? vent.color : "#222",
                          backgroundColor: venture === v ? `${vent.color}10` : "transparent",
                        }}
                      >
                        <div className="w-5 h-5 bg-white/90 rounded-[3px] flex items-center justify-center">
                          <img src={vent.logo} alt={vent.name} className="w-4 h-4 object-contain" />
                        </div>
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: venture === v ? vent.color : "#666" }}
                        >
                          {vent.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A] shrink-0 bg-[#050505]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#666] text-sm border border-[#1A1A1A] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-task-form"
            className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Task Detail Card (Popup) ───────────────────────────────

function TaskDetailCard({
  task,
  onClose,
  onUpdate,
}: {
  task: TaskItem;
  onClose: () => void;
  onUpdate: (updated: TaskItem) => void;
}) {
  const v = VENTURES[task.venture];
  const pCfg = PRIORITY_CONFIG[task.priority];
  const sCfg = STATUS_CONFIG[task.status];
  const dueInfo = getDueLabel(task.due_date);

  // Reminder state
  const [reminderMsg, setReminderMsg] = useState(
    `Hi ${task.assigned},\n\nThis is a reminder regarding: "${task.title}"\n\nPlease ensure this is completed by the due date. Let me know if you need any help.`
  );
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [sending, setSending] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [customEmail, setCustomEmail] = useState(task.assigned_email || "");
  const [customPhone, setCustomPhone] = useState(task.assigned_phone.replace(/\+91\s?/g, "") || "");
  const [countryCode, setCountryCode] = useState("+91");
  const [customTelegramId, setCustomTelegramId] = useState("");

  const COUNTRY_CODES = [
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+1",  flag: "🇺🇸", name: "USA" },
    { code: "+44", flag: "🇬🇧", name: "UK" },
    { code: "+61", flag: "🇦🇺", name: "Australia" },
    { code: "+971", flag: "🇦🇪", name: "UAE" },
    { code: "+65", flag: "🇸🇬", name: "Singapore" },
    { code: "+49", flag: "🇩🇪", name: "Germany" },
    { code: "+33", flag: "🇫🇷", name: "France" },
    { code: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "+86", flag: "🇨🇳", name: "China" },
  ];

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const handleSendReminder = async () => {
    if (!channels.length || !reminderMsg.trim()) {
      toast.error("Select at least one channel and write a message");
      return;
    }
    setSending(true);
    try {
      // Send ALL channels via backend to bypass client-side adblockers and CORS issues
      const res = await fetch("/api/tasks/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          message: reminderMsg,
          channels: channels,
          recipient: {
            name: task.assigned,
            email: customEmail,
            phone: customPhone.startsWith("+") ? customPhone : `${countryCode}${customPhone}`,
            telegram_chat_id: customTelegramId || null,
          },
          due_date: task.due_date,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const failedChannels = data.results?.filter((r: any) => r.status === "failed") || [];
        const sentChannels = data.results?.filter((r: any) => r.status === "sent") || [];
        
        if (failedChannels.length > 0) {
          // If all selected channels failed
          if (sentChannels.length === 0) {
            toast.error(`${failedChannels[0].channel} Error: ${failedChannels[0].error || "Failed to send"}`);
            setSending(false);
            return;
          } else {
            // Partial success
            toast.warning(`Sent via ${sentChannels.map((c: any) => c.channel).join(", ")}, but failed for ${failedChannels.map((c: any) => c.channel).join(", ")}`);
          }
        } else {
          const channelLabels = channels.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");
          toast.success(`Reminder sent via ${channelLabels}`);
        }

        const finalStatus = sentChannels.length > 0 ? "sent" : "simulated";
        
        // Save to Supabase
        const dbReminder = await createTaskReminder({
          task_id: task.id,
          message: reminderMsg,
          channels: channels,
          status: finalStatus,
        });

        const newReminder: TaskReminder = {
          id: dbReminder.id,
          message: dbReminder.message,
          channels: dbReminder.channels,
          sent_at: dbReminder.sent_at,
          status: dbReminder.status,
        };

        const updatedTask = {
          ...task,
          reminders: [...task.reminders, newReminder],
        };
        onUpdate(updatedTask);
        setShowReminderForm(false);
      } else {
        toast.error(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      toast.error("Failed to send reminder");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdate({ ...task, status: newStatus });
    toast.success(`Task marked as ${STATUS_CONFIG[newStatus].label}`);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl"
        style={{
          border: `1px solid ${v.color}25`,
          background: `linear-gradient(180deg, ${v.color}08 0%, #0A0A0A 120px)`,
        }}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* ─── Venture Header Bar ─── */}
        <div
          className="px-8 pt-6 pb-5 border-b shrink-0"
          style={{ borderColor: `${v.color}20` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${v.color}18`, border: `1px solid ${v.color}30` }}
              >
                <div className="w-7 h-7 bg-white/95 rounded-[4px] flex items-center justify-center">
                  <img src={v.logo} alt={v.name} className="w-5 h-5 object-contain" />
                </div>
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: v.color }}>
                  {v.name}
                </span>
                <span className="text-xs text-[#666] ml-3">{v.type}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors border border-[#222]"
            >
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>
        </div>

        {/* ─── Task Content ─── */}
        <div className="overflow-y-auto flex-1" style={{ padding: 0 }}>
          <div style={{ padding: "32px 36px 40px 36px" }}>

            {/* Title & Description */}
            <div style={{ marginBottom: 32 }}>
              <h2
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)", lineHeight: 1.35, marginBottom: task.description ? 14 : 0 }}
              >
                {task.title}
              </h2>
              {task.description && (
                <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginTop: 14 }}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Meta Badges Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
              {/* Priority */}
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                  backgroundColor: pCfg.bg, border: `1px solid ${pCfg.border}`, color: pCfg.color,
                }}
              >
                <Zap style={{ width: 14, height: 14 }} />
                {pCfg.label}
              </span>

              {/* Status */}
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                  backgroundColor: `${sCfg.color}15`, border: `1px solid ${sCfg.color}30`, color: sCfg.color,
                }}
              >
                {task.status === "completed" ? (
                  <CheckCircle style={{ width: 14, height: 14 }} />
                ) : (
                  <Circle style={{ width: 14, height: 14 }} />
                )}
                {sCfg.label}
              </span>

              {/* Due */}
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                  backgroundColor: `${dueInfo.color}12`, border: `1px solid ${dueInfo.color}25`, color: dueInfo.color,
                }}
              >
                <Clock style={{ width: 14, height: 14 }} />
                {dueInfo.text}
              </span>
            </div>

            {/* Info Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {/* Assigned To */}
              <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <User style={{ width: 14, height: 14, color: "#555" }} />
                  <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500 }}>Assigned To</span>
                </div>
                <p style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{task.assigned}</p>
                {task.assigned_email && (
                  <p style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{task.assigned_email}</p>
                )}
              </div>

              {/* Due Date */}
              <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Calendar style={{ width: 14, height: 14, color: "#555" }} />
                  <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500 }}>Due Date</span>
                </div>
                <p style={{ fontSize: 14, color: "#fff", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                  {formatDate(task.due_date)}
                </p>
                <p style={{ fontSize: 12, marginTop: 6, color: dueInfo.color }}>
                  {dueInfo.text}
                </p>
              </div>

              {/* Lead / Company */}
              {task.lead && (
                <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <ArrowUpRight style={{ width: 14, height: 14, color: "#555" }} />
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500 }}>Lead</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{task.lead}</p>
                </div>
              )}

              {/* Opportunity Value */}
              {task.value > 0 && (
                <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <FileText style={{ width: 14, height: 14, color: "#555" }} />
                    <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500 }}>Opportunity</span>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-mono)", color: v.color }}>
                    {formatCurrency(task.value)}
                  </p>
                </div>
              )}
            </div>

            {/* Status Actions */}
            {task.status !== "completed" && (
              <div style={{ display: "flex", gap: 14, marginBottom: 36 }}>
                {task.status !== "in_progress" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "14px 16px", borderRadius: 14, fontSize: 13, fontWeight: 500,
                      border: "1px solid #1A1A1A", background: "#111", color: "#60A5FA", cursor: "pointer",
                    }}
                  >
                    <Circle style={{ width: 16, height: 16 }} />
                    Mark In Progress
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange("completed")}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px 16px", borderRadius: 14, fontSize: 13, fontWeight: 500,
                    border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.07)",
                    color: "#22C55E", cursor: "pointer",
                  }}
                >
                  <CheckCircle style={{ width: 16, height: 16 }} />
                  Mark Completed
                </button>
              </div>
            )}

            {/* ─── Follow-up Reminders ─── */}
            <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: 28, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Bell style={{ width: 16, height: 16, color: "#555" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Follow-up Reminders</span>
                  {task.reminders.length > 0 && (
                    <span
                      style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
                        backgroundColor: `${v.color}15`, color: v.color,
                      }}
                    >
                      {task.reminders.length}
                    </span>
                  )}
                </div>
                {!showReminderForm && (
                  <button
                    onClick={() => setShowReminderForm(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 10,
                      backgroundColor: `${v.color}12`, border: `1px solid ${v.color}25`, color: v.color,
                      cursor: "pointer",
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} />
                    Send Reminder
                  </button>
                )}
              </div>

              {/* Reminder Composer */}
              <AnimatePresence>
                {showReminderForm && (
                  <motion.div
                    style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: 24, marginBottom: 24 }}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {/* Channel Selector */}
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ display: "block", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 500, marginBottom: 12 }}>
                        Send via
                      </span>
                      <div style={{ display: "flex", gap: 10 }}>
                        {[
                          { key: "email", icon: Mail, label: "Email", color: "#60A5FA" },
                          { key: "whatsapp", icon: Phone, label: "WhatsApp", color: "#22C55E" },
                          { key: "telegram", icon: MessageCircle, label: "Telegram", color: "#60A5FA" },
                        ].map((ch) => (
                          <button
                            key={ch.key}
                            type="button"
                            onClick={() => toggleChannel(ch.key)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                              backgroundColor: channels.includes(ch.key) ? `${ch.color}12` : "transparent",
                              border: `1px solid ${channels.includes(ch.key) ? `${ch.color}30` : "#222"}`,
                              color: channels.includes(ch.key) ? ch.color : "#666",
                              cursor: "pointer", transition: "all 0.2s",
                            }}
                          >
                            <ch.icon style={{ width: 14, height: 14 }} />
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recipient Info */}
                    <div style={{ marginBottom: 16, fontSize: 12, color: "#666", background: "#0A0A0A", borderRadius: 10, padding: "12px 16px", border: "1px solid #1A1A1A" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "#888", width: 40 }}>To:</span>
                        <span style={{ color: "#fff", fontWeight: 500 }}>{task.assigned}</span>
                      </div>
                      
                      {channels.includes("email") && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <span style={{ color: "#888", width: 40 }}>Email:</span>
                          <input 
                            value={customEmail}
                            onChange={(e) => setCustomEmail(e.target.value)}
                            className="flex-1 bg-[#111] border border-[#222] rounded-md px-3 py-1.5 text-white focus:outline-none focus:border-[#555] transition-colors"
                            placeholder="Enter email address"
                          />
                        </div>
                      )}

                      {channels.includes("whatsapp") && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <span style={{ color: "#888", width: 40 }}>Phone:</span>
                          <div className="flex flex-1 gap-1">
                            {/* Country Code Dropdown */}
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="bg-[#111] border border-[#222] rounded-md px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555] transition-colors"
                              style={{ minWidth: 90 }}
                            >
                              {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code}>
                                  {c.flag} {c.code}
                                </option>
                              ))}
                            </select>
                            {/* Phone Number Input */}
                            <input
                              value={customPhone}
                              onChange={(e) => setCustomPhone(e.target.value.replace(/[^0-9]/g, ""))}
                              className="flex-1 bg-[#111] border border-[#222] rounded-md px-3 py-1.5 text-white focus:outline-none focus:border-[#555] transition-colors"
                              placeholder="6300315939"
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                      )}

                      {channels.includes("telegram") && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <span style={{ color: "#888", width: 40 }}>Chat ID:</span>
                          <input 
                            value={customTelegramId}
                            onChange={(e) => setCustomTelegramId(e.target.value)}
                            className="flex-1 bg-[#111] border border-[#222] rounded-md px-3 py-1.5 text-white focus:outline-none focus:border-[#555] transition-colors"
                            placeholder="Enter Telegram Chat ID"
                          />
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <textarea
                      value={reminderMsg}
                      onChange={(e) => setReminderMsg(e.target.value)}
                      rows={4}
                      style={{
                        width: "100%", background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 10,
                        padding: "12px 16px", fontSize: 14, color: "#fff", resize: "none", marginBottom: 16,
                        outline: "none", fontFamily: "inherit",
                      }}
                    />

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button
                        onClick={() => setShowReminderForm(false)}
                        style={{
                          padding: "10px 18px", borderRadius: 10, fontSize: 12, color: "#666",
                          background: "#0A0A0A", border: "1px solid #1A1A1A", cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendReminder}
                        disabled={sending || !channels.length}
                        style={{
                          padding: "10px 22px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 8,
                          backgroundColor: v.color, color: "#050505", cursor: "pointer",
                          opacity: (sending || !channels.length) ? 0.5 : 1,
                          border: "none",
                        }}
                      >
                        {sending ? (
                          <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        ) : (
                          <Send style={{ width: 14, height: 14 }} />
                        )}
                        {sending ? "Sending..." : "Send Reminder"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reminder History */}
              {task.reminders.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {task.reminders.map((rem) => (
                    <div
                      key={rem.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 14,
                        padding: 16, background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 999,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          backgroundColor: rem.status === "sent" ? "#22C55E15" : "#F59E0B15",
                        }}
                      >
                        {rem.status === "sent" ? (
                          <CheckCircle style={{ width: 13, height: 13, color: "#22C55E" }} />
                        ) : (
                          <Clock style={{ width: 13, height: 13, color: "#F59E0B" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          {rem.channels.map((ch) => (
                            <span
                              key={ch}
                              style={{
                                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                background: "#1A1A1A", color: "#888", textTransform: "capitalize",
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                          <span style={{ fontSize: 10, color: "#555", fontFamily: "var(--font-mono)" }}>
                            {formatRelativeDate(rem.sent_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{rem.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {task.reminders.length === 0 && !showReminderForm && (
                <p style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "28px 0" }}>No reminders sent yet</p>
              )}
            </div>

            {/* Bottom spacer */}
            <div style={{ height: 20 }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Tasks Page ────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    async function loadTasks() {
      try {
        const dbTasks = await getTasks();
        setTasks(dbTasks.map(mapToTaskItem));
      } catch (err) {
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  // Filtered tasks
  const filtered = tasks.filter((t) => {
    const matchesVenture = activeVenture === "all" || t.venture === activeVenture;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned.toLowerCase().includes(search.toLowerCase()) ||
      (t.lead || "").toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesVenture && matchesSearch && matchesPriority;
  });

  const now = new Date();
  const categorized = {
    overdue: filtered.filter(
      (t) => t.status !== "completed" && new Date(t.due_date) < now
    ),
    today: filtered.filter(
      (t) =>
        t.status !== "completed" &&
        new Date(t.due_date) >= now &&
        new Date(t.due_date) < new Date(now.getTime() + 24 * 3600000)
    ),
    upcoming: filtered.filter(
      (t) =>
        t.status !== "completed" &&
        new Date(t.due_date) >= new Date(now.getTime() + 24 * 3600000)
    ),
    completed: filtered.filter((t) => t.status === "completed"),
  };

  const toggleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    
    try {
      await updateTask(id, { status: newStatus });
    } catch (err) {
      toast.error("Failed to update status");
      // Revert optimistic update
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
    }
  };

  const handleAddTask = async (task: TaskItem) => {
    try {
      const dbTask = await createTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date,
        assigned_to: task.assigned,
        assigned_email: task.assigned_email,
        assigned_phone: task.assigned_phone,
        lead_name: task.lead || undefined,
        venture: task.venture,
        value: task.value
      });
      setTasks([mapToTaskItem(dbTask), ...tasks]);
      setShowAddModal(false);
      toast.success("Task created successfully");
    } catch (err) {
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async (updated: TaskItem) => {
    try {
      // Just update DB, don't update reminders here since they're handled separately
      await updateTask(updated.id, {
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        status: updated.status,
        due_date: updated.due_date,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(updated);
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const sections = [
    { key: "overdue", label: "Overdue", tasks: categorized.overdue, color: "#EF4444", icon: AlertTriangle },
    { key: "today", label: "Due Today", tasks: categorized.today, color: "#F59E0B", icon: Clock },
    { key: "upcoming", label: "Upcoming", tasks: categorized.upcoming, color: "#A3A3A3", icon: Circle },
    { key: "completed", label: "Completed", tasks: categorized.completed, color: "#22C55E", icon: CheckCircle },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Tasks
          </h1>
          <p className="text-[#666] text-sm mt-1">
            <span className="text-[#EF4444]" style={{ fontFamily: "var(--font-mono)" }}>
              {categorized.overdue.length}
            </span>{" "}
            overdue ·{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>{categorized.today.length}</span> due today ·{" "}
            <span className="text-[#22C55E]" style={{ fontFamily: "var(--font-mono)" }}>
              {categorized.completed.length}
            </span>{" "}
            completed
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        className="flex flex-wrap items-center gap-3 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input
            type="text"
            placeholder="Search tasks, people, leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => {
            const isActive = priorityFilter === p;
            const color = p === "all" ? "#A3A3A3" : PRIORITY_CONFIG[p].color;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className="rounded-lg text-xs font-medium capitalize transition-all border"
                style={{
                  padding: "6px 14px",
                  backgroundColor: isActive ? `${color}15` : "#111",
                  borderColor: isActive ? `${color}35` : "#1A1A1A",
                  color: isActive ? color : "#666",
                }}
              >
                {p === "all" ? "All" : PRIORITY_CONFIG[p].label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#666] animate-spin" />
          <p className="text-[#666] mt-4 text-sm font-[var(--font-mono)]">Loading tasks from DB...</p>
        </div>
      ) : (
        <div className="space-y-6">
        {sections.map((section, si) =>
          section.tasks.length > 0 ? (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                <span className="text-xs text-[#A3A3A3] tracking-wider uppercase">{section.label}</span>
                <span className="text-xs text-[#444]" style={{ fontFamily: "var(--font-mono)" }}>
                  ({section.tasks.length})
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-2">
                {section.tasks.map((task) => {
                  const tv = VENTURES[task.venture];
                  const tpCfg = PRIORITY_CONFIG[task.priority];
                  const tDue = getDueLabel(task.due_date);
                  return (
                    <motion.div
                      key={task.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group"
                      style={{
                        background: `linear-gradient(90deg, ${tv.color}05 0%, #111111 80%)`,
                        borderColor: "#1A1A1A",
                      }}
                      whileHover={{
                        borderColor: `${tv.color}35`,
                        backgroundColor: `${tv.color}08`,
                      }}
                      onClick={() => setSelectedTask(task)}
                      layout
                    >
                      {/* Checkbox */}
                      <button
                        onClick={(e) => toggleComplete(task.id, e)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          task.status === "completed"
                            ? "border-[#22C55E] bg-[#22C55E]"
                            : "border-[#333] hover:border-[#666]"
                        }`}
                      >
                        {task.status === "completed" && (
                          <CheckCircle className="w-3 h-3 text-[#050505]" />
                        )}
                      </button>

                      {/* Priority Dot */}
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tpCfg.color }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[0.9rem] truncate font-medium ${
                            task.status === "completed"
                              ? "text-[#666] line-through"
                              : "text-[#E5E5E5]"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {task.lead && (
                            <span className="text-xs text-[#666]">{task.lead}</span>
                          )}
                          <span className="text-xs text-[#555]">{task.assigned}</span>
                          {task.value > 0 && (
                            <span
                              className="text-xs font-medium"
                              style={{ fontFamily: "var(--font-mono)", color: `${tv.color}AA` }}
                            >
                              {formatCurrency(task.value)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Venture Badge */}
                      <VentureBadge venture={task.venture} iconOnly />

                      {/* Due */}
                      <span
                        className="text-xs flex-shrink-0 font-medium"
                        style={{ fontFamily: "var(--font-mono)", color: tDue.color }}
                      >
                        {tDue.text}
                      </span>

                      {/* Reminder count */}
                      {task.reminders.length > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ backgroundColor: `${tv.color}18`, color: tv.color }}
                        >
                          {task.reminders.length} sent
                        </span>
                      )}

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-[#666] transition-colors flex-shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : null
        )}

        {/* Empty State */}
        {filtered.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CheckSquare className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <p className="text-[#666] text-sm">No tasks found matching your criteria.</p>
            <button
              onClick={() => {
                setSearch("");
                setPriorityFilter("all");
              }}
              className="text-xs text-[#888] mt-2 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal onClose={() => setShowAddModal(false)} onSave={handleAddTask} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailCard
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
