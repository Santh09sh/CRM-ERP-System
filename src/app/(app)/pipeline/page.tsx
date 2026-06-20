"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Search, AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { VENTURES } from "@/lib/constants";
import type { Lead, PipelineStage } from "@/lib/types";
import type { VentureKey } from "@/lib/constants";
import { getLeads, getPipelineStages } from "@/lib/db";
import { changeStage } from "@/lib/services/lead-service";
import { analyzeLeadForNextAction } from "@/lib/ai-next-action";

type VentureLead = Lead & { venture: VentureKey };

// ─── Stage Probability Map ──────────────────────────────────────
const STAGE_PROBABILITY: Record<string, number> = {
  s1: 10, s2: 25, s3: 45, s4: 60, s5: 80, s6: 100, s7: 0,
};

// Removed SAMPLE_STAGES and SAMPLE_LEADS

function mapDbLeadToLocal(l: any): VentureLead {
  let venture = "saasum";
  try {
    const cf = typeof l.custom_fields === 'string' ? JSON.parse(l.custom_fields) : (l.custom_fields || {});
    if (cf.venture) venture = cf.venture;
  } catch (e) {}

  return {
    ...l,
    venture: venture as VentureKey,
  };
}

// ─── Lead Aging Helper ──────────────────────────────────────────
function getAgingInfo(createdAt: string): {
  days: number;
  color: string;
  bgColor: string;
  label: string;
  isStuck: boolean;
} {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days >= 10) return { days, color: "#fb7185", bgColor: "rgba(251,113,133,0.1)", label: `Stuck ${days}d`, isStuck: true };
  if (days >= 5)  return { days, color: "#fbbf24", bgColor: "rgba(251,191,36,0.1)",  label: `${days}d`, isStuck: false };
  return               { days, color: "#34d399", bgColor: "rgba(52,211,153,0.1)",   label: `${days}d`, isStuck: false };
}

// ─── Background Arrow Motif ─────────────────────────────────────
function BackgroundArrows() {
  const positions = [
    { x: "15%", y: "20%" }, { x: "35%", y: "60%" }, { x: "55%", y: "30%" },
    { x: "72%", y: "70%" }, { x: "88%", y: "15%" }, { x: "8%",  y: "75%" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: pos.x, top: pos.y }}
          animate={{ y: [0, -18, 0], x: [0, 12, 0], opacity: [0.04, 0.07, 0.04] }}
          transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M10 70 L70 10 M50 10 L70 10 L70 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────
export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<VentureLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const { activeVenture } = useVentureFilter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stagesRes, leadsRes] = await Promise.all([
          getPipelineStages(),
          getLeads(),
        ]);
        if (stagesRes?.length) setStages(stagesRes);
        if (leadsRes?.length) setLeads(leadsRes.map(mapDbLeadToLocal));
      } catch {
        toast.error("Failed to load pipeline data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    let newStageId = overId;
    // If dragging over another lead, get its stage
    const overLead = leads.find((l) => l.id === overId);
    if (overLead) {
      newStageId = overLead.stage_id;
    }

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    const newStage = stages.find((s) => s.id === newStageId);
    const oldProb = STAGE_PROBABILITY[lead.stage_id] ?? 0;
    const newProb = STAGE_PROBABILITY[newStageId] ?? 0;
    const probDiff = newProb - oldProb;

    // Optimistic update + glow animation
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage_id: newStageId } : l));
    setJustMovedId(leadId);
    setTimeout(() => setJustMovedId(null), 1500);

    // Rich success toast
    if (newStage?.is_won_stage) {
      toast.success(`🏆 Deal Won — ${lead.title}`, { description: "Congratulations! Moving to Won." });
    } else {
      toast.success(`Lead advanced → ${newStage?.name}`, {
        description: probDiff > 0 ? `+${probDiff}% conversion probability` : undefined,
      });
    }

    try {
      const oldStage = stages.find((s) => s.id === lead.stage_id);
      await changeStage(
        leadId,
        newStageId,
        { title: lead.title },
        { old: oldStage?.name || "?", new: newStage?.name || "?" }
      );
    } catch {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage_id: lead.stage_id } : l));
      toast.error("Failed to move lead");
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVenture = activeVenture === "all" || l.venture === activeVenture;
    return matchesSearch && matchesVenture;
  });

  const activeLead = leads.find((l) => l.id === activeId);

  return (
    <div className="page-container relative">
      <BackgroundArrows />

      {/* Header */}
      <motion.div
        className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Pipeline
          </h1>
          <p className="text-[#555] text-sm mt-1">
            Drag leads between stages · Hover for aging status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-10 w-52"
            />
          </div>
          <Link href="/leads/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Lead
          </Link>
        </div>
      </motion.div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#666] animate-spin" />
          <p className="text-[#666] mt-4 text-sm font-[var(--font-mono)]">Loading pipeline...</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 relative">
            {stages.map((stage, i) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={filteredLeads.filter((l) => l.stage_id === stage.id)}
                index={i}
                justMovedId={justMovedId}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeLead ? <LeadCardContent lead={activeLead} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

/* ─── Kanban Column ─────────────────────────────────────────── */

function KanbanColumn({
  stage, leads, index, justMovedId
}: {
  stage: PipelineStage;
  leads: VentureLead[];
  index: number;
  justMovedId: string | null;
}) {
  const { setNodeRef } = useSortable({ id: stage.id });
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const maxValue = 5000000; // For progress bar
  const fillPercent = Math.min((totalValue / maxValue) * 100, 100);

  const headerColor = stage.is_won_stage ? "#34d399" : stage.color;

  return (
    <motion.div
      ref={setNodeRef}
      className="flex-shrink-0 w-72"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 120, damping: 20 }}
    >
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: headerColor }} />
            <span className="text-sm text-[#A3A3A3] font-semibold tracking-wide uppercase" style={{ letterSpacing: "0.07em", fontSize: "0.7rem" }}>
              {stage.name}
            </span>
            <span
              className="text-xs text-[#555] bg-[#111] border border-[#1F1F1F] px-2 py-0.5 rounded-full"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {leads.length}
            </span>
          </div>
          {stage.display_order >= 4 && (
            <span className="text-sm text-[#666] font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              {formatCurrency(totalValue)}
            </span>
          )}
        </div>
        {/* Revenue Progress Bar */}
        <div className="h-[2px] bg-[#111] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: headerColor }}
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 0.6, delay: index * 0.07 + 0.3 }}
          />
        </div>
      </div>

      {/* Cards Drop Zone */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 min-h-[200px] p-2 rounded-xl border border-[#111] bg-[#050505]/60">
          <AnimatePresence>
            {leads.map((lead) => (
              <SortableLeadCard key={lead.id} lead={lead} justMoved={justMovedId === lead.id} stageOrder={stage.display_order} />
            ))}
          </AnimatePresence>
          {leads.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[#2A2A2A] text-xs">Drop leads here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
}

/* ─── Sortable Lead Card ────────────────────────────────────── */

function SortableLeadCard({ lead, justMoved, stageOrder }: { lead: VentureLead; justMoved: boolean; stageOrder: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
    >
      <LeadCardContent lead={lead} justMoved={justMoved} stageOrder={stageOrder} />
    </motion.div>
  );
}

/* ─── Lead Card Content ─────────────────────────────────────── */

function LeadCardContent({
  lead,
  isDragging,
  justMoved,
  stageOrder = 1,
}: {
  lead: VentureLead;
  isDragging?: boolean;
  justMoved?: boolean;
  stageOrder?: number;
}) {
  const venture = VENTURES[lead.venture];
  const ventureColor = venture?.color ?? "#666";
  const aging = getAgingInfo(lead.created_at);

  const priorityColor =
    lead.priority === 4 ? "#fb7185"
    : lead.priority === 3 ? "#fbbf24"
    : lead.priority === 2 ? "#666"
    : "#333";

  // Calculate AI health (passing empty activities since we don't have them all loaded here, 
  // it will still use time-in-stage and metadata to give a baseline health)
  const aiAnalysis = analyzeLeadForNextAction(lead as any, [], []);

  return (
    <Link href={`/leads/${lead.id}`}>
      <motion.div
        animate={justMoved ? {
          boxShadow: [`0 0 0px ${ventureColor}00`, `0 0 20px ${ventureColor}60`, `0 0 0px ${ventureColor}00`],
        } : {}}
        transition={{ duration: 1.2 }}
        className={`relative group overflow-hidden rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
          isDragging ? "scale-105 rotate-1" : "hover:translate-y-[-2px]"
        }`}
        style={{
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(8px)",
          border: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        {/* Venture accent bar — absolutely positioned, never clips text */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ backgroundColor: ventureColor }}
        />

        {/* Subtle hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(ellipse at 0% 50%, ${ventureColor}08 0%, transparent 70%)` }}
        />

        <div className="relative" style={{ padding: "16px 16px 16px 32px" }}>
          {/* Title + Priority */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm text-white font-semibold leading-snug flex-1">{lead.title}</p>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: priorityColor }} />
          </div>

          {/* Value — only for Proposal, Negotiation, Won (stageOrder >= 4) */}
          {stageOrder >= 4 && (
            <div className="mb-3">
              <span
                className="text-base text-white font-bold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {formatCurrency(lead.estimated_value)}
              </span>
            </div>
          )}

          {/* Footer: Avatar + Aging */}
          <div className="flex items-center justify-between">
            {/* Mini Avatar */}
            {lead.assigned_user && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border"
                  style={{
                    backgroundColor: `${ventureColor}20`,
                    borderColor: `${ventureColor}40`,
                    color: ventureColor,
                  }}
                >
                  {getInitials(lead.assigned_user.full_name)}
                </div>
                <span className="text-xs text-[#666]">
                  {lead.assigned_user.full_name.split(" ")[0]}
                </span>
              </div>
            )}

            {/* Lead Aging & AI Indicator */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: aiAnalysis.health_color + "15", color: aiAnalysis.health_color }}
                title={aiAnalysis.health_label}
              >
                <span className="text-[10px] opacity-90">{aiAnalysis.momentum_icon}</span>
                {aiAnalysis.health_score}
              </div>
              
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: aging.bgColor, color: aging.color }}
              >
              {aging.isStuck ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span style={{ fontFamily: "var(--font-mono)" }}>{aging.label}</span>
            </div>
            </div>
          </div>

          {/* Venture name — subtle footer line */}
          <div className="mt-2.5 pt-2 border-t border-white/[0.04]">
            <span className="text-[10px] font-medium" style={{ color: `${ventureColor}99`, letterSpacing: "0.06em" }}>
              {venture?.name?.toUpperCase()}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
