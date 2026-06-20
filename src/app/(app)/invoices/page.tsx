"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Download, Eye, Mail, X, Send, FileText, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { toast } from "sonner";
import type { VentureKey } from "@/lib/constants";
import { getInvoices } from "@/lib/db";
import { generateInvoice } from "@/lib/services/invoice-service";

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  company_name: string;
  contact_name: string;
  total: number;
  tax_amount: number;
  subtotal: number;
  status: string;
  issue_date: string;
  due_date: string;
  deal_name: string;
  venture: VentureKey;
  items: InvoiceItem[];
};

// ─── PDF Generator ────────────────────────────────────────────────
async function downloadInvoicePDF(invoice: Invoice) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Background
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, pageW, 297, "F");

  // Header bar
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageW, 42, "F");

  // Invoice number
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE", margin, y);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.invoice_number, margin, y + 9);

  // Company (sender)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("SAASUM", pageW - margin, y, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Centle Group · Hyderabad, India", pageW - margin, y + 6, { align: "right" });
  doc.text("invoices@saasum.in", pageW - margin, y + 11, { align: "right" });

  y = 55;

  // Bill To / Dates
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("BILL TO", margin, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(240, 240, 240);
  doc.text(invoice.company_name, margin, y + 7);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(invoice.contact_name, margin, y + 14);

  // Dates on right
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Issue Date:`, pageW - margin - 50, y, { align: "left" });
  doc.setTextColor(163, 163, 163);
  doc.text(formatDate(invoice.issue_date), pageW - margin, y, { align: "right" });

  doc.setTextColor(100, 100, 100);
  doc.text(`Due Date:`, pageW - margin - 50, y + 7);
  doc.setTextColor(163, 163, 163);
  doc.text(formatDate(invoice.due_date), pageW - margin, y + 7, { align: "right" });

  doc.setTextColor(100, 100, 100);
  doc.text(`Deal:`, pageW - margin - 50, y + 14);
  doc.setTextColor(163, 163, 163);
  doc.text(invoice.deal_name || (invoice as any).notes || "—", pageW - margin, y + 14, { align: "right" });
  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    sent: [245, 158, 11],
    overdue: [239, 68, 68],
    draft: [100, 100, 100],
  };
  const [r, g, b] = statusColors[invoice.status] ?? [100, 100, 100];
  doc.setFillColor(r, g, b);
  doc.roundedRect(pageW - margin - 28, y + 19, 28, 7, 2, 2, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.status.toUpperCase(), pageW - margin - 14, y + 24, { align: "center" });

  y = 95;

  // Divider
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Line items header
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  doc.text("DESCRIPTION", margin, y);
  doc.text("QTY", pageW - margin - 70, y, { align: "right" });
  doc.text("UNIT PRICE", pageW - margin - 35, y, { align: "right" });
  doc.text("TOTAL", pageW - margin, y, { align: "right" });
  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // Items
  for (const item of invoice.items) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    const descLines = doc.splitTextToSize(item.description, pageW - margin - 90);
    doc.text(descLines, margin, y);

    doc.setTextColor(120, 120, 120);
    doc.text(String(item.quantity), pageW - margin - 70, y, { align: "right" });
    doc.text(formatCurrency(item.unit_price), pageW - margin - 35, y, { align: "right" });
    doc.setTextColor(163, 163, 163);
    doc.text(formatCurrency(item.total), pageW - margin, y, { align: "right" });

    y += descLines.length * 5 + 4;
    doc.setDrawColor(26, 26, 26);
    doc.line(margin, y - 1, pageW - margin, y - 1);
    y += 3;
  }

  y += 8;

  // Totals box
  const totalsX = pageW - margin - 75;
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(totalsX, y - 4, 75, 34, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", totalsX + 6, y + 4);
  doc.setTextColor(163, 163, 163);
  doc.text(formatCurrency(invoice.subtotal), pageW - margin - 4, y + 4, { align: "right" });

  doc.setTextColor(100, 100, 100);
  doc.text("GST (18%)", totalsX + 6, y + 12);
  doc.setTextColor(163, 163, 163);
  doc.text(formatCurrency(invoice.tax_amount), pageW - margin - 4, y + 12, { align: "right" });

  doc.setDrawColor(40, 40, 40);
  doc.line(totalsX + 4, y + 16, pageW - margin - 4, y + 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Total", totalsX + 6, y + 24);
  doc.text(formatCurrency(invoice.total), pageW - margin - 4, y + 24, { align: "right" });

  // Footer
  y = 275;
  doc.setDrawColor(26, 26, 26);
  doc.line(margin, y, pageW - margin, y);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Generated by Saasum CRM · Centle Group · invoices@saasum.in", pageW / 2, y + 7, { align: "center" });

  doc.save(`${invoice.invoice_number}.pdf`);
}

// ─── Email Modal ──────────────────────────────────────────────────
function EmailModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Dear ${invoice.contact_name},\n\nPlease find attached invoice ${invoice.invoice_number} for ${invoice.deal_name} amounting to ${formatCurrency(invoice.total)}.\n\nKindly process the payment by ${formatDate(invoice.due_date)}.\n\nThank you for your business.\n\nWarm regards,\nSaasum Team`
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const res = await fetch("/api/invoices/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, message, invoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      toast.success(`Invoice sent to ${email}`);
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-lg rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Send Invoice via Email</p>
              <p className="text-xs text-[#555]" style={{ fontFamily: "var(--font-mono)" }}>{invoice.invoice_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-[#666]" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle className="w-12 h-12 text-[#22C55E]" />
            </motion.div>
            <p className="text-white font-semibold">Invoice Sent!</p>
            <p className="text-sm text-[#666]">Delivered to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* From */}
              <div>
                <label className="block text-xs text-[#555] mb-1.5 tracking-wider uppercase">From</label>
                <div className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-[#555]">
                  Saasum Invoices &lt;invoices@saasum.in&gt;
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-xs text-[#555] mb-1.5 tracking-wider uppercase">To <span className="text-[#EF4444]">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@company.com"
                  required
                  autoFocus
                  className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#333] transition-colors"
                />
              </div>

              {/* Subject preview */}
              <div>
                <label className="block text-xs text-[#555] mb-1.5 tracking-wider uppercase">Subject</label>
                <div className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-[#555]">
                  Invoice {invoice.invoice_number} from Saasum — {invoice.company_name}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs text-[#555] mb-1.5 tracking-wider uppercase">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3 text-sm text-[#A3A3A3] placeholder:text-[#333] focus:outline-none focus:border-[#333] transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Invoice summary chip */}
              <div className="flex items-center gap-3 bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-3">
                <FileText className="w-4 h-4 text-[#444] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{invoice.invoice_number}</p>
                  <p className="text-xs text-[#555]">{invoice.company_name} · {formatCurrency(invoice.total)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${invoice.status === "paid" ? "bg-[#22C55E]/10 text-[#22C55E]" : invoice.status === "overdue" ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#666] text-sm border border-[#1A1A1A] transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !email}
                className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Invoice
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── New Invoice Modal ────────────────────────────────────────────
function NewInvoiceModal({ onClose, onSave }: { onClose: () => void, onSave: (inv: Invoice) => void }) {
  const [company_name, setCompany] = useState("");
  const [contact_name, setContact] = useState("");
  const [deal_name, setDeal] = useState("");
  const [venture, setVenture] = useState<VentureKey>("saasum");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);

  const handleAddItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].unit_price) || 0);
    }
    setItems(newItems);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = subtotal * 0.18;
    const newInv: Invoice = {
      id: `inv_${Date.now()}`,
      invoice_number: `INV-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`,
      company_name, contact_name, deal_name, venture, status,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items, subtotal, tax_amount, total: subtotal + tax_amount
    };
    onSave(newInv);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <p className="text-base font-semibold text-white">Create New Invoice</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5 text-[#666]" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="new-invoice-form" onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Company <span className="text-[#EF4444]">*</span></label><input required value={company_name} onChange={e => setCompany(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#333] focus:outline-none" placeholder="e.g. Acme Corp" /></div>
              <div><label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Contact Person <span className="text-[#EF4444]">*</span></label><input required value={contact_name} onChange={e => setContact(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#333] focus:outline-none" placeholder="e.g. John Doe" /></div>
              <div><label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Deal <span className="text-[#EF4444]">*</span></label><input required value={deal_name} onChange={e => setDeal(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#333] focus:outline-none" placeholder="e.g. Q3 Marketing Campaign" /></div>
              <div>
                <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Venture</label>
                <select value={venture} onChange={e => setVenture(e.target.value as VentureKey)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#333] focus:outline-none appearance-none">
                  <option value="saasum">Saasum</option><option value="maceco">Maceco</option><option value="skill_tank">Skill Tank</option><option value="promtal">Promtal</option><option value="tobofu">Tobofu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#333] focus:outline-none appearance-none">
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            
            <div className="border-t border-[#1A1A1A] pt-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium text-white">Line Items</p>
                <button type="button" onClick={handleAddItem} className="text-xs font-medium text-[#888] hover:text-white flex items-center gap-1 transition-colors bg-[#111] px-3 py-1.5 rounded-md border border-[#1A1A1A]"><Plus className="w-3.5 h-3.5" /> Add Item</button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex-1"><input required placeholder="Description" value={item.description} onChange={e => handleItemChange(i, 'description', e.target.value)} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#333]" /></div>
                    <div className="w-20"><input type="number" required min="1" placeholder="Qty" value={item.quantity || ''} onChange={e => handleItemChange(i, 'quantity', Number(e.target.value))} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-[#333]" /></div>
                    <div className="w-32"><input type="number" required min="0" placeholder="Price" value={item.unit_price || ''} onChange={e => handleItemChange(i, 'unit_price', Number(e.target.value))} className="w-full bg-[#111] border border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-[#333]" /></div>
                    {items.length > 1 && <button type="button" onClick={() => { const n = [...items]; n.splice(i,1); setItems(n); }} className="p-2 text-[#666] hover:text-red-400 mt-0.5"><X className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-[#111] border border-[#1A1A1A] rounded-lg p-4 flex justify-between items-center">
                <p className="text-sm text-[#888]">Subtotal (+ 18% GST)</p>
                <p className="text-lg text-white font-mono font-semibold">{formatCurrency(subtotal * 1.18)}</p>
              </div>
            </div>
          </form>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A] shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#1A1A1A] text-[#666] text-sm border border-[#1A1A1A] transition-colors">Cancel</button>
          <button type="submit" form="new-invoice-form" className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getInvoices();
        if (data?.length) {
          // Map DB response to UI format
          const mapped = data.map((inv: any) => {
            let mappedVenture = inv.venture;
            if (!mappedVenture || mappedVenture === "core") {
              mappedVenture = inv.deal?.venture || inv.company?.venture || "saasum";
            }
            
            return {
              ...inv,
              venture: mappedVenture,
              company_name: inv.company?.name || inv.company_name || "Unknown Company",
              contact_name: inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name}`.trim() : inv.contact_name || "Unknown Contact",
              items: inv.invoice_items || [],
            };
          });
          setInvoices(mapped);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInvoices();
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.company_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesVenture = activeVenture === "all" || inv.venture === activeVenture;
    return matchesSearch && matchesStatus && matchesVenture;
  });

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + i.total, 0);

  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      await downloadInvoicePDF(invoice);
      toast.success(`${invoice.invoice_number}.pdf downloaded`);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSaveNewInvoice = async (newInv: Invoice) => {
    try {
      const items = newInv.items || [];
      const dbInv = {
        invoice_number: newInv.invoice_number,
        company_name: newInv.company_name,
        contact_name: newInv.contact_name,
        deal_name: newInv.deal_name,
        venture: newInv.venture,
        status: newInv.status,
        issue_date: newInv.issue_date,
        due_date: newInv.due_date,
        subtotal: newInv.subtotal,
        tax_amount: newInv.tax_amount,
        total: newInv.total
      };
      const created = await generateInvoice(dbInv, items);
      
      const mapped = {
        ...created,
        items: created.invoice_items || [],
      };
      
      setInvoices([mapped, ...invoices]);
      setShowNewModal(false);
      toast.success("Invoice created successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    }
  };

  return (
    <div className="page-container">
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Invoices</h1>
          <p className="text-[#666] text-sm mt-1">
            Collected: <span className="text-[#22C55E]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(totalRevenue)}</span>
            <span className="text-[#444] mx-2">·</span>
            Outstanding: <span className="text-[#F59E0B]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(totalOutstanding)}</span>
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
                  const cols = ["Invoice #", "Company", "Venture", "Total", "Status", "Issue Date", "Due Date"];
                  const rows = filtered.map(i => [
                    i.invoice_number,
                    i.company_name,
                    i.venture,
                    i.total,
                    i.status,
                    i.issue_date,
                    i.due_date
                  ]);
                  exportToCsv("invoices_export.csv", cols, rows);
                  toast.success("CSV Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As CSV
              </button>
              <button 
                onClick={() => {
                  const cols = ["Invoice #", "Company", "Venture", "Total", "Status", "Issue Date"];
                  const rows = filtered.map(i => [
                    i.invoice_number,
                    i.company_name,
                    i.venture,
                    i.status,
                    formatCurrency(i.total),
                    i.issue_date
                  ]);
                  exportToPdf("invoices_export.pdf", "Invoices Report", cols, rows);
                  toast.success("PDF Exported");
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#A3A3A3] hover:bg-[#222] hover:text-white transition-colors"
              >
                As PDF
              </button>
            </div>
          </div>
          <button onClick={() => setShowNewModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" />New Invoice</button>
        </div>
      </motion.div>

      <motion.div className="flex flex-wrap items-center gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "sent", "paid", "overdue"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === s ? "bg-white text-black" : "bg-[#111] text-[#888] border border-[#1A1A1A] hover:text-white hover:bg-[#1A1A1A]"}`}>{s}</button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoice List */}
        <motion.div className={`card overflow-hidden ${selectedInvoice ? "lg:col-span-1" : "lg:col-span-3"}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>{selectedInvoice ? "" : "Company"}</th>
                  {!selectedInvoice && <th>Venture</th>}
                  <th>Total</th>
                  <th>Status</th>
                  {!selectedInvoice && <th className="hidden md:table-cell">Date</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.02 * i }} className={`cursor-pointer ${selectedInvoice?.id === inv.id ? "bg-[#1A1A1A]" : ""}`} onClick={() => setSelectedInvoice(inv)}>
                    <td><span className="text-base text-white font-medium" style={{ fontFamily: "var(--font-mono)" }}>{inv.invoice_number}</span></td>
                    <td>{!selectedInvoice && <span className="text-sm text-[#888]">{inv.company_name}</span>}</td>
                    {!selectedInvoice && <td><VentureBadge venture={inv.venture} /></td>}
                    <td><span className="text-base text-[#A3A3A3] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(inv.total)}</span></td>
                    <td>
                      <span className={`badge ${inv.status === "paid" ? "badge-success" : inv.status === "overdue" ? "badge-danger" : inv.status === "sent" ? "badge-warning" : ""}`}>{inv.status}</span>
                    </td>
                    {!selectedInvoice && <td className="hidden md:table-cell"><span className="text-sm text-[#888]" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(inv.issue_date)}</span></td>}
                    <td><Eye className="w-3.5 h-3.5 text-[#444]" /></td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={selectedInvoice ? 4 : 7} className="text-center py-12 text-[#666]">
                      No invoices found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Invoice Preview */}
        {selectedInvoice && (
          <motion.div className="lg:col-span-2 card p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] text-[#444] tracking-[0.15em] uppercase mb-1">Invoice</p>
                <p className="text-xl text-white font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{selectedInvoice.invoice_number}</p>
                <div className="mt-2">
                  <VentureBadge venture={selectedInvoice.venture} size="md" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-heading)" }}>SAASUM</p>
                <p className="text-[10px] text-[#666] mt-1">Centle Group<br />Hyderabad, India</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-[10px] text-[#444] tracking-wider uppercase mb-1">Bill To</p>
                <p className="text-sm text-white">{selectedInvoice.company_name}</p>
                <p className="text-xs text-[#666]">{selectedInvoice.contact_name}</p>
              </div>
              <div className="text-right">
                <div className="space-y-1 text-xs">
                  <div><span className="text-[#666]">Issue: </span><span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(selectedInvoice.issue_date)}</span></div>
                  <div><span className="text-[#666]">Due: </span><span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatDate(selectedInvoice.due_date)}</span></div>
                  <div><span className="text-[#666]">Deal: </span><span className="text-[#A3A3A3]">{selectedInvoice.deal_name}</span></div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="text-left text-[10px] text-[#666] tracking-wider uppercase py-2">Description</th>
                  <th className="text-right text-[10px] text-[#666] tracking-wider uppercase py-2">Qty</th>
                  <th className="text-right text-[10px] text-[#666] tracking-wider uppercase py-2">Price</th>
                  <th className="text-right text-[10px] text-[#666] tracking-wider uppercase py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-[#1A1A1A]">
                    <td className="text-sm text-[#D4D4D4] py-3">{item.description}</td>
                    <td className="text-sm text-[#666] text-right py-3" style={{ fontFamily: "var(--font-mono)" }}>{item.quantity}</td>
                    <td className="text-sm text-[#666] text-right py-3" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(item.unit_price)}</td>
                    <td className="text-sm text-[#A3A3A3] text-right py-3" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Subtotal</span>
                  <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">GST (18%)</span>
                  <span className="text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(selectedInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-[#222]">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-white font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-[#1A1A1A]">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                disabled={downloadingId === selectedInvoice.id}
                className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadingId === selectedInvoice.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-secondary text-sm"
              >
                <Mail className="w-4 h-4" />
                Send via Email
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="btn-ghost text-sm ml-auto">Close</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEmailModal && selectedInvoice && (
          <EmailModal invoice={selectedInvoice} onClose={() => setShowEmailModal(false)} />
        )}
        {showNewModal && (
          <NewInvoiceModal onClose={() => setShowNewModal(false)} onSave={handleSaveNewInvoice} />
        )}
      </AnimatePresence>
    </div>
  );
}
