"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, Globe, MapPin, Phone, Mail, FileText,
  Users, Briefcase, TrendingUp, Clock, ShieldCheck, AlertTriangle,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatRelativeDate, getInitials } from "@/lib/utils";
import { VENTURES } from "@/lib/constants";
import type { VentureKey } from "@/lib/constants";
import { VentureBadge } from "@/components/shared/venture-badge";
import { Flywheel } from "@/components/shared/flywheel";
import { getCompanyDetails } from "@/lib/db";
import { toast } from "sonner";

/* ─── Scroll-spy sections ──────────────────────────────────── */
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "deals", label: "Deals" },
  { id: "invoices", label: "Invoices" },
  { id: "contacts", label: "Contacts" },
  { id: "activity", label: "Activity" },
] as const;

/* ─── Helpers ──────────────────────────────────────────────── */
function invoiceStatusStyle(status: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    paid:    { bg: "#22C55E14", text: "#22C55E", border: "#22C55E30" },
    sent:    { bg: "#3B82F614", text: "#3B82F6", border: "#3B82F630" },
    overdue: { bg: "#EF444414", text: "#EF4444", border: "#EF444430" },
    draft:   { bg: "#52525214", text: "#A3A3A3", border: "#52525240" },
  };
  return map[status] || map.draft;
}

function dealStatusStyle(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    won:  { bg: "#22C55E14", text: "#22C55E" },
    lost: { bg: "#EF444414", text: "#EF4444" },
    open: { bg: "#3B82F614", text: "#3B82F6" },
  };
  return map[status] || map.open;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Users, note: FileText, task: FileText,
};

/* ─── Revenue mini-chart ───────────────────────────────────── */
function RevenueChart({ invoices }: { invoices: any[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const result: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const total = invoices
        .filter((inv) => {
          if (inv.status !== "paid") return false;
          const id = new Date(inv.issue_date);
          return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
        })
        .reduce((s: number, inv: any) => s + Number(inv.total || 0), 0);
      result.push({ label, value: total });
    }
    return result;
  }, [invoices]);

  const max = Math.max(...months.map((m) => m.value), 1);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: 72 }}>
      {months.map((m, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div
            className="w-full rounded-[2px]"
            style={{
              height: m.value > 0 ? Math.max((m.value / max) * 56, 5) : 2,
              background: m.value > 0 ? "linear-gradient(to top, #22C55E50, #22C55E)" : "#1A1A1A",
              transition: "height 0.5s ease",
            }}
            title={`${m.label}: ${formatCurrency(m.value)}`}
          />
          <span className="text-[7px] text-[#444] leading-none select-none">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section heading (avoids global h2 overrides) ─────────── */
function SectionHeading({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="w-4 h-4 text-[#444]" />
      <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 600, color: "#E5E5E5", letterSpacing: "-0.01em" }}>
        {label}
      </span>
      <span className="text-[11px] text-[#444]" style={{ fontFamily: "var(--font-mono)" }}>({count})</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                  */
/* ═══════════════════════════════════════════════════════════════ */
export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  /* Fetch */
  useEffect(() => {
    (async () => {
      try {
        setData(await getCompanyDetails(companyId));
      } catch {
        toast.error("Failed to load company");
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  /* Scroll-spy */
  useEffect(() => {
    if (!data) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: "-80px 0px -65% 0px" },
    );
    const t = setTimeout(() => {
      SECTIONS.forEach((s) => { const el = sectionRefs.current[s.id]; if (el) obs.observe(el); });
    }, 250);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [data]);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const navH = navRef.current?.offsetHeight || 56;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 20, behavior: "smooth" });
    setActiveSection(id);
  };

  /* Loading / Not Found */
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <div className="w-7 h-7 rounded-full border-[3px] border-[#222] border-t-[#666] animate-spin" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="page-container">
        <Link href="/companies" className="btn-ghost text-xs mb-6 inline-flex"><ArrowLeft className="w-3 h-3" /> Back</Link>
        <div className="card p-12 text-center">
          <p className="text-sm text-white font-medium mb-1">Company Not Found</p>
          <p className="text-xs text-[#555]">This company doesn&apos;t exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  const { company, deals, invoices, contacts, leads, activities } = data;

  /* ─── KPIs ──────────────────────────────────────────────── */
  const wonDeals = deals.filter((d: any) => d.status === "won");
  const totalWon = wonDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const paidInv = invoices.filter((i: any) => i.status === "paid");
  const outInv = invoices.filter((i: any) => i.status === "sent" || i.status === "overdue");
  const totalOut = outInv.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const draftInv = invoices.filter((i: any) => i.status === "draft");

  /* Venture ecosystem */
  const ventureMap: Record<string, number> = {};
  wonDeals.forEach((d: any) => {
    const ml = leads.find((l: any) => l.id === d.lead_id);
    const v = ml?.venture || "saasum";
    ventureMap[v] = (ventureMap[v] || 0) + Number(d.value || 0);
  });
  if (!Object.keys(ventureMap).length) {
    leads.forEach((l: any) => { const v = l.venture || "saasum"; ventureMap[v] = (ventureMap[v] || 0) + Number(l.estimated_value || 0); });
  }
  const ventureEntries = Object.entries(ventureMap).sort((a, b) => b[1] - a[1]);
  
  // Compute events for Flywheel
  const activeVentures = ventureEntries.map(e => e[0] as VentureKey);
  const crossSellEvents: { from: VentureKey; to: VentureKey }[] = [];
  if (activeVentures.length > 1) {
    for (let i = 0; i < activeVentures.length; i++) {
      for (let j = i + 1; j < activeVentures.length; j++) {
        crossSellEvents.push({ from: activeVentures[i], to: activeVentures[j] });
        crossSellEvents.push({ from: activeVentures[j], to: activeVentures[i] }); // Bidirectional
      }
    }
  }

  /* Payment intelligence */
  const avgCycle = paidInv.length > 0
    ? (paidInv.reduce((s: number, i: any) => s + Math.max(0, (new Date(i.due_date).getTime() - new Date(i.issue_date).getTime()) / 864e5), 0) / paidInv.length).toFixed(1)
    : "—";
  const overdueN = invoices.filter((i: any) => i.status === "overdue").length;
  const risk = overdueN >= 3 ? "High" : overdueN >= 1 ? "Medium" : "Low";
  const riskClr = risk === "High" ? "#EF4444" : risk === "Medium" ? "#F59E0B" : "#22C55E";
  const RiskIcon = risk === "Low" ? ShieldCheck : AlertTriangle;

  /* Company venture */
  let cVenture: VentureKey = "saasum";
  try { const n = JSON.parse(company.notes || "{}"); if (n.venture) cVenture = n.venture; } catch { /* */ }
  const vColor = VENTURES[cVenture]?.color || "#666";

  return (
    <div className="page-container" style={{ maxWidth: 1080, paddingBottom: 80 }}>

      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Companies
        </Link>
      </motion.div>

      {/* ─── HEADER ──────────────────────────────────────────── */}
      <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
            style={{ backgroundColor: `${vColor}12`, borderColor: `${vColor}25` }}
          >
            <Building2 className="w-5 h-5" style={{ color: vColor }} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2 }}>
              {company.name}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              {company.industry && <span className="badge text-[11px]">{company.industry}</span>}
              <VentureBadge venture={cVenture} size="sm" />
              {company.website && (
                <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#555] hover:text-white transition-colors">
                  <Globe className="w-3 h-3" /> {company.website}
                </a>
              )}
              {company.address && (
                <span className="flex items-center gap-1 text-[11px] text-[#444]">
                  <MapPin className="w-3 h-3" /> {company.address}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── STICKY NAV ──────────────────────────────────────── */}
      <div
        ref={navRef}
        className="sticky top-0 z-30 border-b border-[#1A1A1A] mb-8"
        style={{ backgroundColor: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)", marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="flex items-center gap-0.5 overflow-x-auto py-2.5">
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="relative px-4 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: active ? `${vColor}12` : "transparent",
                  color: active ? vColor : "#555",
                }}
              >
                {s.label}
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-[-10px] left-3 right-3 h-[2px] rounded-full"
                    style={{ backgroundColor: vColor }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  OVERVIEW                                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="overview" ref={(el) => { sectionRefs.current.overview = el; }} className="mb-10">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Won", val: formatCurrency(totalWon), sub: `${wonDeals.length} deals`, icon: TrendingUp, clr: "#22C55E" },
            { label: "Outstanding", val: formatCurrency(totalOut), sub: `${outInv.length} invoices`, icon: Clock, clr: "#F59E0B" },
            { label: "Active Leads", val: String(leads.length), sub: "in pipeline", icon: Briefcase, clr: "#3B82F6" },
            { label: "Contacts", val: String(contacts.length), sub: "stakeholders", icon: Users, clr: "#A78BFA" },
          ].map((k, i) => (
            <div key={i} className="card px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${k.clr}12` }}>
                  <k.icon className="w-3 h-3" style={{ color: k.clr }} />
                </div>
                <span className="text-[9px] text-[#555] uppercase tracking-[0.1em] font-medium">{k.label}</span>
              </div>
              <p className="text-lg text-white font-semibold leading-none" style={{ fontFamily: "var(--font-mono)" }}>{k.val}</p>
              <p className="text-[10px] text-[#444] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* 3-column intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Venture Ecosystem */}
          <div className="card px-5 py-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-[#555] uppercase tracking-[0.1em] font-semibold">Customer Ecosystem</span>
              <span className="text-[9px] text-[#444] px-1.5 py-0.5 rounded border border-[#1A1A1A]">
                {ventureEntries.length} venture{ventureEntries.length !== 1 ? "s" : ""}
              </span>
            </div>
            {ventureEntries.length === 0 ? (
              <p className="text-xs text-[#444]">No ventures linked.</p>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Flywheel Visualization */}
                <div className="flex items-center justify-center py-4 relative mb-4" style={{ minHeight: 180 }}>
                  <Flywheel 
                    size={220} 
                    activeVentures={activeVentures} 
                    events={crossSellEvents} 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
                  />
                </div>
                
                <div className="space-y-3 mt-auto">
                  {ventureEntries.map(([key, val]) => {
                    const v = VENTURES[key as VentureKey];
                    if (!v) return null;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${v.color}12` }}>
                            <img src={v.logo} alt={v.name} className="w-3.5 h-3.5 object-contain" />
                          </div>
                          <span className="text-xs text-[#D4D4D4] font-medium">{v.name}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: v.color, fontFamily: "var(--font-mono)" }}>
                          {formatCurrency(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Revenue Journey */}
          <div className="card px-5 py-5">
            <span className="text-[10px] text-[#555] uppercase tracking-[0.1em] font-semibold block mb-4">Revenue Journey</span>
            <RevenueChart invoices={invoices} />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A1A]">
              <span className="text-[10px] text-[#555]">Total Invoiced</span>
              <span className="text-xs text-white font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(totalInvoiced)}</span>
            </div>
          </div>

          {/* Payment Intelligence */}
          <div className="card px-5 py-5">
            <span className="text-[10px] text-[#555] uppercase tracking-[0.1em] font-semibold block mb-4">Payment Intelligence</span>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {[
                { label: "Paid", n: paidInv.length, clr: "#22C55E" },
                { label: "Outstanding", n: outInv.length, clr: "#F59E0B" },
                { label: "Draft", n: draftInv.length, clr: "#A3A3A3" },
              ].map((s) => (
                <div key={s.label} className="text-center py-2 rounded-lg" style={{ backgroundColor: `${s.clr}08` }}>
                  <p className="text-base font-bold leading-none" style={{ color: s.clr, fontFamily: "var(--font-mono)" }}>{s.n}</p>
                  <p className="text-[8px] text-[#555] uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-[#1A1A1A]">
              <div className="flex-1">
                <p className="text-[9px] text-[#555] uppercase tracking-[0.08em] mb-1">Avg Payment Cycle</p>
                <p className="text-lg text-white font-bold leading-none" style={{ fontFamily: "var(--font-mono)" }}>
                  {avgCycle}<span className="text-[10px] text-[#555] font-normal ml-0.5">days</span>
                </p>
              </div>
              <div className="w-px h-8 bg-[#1A1A1A]" />
              <div className="flex-1">
                <p className="text-[9px] text-[#555] uppercase tracking-[0.08em] mb-1">Risk Level</p>
                <div className="flex items-center gap-1.5">
                  <RiskIcon className="w-4 h-4" style={{ color: riskClr }} />
                  <span className="text-sm font-bold" style={{ color: riskClr }}>{risk}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  DEALS                                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="deals" ref={(el) => { sectionRefs.current.deals = el; }} className="mb-10">
        <SectionHeading icon={Briefcase} label="Deals" count={deals.length} />
        <div className="card overflow-hidden">
          {deals.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-[#444]">No deals yet for this customer.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Deal</th><th>Value</th><th>Status</th><th>Probability</th><th>Close Date</th></tr></thead>
                <tbody>
                  {deals.map((d: any) => {
                    const sc = dealStatusStyle(d.status);
                    return (
                      <tr key={d.id}>
                        <td>
                          <p className="text-sm text-white font-medium">{d.title}</p>
                          {d.contact && <p className="text-[11px] text-[#555] mt-0.5">{d.contact.first_name} {d.contact.last_name}</p>}
                        </td>
                        <td><span className="text-sm text-[#D4D4D4] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(Number(d.value || 0))}</span></td>
                        <td><span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize" style={{ backgroundColor: sc.bg, color: sc.text }}>{d.status}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 rounded-full bg-[#1A1A1A] overflow-hidden"><div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${d.probability}%` }} /></div>
                            <span className="text-[11px] text-[#555]" style={{ fontFamily: "var(--font-mono)" }}>{d.probability}%</span>
                          </div>
                        </td>
                        <td><span className="text-[11px] text-[#666]">{formatDate(d.expected_close_date)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  INVOICES                                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="invoices" ref={(el) => { sectionRefs.current.invoices = el; }} className="mb-10">
        <SectionHeading icon={FileText} label="Invoices" count={invoices.length} />
        <div className="card overflow-hidden">
          {invoices.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-[#444]">No invoices issued yet.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Invoice #</th><th>Amount</th><th>Status</th><th>Issue Date</th><th>Due Date</th></tr></thead>
                <tbody>
                  {invoices.map((inv: any) => {
                    const isOverdue = inv.status === "sent" && new Date(inv.due_date) < new Date();
                    const status = isOverdue ? "overdue" : inv.status;
                    const sc = invoiceStatusStyle(status);
                    return (
                      <tr key={inv.id}>
                        <td><span className="text-sm text-white font-medium" style={{ fontFamily: "var(--font-mono)" }}>{inv.invoice_number}</span></td>
                        <td><span className="text-sm text-[#D4D4D4] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(Number(inv.total || 0))}</span></td>
                        <td>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border" style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}>
                            {status}
                          </span>
                        </td>
                        <td><span className="text-[11px] text-[#666]">{formatDate(inv.issue_date)}</span></td>
                        <td><span className="text-[11px] text-[#666]">{formatDate(inv.due_date)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  CONTACTS                                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="contacts" ref={(el) => { sectionRefs.current.contacts = el; }} className="mb-10">
        <SectionHeading icon={Users} label="Contacts" count={contacts.length} />
        {contacts.length === 0 ? (
          <div className="card px-6 py-10 text-center text-xs text-[#444]">No contacts associated yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((c: any) => (
              <div key={c.id} className="card px-4 py-4 flex items-start gap-3 hover:border-[#333] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-[#888] font-semibold">{getInitials(`${c.first_name} ${c.last_name}`)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{c.first_name} {c.last_name}</p>
                  {c.job_title && <p className="text-[11px] text-[#555] mt-0.5">{c.job_title}</p>}
                  <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-[11px] text-[#444] hover:text-white transition-colors">
                        <Mail className="w-3 h-3" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-[11px] text-[#444]"><Phone className="w-3 h-3" /> {c.phone}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  ACTIVITY                                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="activity" ref={(el) => { sectionRefs.current.activity = el; }} className="mb-12">
        <SectionHeading icon={MessageSquare} label="Activity" count={activities.length} />
        <div className="card px-5 py-5">
          {activities.length === 0 ? (
            <p className="text-xs text-[#444] text-center py-6">No activity recorded for this customer yet.</p>
          ) : (
            <div>
              {activities.slice(0, 15).map((act: any, i: number) => {
                const Icon = ACTIVITY_ICONS[act.type] || FileText;
                return (
                  <div key={act.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3 h-3 text-[#555]" />
                      </div>
                      {i < Math.min(activities.length, 15) - 1 && <div className="w-px flex-1 bg-[#1A1A1A] mt-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#666]">{act.type}</span>
                        <p className="text-xs text-[#D4D4D4] font-medium truncate">{act.subject}</p>
                      </div>
                      {act.description && <p className="text-[11px] text-[#444] mt-1 line-clamp-2">{act.description}</p>}
                      <p className="text-[10px] text-[#333] mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                        {act.created_by_user?.full_name || "System"} · {formatRelativeDate(act.activity_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
