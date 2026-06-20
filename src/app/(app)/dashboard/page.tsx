"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { VENTURES, type VentureKey } from "@/lib/constants";
import { VentureBadge } from "@/components/shared/venture-badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Share2,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  MousePointer,
  Zap,
  Target,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Check,
  Download,
  Send,
  RefreshCw,
  ChevronRight,
  Sparkles,
  TrendingDown,
  Minus,
  X
} from "lucide-react";
import { exportDashboardReport } from "@/lib/export";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { getLeads, getDeals, getTasks } from "@/lib/db";
import { formatCurrency, formatRelativeDate, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";

// ─── Sample Data ──────────────────────────────────────────────

const SAMPLE_FUNNEL = [
  { name: "New", count: 124, value: 4800000 },
  { name: "Contacted", count: 89, value: 3200000 },
  { name: "Qualified", count: 42, value: 2100000 },
  { name: "Proposal", count: 28, value: 1800000 },
  { name: "Negotiation", count: 15, value: 1200000 },
  { name: "Won", count: 12, value: 980000 },
];

const SAMPLE_REVENUE = [
  { month: "Jan", revenue: 320000, forecast: 350000 },
  { month: "Feb", revenue: 480000, forecast: 460000 },
  { month: "Mar", revenue: 620000, forecast: 580000 },
  { month: "Apr", revenue: 540000, forecast: 620000 },
  { month: "May", revenue: 780000, forecast: 750000 },
  { month: "Jun", revenue: 920000, forecast: 900000 },
];

const VENTURE_MONTHLY_REVENUE = [
  { month: "Jan", maceco: 180000, skill_tank: 140000, vriddhi: 95000, tobofu: 80000, promtal: 62000, saasum: 38000 },
  { month: "Feb", maceco: 220000, skill_tank: 175000, vriddhi: 110000, tobofu: 95000, promtal: 74000, saasum: 48000 },
  { month: "Mar", maceco: 310000, skill_tank: 240000, vriddhi: 145000, tobofu: 130000, promtal: 98000, saasum: 65000 },
  { month: "Apr", maceco: 270000, skill_tank: 210000, vriddhi: 165000, tobofu: 110000, promtal: 88000, saasum: 72000 },
  { month: "May", maceco: 390000, skill_tank: 295000, vriddhi: 195000, tobofu: 155000, promtal: 115000, saasum: 90000 },
  { month: "Jun", maceco: 470000, skill_tank: 360000, vriddhi: 230000, tobofu: 185000, promtal: 138000, saasum: 115000 },
];

const SAMPLE_ACTIVITIES = [
  { id: "1", type: "call", subject: "Discovery call with IIT Hyderabad", user: "Priya Sharma", time: "2h ago", venture: "skill_tank" as VentureKey },
  { id: "2", type: "email", subject: "Proposal sent to Zomato", user: "Arjun Mehta", time: "3h ago", venture: "maceco" as VentureKey },
  { id: "3", type: "meeting", subject: "Quarterly review — Razorpay", user: "Priya Sharma", time: "5h ago", venture: "tobofu" as VentureKey },
  { id: "4", type: "note", subject: "Lead qualified — Sunburn Festival", user: "Sneha Reddy", time: "6h ago", venture: "promtal" as VentureKey },
  { id: "5", type: "call", subject: "Follow-up with GreenEnergy Labs", user: "Arjun Mehta", time: "8h ago", venture: "vriddhi" as VentureKey },
];

const VENTURE_REVENUE: { key: VentureKey; revenue: number; leads: number; deals: number }[] = [
  { key: "maceco", revenue: 1840000, leads: 42, deals: 8 },
  { key: "skill_tank", revenue: 1420000, leads: 56, deals: 6 },
  { key: "vriddhi", revenue: 1180000, leads: 28, deals: 5 },
  { key: "tobofu", revenue: 980000, leads: 38, deals: 4 },
  { key: "promtal", revenue: 740000, leads: 30, deals: 3 },
  { key: "saasum", revenue: 540000, leads: 24, deals: 2 },
];

const VENTURE_LEAD_DIST: { key: VentureKey; percent: number }[] = [
  { key: "skill_tank", percent: 25 },
  { key: "maceco", percent: 20 },
  { key: "tobofu", percent: 18 },
  { key: "vriddhi", percent: 15 },
  { key: "promtal", percent: 12 },
  { key: "saasum", percent: 10 },
];

const SAMPLE_LEADERBOARD = [
  { rank: 1, name: "Sneha Reddy",  clicks: 247, conversions: 18, earned: 240000 },
  { rank: 2, name: "Priya Sharma", clicks: 183, conversions: 12, earned: 180000 },
  { rank: 3, name: "Arjun Mehta",  clicks: 156, conversions: 9,  earned: 120000 },
];

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: MessageSquare,
  note: FileText,
};

// ─── Venture Revenue Trend Chart ────────────────────────────────

const VENTURE_LINE_META: { key: string; color: string; name: string }[] = [
  { key: "maceco",     color: "#60a5fa", name: "Maceco" },
  { key: "skill_tank", color: "#fbbf24", name: "Skill Tank" },
  { key: "vriddhi",   color: "#34d399", name: "Vriddhi" },
  { key: "tobofu",    color: "#a78bfa", name: "Tobofu" },
  { key: "promtal",   color: "#fb7185", name: "Promtal" },
  { key: "saasum",    color: "#E54D4C", name: "Saasum" },
];

function VentureRevenueTrendChart() {
  const [active, setActive] = useState<Set<string>>(new Set(VENTURE_LINE_META.map(v => v.key)));
  const [animKey, setAnimKey] = useState(0);

  const toggle = (key: string) => {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setAnimKey(k => k + 1);
  };

  const CustomTooltip = ({ active: tooltipActive, payload, label }: any) => {
    if (!tooltipActive || !payload?.length) return null;
    return (
      <div className="bg-[#0D0D0D] border border-[#222] rounded-2xl p-4 shadow-2xl min-w-[180px]">
        <p className="text-[11px] text-[#666] uppercase tracking-widest font-bold mb-3">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-[12px] text-[#A3A3A3]">{VENTURE_LINE_META.find(v => v.key === p.dataKey)?.name}</span>
              </div>
              <span className="text-[13px] font-semibold text-white">₹{(p.value / 100000).toFixed(1)}L</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[#1A1A1A] flex items-center justify-between">
          <span className="text-[11px] text-[#555]">Total</span>
          <span className="text-[13px] font-black text-white">₹{(payload.reduce((s: number, p: any) => s + (p.value || 0), 0) / 100000).toFixed(1)}L</span>
        </div>
      </div>
    );
  };

  // Custom dot with pulse ring on last data point
  const PulseDot = (props: any) => {
    const { cx, cy, dataKey, index } = props;
    const isLast = index === VENTURE_MONTHLY_REVENUE.length - 1;
    if (!isLast) return null;
    const meta = VENTURE_LINE_META.find(v => v.key === dataKey);
    if (!meta) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={meta.color} fillOpacity={0.15} />
        <circle cx={cx} cy={cy} r={4} fill={meta.color} />
        <circle cx={cx} cy={cy} r={3} fill="#0D0D0D" />
        <circle cx={cx} cy={cy} r={2} fill={meta.color} />
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>Revenue Trend</h3>
          <p className="text-xs text-[#444] mt-0.5">Per venture · Last 6 months</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl px-2 py-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#34d399]" />
          <span className="text-[11px] font-bold text-[#34d399]">+187%</span>
          <span className="text-[11px] text-[#444]">YTD</span>
        </div>
      </div>

      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        {VENTURE_LINE_META.map(v => {
          const on = active.has(v.key);
          return (
            <motion.button
              key={v.key}
              onClick={() => toggle(v.key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer"
              style={{
                background: on ? `${v.color}18` : "#080808",
                borderColor: on ? `${v.color}60` : "#1A1A1A",
                color: on ? v.color : "#333",
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: on ? v.color : "#222" }} />
              {v.name}
            </motion.button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[13rem]" key={animKey}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={VENTURE_MONTHLY_REVENUE} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {VENTURE_LINE_META.map(v => (
                <linearGradient key={v.key} id={`glow-${v.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={v.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={v.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#111" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#444" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#333" }}
              tickFormatter={(v) => `₹${v / 100000}L`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#222", strokeWidth: 1 }} />
            {VENTURE_LINE_META.filter(v => active.has(v.key)).map(v => (
              <Line
                key={v.key}
                type="monotone"
                dataKey={v.key}
                stroke={v.color}
                strokeWidth={2.5}
                dot={<PulseDot />}
                activeDot={{ r: 5, fill: v.color, strokeWidth: 2, stroke: "#0D0D0D" }}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom KPI strip */}
      <div className="mt-4 pt-4 border-t border-[#111] grid grid-cols-3 gap-2 flex-shrink-0">
        {[
          { label: "Top Venture", value: "Maceco", sub: "₹47L this month", color: "#60a5fa" },
          { label: "Total Jun Revenue", value: "₹146L", sub: "↑ 23% vs May", color: "#34d399" },
          { label: "Fastest Growth", value: "Saasum", sub: "+28% MoM", color: "#E54D4C" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#080808] rounded-xl p-3 border border-[#111]">
            <p className="text-[10px] text-[#444] uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-[14px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] text-[#555] mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live AI Insight Widget (Admin + Manager) ─────────────────

// Smart fallback summary (shown instantly before Gemini responds)
const FALLBACK_SUMMARY = {
  headline: "84 leads in pipeline — ₹5.78Cr opportunity active this quarter.",
  sentiment: "positive",
  metrics: [
    { label: "Pipeline", value: "₹5.78Cr", trend: "up" },
    { label: "Conversion", value: "25.0%", trend: "up" },
    { label: "Deals Won", value: "21", trend: "up" },
    { label: "Tasks Pending", value: "17", trend: "down" },
  ],
  actions: [
    { priority: "high", text: "Follow up on deals closing this week", link: "/deals" },
    { priority: "medium", text: "17 pending tasks need your attention", link: "/tasks" },
    { priority: "low", text: "Qualify top prospects from 84 pipeline leads", link: "/leads" },
  ],
  forecast: "At current velocity of 21 closed deals, Q3 is on track to exceed ₹8Cr in closed revenue.",
};

function useTypewriter(text: string, speed = 20) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) return;
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return displayed;
}

// ─── Expandable Revenue Chart ──────────────────────────────────────

function ExpandableRevenueChart() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <motion.div
        layoutId="revenue-trend-card"
        className="card p-6 lg:col-span-2 flex flex-col h-full cursor-pointer hover:border-[#333] transition-colors"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        onClick={() => setExpanded(true)}
      >
        <VentureRevenueTrendChart />
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              layoutId="revenue-trend-card"
              className="relative w-full max-w-7xl h-[85vh] card flex flex-col shadow-2xl overflow-hidden"
              style={{ background: "#0A0A0A", border: "1px solid #222" }}
            >
              <div className="flex justify-end p-4 pb-0 flex-shrink-0 z-10 absolute right-0 top-0">
                <button onClick={() => setExpanded(false)} className="text-[#666] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 bg-[#00000088]">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 p-6 lg:p-8 min-h-0 w-full h-full pt-8">
                <VentureRevenueTrendChart />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function LiveAIInsightWidget() {
  const [summary, setSummary] = useState<any>(FALLBACK_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [isAI, setIsAI] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const headlineTyped = useTypewriter(summary?.headline || "", 20);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setIsAI(false);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "summary" }),
      });
      const data = await res.json();
      if (data.summary) { setSummary(data.summary); setIsAI(true); }
    } catch { /* keep fallback */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", question: q }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "ai", text: data.answer || "I couldn't answer that." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const accentColor = summary?.sentiment === "warning" ? "#F59E0B" : "#22C55E";
  const trendColor = (t: string) => t === "up" ? "#22C55E" : t === "down" ? "#EF4444" : "#555";

  return (
    <>
      <motion.div
        layoutId="ai-widget-card"
        className="card overflow-hidden h-full flex flex-col cursor-pointer"
        style={{ borderLeft: `2px solid ${accentColor}44` }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        onClick={() => setExpanded(true)}
      >
        {/* ── Collapsed Card (always visible in grid) ── */}
        {/* ── Collapsed Card (always visible in grid) ── */}
        <div className="w-full h-full flex-1 p-6 lg:p-8 flex flex-col justify-between text-left group transition-all min-h-[16rem]">
          {/* Top Section */}
          <div className="flex flex-col gap-4">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={loading ? { rotate: 360 } : { scale: [1, 1.2, 1] }}
                  transition={loading ? { repeat: Infinity, duration: 1.2, ease: "linear" } : { duration: 0.5 }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                </motion.div>
                <span className="text-[11px] text-[#555] tracking-[0.15em] uppercase font-bold">
                  AI Executive Summary
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide"
                  style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
                >
                  {isAI ? "✦ GEMINI" : loading ? "…" : "LIVE"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={e => { e.stopPropagation(); fetchSummary(); }}
                  className="p-1.5 rounded-lg text-[#333] hover:text-[#666] hover:bg-[#111] transition-all"
                  title="Refresh"
                  whileTap={{ scale: 0.9 }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </motion.button>
                <div className="text-[#333] group-hover:text-[#666] transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Headline preview */}
            {loading ? (
              <div className="space-y-2">
                <div className="h-5 bg-white/5 rounded animate-pulse w-4/5" />
                <div className="h-5 bg-white/5 rounded animate-pulse w-3/5" />
              </div>
            ) : (
              <p
                className="text-white text-left leading-snug"
                style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", lineHeight: 1.4 }}
              >
                <span className="line-clamp-2">{summary?.headline}</span>
              </p>
            )}

            {/* Smart Actions (Unexpanded snippet) */}
            {!loading && summary?.actions && summary.actions.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {summary.actions.slice(0, 2).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: a.priority === "high" ? "#EF4444" : a.priority === "medium" ? "#F59E0B" : "#22C55E" }}
                    />
                    <span className="text-sm text-[#888] truncate">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Collapsed mini-metrics strip */}
            {!loading && summary?.metrics && (
              <div className="flex items-center gap-4 flex-wrap">
                {summary.metrics.map((m: any) => (
                  <div key={m.label} className="flex items-center gap-1.5">
                    {m.trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />}
                    {m.trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />}
                    {m.trend === "flat" && <Minus className="w-3.5 h-3.5 text-[#444]" />}
                    <span
                      className="text-sm font-bold"
                      style={{ fontFamily: "var(--font-mono)", color: trendColor(m.trend) }}
                    >
                      {m.value}
                    </span>
                    <span className="text-[10px] text-[#555] font-medium tracking-wide uppercase">{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expand prompt */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#444] group-hover:text-[#666] transition-colors mt-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Click anywhere to open full AI dashboard</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Expanded Detail (Modal Popup) ── */}
      <AnimatePresence>
        {expanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
            />
            {/* Modal Content */}
            <motion.div
              key="expanded"
              layoutId="ai-widget-card"
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: "#080808", border: `1px solid ${accentColor}44` }}
            >
              {/* Modal Header */}
              <div className="p-6 lg:p-8 border-b border-[#111] flex flex-col gap-5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
                    <span className="text-xs text-[#555] tracking-[0.15em] uppercase font-bold">
                      AI Executive Summary
                    </span>
                    <span
                      className="text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide"
                      style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
                    >
                      {isAI ? "✦ GEMINI" : "LIVE"}
                    </span>
                  </div>
                  <button onClick={() => setExpanded(false)} className="text-[#666] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-white text-2xl leading-snug" style={{ fontFamily: "var(--font-heading)" }}>
                  {headlineTyped}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.65 }}
                    className="inline-block w-0.5 h-[0.9em] align-middle ml-0.5"
                    style={{ background: accentColor }}
                  />
                </p>
              </div>

              {/* Scrollable Details - Two Column Layout */}
              <div className="overflow-y-auto flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                
                {/* Left Column */}
                <div className="flex flex-col gap-8">
                  {/* 2×2 metrics grid */}
                  {summary?.metrics && (
                    <div className="grid grid-cols-2 gap-4">
                      {summary.metrics.map((m: any, i: number) => (
                        <motion.div
                          key={m.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          whileHover={{ scale: 1.02 }}
                          className="rounded-xl p-5 flex flex-col gap-2 cursor-default shadow-lg"
                          style={{ background: "#0C0C0C", border: "1px solid #1E1E1E" }}
                        >
                          <span className="text-xs text-[#666] font-semibold tracking-wider uppercase">{m.label}</span>
                          <div className="flex items-center gap-2.5">
                            {m.trend === "up" && <TrendingUp className="w-5 h-5 text-[#22C55E]" />}
                            {m.trend === "down" && <TrendingDown className="w-5 h-5 text-[#EF4444]" />}
                            {m.trend === "flat" && <Minus className="w-5 h-5 text-[#555]" />}
                            <span
                              className="text-3xl font-bold"
                              style={{ fontFamily: "var(--font-mono)", color: trendColor(m.trend) }}
                            >
                              {m.value}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Forecast */}
                  {summary?.forecast && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex gap-4 items-start rounded-xl p-6"
                      style={{ background: `${accentColor}08`, border: `1px dashed ${accentColor}28` }}
                    >
                      <span className="text-2xl flex-shrink-0 mt-0.5">🔮</span>
                      <p className="text-lg leading-relaxed italic" style={{ color: "#A3A3A3" }}>
                        {summary.forecast}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-8">
                  {/* Smart Actions */}
                  {summary?.actions && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-[#555] tracking-widest uppercase font-bold mb-1">Smart Actions</p>
                      {summary.actions.map((a: any, i: number) => (
                        <motion.a
                          key={i}
                          href={a.link}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          whileHover={{ x: 3 }}
                          className="flex items-center gap-4 p-4 rounded-xl group cursor-pointer transition-colors shadow-md"
                          style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background: a.priority === "high" ? "#EF4444" : a.priority === "medium" ? "#F59E0B" : "#22C55E",
                              boxShadow: `0 0 8px ${a.priority === "high" ? "#EF444455" : a.priority === "medium" ? "#F59E0B55" : "#22C55E55"}`,
                            }}
                          />
                          <span className="text-lg text-[#888] group-hover:text-white transition-colors flex-1 leading-snug">
                            {a.text}
                          </span>
                          <ChevronRight className="w-6 h-6 text-[#444] group-hover:text-[#888] transition-colors flex-shrink-0" />
                        </motion.a>
                      ))}
                    </div>
                  )}

                  {/* Chat */}
                  <div className="flex flex-col flex-1 min-h-[250px]" style={{ borderTop: "1px solid #1A1A1A", paddingTop: "1.5rem" }}>
                    <button
                      onClick={() => setChatOpen(o => !o)}
                      className="flex items-center gap-3 w-full group mb-4"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{ background: "#111", border: "1px solid #222" }}
                      >
                        <MessageSquare className="w-5 h-5 text-[#888] group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-lg font-medium text-[#888] group-hover:text-white transition-colors flex-1 text-left">
                        Ask your CRM anything…
                      </span>
                      <motion.div animate={{ rotate: chatOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight className="w-5 h-5 text-[#444]" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {chatOpen && (
                        <motion.div
                          key="chat"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex flex-col gap-4 overflow-hidden flex-1"
                        >
                          {chatMessages.length === 0 && (
                            <div className="flex flex-wrap gap-2.5">
                              {["Which venture has most leads?", "Deals closing this week?", "Pipeline value?"].map(q => (
                                <button
                                  key={q}
                                  onClick={() => setChatInput(q)}
                                  className="text-[13px] text-[#888] px-4 py-2.5 rounded-full hover:text-white transition-all shadow-sm hover:shadow-md"
                                  style={{ background: "#111", border: "1px solid #222" }}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}
                          {chatMessages.length > 0 && (
                            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 mb-2 max-h-[35vh]">
                              {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                  <div
                                    className="max-w-[88%] text-base px-5 py-3.5 rounded-2xl leading-relaxed shadow-sm"
                                    style={msg.role === "user"
                                      ? { background: "#fff", color: "#000", borderBottomRightRadius: 6 }
                                      : { background: "#151515", border: "1px solid #2A2A2A", color: "#E5E5E5", borderBottomLeftRadius: 6 }
                                    }
                                  >
                                    {msg.role === "ai" && <Brain className="w-4 h-4 inline mr-2 opacity-50" />}
                                    {msg.text}
                                  </div>
                                </div>
                              ))}
                              {chatLoading && (
                                <div className="flex justify-start">
                                  <div className="px-5 py-4 rounded-2xl" style={{ background: "#111", border: "1px solid #222", borderBottomLeftRadius: 6 }}>
                                    <div className="flex gap-2">
                                      {[0,1,2].map(i => (
                                        <motion.span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#444" }}
                                          animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div ref={chatEndRef} />
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-auto">
                            <input
                              ref={inputRef}
                              type="text"
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && sendChat()}
                              placeholder="Type a question..."
                              className="flex-1 bg-[#111] border border-[#222] rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#444] transition-colors"
                            />
                            <button
                              onClick={sendChat}
                              disabled={chatLoading || !chatInput.trim()}
                              className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-200"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}


function AIInsightSalesRep() {
  return (
    <motion.div
      className="card p-5 border-l-2 border-l-[#F5F5F5]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-[#A3A3A3]" />
        <span className="text-[10px] text-[#666] tracking-[0.15em] uppercase font-semibold">AI Suggested Action</span>
      </div>
      <div className="space-y-4">
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium">Follow up with Zomato</span>
              <VentureBadge venture="maceco" iconOnly />
            </div>
            <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full font-semibold" style={{ fontFamily: "var(--font-mono)" }}>82% close</span>
          </div>
          <p className="text-xs text-[#666]">Last contact was 3 days ago. They requested pricing — send the campaign proposal today.</p>
        </div>
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium">Re-engage Razorpay</span>
              <VentureBadge venture="tobofu" iconOnly />
            </div>
            <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full font-semibold" style={{ fontFamily: "var(--font-mono)" }}>54% close</span>
          </div>
          <p className="text-xs text-[#666]">No response in 7 days. Try a phone call — email open rate was low.</p>
        </div>
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium">Qualify Sunburn Festival</span>
              <VentureBadge venture="promtal" iconOnly />
            </div>
            <span className="text-[10px] text-[#A3A3A3] bg-[#1A1A1A] px-2 py-0.5 rounded-full font-semibold" style={{ fontFamily: "var(--font-mono)" }}>New</span>
          </div>
          <p className="text-xs text-[#666]">Inbound lead from website — matches your ideal customer profile.</p>
        </div>
      </div>
    </motion.div>
  );
}

function AIInsightAmbassador() {
  return (
    <motion.div
      className="card p-5 border-l-2 border-l-[#22C55E]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-[#22C55E]" />
        <span className="text-[10px] text-[#666] tracking-[0.15em] uppercase font-semibold">AI Referral Insight</span>
      </div>
      <div className="space-y-4">
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-xs text-[#A3A3A3] font-medium">Best Audience</span>
          </div>
          <p className="text-sm text-white">Technology startups convert <span className="text-[#22C55E] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>31%</span> better than other industries.</p>
        </div>
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-xs text-[#A3A3A3] font-medium">Tip</span>
          </div>
          <p className="text-sm text-[#888]">Share your link in AI/ML communities — these leads have the highest deal value.</p>
        </div>
        <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span className="text-xs text-[#A3A3A3] font-medium">Your Trend</span>
          </div>
          <p className="text-sm text-[#888]">Your conversion rate is <span className="text-white font-medium">up 12%</span> this month. Keep sharing!</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export default function DashboardPage() {
  const { can, role, user } = useAuth();

  const [metrics, setMetrics] = useState({
    total_leads: 0,
    conversion_rate: 0,
    pipeline_value: 0,
    deals_closed: 0,
    referral_revenue: 0,
    tasks_due: 0,
    referral_clicks: 0,
    referral_conversions: 0,
    referral_rate: 0,
    referral_earned: 0,
  });

  const [leaderboard, setLeaderboard] = useState(SAMPLE_LEADERBOARD);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [leads, deals, tasks] = await Promise.all([
          getLeads(),
          getDeals(),
          getTasks(),
        ]);
        
        const wonDeals = deals.filter((d: any) => d.status === 'won');
        const openDeals = deals.filter((d: any) => d.status === 'open');
        const pendingTasks = tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
        const wonLeads = leads.filter((l: any) => l.stage?.is_won_stage);
        const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
        const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);

        setMetrics(prev => ({
          ...prev,
          total_leads: leads.length,
          deals_closed: wonDeals.length,
          pipeline_value: pipelineValue,
          tasks_due: pendingTasks.length,
          conversion_rate: parseFloat(conversionRate.toFixed(1)),
        }));

      } catch (err: any) {
        console.error("fetchMetrics error:", err);
      }
    };
    fetchMetrics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  // Determine what this role can see
  const canViewPipeline = can("view_pipeline");
  const canViewLeads = can("view_leads");
  const canViewDeals = can("view_deals");
  const canViewTasks = can("view_tasks");
  const canViewReferrals = can("view_referrals");
  const canViewInvoices = can("view_invoices");
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isSalesRep = role === "sales_rep";
  const isAmbassador = role === "ambassador";

  const ambConversions = metrics.referral_conversions;
  const ambTiers = [
    { min: 0,  rate: 0.014, label: "Starter",  emoji: "🌱", color: "#6366F1" },
    { min: 3,  rate: 0.020, label: "Rising",   emoji: "🚀", color: "#8B5CF6" },
    { min: 6,  rate: 0.028, label: "Active",   emoji: "⚡", color: "#EC4899" },
    { min: 10, rate: 0.035, label: "Elite",    emoji: "💎", color: "#F43F5E" },
    { min: 15, rate: 0.042, label: "Champion", emoji: "🏆", color: "#F59E0B" },
    { min: 25, rate: 0.050, label: "Legend",   emoji: "👑", color: "#EAB308" },
  ] as const;
  const ambTier = [...ambTiers].reverse().find(t => ambConversions >= t.min) || ambTiers[0];
  const ambTierIdx = ambTiers.findIndex(t => t.label === ambTier.label);
  const ambNextTier = ambTierIdx < ambTiers.length - 1 ? ambTiers[ambTierIdx + 1] : null;
  const ambProgress = ambNextTier ? Math.min(100, ((ambConversions - ambTier.min) / (ambNextTier.min - ambTier.min)) * 100) : 100;

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isAmbassador ? (
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <motion.div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${ambTier.color}18`, border: `1px solid ${ambTier.color}40` }}
                animate={{ boxShadow: [`0 0 0px ${ambTier.color}00`, `0 0 20px ${ambTier.color}50`, `0 0 0px ${ambTier.color}00`] }}
                transition={{ repeat: Infinity, duration: 2.5 }}>
                {ambTier.emoji}
              </motion.div>
              <div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 700 }}>Ambassador War Room</h1>
                <p className="text-[#666] text-sm mt-0.5">{user?.full_name?.split(" ")[0]} · <span style={{ color: ambTier.color }} className="font-semibold">{ambTier.label} Tier</span></p>
              </div>
            </div>
            <motion.div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: `${ambTier.color}12`, border: `1px solid ${ambTier.color}35`, color: ambTier.color }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
              <Zap className="w-4 h-4" /> {(ambTier.rate * 100).toFixed(1)}% Commission
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex justify-between items-center w-full">
            <div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
                Dashboard
              </h1>
              <p className="text-[#666] text-sm mt-1">
                {isAdmin
                  ? "Executive overview of the entire Centle ecosystem."
                  : isManager
                  ? "Your team's pipeline and performance at a glance."
                  : `Welcome back, ${user?.full_name?.split(" ")[0] ?? "Rep"}. Here are your priorities.`}
              </p>
            </div>
            {(isAdmin || isManager) && (
              <button 
                onClick={() => {
                  const sections = [
                    {
                      title: "Revenue Overview",
                      columns: ["Month", "Revenue", "Forecast"],
                      rows: SAMPLE_REVENUE.map(r => [r.month, formatCurrency(r.revenue), formatCurrency(r.forecast)])
                    },
                    {
                      title: "Pipeline Summary",
                      columns: ["Stage", "Count", "Value"],
                      rows: SAMPLE_FUNNEL.map(r => [r.name, String(r.count), formatCurrency(r.value)])
                    },
                    {
                      title: "Lead Distribution",
                      columns: ["Venture", "Percentage"],
                      rows: VENTURE_LEAD_DIST.map(r => [r.key.replace("_", " ").toUpperCase(), String(r.percent) + "%"])
                    },
                    {
                      title: "Venture Performance",
                      columns: ["Venture", "Revenue", "Leads", "Deals"],
                      rows: VENTURE_REVENUE.map(r => [r.key.replace("_", " ").toUpperCase(), formatCurrency(r.revenue), String(r.leads), String(r.deals)])
                    }
                  ];
                  exportDashboardReport("dashboard_report.pdf", "Executive Dashboard Report", sections);
                  import("sonner").then(m => m.toast.success("Dashboard Report Exported"));
                }}
                className="btn-ghost text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          STAT CARDS — Role-specific
          ═══════════════════════════════════════════════════════════ */}

      {/* CRM Stats — Admin, Manager, Sales Rep */}
      {(canViewLeads || canViewDeals) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Leads"
            value={metrics.total_leads}
            icon={Users}
            trend={{ value: 12, positive: true }}
            index={0}
          />
          <StatCard
            label="Conversion Rate"
            value={metrics.conversion_rate}
            suffix="%"
            decimals={1}
            icon={TrendingUp}
            trend={{ value: 4.2, positive: true }}
            index={1}
          />
          <StatCard
            label="Pipeline Value"
            value={metrics.pipeline_value / 10000000}
            prefix="₹"
            suffix=" Cr"
            decimals={2}
            icon={DollarSign}
            index={2}
          />
          <StatCard
            label="Deals Won"
            value={metrics.deals_closed}
            icon={CheckCircle}
            trend={{ value: 8, positive: true }}
            index={3}
          />
        </div>
      )}

      {/* ─── Ambassador: Commission Arc + Tier Roadmap ─── */}
      {isAmbassador && (
        <div className="flex flex-col gap-8 mb-10">
          {/* Arc + Stats row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Arc Card */}
            <motion.div className="card p-8 flex flex-col items-center relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: `linear-gradient(135deg, ${ambTier.color}06, transparent)` }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${ambTier.color}80,transparent)` }} />
              {/* SVG Arc */}
              <div className="relative w-44 h-44 mx-auto">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
                  <circle cx="100" cy="100" r="76" fill="none" stroke="#111" strokeWidth="12"
                    strokeDasharray={`${2*Math.PI*76*0.75} ${2*Math.PI*76}`} strokeLinecap="round" />
                  <motion.circle cx="100" cy="100" r="76" fill="none" stroke={ambTier.color} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*76*0.75} ${2*Math.PI*76}`}
                    initial={{ strokeDashoffset: 2*Math.PI*76*0.75 }}
                    animate={{ strokeDashoffset: 2*Math.PI*76*0.75*(1-(ambProgress/100)) }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} />
                  <motion.circle cx="100" cy="100" r="76" fill="none" stroke={ambTier.color} strokeWidth="20" strokeLinecap="round" opacity="0.1"
                    strokeDasharray={`${2*Math.PI*76*0.75} ${2*Math.PI*76}`}
                    initial={{ strokeDashoffset: 2*Math.PI*76*0.75 }}
                    animate={{ strokeDashoffset: 2*Math.PI*76*0.75*(1-(ambProgress/100)) }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                  <motion.span className="text-4xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>{ambTier.emoji}</motion.span>
                  <motion.p className="text-2xl font-black mt-1" style={{ color: ambTier.color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{(ambTier.rate*100).toFixed(1)}%</motion.p>
                  <p className="text-[9px] text-[#444] uppercase tracking-widest font-bold mt-0.5">{ambTier.label}</p>
                </div>
              </div>
              {ambNextTier ? (
                <div className="w-full mt-5">
                  <div className="flex justify-between text-[11px] mb-2">
                    <span className="text-[#555]">{ambConversions} conversions</span>
                    <span style={{ color: ambNextTier.color }}>{ambNextTier.min - ambConversions} more → {ambNextTier.emoji}</span>
                  </div>
                  <div className="h-2 bg-[#111] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${ambTier.color},${ambNextTier.color})` }}
                      initial={{ width: 0 }} animate={{ width: `${ambProgress}%` }} transition={{ duration: 1.2, delay: 0.5 }} />
                  </div>
                </div>
              ) : (
                <motion.p className="mt-4 text-yellow-400 text-xs font-bold text-center" animate={{ scale: [1,1.05,1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  👑 Maximum Tier Reached!
                </motion.p>
              )}
            </motion.div>

            {/* Stats 2x2 */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-5">
              {[
                { label: "Total Earned", value: metrics.referral_earned, prefix: "₹", icon: DollarSign, color: "#10B981" },
                { label: "Link Clicks",  value: metrics.referral_clicks, prefix: "", icon: MousePointer, color: "#EC4899" },
                { label: "Conversions",  value: metrics.referral_conversions, prefix: "", icon: TrendingUp, color: ambTier.color },
                { label: "Conv. Rate",   value: metrics.referral_rate, prefix: "", suffix: "%", icon: Share2, color: "#6366F1" },
              ].map((s, i) => (
                <motion.div key={s.label} className="card p-6 relative overflow-hidden"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08*i }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}>
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-[0.07]" style={{ background: s.color, filter: "blur(20px)" }} />
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-[#555]">{s.label}</p>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tight">{s.prefix}{s.value.toLocaleString("en-IN")}{s.suffix || ""}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tier Roadmap */}
          <motion.div className="card p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-white">Commission Tier Roadmap</h3>
              <span className="text-[11px] text-[#555] bg-[#0A0A0A] px-3 py-1 rounded-full border border-[#1A1A1A]">Up to <span className="text-yellow-400 font-bold">5%</span> at 25 conversions</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {ambTiers.map((t, i) => {
                const unlocked = i <= ambTierIdx;
                const current = i === ambTierIdx;
                return (
                  <motion.div key={t.label}
                    className="relative rounded-xl p-3 text-center border cursor-default"
                    style={{ background: unlocked ? `${t.color}08` : "#060606", borderColor: current ? t.color : unlocked ? `${t.color}25` : "#0F0F0F", boxShadow: current ? `0 0 20px ${t.color}20` : undefined }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.07 }}
                    whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}>
                    {current && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><div className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider" style={{ background: t.color, color: "#000" }}>YOU</div></div>}
                    {current && <motion.div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: `1px solid ${t.color}` }} animate={{ opacity: [0.4,1,0.4] }} transition={{ repeat: Infinity, duration: 2 }} />}
                    <div className="text-2xl mb-2 mt-2">{t.emoji}</div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: unlocked ? t.color : "#1A1A1A" }}>{t.label}</p>
                    <p className="text-sm font-black" style={{ color: unlocked ? "#fff" : "#111" }}>{(t.rate*100).toFixed(1)}%</p>
                    <p className="text-[8px] mt-1" style={{ color: unlocked ? "#444" : "#111" }}>{t.min}+ refs</p>
                    {unlocked && !current && <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-3 h-3" style={{ color: t.color }} /></motion.div>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CHARTS ROW — Admin & Manager get revenue chart + AI widget
          Sales Rep gets funnel + AI widget
          ═══════════════════════════════════════════════════════════ */}

      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart — Animated Multi-Venture Breakdown */}
          <ExpandableRevenueChart />

          {/* AI Widget — Admin or Manager (Live Gemini) */}
          <LiveAIInsightWidget />
        </div>
      )}

      {/* Sales Rep: Funnel + AI Widget row */}
      {isSalesRep && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Sales Funnel */}
          <motion.div
            className="card p-6 lg:col-span-2 flex flex-col h-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3
              className="text-sm text-[#A3A3A3] mb-6 flex-shrink-0"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Pipeline
            </h3>
            <div className="flex-1 min-h-[13rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SAMPLE_FUNNEL} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#A3A3A3" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #222",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#F5F5F5"
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <AIInsightSalesRep />
        </div>
      )}

      {/* Ambassador: AI Insight + Quick Link */}
      {isAmbassador && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <AIInsightAmbassador />
          <motion.div className="card p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <h3 className="text-sm font-semibold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>Ambassador Leaderboard</h3>
            <p className="text-[11px] text-[#555] mb-5">Ranked by total earned commissions</p>
            <div className="flex items-center gap-2 bg-[#050505] border border-[#1A1A1A] rounded-xl px-3 py-3 mb-4 overflow-hidden">
              <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: ambTier.color }} />
              <span className="text-[#555] font-mono text-xs truncate flex-1">
                {typeof window !== "undefined" ? window.location.origin : "https://saasum.in"}/r/AMB-2026
              </span>
            </div>
            <a href="/referrals" className="w-full btn-primary justify-center gap-2 flex text-sm py-3 mb-6">
              <ArrowUpRight className="w-4 h-4" /> Open War Room
            </a>
            <div className="flex flex-col gap-3">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 p-3 rounded-xl bg-[#050505] border border-[#111]">
                  <span className="text-base w-6 text-center flex-shrink-0">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[10px] text-[#666] font-semibold flex-shrink-0">{getInitials(entry.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{entry.name}</p>
                    <p className="text-[10px] text-[#555] mt-0.5">{entry.conversions} conversions</p>
                  </div>
                  <span className="text-xs text-[#666] font-mono flex-shrink-0">{formatCurrency(entry.earned)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VENTURE ANALYTICS — Admin & Manager
          ═══════════════════════════════════════════════════════════ */}

      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Ventures */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <h3 className="text-sm text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Top Performing Ventures
            </h3>
            <div className="space-y-4">
              {VENTURE_REVENUE.map((v, i) => {
                const venture = VENTURES[v.key];
                const maxRevenue = VENTURE_REVENUE[0].revenue;
                return (
                  <div key={v.key}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-[#555] w-6" style={{ fontFamily: "var(--font-mono)" }}>{i + 1}</span>
                        <span className="text-base text-white font-medium">{venture.name}</span>
                      </div>
                      <span className="text-base text-[#A3A3A3] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(v.revenue)}</span>
                    </div>
                    <div className="ml-12 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(v.revenue / maxRevenue) * 100}%`, backgroundColor: venture.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Lead Distribution by Venture */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-sm text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Lead Distribution
            </h3>
            <div className="space-y-4">
              {VENTURE_LEAD_DIST.map((v) => {
                const venture = VENTURES[v.key];
                return (
                  <div key={v.key}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-base text-[#A3A3A3]">{venture.name}</span>
                      </div>
                      <span className="text-sm text-[#888] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{v.percent}%</span>
                    </div>
                    <div className="h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: venture.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${v.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM ROW — Funnel, Activity, Leaderboard
          ═══════════════════════════════════════════════════════════ */}

      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Sales Funnel */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <h3 className="text-sm text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Sales Funnel
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SAMPLE_FUNNEL} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#A3A3A3" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #222",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#F5F5F5"
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-sm text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Recent Activity
            </h3>
            <div className="space-y-3">
              {SAMPLE_ACTIVITIES.map((activity) => {
                const IconComp = activityIcons[activity.type] || FileText;
                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-md bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconComp className="w-4 h-4 text-[#666]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#D4D4D4] font-medium truncate">{activity.subject}</p>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: VENTURES[activity.venture].color }} title={VENTURES[activity.venture].name} />
                      </div>
                      <p className="text-xs text-[#666] mt-1">
                        {activity.user} · {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Referral Leaderboard */}
          {canViewReferrals && (
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <h3 className="text-sm text-[#A3A3A3] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                Top Referrers
              </h3>
              <div className="space-y-3">
                {SAMPLE_LEADERBOARD.map((entry) => (
                  <div key={entry.rank} className="flex items-center gap-4">
                    <span
                      className="text-xl font-bold text-[#444] w-8"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {String(entry.rank).padStart(2, "0")}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-xs text-[#A3A3A3] font-medium">
                      {getInitials(entry.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-[#666]">
                        {entry.conversions} conversions
                      </p>
                    </div>
                    <span
                      className="text-sm text-[#A3A3A3] font-medium"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {formatCurrency(entry.earned)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Sales Rep: Activity + Leaderboard row (no funnel — it's above) */}
      {isSalesRep && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3
              className="text-sm text-[#A3A3A3] mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Recent Activity
            </h3>
            <div className="space-y-3">
              {SAMPLE_ACTIVITIES.map((activity) => {
                const IconComp = activityIcons[activity.type] || FileText;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconComp className="w-3.5 h-3.5 text-[#666]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#D4D4D4] truncate">{activity.subject}</p>
                      <p className="text-[10px] text-[#444] mt-0.5">
                        {activity.user} · {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Tasks Preview */}
          <motion.div
            className="card p-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm text-[#A3A3A3]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Your Tasks
              </h3>
              <span
                className="badge"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {metrics.tasks_due} pending
              </span>
            </div>
            <div className="space-y-2">
              {[
                { title: "Follow up with IIT Hyderabad — placement pricing", priority: "high", venture: "skill_tank" as VentureKey },
                { title: "Send campaign proposal to Zomato", priority: "urgent", venture: "maceco" as VentureKey },
                { title: "Prepare demo for Razorpay lead gen", priority: "medium", venture: "tobofu" as VentureKey },
              ].map((task, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#333] transition-colors"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      task.priority === "urgent"
                        ? "bg-[#EF4444]"
                        : task.priority === "high"
                        ? "bg-[#F5F5F5]"
                        : "bg-[#666]"
                    }`}
                  />
                  <span className="text-base text-white font-semibold flex-1 truncate">{task.title}</span>
                  <VentureBadge venture={task.venture} iconOnly />
                  <Clock className="w-4 h-4 text-[#555] ml-2" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TASKS DUE TODAY — Admin & Manager only (full width)
          ═══════════════════════════════════════════════════════════ */}

      {(isAdmin || isManager) && (
        <motion.div
          className="card p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm text-[#A3A3A3]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Tasks Due Today
            </h3>
            <span
              className="badge"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {metrics.tasks_due} pending
            </span>
          </div>
          <div className="space-y-2">
            {[
              { title: "Follow up with IIT Hyderabad — placement pricing", priority: "high", assignee: "Priya Sharma", venture: "skill_tank" as VentureKey },
              { title: "Send campaign proposal to Zomato", priority: "urgent", assignee: "Arjun Mehta", venture: "maceco" as VentureKey },
              { title: "Prepare demo for Sunburn activation", priority: "medium", assignee: "Sneha Reddy", venture: "promtal" as VentureKey },
              { title: "Review Q2 growth plan for GreenEnergy", priority: "low", assignee: "Admin", venture: "vriddhi" as VentureKey },
            ].map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#333] transition-colors"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    task.priority === "urgent"
                      ? "bg-[#EF4444]"
                      : task.priority === "high"
                      ? "bg-[#F5F5F5]"
                      : task.priority === "medium"
                      ? "bg-[#666]"
                      : "bg-[#333]"
                  }`}
                />
                <span className="text-base text-white font-semibold flex-1 truncate">{task.title}</span>
                <VentureBadge venture={task.venture} />
                <span className="text-sm text-[#888] hidden sm:inline ml-2">{task.assignee}</span>
                <Clock className="w-4 h-4 text-[#555] ml-2" />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

