-- Ambassador Program Migration
-- Run this in Supabase SQL Editor

-- 1. Add payout payment details columns
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN ('bank', 'upi')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS ambassador_notes TEXT;

-- 2. Commission rate compute function
CREATE OR REPLACE FUNCTION compute_commission_rate(conversions INT)
RETURNS DECIMAL AS $$
BEGIN
  IF conversions >= 25 THEN RETURN 0.050;
  ELSIF conversions >= 15 THEN RETURN 0.042;
  ELSIF conversions >= 10 THEN RETURN 0.035;
  ELSIF conversions >= 6  THEN RETURN 0.028;
  ELSIF conversions >= 3  THEN RETURN 0.020;
  ELSE RETURN 0.014;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-update commission_rate on referral_codes when conversion count changes
CREATE OR REPLACE FUNCTION update_commission_rate()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_rate := compute_commission_rate(NEW.total_conversions);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_commission_rate ON referral_codes;
CREATE TRIGGER trg_update_commission_rate
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_rate();

-- 4. Increment referral clicks RPC (if not already present)
CREATE OR REPLACE FUNCTION increment_referral_clicks(code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_codes
  SET total_clicks = total_clicks + 1
  WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Update existing referral codes to correct starting commission rate
UPDATE referral_codes SET commission_rate = compute_commission_rate(total_conversions);

-- 6. Disable RLS on ambassador tables (for anon access in MVP)
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions DISABLE ROW LEVEL SECURITY;

-- 7. Seed referral code using an EXISTING profile
-- NOTE: profiles.id is linked to auth.users — we never insert a new profile here.
-- We just promote an existing profile to ambassador and give them a referral code.
DO $$
DECLARE
  v_ambassador_id UUID;
BEGIN
  -- First: check if any ambassador already exists
  SELECT id INTO v_ambassador_id FROM profiles WHERE role = 'ambassador' LIMIT 1;

  -- If no ambassador exists: take the first non-admin profile and promote them
  IF v_ambassador_id IS NULL THEN
    SELECT id INTO v_ambassador_id FROM profiles WHERE role != 'admin' LIMIT 1;
    IF v_ambassador_id IS NOT NULL THEN
      UPDATE profiles SET role = 'ambassador' WHERE id = v_ambassador_id;
    END IF;
  END IF;

  -- Create referral code for this profile if they don't have one
  IF v_ambassador_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM referral_codes WHERE ambassador_id = v_ambassador_id
  ) THEN
    INSERT INTO referral_codes (ambassador_id, code, link_slug, total_clicks, total_conversions, commission_rate, total_earned)
    VALUES (
      v_ambassador_id,
      'AMB-' || UPPER(SUBSTRING(v_ambassador_id::TEXT, 1, 8)),
      'AMB-' || UPPER(SUBSTRING(v_ambassador_id::TEXT, 1, 8)),
      0, 0, 0.014, 0
    );
  END IF;
END $$;
