"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, Copy, QrCode, Check, TrendingUp, DollarSign, Activity, Users, Info, ChevronRight, Trophy, Sparkles, Download, X, Zap, Crown
} from "lucide-react";
import { formatCurrency, cn, getInitials } from "@/lib/utils";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";

// ─── Commission Tier System ───────────────────────────────────────────────────
const TIERS = [
  { min: 0,  rate: 0.014, label: "Starter",  emoji: "🌱", color: "#6366F1" },
  { min: 3,  rate: 0.020, label: "Rising",   emoji: "🚀", color: "#8B5CF6" },
  { min: 6,  rate: 0.028, label: "Active",   emoji: "⚡", color: "#EC4899" },
  { min: 10, rate: 0.035, label: "Elite",    emoji: "💎", color: "#F43F5E" },
  { min: 15, rate: 0.042, label: "Champion", emoji: "🏆", color: "#F59E0B" },
  { min: 25, rate: 0.050, label: "Legend",   emoji: "👑", color: "#EAB308" },
];

function getTier(c: number) { return [...TIERS].reverse().find(t => c >= t.min) || TIERS[0]; }
function getTierIdx(c: number) { return TIERS.findIndex(t => t.label === getTier(c).label); }
function getNextTier(c: number) { const i = getTierIdx(c); return i < TIERS.length - 1 ? TIERS[i + 1] : null; }

// ─── Demo data for when real DB rows don't exist yet ─────────────────────────
function makeDemoProfile(name: string, role: string) {
  const isAmb = role === "ambassador";
  const slug = name.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 15) + "-2026";
  return {
    id: "demo",
    code: slug,
    link_slug: slug,
    total_clicks: isAmb ? 47 : 0,
    total_conversions: isAmb ? 3 : 0,
    commission_rate: isAmb ? 0.020 : 0.014,
    total_earned: isAmb ? 8400 : 0,
    is_active: true,
  };
}

const DEMO_CONVERSIONS = [
  { id: "dc1", converted_at: new Date(Date.now() - 3 * 864e5).toISOString(), commission_amount: 3200, commission_rate: 0.02, lead: { title: "IIT Hyderabad Club", company: { name: "IIT Hyderabad" } }, deal: { value: 160000 } },
  { id: "dc2", converted_at: new Date(Date.now() - 8 * 864e5).toISOString(), commission_amount: 2800, commission_rate: 0.02, lead: { title: "Techno Club BITS", company: { name: "BITS Pilani" } }, deal: { value: 140000 } },
  { id: "dc3", converted_at: new Date(Date.now() - 15 * 864e5).toISOString(), commission_amount: 2400, commission_rate: 0.014, lead: { title: "Startup Society NIT", company: { name: "NIT Warangal" } }, deal: { value: 171428 } },
];

const DEMO_LEADERBOARD = [
  { total_clicks: 247, total_conversions: 18, total_earned: 240000, ambassador: { full_name: "Priya Sharma" } },
  { total_clicks: 183, total_conversions: 12, total_earned: 180000, ambassador: { full_name: "Arjun Mehta" } },
  { total_clicks: 47, total_conversions: 3, total_earned: 8400, ambassador: { full_name: "Sneha Reddy" } },
];

// ─── SVG Commission Arc ───────────────────────────────────────────────────────
function CommissionArc({ conversions }: { conversions: number }) {
  const tier = getTier(conversions);
  const next = getNextTier(conversions);
  const progress = next ? Math.min(1, (conversions - tier.min) / (next.min - tier.min)) : 1;
  const r = 76, cx = 100, cy = 100, sw = 12;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const dashOffset = arcLen * (1 - progress);

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        {/* Background */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={sw}
          strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round" />
        {/* Tier hints */}
        {TIERS.map((t, i) => {
          const s = (i / TIERS.length) * arcLen;
          const l = (1 / TIERS.length) * arcLen;
          return <circle key={t.label} cx={cx} cy={cy} r={r} fill="none" stroke={t.color} strokeWidth={sw - 4} opacity={0.12}
            strokeDasharray={`${l - 1} ${circ - l + 1}`} strokeDashoffset={-s} strokeLinecap="round" />;
        })}
        {/* Active arc */}
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={tier.color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          initial={{ strokeDashoffset: arcLen }} animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }} />
        {/* Outer glow */}
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={tier.color} strokeWidth={sw + 8} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`} opacity={0.12}
          initial={{ strokeDashoffset: arcLen }} animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }} />
      </svg>
      {/* Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
        <motion.span className="text-3xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>
          {tier.emoji}
        </motion.span>
        <motion.p className="text-2xl font-black mt-0.5" style={{ color: tier.color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {(tier.rate * 100).toFixed(1)}%
        </motion.p>
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">{tier.label}</p>
      </div>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ end, prefix = "", suffix = "" }: { end: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let v = 0; const step = end / 60;
    const t = setInterval(() => { v = Math.min(v + step, end); setN(Math.round(v)); if (v >= end) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, [end]);
  return <>{prefix}{n.toLocaleString("en-IN")}{suffix}</>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReferralsPage() {
  const { user } = useAuth();
  const isDemoUser = user?.id?.startsWith("demo-");

  const [tab, setTab] = useState<"dashboard" | "payouts" | "leaderboard">("dashboard");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [conversions, setConversions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "upi">("bank");
  const [bankDetails, setBankDetails] = useState({ account_name: "", account_number: "", ifsc: "" });
  const [upiId, setUpiId] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // ── Demo mode: use local mock data ──
    if (isDemoUser) {
      const demo = makeDemoProfile(user.full_name, user.role);
      setProfile(demo);
      setConversions(user.role === "ambassador" ? DEMO_CONVERSIONS : []);
      setPayouts([]);
      setLeaderboard(DEMO_LEADERBOARD);
      setLoading(false);
      return;
    }

    // ── Real Supabase mode ──
    try {
      const supabase = createClient();

      let { data: rc, error: rcErr } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("ambassador_id", user.id)
        .single();

      if (!rc) {
        const slug = (user.full_name || "AMB")
          .toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 15) + "-" + new Date().getFullYear();

        const { data: newRc, error: insertErr } = await supabase.from("referral_codes").insert({
          ambassador_id: user.id,
          code: slug,
          link_slug: slug,
          commission_rate: 0.014,
          is_active: true,
        }).select().single();

        if (insertErr) {
          console.error("Could not create referral code:", insertErr.message);
          toast.error("Could not initialise referral code: " + insertErr.message);
          setLoading(false);
          return;
        }
        rc = newRc;
      }

      setProfile(rc);

      const [convRes, payRes, lbRes] = await Promise.all([
        supabase.from("referral_conversions")
          .select("*, lead:leads(title, company:companies(name)), deal:deals(title,value)")
          .eq("referral_code_id", rc!.id)
          .order("converted_at", { ascending: false }),
        supabase.from("payouts").select("*").eq("ambassador_id", user.id).order("requested_at", { ascending: false }),
        supabase.from("referral_codes")
          .select("total_clicks, total_conversions, total_earned, ambassador:profiles!referral_codes_ambassador_id_fkey(full_name,avatar_url)")
          .eq("is_active", true).order("total_earned", { ascending: false }).limit(10),
      ]);

      setConversions(convRes.data || []);
      setPayouts(payRes.data || []);
      setLeaderboard(lbRes.data || []);
    } catch (err: any) {
      console.error("loadData error:", err);
      toast.error("Failed to load: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoUser]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const amount = Number(payoutAmount);
    if (amount < 100) { toast.error("Minimum is ₹100"); return; }
    if (amount > availableBalance) { toast.error(`Max available: ${formatCurrency(availableBalance)}`); return; }

    setSubmittingPayout(true);
    try {
      const payload: Record<string, any> = {
        amount,
        payment_method_type: paymentMethod,
        ambassador_notes: payoutNote || null,
      };

      if (isDemoUser) {
        // Demo user: resolve real profile via name (Sneha Reddy exists in DB)
        payload.demo_name = user.full_name;
      } else {
        payload.user_id = user.id;
      }

      if (paymentMethod === "bank") {
        payload.bank_account_name = bankDetails.account_name;
        payload.bank_account_number = bankDetails.account_number;
        payload.bank_ifsc = bankDetails.ifsc.toUpperCase();
      } else {
        payload.upi_id = upiId;
      }

      const res = await fetch("/api/referral/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");

      toast.success("Payout request submitted! Admin will review shortly.");
      setPayoutAmount(""); setPayoutNote(""); setUpiId("");
      setBankDetails({ account_name: "", account_number: "", ifsc: "" });
      loadData(); setTab("dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}/r/${profile.link_slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true); toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="page-container flex flex-col items-center justify-center py-32">
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-xl">🌱</div>
      </div>
      <p className="text-zinc-600 text-sm mt-4">Initialising War Room…</p>
    </div>
  );

  if (!profile) return (
    <div className="page-container py-16 text-center">
      <p className="text-zinc-500 mb-4">Could not load your referral profile.</p>
      <button className="btn-primary" onClick={loadData}>Retry</button>
    </div>
  );

  const totalConversions = profile.total_conversions || 0;
  const tier = getTier(totalConversions);
  const tierIdx = getTierIdx(totalConversions);
  const nextTier = getNextTier(totalConversions);
  const progressPct = nextTier ? Math.min(100, ((totalConversions - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const pendingSum = payouts.filter(p => ["requested", "approved", "processing"].includes(p.status)).reduce((a, p) => a + Number(p.amount), 0);
  const paidSum = payouts.filter(p => p.status === "paid").reduce((a, p) => a + Number(p.amount), 0);
  const availableBalance = Math.max(0, (profile.total_earned || 0) - pendingSum - paidSum);
  const refLink = `${typeof window !== "undefined" ? window.location.origin : "https://saasum.in"}/r/${profile.link_slug}`;

  return (
    <div className="page-container pb-20 relative">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-[0.06]"
          style={{ background: `radial-gradient(ellipse at center, ${tier.color} 0%, transparent 65%)` }} />
      </div>

      <div className="relative z-10 pt-6">
        {/* Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center gap-6 justify-between">
            <div className="flex items-center gap-6">
              <motion.div className="relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}40` }}>
                {/* Crazy Animation Background */}
                <motion.div className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at center, ${tier.color}40 0%, transparent 70%)` }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                
                {/* Rotating Rings */}
                <motion.div className="absolute w-full h-full border-[1.5px] border-dashed rounded-full"
                  style={{ borderColor: tier.color, opacity: 0.4 }}
                  animate={{ rotate: 360, scale: [0.85, 1.15, 0.85] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                <motion.div className="absolute w-[65%] h-[65%] border-[1.5px] border-dashed rounded-full"
                  style={{ borderColor: tier.color, opacity: 0.6 }}
                  animate={{ rotate: -360, scale: [1.15, 0.85, 1.15] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
                  
                {/* The Emoji floating in center */}
                <motion.div className="relative z-10 text-[28px] drop-shadow-2xl"
                  animate={{ y: [-2, 2, -2], rotate: [-8, 8, -8] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
                  {tier.emoji}
                </motion.div>
                
                {/* Scanning line */}
                <motion.div className="absolute left-0 right-0 h-[2px]"
                  style={{ background: tier.color, boxShadow: `0 0 12px 2px ${tier.color}` }}
                  animate={{ top: ["-10%", "110%", "-10%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
              </motion.div>
              <div>
                <div className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>Ambassador War Room</div>
                <p className="text-zinc-500 text-sm mt-1.5">{user?.full_name} · <span style={{ color: tier.color }} className="font-semibold">{tier.label} Tier</span>
                  {isDemoUser && <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Demo</span>}
                </p>
              </div>
            </div>
            <motion.div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold shadow-lg"
              style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}40`, color: tier.color, boxShadow: `0 4px 20px -5px ${tier.color}30` }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
              <Zap className="w-4 h-4" /> {(tier.rate * 100).toFixed(1)}% Commission
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-zinc-800 no-scrollbar" style={{ gap: "0.5rem", marginBottom: "3rem", marginTop: "2rem" }}>
          {[{ id: "dashboard", label: "War Room", icon: Activity }, { id: "payouts", label: "Payouts", icon: DollarSign }, { id: "leaderboard", label: "Leaderboard", icon: Trophy }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ marginBottom: "-1px" }}
              className={cn("flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all flex-shrink-0",
                tab === t.id ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}>
              <t.icon className="w-4 h-4 flex-shrink-0" />{t.label}
            </button>
          ))}
        </div>

        {/* ═══════ WAR ROOM ═══════ */}
        {tab === "dashboard" && (
          <div className="flex flex-col" style={{ gap: "2.5rem" }}>
            {/* Referral Link */}
            <motion.div className="card" style={{ padding: "2rem" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <p className="text-zinc-400 text-[11px] uppercase tracking-widest font-semibold" style={{ marginBottom: "1.25rem" }}>Your Referral Link</p>
              <div className="flex flex-col sm:flex-row" style={{ gap: "0.75rem" }}>
                <div className="flex-1 min-w-0 flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors" style={{ padding: "0.75rem 1rem" }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: tier.color, marginRight: "1rem" }} />
                  <span className="text-zinc-300 font-mono text-sm truncate flex-1 min-w-0">{refLink}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button onClick={copyLink} className="btn-primary gap-2" whileTap={{ scale: 0.95 }}>
                    {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </motion.button>
                  <button onClick={() => setShowQR(true)} className="btn-secondary px-4 border-zinc-800 hover:border-zinc-600"><QrCode className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 flex items-center" style={{ marginTop: "1.25rem", gap: "0.5rem" }}>
                <Info className="w-3.5 h-3.5" />
                Every conversion earns you <strong className="text-white">{(tier.rate * 100).toFixed(1)}%</strong> — complete more referrals to unlock higher tiers.
              </p>
            </motion.div>

            {/* Conversion Timeline */}
            <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="border-b border-zinc-800/50 flex justify-between items-center" style={{ padding: "1.25rem 2rem" }}>
                <p className="font-semibold text-white text-base">Conversion Timeline</p>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <button className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md">
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-32 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button 
                        onClick={() => {
                          const cols = ["Lead/Deal", "Date", "Deal Value", "Commission Rate", "Commission Earned"];
                          const rows = conversions.map((c: any) => [
                            c.lead?.company?.name || c.lead?.title || "Lead",
                            new Date(c.converted_at).toLocaleDateString(),
                            c.deal?.value || 0,
                            ((c.commission_rate || 0) * 100).toFixed(1) + "%",
                            c.commission_amount || 0
                          ]);
                          exportToCsv("conversions_export.csv", cols, rows);
                          toast.success("CSV Exported");
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
                      >
                        As CSV
                      </button>
                      <button 
                        onClick={() => {
                          const cols = ["Lead/Deal", "Date", "Deal Value", "Commission Rate", "Commission Earned"];
                          const rows = conversions.map((c: any) => [
                            c.lead?.company?.name || c.lead?.title || "Lead",
                            new Date(c.converted_at).toLocaleDateString(),
                            formatCurrency(c.deal?.value || 0),
                            ((c.commission_rate || 0) * 100).toFixed(1) + "%",
                            formatCurrency(c.commission_amount || 0)
                          ]);
                          exportToPdf("conversions_export.pdf", "Referral Conversions", cols, rows);
                          toast.success("PDF Exported");
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
                      >
                        As PDF
                      </button>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">{conversions.length} total</span>
                </div>
              </div>
              {conversions.length === 0 ? (
                <div className="p-16 flex flex-col items-center text-center">
                  <motion.div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl mb-4"
                    animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>🌱</motion.div>
                  <p className="text-zinc-400 font-medium">No conversions yet</p>
                  <p className="text-zinc-600 text-sm mt-1">Share your link and watch the commissions roll in.</p>
                </div>
              ) : (
                <div className="p-8">
                  <div className="relative border-l border-zinc-800 ml-4 space-y-8">
                    {conversions.map((conv, i) => (
                      <motion.div key={conv.id} className="relative pl-8"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                        <span className="absolute top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#0A0A0A]" style={{ left: "-5px" }} />
                        <span className="absolute top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-40" style={{ left: "-5px" }} />
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-white font-medium text-sm">{conv.lead?.company?.name || conv.lead?.title || "Lead"}</p>
                            <p className="text-zinc-500 text-[11px] font-mono mt-0.5">{new Date(conv.converted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-emerald-400 font-bold font-mono text-sm">+{formatCurrency(conv.commission_amount || 0)}</p>
                            <p className="text-zinc-600 text-[10px] uppercase">{formatCurrency(conv.deal?.value || 0)} @ {((conv.commission_rate || 0) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ======= PAYOUTS ======= */}
        {tab === "payouts" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <motion.div className="card p-8" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                <p className="font-semibold text-white text-base mb-6">Request Payout</p>

                {/* Balance Card — click to toggle form */}
                <button type="button" onClick={() => setShowPayoutForm(v => !v)}
                  className="w-full text-left rounded-2xl p-5 mb-4 relative overflow-hidden transition-all hover:brightness-110 focus:outline-none"
                  style={{ background: `${tier.color}0A`, border: `2px solid ${showPayoutForm ? tier.color : tier.color + "30"}`, boxShadow: showPayoutForm ? `0 0 24px ${tier.color}25` : undefined }}>
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-[0.08] pointer-events-none" style={{ background: tier.color, filter: "blur(20px)" }} />
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Available Balance</p>
                  <p className="text-4xl font-black text-white">{formatCurrency(availableBalance)}</p>
                  {pendingSum > 0 && <p className="text-xs text-zinc-600 mt-1">{formatCurrency(pendingSum)} pending review</p>}
                  <p className="text-[11px] mt-3 font-semibold" style={{ color: tier.color }}>
                    {showPayoutForm ? "▲ Hide form" : "▼ Tap to request payout"}
                  </p>
                </button>

                <AnimatePresence>
                  {showPayoutForm && (
                    <motion.form onSubmit={handlePayoutRequest} className="space-y-4"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount (₹) — min ₹100</label>
                        <input type="number" min="100" max={availableBalance} required value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                          placeholder="0" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-2xl font-bold focus:border-zinc-600 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Method</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["bank", "upi"] as const).map(m => (
                            <button type="button" key={m} onClick={() => setPaymentMethod(m)}
                              className={cn("py-2.5 rounded-xl text-sm font-semibold border transition-all", paymentMethod === m ? "bg-white text-black border-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700")}>
                              {m === "bank" ? "🏦 Bank" : "📱 UPI"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <AnimatePresence mode="wait">
                        {paymentMethod === "bank" ? (
                          <motion.div key="b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                            {[{ k: "account_name", l: "Account Holder", p: "As per bank" }, { k: "account_number", l: "Account Number", p: "12-digit number" }, { k: "ifsc", l: "IFSC Code", p: "e.g. SBIN0001234" }].map(f => (
                              <div key={f.k}>
                                <label className="block text-[11px] text-zinc-500 mb-1">{f.l}</label>
                                <input type="text" required placeholder={f.p} value={bankDetails[f.k as keyof typeof bankDetails]}
                                  onChange={e => setBankDetails({ ...bankDetails, [f.k]: e.target.value })}
                                  className={cn("w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none", f.k === "ifsc" && "uppercase font-mono")} />
                              </div>
                            ))}
                          </motion.div>
                        ) : (
                          <motion.div key="u" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            <label className="block text-[11px] text-zinc-500 mb-1">UPI ID</label>
                            <input type="text" required placeholder="yourname@bank" value={upiId} onChange={e => setUpiId(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <textarea rows={2} value={payoutNote} onChange={e => setPayoutNote(e.target.value)} placeholder="Note for admin (optional)"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-600 outline-none resize-none" />
                      <button type="submit" disabled={submittingPayout || !payoutAmount || Number(payoutAmount) < 100 || Number(payoutAmount) > availableBalance}
                        className="w-full btn-primary justify-center py-3.5 gap-2">
                        {submittingPayout ? <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-white animate-spin" /> : <><ArrowUpRight className="w-4 h-4" /> Submit Request</>}
                      </button>
                      <p className="text-center text-[10px] text-zinc-700">Admin reviews all payouts — typically 2–5 business days</p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="lg:col-span-3">
              <motion.div className="card overflow-hidden" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
                <div className="px-8 py-5 border-b border-zinc-800/50"><p className="font-semibold text-white text-base">Payout History</p></div>
                <div className="table-container">
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Amount</th><th>Via</th><th>Status</th></tr></thead>
                    <tbody>
                      {payouts.length === 0 ? (
                        <tr><td colSpan={4} className="py-12 text-center text-zinc-600 text-sm">No payout history yet.</td></tr>
                      ) : payouts.map(p => (
                        <tr key={p.id}>
                          <td><span className="text-sm text-zinc-300 font-mono">{new Date(p.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></td>
                          <td><span className="text-sm font-mono text-white font-bold">{formatCurrency(p.amount)}</span></td>
                          <td><span className="text-sm text-zinc-300">{p.payment_method_type === "bank" ? "🏦 Bank" : "📱 UPI"}</span></td>
                          <td>
                            <span className={cn("badge text-xs capitalize",
                              p.status === "paid" && "badge-success",
                              p.status === "approved" && "badge-warning",
                              p.status === "requested" && "bg-zinc-800 text-zinc-300 border border-zinc-700",
                              p.status === "rejected" && "bg-red-500/10 text-red-400 border border-red-500/20")}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* ═══════ LEADERBOARD ═══════ */}
        {tab === "leaderboard" && (
          <motion.div className="pt-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-bold text-white tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>Global Leaderboard</h1>
            <p className="text-zinc-500 text-sm mb-8">Ranked by total earned commissions.</p>
            <div className="flex flex-col gap-4">
              {leaderboard.map((entry, i) => {
                const tr = getTier(entry.total_conversions || 0);
                const isYou = entry.ambassador?.full_name === user?.full_name;
                return (
                  <motion.div key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl border"
                    style={isYou ? { borderColor: `${tr.color}40`, background: `${tr.color}08` } : { borderColor: "#111", background: "#0A0A0A" }}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}>
                    <span className="w-8 text-center text-xl font-black flex-shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-zinc-700 text-sm font-mono">{i + 1}</span>}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0">
                      {getInitials(entry.ambassador?.full_name || "A")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-semibold">{entry.ambassador?.full_name}</p>
                        {isYou && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-bold">YOU</span>}
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: tr.color, background: `${tr.color}15` }}>{tr.emoji} {tr.label}</span>
                      </div>
                      <p className="text-zinc-600 text-[11px] font-mono mt-0.5">{entry.total_clicks || 0} clicks · {entry.total_conversions || 0} conversions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold font-mono">{formatCurrency(entry.total_earned || 0)}</p>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">earned</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* QR Modal */}
        <AnimatePresence>
          {showQR && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQR(false)}>
              <motion.div onClick={e => e.stopPropagation()} className="w-full max-w-xs text-center relative"
                style={{ background: "rgba(7,7,9,0.98)", border: `1px solid ${tier.color}30`, borderRadius: "24px", padding: "2rem", boxShadow: `0 0 60px ${tier.color}25` }}
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}>
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)` }} />
                <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                <p className="text-white font-bold text-xl mb-1">Scan to Refer</p>
                <p className="text-zinc-500 text-xs mb-6">Opens your Centle referral page</p>
                <div className="bg-white rounded-2xl p-4 mb-6 mx-auto w-56 h-56 flex items-center justify-center">
                  <QRCodeSVG value={refLink} size={208} level="H" includeMargin={false} />
                </div>
                <div className="rounded-xl px-4 py-3 border" style={{ background: "#0A0A0A", borderColor: "#1A1A1A" }}>
                  <p className="text-zinc-300 font-mono text-sm tracking-widest">{profile.code}</p>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tier.color }} />
                  <p className="text-zinc-600 text-xs">{tier.emoji} {tier.label} · {(tier.rate * 100).toFixed(1)}%</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
