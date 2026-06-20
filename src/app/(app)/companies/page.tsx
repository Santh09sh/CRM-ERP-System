"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Globe, MapPin, X, Building2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { toast } from "sonner";
import type { VentureKey } from "@/lib/constants";
import { getCompanies, createCompany } from "@/lib/db";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

type Company = {
  id: string;
  name: string;
  industry: string;
  website: string;
  address: string;
  contacts: number;
  deals: number;
  total_revenue: number;
  venture: VentureKey;
};

// Removed SAMPLE_COMPANIES

function mapDbCompanyToLocal(c: any): Company {
  let venture = "saasum";
  try {
    const notes = JSON.parse(c.notes || "{}");
    if (notes.venture) venture = notes.venture;
  } catch (e) {
    // ignore
  }

  const contactsList = Array.isArray(c.company_contacts) ? c.company_contacts : [];
  const dealsList = Array.isArray(c.company_deals) ? c.company_deals : [];
  const invoicesList = Array.isArray(c.company_invoices) ? c.company_invoices : [];

  // Revenue = sum of won deal values + paid invoice totals (use whichever is greater to avoid double-counting)
  const wonDealRevenue = dealsList.filter((d: any) => d.status === "won").reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const paidInvoiceRevenue = invoicesList.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const revenue = Math.max(wonDealRevenue, paidInvoiceRevenue);

  return {
    id: c.id,
    name: c.name,
    industry: c.industry || "",
    website: c.website || "",
    address: c.address || "",
    contacts: contactsList.length,
    deals: dealsList.length,
    total_revenue: revenue,
    venture: venture as VentureKey,
  };
}

function AddCompanyModal({ onClose, onSave }: { onClose: () => void, onSave: (c: Company) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [venture, setVenture] = useState<VentureKey>("saasum");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCompany: Company = {
      id: `co_${Date.now()}`,
      name,
      industry,
      website,
      address,
      contacts: 0,
      deals: 0,
      total_revenue: 0,
      venture,
    };
    onSave(newCompany);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-xl rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden flex flex-col" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <p className="text-base font-semibold text-white">Add New Company</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5 text-[#666]" /></button>
        </div>

        <div className="p-8">
          <form id="add-company-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Company Name <span className="text-[#EF4444]">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Acme Corp" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Industry <span className="text-[#EF4444]">*</span></label>
                <input required value={industry} onChange={e => setIndustry(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. SaaS" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Website</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. acmecorp.com" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Address / Location</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Bangalore, India" />
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
          <button type="submit" form="add-company-form" className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getCompanies();
        setCompanies(data.map(mapDbCompanyToLocal));
      } catch (err) {
        toast.error("Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = companies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase());
    const matchesVenture = activeVenture === "all" || c.venture === activeVenture;
    return matchesSearch && matchesVenture;
  });

  const handleSaveCompany = async (newCompany: Company) => {
    try {
      const dbCompany = await createCompany({
        name: newCompany.name,
        industry: newCompany.industry,
        website: newCompany.website,
        address: newCompany.address,
        notes: JSON.stringify({ venture: newCompany.venture }),
      });
      setCompanies([mapDbCompanyToLocal(dbCompany), ...companies]);
      setShowAddModal(false);
      toast.success("Company added successfully");
    } catch (err) {
      toast.error("Failed to create company");
    }
  };

  return (
    <div className="page-container">
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Companies</h1>
          <p className="text-[#666] text-sm mt-1"><span style={{ fontFamily: "var(--font-mono)" }}>{filtered.length}</span> companies</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" />Add Company</button>
      </motion.div>

      <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#666] animate-spin" />
          <p className="text-[#666] mt-4 text-sm font-[var(--font-mono)]">Loading companies from DB...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company, i) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
            <motion.div
              className="card p-6 hover:border-[#333] transition-all cursor-pointer flex flex-col group"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg text-white font-semibold">{company.name}</h3>
                  <p className="text-sm text-[#888] mt-1">{company.industry}</p>
                </div>
                <VentureBadge venture={company.venture} />
              </div>

              <div className="space-y-2 mb-5 flex-1">
                {company.website && (
                  <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
                    <Globe className="w-4 h-4 text-[#555]" />{company.website}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <MapPin className="w-4 h-4 text-[#555]" />{company.address}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-[#1A1A1A] mt-auto">
                <div className="text-center">
                  <p className="text-base text-white font-medium" style={{ fontFamily: "var(--font-mono)" }}>{company.contacts}</p>
                  <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">Contacts</p>
                </div>
                <div className="text-center">
                  <p className="text-base text-white font-medium" style={{ fontFamily: "var(--font-mono)" }}>{company.deals}</p>
                  <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">Deals</p>
                </div>
                <div className="text-right ml-auto">
                  <p className="text-base text-[#A3A3A3] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(company.total_revenue)}</p>
                  <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">Revenue</p>
                </div>
              </div>
            </motion.div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#666]">
              No companies found.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddCompanyModal onClose={() => setShowAddModal(false)} onSave={handleSaveCompany} />
        )}
      </AnimatePresence>
    </div>
  );
}
