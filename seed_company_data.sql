-- CLEANUP + Re-seed deals and invoices for existing companies
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (deletes old seed data first)

-- Step 1: Clean up any previously seeded deals and invoices
DELETE FROM invoices WHERE invoice_number LIKE 'INV-25%' OR invoice_number LIKE 'INV-26%';
DELETE FROM deals WHERE title IN (
  'Social Media Campaign Q1', 'Brand Refresh 2025', 'Influencer Outreach', 'SEO Optimization',
  'B2B Lead Gen Campaign', 'Content Marketing Suite', 'Merchant Onboarding Funnels',
  'Zomato Gold Launch Campaign', 'Hyper-local Ad Strategy',
  'Campus Placement Drive 2025', 'Skill Development Workshop',
  'Brand Activation - Sunburn Goa', 'Festival Aftermovie Production', 'Sunburn — Festival Brand Activation',
  'Market Expansion Consulting', 'Investor Relations Package',
  'ABM Campaign for Enterprise', 'Product Launch Content',
  'Campus Ambassador Program', 'Annual Placement Support'
);

-- Step 2: Insert fresh data
DO $$
DECLARE
  v_user_id UUID;
  v_lenskart_id UUID;
  v_razorpay_id UUID;
  v_zomato_id UUID;
  v_iith_id UUID;
  v_sunburn_id UUID;
  v_greenergy_id UUID;
  v_freshworks_id UUID;
  v_bits_id UUID;
  v_contact_id UUID;
BEGIN

  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_contact_id FROM contacts LIMIT 1;

  SELECT id INTO v_lenskart_id FROM companies WHERE name ILIKE '%Lenskart%' LIMIT 1;
  SELECT id INTO v_razorpay_id FROM companies WHERE name ILIKE '%Razorpay%' LIMIT 1;
  SELECT id INTO v_zomato_id FROM companies WHERE name ILIKE '%Zomato%' LIMIT 1;
  SELECT id INTO v_iith_id FROM companies WHERE name ILIKE '%IIT%' LIMIT 1;
  SELECT id INTO v_sunburn_id FROM companies WHERE name ILIKE '%Sunburn%' LIMIT 1;
  SELECT id INTO v_greenergy_id FROM companies WHERE name ILIKE '%Green%' LIMIT 1;
  SELECT id INTO v_freshworks_id FROM companies WHERE name ILIKE '%Freshworks%' LIMIT 1;
  SELECT id INTO v_bits_id FROM companies WHERE name ILIKE '%BITS%' LIMIT 1;

  -- ═══ Lenskart ═══
  IF v_lenskart_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Social Media Campaign Q1', v_lenskart_id, v_contact_id, v_user_id, 480000, 100, '2025-03-15', 'won', 'Instagram + YouTube campaign'),
      ('Brand Refresh 2025', v_lenskart_id, v_contact_id, v_user_id, 720000, 100, '2025-06-20', 'won', 'Full brand identity refresh'),
      ('Influencer Outreach', v_lenskart_id, v_contact_id, v_user_id, 350000, 75, '2026-08-01', 'open', 'Micro-influencer strategy'),
      ('SEO Optimization', v_lenskart_id, v_contact_id, v_user_id, 200000, 40, '2026-04-15', 'lost', 'Went with another agency');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2501-LK1', v_lenskart_id, v_contact_id, v_user_id, 406780, 18, 73220, 480000, 'paid', '2025-01-10', '2025-02-10', 'Q1 Social Campaign'),
      ('INV-2506-LK2', v_lenskart_id, v_contact_id, v_user_id, 610169, 18, 109831, 720000, 'paid', '2025-06-01', '2025-07-01', 'Brand Refresh'),
      ('INV-2602-LK3', v_lenskart_id, v_contact_id, v_user_id, 296610, 18, 53390, 350000, 'sent', '2026-05-15', '2026-06-15', 'Influencer Outreach Retainer');
  END IF;

  -- ═══ Razorpay ═══
  IF v_razorpay_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('B2B Lead Gen Campaign', v_razorpay_id, v_contact_id, v_user_id, 3200000, 100, '2025-09-01', 'won', 'Enterprise merchant acquisition'),
      ('Content Marketing Suite', v_razorpay_id, v_contact_id, v_user_id, 1500000, 80, '2026-07-15', 'open', 'Blog + whitepaper content engine'),
      ('Merchant Onboarding Funnels', v_razorpay_id, v_contact_id, v_user_id, 900000, 100, '2026-01-10', 'won', 'Automated onboarding funnels');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2509-RP1', v_razorpay_id, v_contact_id, v_user_id, 2711864, 18, 488136, 3200000, 'paid', '2025-09-05', '2025-10-05', 'B2B Lead Gen'),
      ('INV-2601-RP2', v_razorpay_id, v_contact_id, v_user_id, 762712, 18, 137288, 900000, 'paid', '2026-01-15', '2026-02-15', 'Merchant Onboarding'),
      ('INV-2606-RP3', v_razorpay_id, v_contact_id, v_user_id, 1271186, 18, 228814, 1500000, 'sent', '2026-06-01', '2026-07-01', 'Content Marketing');
  END IF;

  -- ═══ Zomato ═══
  IF v_zomato_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Zomato Gold Launch Campaign', v_zomato_id, v_contact_id, v_user_id, 2400000, 100, '2025-05-01', 'won', 'Full rebranding for Zomato Gold'),
      ('Hyper-local Ad Strategy', v_zomato_id, v_contact_id, v_user_id, 1800000, 60, '2026-09-01', 'open', 'City-wise restaurant ads');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2505-ZM1', v_zomato_id, v_contact_id, v_user_id, 2033898, 18, 366102, 2400000, 'paid', '2025-05-05', '2025-06-05', 'Gold Launch Campaign'),
      ('INV-2605-ZM2', v_zomato_id, v_contact_id, v_user_id, 847458, 18, 152542, 1000000, 'draft', '2026-06-10', '2026-07-10', 'Hyper-local Ads Phase 1');
  END IF;

  -- ═══ IIT Hyderabad ═══
  IF v_iith_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Campus Placement Drive 2025', v_iith_id, v_contact_id, v_user_id, 1800000, 100, '2025-11-01', 'won', '500+ students placed'),
      ('Skill Development Workshop', v_iith_id, v_contact_id, v_user_id, 450000, 90, '2026-08-15', 'open', 'Technical upskilling workshops');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2511-IIT1', v_iith_id, v_contact_id, v_user_id, 1525424, 18, 274576, 1800000, 'paid', '2025-11-10', '2025-12-10', 'Placement Drive 2025');
  END IF;

  -- ═══ Sunburn Festival ═══
  IF v_sunburn_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Brand Activation - Sunburn Goa', v_sunburn_id, v_contact_id, v_user_id, 2800000, 100, '2025-12-15', 'won', 'On-ground activation + promo staff'),
      ('Festival Aftermovie Production', v_sunburn_id, v_contact_id, v_user_id, 600000, 70, '2026-10-01', 'open', 'Video production for aftermovie');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2512-SB1', v_sunburn_id, v_contact_id, v_user_id, 2372881, 18, 427119, 2800000, 'paid', '2025-12-20', '2026-01-20', 'Brand Activation Goa'),
      ('INV-2606-SB2', v_sunburn_id, v_contact_id, v_user_id, 254237, 18, 45763, 300000, 'sent', '2026-06-01', '2026-06-25', 'Aftermovie Advance');
  END IF;

  -- ═══ GreenEnergy Labs ═══
  IF v_greenergy_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Market Expansion Consulting', v_greenergy_id, v_contact_id, v_user_id, 1400000, 100, '2025-08-01', 'won', 'South India expansion strategy'),
      ('Investor Relations Package', v_greenergy_id, v_contact_id, v_user_id, 800000, 55, '2026-11-01', 'open', 'Pitch deck + investor outreach');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2508-GE1', v_greenergy_id, v_contact_id, v_user_id, 1186441, 18, 213559, 1400000, 'paid', '2025-08-10', '2025-09-10', 'Market Expansion');
  END IF;

  -- ═══ Freshworks ═══
  IF v_freshworks_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('ABM Campaign for Enterprise', v_freshworks_id, v_contact_id, v_user_id, 2200000, 100, '2026-02-01', 'won', 'Account-based marketing program'),
      ('Product Launch Content', v_freshworks_id, v_contact_id, v_user_id, 950000, 65, '2026-09-15', 'open', 'Launch content for new CX product');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2602-FW1', v_freshworks_id, v_contact_id, v_user_id, 1864407, 18, 335593, 2200000, 'paid', '2026-02-05', '2026-03-05', 'ABM Campaign');
  END IF;

  -- ═══ BITS Pilani ═══
  IF v_bits_id IS NOT NULL THEN
    INSERT INTO deals (title, company_id, contact_id, assigned_to, value, probability, expected_close_date, status, notes)
    VALUES
      ('Campus Ambassador Program', v_bits_id, v_contact_id, v_user_id, 650000, 100, '2025-07-01', 'won', '50 ambassadors across 3 campuses'),
      ('Annual Placement Support', v_bits_id, v_contact_id, v_user_id, 1200000, 85, '2026-12-01', 'open', 'Full-year placement support');
    INSERT INTO invoices (invoice_number, company_id, contact_id, created_by, subtotal, tax_rate, tax_amount, total, status, issue_date, due_date, notes)
    VALUES
      ('INV-2507-BP1', v_bits_id, v_contact_id, v_user_id, 550847, 18, 99153, 650000, 'paid', '2025-07-10', '2025-08-10', 'Campus Ambassador Program');
  END IF;

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
