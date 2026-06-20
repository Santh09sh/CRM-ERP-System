"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Building2, X, UserPlus } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { VentureBadge } from "@/components/shared/venture-badge";
import { useVentureFilter } from "@/components/shared/venture-switcher";
import { toast } from "sonner";
import type { VentureKey } from "@/lib/constants";
import { getContacts, createContact } from "@/lib/db";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company: { id: string; name: string };
  leads_count: number;
  venture: VentureKey;
};

// Removed SAMPLE_CONTACTS

function mapDbContactToLocal(c: any): Contact {
  let venture = "saasum";
  try {
    const notes = JSON.parse(c.company?.notes || "{}");
    if (notes.venture) venture = notes.venture;
  } catch (e) {
    // fallback
  }

  return {
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone || "",
    job_title: c.job_title || "",
    company: c.company || { id: "", name: "Unknown" },
    leads_count: 0,
    venture: venture as VentureKey,
  };
}

function AddContactModal({ onClose, onSave }: { onClose: () => void, onSave: (c: Contact) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [venture, setVenture] = useState<VentureKey>("saasum");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: Contact = {
      id: `c_${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      job_title: jobTitle,
      company: { id: `co_${Date.now()}`, name: companyName },
      leads_count: 0,
      venture,
    };
    onSave(newContact);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-xl rounded-2xl border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden flex flex-col" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#A3A3A3]" />
            </div>
            <p className="text-base font-semibold text-white">Add New Contact</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-[#111] hover:bg-[#1A1A1A] flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5 text-[#666]" /></button>
        </div>
        <div className="p-8">
          <form id="add-contact-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">First Name <span className="text-[#EF4444]">*</span></label>
                <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Jane" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Last Name <span className="text-[#EF4444]">*</span></label>
                <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Doe" />
              </div>
            
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Email <span className="text-[#EF4444]">*</span></label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. jane@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. +91 98765 43210" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Company <span className="text-[#EF4444]">*</span></label>
                <input required value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-2 uppercase tracking-widest">Job Title</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#555] focus:outline-none transition-all" placeholder="e.g. Marketing Director" />
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
          <button type="submit" form="add-contact-form" className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { activeVenture } = useVentureFilter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getContacts();
        setContacts(data.map(mapDbContactToLocal));
      } catch (err) {
        toast.error("Failed to load contacts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.name.toLowerCase().includes(search.toLowerCase());
    const matchesVenture = activeVenture === "all" || c.venture === activeVenture;
    return matchesSearch && matchesVenture;
  });

  const handleSaveContact = async (newContact: Contact) => {
    try {
      // NOTE: Creating a contact without a real company UUID will fail if we enforce FK.
      // For now, since companyName is just UI string, we might just insert it as null or omit it.
      const dbContact = await createContact({
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        email: newContact.email,
        phone: newContact.phone,
        job_title: newContact.job_title,
      });
      // Mock the venture and company to match what user entered
      const localContact = mapDbContactToLocal(dbContact);
      localContact.company = newContact.company;
      localContact.venture = newContact.venture;

      setContacts([localContact, ...contacts]);
      setShowAddModal(false);
      toast.success("Contact added successfully");
    } catch (err) {
      toast.error("Failed to create contact");
    }
  };

  return (
    <div className="page-container">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Contacts
          </h1>
          <p className="text-[#666] text-sm mt-1">
            <span style={{ fontFamily: "var(--font-mono)" }}>{filtered.length}</span> contacts
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </motion.div>

      <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#666] animate-spin" />
          <p className="text-[#666] mt-4 text-sm font-[var(--font-mono)]">Loading contacts from DB...</p>
        </div>
      ) : (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Venture</th>
                  <th>Email</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden md:table-cell">Company</th>
                  <th className="hidden lg:table-cell">Title</th>
                  <th>Leads</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.02 * i }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-xs text-[#A3A3A3] font-medium">
                          {getInitials(`${c.first_name} ${c.last_name}`)}
                        </div>
                        <span className="text-base text-white font-medium">{c.first_name} {c.last_name}</span>
                      </div>
                    </td>
                    <td><VentureBadge venture={c.venture} /></td>
                    <td><span className="text-sm text-[#A3A3A3]">{c.email}</span></td>
                    <td className="hidden md:table-cell"><span className="text-sm text-[#888]" style={{ fontFamily: "var(--font-mono)" }}>{c.phone}</span></td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2 text-sm text-[#888]">
                        <Building2 className="w-4 h-4 text-[#555]" />
                        {c.company?.name}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell"><span className="text-sm text-[#888]">{c.job_title}</span></td>
                    <td>
                      <span className="text-sm text-[#A3A3A3]" style={{ fontFamily: "var(--font-mono)" }}>{c.leads_count}</span>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#666]">
                      No contacts found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddContactModal onClose={() => setShowAddModal(false)} onSave={handleSaveContact} />
        )}
      </AnimatePresence>
    </div>
  );
}
