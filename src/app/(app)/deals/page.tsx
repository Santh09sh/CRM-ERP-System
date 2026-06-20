"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Target, Download } from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { toast } from "sonner";
import type { VentureKey } from "@/lib/constants";
import { getDeals, createDeal } from "@/lib/db";
import { updateDealStatus } from "@/lib/services/deal-service";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

type Deal = {
  id: string;
  title: string;
  value: number;
  probability: number;
  expected_close_date: string;
  status: string;
  company: string;
  assigned: string;
  venture: VentureKey;
  created_at: string;
};

// Removed SAMPLE_DEALS

function mapDbDealToLocal(d: any): Deal {
  let venture = "saasum";
  let companyName = d.company?.name;
  let assignedName = d.assigned_user?.full_name;

  try {
    // Check if deal itself has notes (UI created)
    if (d.notes) {
      const dealNotes = typeof d.notes === "string" ? JSON.parse(d.notes) : d.notes;
      if (dealNotes.venture) venture = dealNotes.venture;
      if (dealNotes.companyName && !companyName) companyName = dealNotes.companyName;
      if (dealNotes.assignedName && !assignedName) assignedName = dealNotes.assignedName;
    }
    // Check company notes (Seed data)
    if (d.company?.notes) {
      const companyNotes = typeof d.company.notes === "string" ? JSON.parse(d.company.notes) : d.company.notes;
      if (companyNotes.venture) venture = companyNotes.venture;
    }
  } catch (e) {
    // fallback
  }

  companyName = companyName || "Unknown Company";
  assignedName = assignedName || "Unassigned";

  const title = d.title && d.title !== "Deal: undefined" 
    ? d.title 
    : `${companyName} Deal`;

  return {
    id: d.id,
    title,
    value: Number(d.value) || 0,
    probability: Number(d.probability) || 0,
    expected_close_date: d.expected_close_date,
    status: d.status,
    company: companyName,
    assigned: assignedName,
    venture: venture as VentureKey,
    created_at: d.created_at,
  };
}

function AddDealModal({ onClose, onSave }: { onClose: () => void, onSave: (d: Deal) => void }) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("50");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [assigned, setAssigned] = useState("");
  const [venture, setVenture] = useState<VentureKey>("saasum");
  const [status, setStatus] = useState("open");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDeal: Deal = {
      id: `d_${Date.now()}`,
      title,
      company,
      value: Number(value) || 0,
      probability: Number(probability) || 0,
      expected_close_date: expectedCloseDate,
      assigned,
      venture,
      status,
      created_at: new Date().toISOString()
    };
    onSave(newDeal);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-xl rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <Target className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <p className="text-base font-semibold text-white">Create New Deal</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5 text-[#666]" /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="add-deal-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Deal Name <span className="text-[#EF4444]">*</span></label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Acme Corp — Q3 Campaign" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Company <span className="text-[#EF4444]">*</span></label>
                <input required value={company} onChange={e => setCompany(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Assigned To</label>
                <input value={assigned} onChange={e => setAssigned(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Jane Doe" />
              </div>
            
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Deal Value (₹) <span className="text-[#EF4444]">*</span></label>
                <input type="number" required min="0" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. 500000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Probability (%)</label>
                <input type="number" min="0" max="100" value={probability} onChange={e => setProbability(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. 50" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Expected Close Date <span className="text-[#EF4444]">*</span></label>
                <input type="date" required value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none appearance-none transition-all cursor-pointer">
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Venture</label>
                <select value={venture} onChange={e => setVenture(e.target.value as VentureKey)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none appearance-none transition-all cursor-pointer">
                  <option value="saasum">Saasum</option>
                  <option value="maceco">Maceco</option>
                  <option value="skill_tank">Skill Tank</option>
                  <option value="promtal">Promtal</option>
                  <option value="tobofu">Tobofu</option>
                  <option value="vriddhi">Vriddhi Capital</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A] shrink-0 bg-[#050505]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#666] text-sm border border-[#1A1A1A] transition-colors">Cancel</button>
          <button type="submit" form="add-deal-form" className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Deal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getDeals();
        setDeals(data.map(mapDbDealToLocal));
      } catch (err) {
        toast.error("Failed to load deals");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = deals.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesVenture = activeVenture === "all" || d.venture === activeVenture;
    return matchesSearch && matchesStatus && matchesVenture;
  });

  const totalPipeline = filtered.filter((d) => d.status === "open").reduce((sum, d) => sum + d.value, 0);
  const weightedPipeline = filtered.filter((d) => d.status === "open").reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

  const handleSaveDeal = async (newDeal: Deal) => {
    try {
      const dbDeal = await createDeal({
        title: newDeal.title,
        value: newDeal.value,
        probability: newDeal.probability,
        expected_close_date: newDeal.expected_close_date,
        status: newDeal.status,
        notes: JSON.stringify({
          venture: newDeal.venture,
          companyName: newDeal.company,
          assignedName: newDeal.assigned,
        }),
      });
      // Fire deal_won notification if created as won
      if (newDeal.status === "won" && dbDeal?.id) {
        updateDealStatus(dbDeal.id, "won", {
          title: newDeal.title,
          value: newDeal.value,
          company: newDeal.company,
        });
      }
      setDeals([mapDbDealToLocal(dbDeal), ...deals]);
      setShowAddModal(false);
      toast.success("Deal created successfully");
    } catch (err) {
      toast.error("Failed to create deal");
    }
  };

  return (
    <div className="page-container">
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Deals</h1>
          <p className="text-[#666] text-sm mt-1">
            Pipeline: <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(totalPipeline)}</span>
            <span className="text-[#444] mx-2">·</span>
            Weighted: <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(weightedPipeline)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="btn-ghost text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-32 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button 
                onClick={() => {
                  const cols = ["Title", "Company", "Venture", "Status", "Value", "Probability", "Close Date", "Assigned To"];
                  const rows = filtered.map(d => [
                    d.title,
                    d.company,
                    d.venture,
                    d.status,
                    d.value,
                    d.probability + "%",
                    d.expected_close_date,
                    d.assigned
                  ]);
                  exportToCsv("deals_export.csv", cols, rows);
                  toast.success("CSV Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As CSV
              </button>
              <button 
                onClick={() => {
                  const cols = ["Title", "Company", "Venture", "Status", "Value", "Probability", "Close Date"];
                  const rows = filtered.map(d => [
                    d.title,
                    d.company,
                    d.venture,
                    d.status,
                    formatCurrency(d.value),
                    d.probability + "%",
                    d.expected_close_date
                  ]);
                  exportToPdf("deals_export.pdf", "Deals Report", cols, rows);
                  toast.success("PDF Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As PDF
              </button>
            </div>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" />New Deal</button>
        </div>
      </motion.div>

      <motion.div className="flex flex-wrap items-center gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input type="text" placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
        <div className="flex flex-wrap gap-3">
          {["all", "open", "won", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? "bg-white text-black" : "bg-[#111] text-[#888] border border-[#1A1A1A] hover:text-white hover:bg-[#1A1A1A]"
              }`}
              style={{ padding: '8px 16px' }}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div className="card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Venture</th>
                <th>Value</th>
                <th>Probability</th>
                <th className="hidden md:table-cell">Estimated Close Date</th>
                <th className="hidden md:table-cell">Assigned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal, i) => (
                <motion.tr key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.02 * i }}>
                  <td>
                    <div>
                      <p className="text-base text-white font-semibold">{deal.title}</p>
                      <p className="text-sm text-[#888] mt-1">{deal.company}</p>
                    </div>
                  </td>
                  <td><VentureBadge venture={deal.venture} /></td>
                  <td><span className="text-base text-[#A3A3A3] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(deal.value)}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F5F5F5] rounded-full" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <span className="text-sm text-[#888]" style={{ fontFamily: "var(--font-mono)" }}>{deal.probability}%</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell"><span className="text-sm text-[#888]" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(deal.expected_close_date)}</span></td>
                  <td className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[10px] text-[#888]">{getInitials(deal.assigned)}</div>
                      <span className="text-sm text-[#888]">{deal.assigned}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${deal.status === "won" ? "badge-success" : deal.status === "lost" ? "badge-danger" : ""}`}>
                      {deal.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#666]">
                    No deals found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddDealModal onClose={() => setShowAddModal(false)} onSave={handleSaveDeal} />
        )}
      </AnimatePresence>
    </div>
  );
}
