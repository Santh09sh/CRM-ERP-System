-- CRM ERP - Supabase Database Schema
-- Run this entire script in your Supabase SQL Editor

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'sales_rep', 'manager', 'ambassador');
CREATE TYPE lead_source AS ENUM ('referral', 'ads', 'organic', 'event', 'cold_call', 'website_form', 'manual');
CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE conversion_status AS ENUM ('pending', 'approved', 'paid');
CREATE TYPE payout_status AS ENUM ('requested', 'approved', 'processing', 'paid', 'rejected');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- PROFILES (Matches Profile interface)
-- Keeping demo auth means we just use arbitrary strings for IDs for now,
-- but we define it as UUID for standard Supabase structure if we migrate to Auth later.
-- For demo auth, we can just insert fake UUIDs.
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'sales_rep',
    avatar_url TEXT,
    phone TEXT,
    telegram_chat_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPANIES (Matches Company interface)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    address TEXT,
    phone TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CONTACTS (Matches Contact interface)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    job_title TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PIPELINE STAGES (Matches PipelineStage interface)
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    color TEXT NOT NULL,
    is_won_stage BOOLEAN NOT NULL DEFAULT FALSE,
    is_lost_stage BOOLEAN NOT NULL DEFAULT FALSE
);

-- REFERRAL CODES (Matches ReferralCode interface - needed for Lead FK)
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    link_slug TEXT UNIQUE NOT NULL,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    commission_rate DECIMAL NOT NULL DEFAULT 0.10,
    total_earned DECIMAL NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LEADS (Matches Lead interface)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    source lead_source NOT NULL DEFAULT 'manual',
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
    estimated_value DECIMAL NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 2, -- 1=low, 2=med, 3=high, 4=urgent
    custom_fields JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAGE HISTORY (Matches StageHistory interface)
CREATE TABLE stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES pipeline_stages(id),
    to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEALS (Matches Deal interface)
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    value DECIMAL NOT NULL DEFAULT 0,
    probability INTEGER NOT NULL DEFAULT 50,
    expected_close_date DATE NOT NULL,
    status deal_status NOT NULL DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- ACTIVITIES (Matches Activity interface)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    type activity_type NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASKS (Matches Task interface + Venture metadata from recent updates)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT NOT NULL, -- Currently string name in UI, ideally UUID to profiles but keeping simple for migration
    assigned_email TEXT,
    assigned_phone TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    lead_name TEXT, -- Denormalized for UI
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'pending',
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    value DECIMAL DEFAULT 0,
    venture TEXT NOT NULL DEFAULT 'core',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASK REMINDERS
CREATE TABLE task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVOICES (Matches Invoice interface)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subtotal DECIMAL NOT NULL DEFAULT 0,
    tax_rate DECIMAL NOT NULL DEFAULT 0,
    tax_amount DECIMAL NOT NULL DEFAULT 0,
    total DECIMAL NOT NULL DEFAULT 0,
    status invoice_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVOICE ITEMS (Matches InvoiceItem interface)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL NOT NULL DEFAULT 1,
    unit_price DECIMAL NOT NULL DEFAULT 0,
    total DECIMAL NOT NULL DEFAULT 0
);

-- REFERRAL CLICKS
CREATE TABLE referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFERRAL CONVERSIONS
CREATE TABLE referral_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    deal_value DECIMAL NOT NULL DEFAULT 0,
    commission_amount DECIMAL NOT NULL DEFAULT 0,
    status conversion_status NOT NULL DEFAULT 'pending',
    converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYOUTS
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    status payout_status NOT NULL DEFAULT 'requested',
    payment_method TEXT,
    transaction_ref TEXT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================
-- For MVP with Demo Auth, we will allow all access to authenticated/anon roles
-- This allows the front-end to query directly without auth tokens

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for MVP (allow all operations)
CREATE POLICY "Allow all operations for anon" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON referral_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON stage_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON task_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON referral_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON referral_conversions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON payouts FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 4. DEFAULT DATA (Optional but recommended)
-- ==========================================

-- Insert default pipeline stages
INSERT INTO pipeline_stages (id, name, display_order, color, is_won_stage, is_lost_stage) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Lead In', 1, '#60A5FA', false, false),
    ('00000000-0000-0000-0000-000000000002', 'Contact Made', 2, '#A78BFA', false, false),
    ('00000000-0000-0000-0000-000000000003', 'Meeting Set', 3, '#F472B6', false, false),
    ('00000000-0000-0000-0000-000000000004', 'Proposal Sent', 4, '#FBBF24', false, false),
    ('00000000-0000-0000-0000-000000000005', 'Negotiation', 5, '#FB923C', false, false),
    ('00000000-0000-0000-0000-000000000006', 'Closed Won', 6, '#4ADE80', true, false),
    ('00000000-0000-0000-0000-000000000007', 'Closed Lost', 7, '#F87171', false, true)
ON CONFLICT DO NOTHING;

-- Insert a default admin user for the Demo Auth
INSERT INTO profiles (id, full_name, email, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@saasum.in', 'admin')
ON CONFLICT DO NOTHING;
