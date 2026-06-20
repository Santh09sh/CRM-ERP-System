"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ExternalLink, Download } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatRelativeDate, getInitials } from "@/lib/utils";
import { LEAD_SOURCES } from "@/lib/constants";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { toast } from "sonner";
import type { Lead } from "@/lib/types";
import type { VentureKey } from "@/lib/constants";

// Extend lead with venture field for UI
type VentureLead = Lead & { venture: VentureKey };

import { getLeads, createLead } from "@/lib/db";

export default function LeadsPage() {
  const [leads, setLeads] = useState<VentureLead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const data = await getLeads();
        if (data?.length) setLeads(data as VentureLead[]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || l.source === sourceFilter;
    const matchesStage = stageFilter === "all" || l.stage?.name === stageFilter;
    const matchesVenture = activeVenture === "all" || l.venture === activeVenture;
    return matchesSearch && matchesSource && matchesStage && matchesVenture;
  });

  return (
    <div className="page-container">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Leads
          </h1>
          <p className="text-[#666] text-sm mt-1">
            <span style={{ fontFamily: "var(--font-mono)" }}>{filtered.length}</span> leads in your pipeline
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
                  const cols = ["Title", "Venture", "Stage", "Value", "Source", "Assigned To", "Created"];
                  const rows = filtered.map(l => [
                    l.title, 
                    l.venture, 
                    l.stage?.name || "Unknown", 
                    l.estimated_value, 
                    l.source, 
                    l.assigned_user?.full_name || "Unassigned", 
                    new Date(l.created_at).toLocaleDateString()
                  ]);
                  exportToCsv("leads_export.csv", cols, rows);
                  toast.success("CSV Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As CSV
              </button>
              <button 
                onClick={() => {
                  const cols = ["Title", "Venture", "Stage", "Value", "Source", "Assigned To", "Created"];
                  const rows = filtered.map(l => [
                    l.title, 
                    l.venture, 
                    l.stage?.name || "Unknown", 
                    formatCurrency(l.estimated_value), 
                    l.source, 
                    l.assigned_user?.full_name || "Unassigned", 
                    new Date(l.created_at).toLocaleDateString()
                  ]);
                  exportToPdf("leads_export.pdf", "Leads Report", cols, rows);
                  toast.success("PDF Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As PDF
              </button>
            </div>
          </div>
          <Link href="/leads/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Lead
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
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
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="input-base w-auto appearance-none cursor-pointer pr-8"
        >
          <option value="all">All Sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="input-base w-auto appearance-none cursor-pointer pr-8"
        >
          <option value="all">All Stages</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        className="card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Venture</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Source</th>
                <th className="hidden md:table-cell">Assigned To</th>
                <th className="hidden lg:table-cell">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.02 * i }}
                >
                  <td>
                    <Link href={`/leads/${lead.id}`} className="group">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            lead.priority === 4 ? "bg-[#EF4444]" :
                            lead.priority === 3 ? "bg-[#F5F5F5]" :
                            lead.priority === 2 ? "bg-[#666]" : "bg-[#333]"
                          }`}
                        />
                        <div>
                          <p className="text-base text-white font-semibold group-hover:underline">{lead.title}</p>
                          {lead.description && (
                            <p className="text-sm text-[#888] mt-1 truncate max-w-[250px]">{lead.description}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <VentureBadge venture={lead.venture as VentureKey} />
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: lead.stage?.color || "#666" }}
                      />
                      {lead.stage?.name || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="text-base text-[#A3A3A3] font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                      {formatCurrency(lead.estimated_value)}
                    </span>
                  </td>
                  <td>
                    <span className="badge">{lead.source?.replace("_", " ")}</span>
                  </td>
                  <td className="hidden md:table-cell">
                    {lead.assigned_user && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[10px] text-[#888]">
                          {getInitials(lead.assigned_user.full_name)}
                        </div>
                        <span className="text-sm text-[#888]">{lead.assigned_user.full_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="hidden lg:table-cell">
                    <span className="text-sm text-[#888]">{formatRelativeDate(lead.created_at)}</span>
                  </td>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="btn-ghost p-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[#444] text-sm">
            No leads found matching your filters.
          </div>
        )}
      </motion.div>
    </div>
  );
}
