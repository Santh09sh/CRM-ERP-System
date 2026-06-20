"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAD_SOURCES } from "@/lib/constants";
import { toast } from "sonner";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "manual",
    estimated_value: "",
    priority: "2",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_job_title: "",
    company_name: "",
    company_industry: "",
    company_website: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Create company
      let company_id = null;
      if (form.company_name) {
        const { data: company } = await supabase
          .from("companies")
          .insert({
            name: form.company_name,
            industry: form.company_industry || null,
            website: form.company_website || null,
            created_by: user?.id,
          })
          .select()
          .single();
        company_id = company?.id;
      }

      // Create contact
      let contact_id = null;
      if (form.contact_email) {
        const { data: contact } = await supabase
          .from("contacts")
          .insert({
            first_name: form.contact_first_name,
            last_name: form.contact_last_name,
            email: form.contact_email,
            phone: form.contact_phone || null,
            job_title: form.contact_job_title || null,
            company_id,
            created_by: user?.id,
          })
          .select()
          .single();
        contact_id = contact?.id;
      }

      // Get first stage
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id")
        .order("display_order")
        .limit(1);
      const stage_id = stages?.[0]?.id;

      // Create lead
      const { error } = await supabase.from("leads").insert({
        title: form.title,
        description: form.description || null,
        source: form.source,
        estimated_value: parseFloat(form.estimated_value) || 0,
        priority: parseInt(form.priority),
        contact_id,
        company_id,
        stage_id,
        assigned_to: user?.id,
      });

      if (error) throw error;

      toast.success("Lead created successfully");
      router.push("/leads");
    } catch (err) {
      toast.error("Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link href="/leads" className="btn-ghost text-xs mb-6 inline-flex">
          <ArrowLeft className="w-3 h-3" />
          Back to Leads
        </Link>
      </motion.div>

      <motion.div className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
          New Lead
        </h1>
        <p className="text-[#666] text-sm mt-1">Capture a new lead with contact and company details.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Lead Info */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm text-[#A3A3A3]" style={{ fontFamily: "var(--font-heading)" }}>Lead Information</h3>
          <div>
            <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Title *</label>
            <input type="text" value={form.title} onChange={(e) => updateField("title", e.target.value)} className="input-base" placeholder="e.g., Acme Corporation — Enterprise CRM" required />
          </div>
          <div>
            <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className="input-base min-h-[80px] resize-none" placeholder="Brief description of the opportunity..." rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Source *</label>
              <select value={form.source} onChange={(e) => updateField("source", e.target.value)} className="input-base appearance-none cursor-pointer">
                {LEAD_SOURCES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Estimated Value (₹)</label>
              <input type="number" value={form.estimated_value} onChange={(e) => updateField("estimated_value", e.target.value)} className="input-base" placeholder="500000" />
            </div>
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Priority</label>
              <select value={form.priority} onChange={(e) => updateField("priority", e.target.value)} className="input-base appearance-none cursor-pointer">
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
                <option value="4">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm text-[#A3A3A3]" style={{ fontFamily: "var(--font-heading)" }}>Contact Person</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">First Name</label>
              <input type="text" value={form.contact_first_name} onChange={(e) => updateField("contact_first_name", e.target.value)} className="input-base" placeholder="Rajesh" />
            </div>
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Last Name</label>
              <input type="text" value={form.contact_last_name} onChange={(e) => updateField("contact_last_name", e.target.value)} className="input-base" placeholder="Kumar" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Email</label>
              <input type="email" value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} className="input-base" placeholder="rajesh@acme.in" />
            </div>
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Phone</label>
              <input type="text" value={form.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} className="input-base" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Job Title</label>
            <input type="text" value={form.contact_job_title} onChange={(e) => updateField("contact_job_title", e.target.value)} className="input-base" placeholder="CTO" />
          </div>
        </div>

        {/* Company Info */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm text-[#A3A3A3]" style={{ fontFamily: "var(--font-heading)" }}>Company</h3>
          <div>
            <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Company Name</label>
            <input type="text" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} className="input-base" placeholder="Acme Corporation" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Industry</label>
              <input type="text" value={form.company_industry} onChange={(e) => updateField("company_industry", e.target.value)} className="input-base" placeholder="Technology" />
            </div>
            <div>
              <label className="text-[#666] text-xs tracking-wider uppercase block mb-2">Website</label>
              <input type="text" value={form.company_website} onChange={(e) => updateField("company_website", e.target.value)} className="input-base" placeholder="acme.in" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Lead"}
          </button>
          <Link href="/leads" className="btn-secondary">Cancel</Link>
        </div>
      </motion.form>
    </div>
  );
}
