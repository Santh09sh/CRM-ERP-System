-- 1. Modify invoices table to match the UI's simple string fields
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS deal_name TEXT,
ADD COLUMN IF NOT EXISTS venture TEXT NOT NULL DEFAULT 'core';

-- 2. Insert dummy invoices
DO $$ 
DECLARE
  inv1_id UUID := gen_random_uuid();
  inv2_id UUID := gen_random_uuid();
  inv3_id UUID := gen_random_uuid();
  inv4_id UUID := gen_random_uuid();
  inv5_id UUID := gen_random_uuid();
BEGIN
  -- Insert Invoices
  INSERT INTO invoices (id, invoice_number, company_name, contact_name, deal_name, venture, subtotal, tax_amount, total, status, issue_date, due_date)
  VALUES 
    (inv1_id, 'INV-2504-001', 'Lenskart', 'Priyanka Agarwal', 'Digital Marketing Strategy', 'maceco', 984000, 216000, 1200000, 'paid', '2026-04-15', '2026-05-15'),
    (inv2_id, 'INV-2504-002', 'BITS Pilani', 'Meera Bhatt', 'Internship Program', 'skill_tank', 779000, 171000, 950000, 'paid', '2026-04-20', '2026-05-20'),
    (inv3_id, 'INV-2505-001', 'IIT Hyderabad', 'Dr. Anil Kumar', 'Campus Placement Drive', 'skill_tank', 1476000, 324000, 1800000, 'sent', '2026-05-10', '2026-06-10'),
    (inv4_id, 'INV-2505-002', 'Razorpay', 'Harshil Mathur', 'B2B Lead Generation', 'tobofu', 2624000, 576000, 3200000, 'draft', '2026-05-28', '2026-06-28'),
    (inv5_id, 'INV-2506-001', 'Sunburn Festival', 'Karan Singh', 'Festival Brand Activation', 'promtal', 2296000, 504000, 2800000, 'overdue', '2026-04-01', '2026-05-01')
  ON CONFLICT DO NOTHING;

  -- Insert Line Items for INV-2504-001
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
    (inv1_id, 'Social Media Campaign — 3 Months', 1, 600000, 600000),
    (inv1_id, 'Influencer Partnership Management', 1, 250000, 250000),
    (inv1_id, 'Performance Ad Management', 3, 44667, 134000);

  -- Insert Line Items for INV-2504-002
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
    (inv2_id, 'Placement Drive — 300 Students', 1, 600000, 600000),
    (inv2_id, 'Resume & Interview Prep Workshop', 1, 179000, 179000);

  -- Insert Line Items for INV-2505-001
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
    (inv3_id, 'Full Placement Drive Partnership', 1, 1000000, 1000000),
    (inv3_id, 'Industry Connect Sessions', 4, 75000, 300000),
    (inv3_id, 'Career Readiness Training', 1, 176000, 176000);

  -- Insert Line Items for INV-2505-002
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
    (inv4_id, 'Lead Gen Platform Setup', 1, 1500000, 1500000),
    (inv4_id, 'Content Syndication — 6 Months', 1, 624000, 624000),
    (inv4_id, 'ABM Campaign (100 Accounts)', 1, 500000, 500000);

  -- Insert Line Items for INV-2506-001
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
    (inv5_id, 'Event Activation Setup & Management', 1, 1500000, 1500000),
    (inv5_id, 'Promo Staff — 40 Personnel × 3 Days', 120, 5000, 600000),
    (inv5_id, 'Brand Experience Zone Design', 1, 196000, 196000);
END $$;
