-- ======================================================
-- 🩹 FIX EXISTING DATA: RANDOMIZE VENTURES
-- This script patches your existing companies, leads, and tasks
-- to have correctly distributed cross-venture badges!
-- ======================================================

-- 1. Randomize ventures for Companies (stored in notes JSON)
UPDATE companies 
SET notes = jsonb_build_object('venture', (ARRAY['saasum', 'maceco', 'skill_tank', 'promtal', 'tobofu', 'vriddhi'])[floor(random() * 6 + 1)])::text
WHERE notes IS NULL OR notes = '{}' OR notes = '{"venture": "saasum"}';

-- 2. Randomize ventures for Leads (stored in venture column and custom_fields JSON)
UPDATE leads 
SET 
  venture = (ARRAY['saasum', 'maceco', 'skill_tank', 'promtal', 'tobofu', 'vriddhi'])[floor(random() * 6 + 1)]
WHERE venture = 'skill_tank';

-- Sync the custom_fields JSON to match the newly randomized venture column
UPDATE leads 
SET custom_fields = jsonb_build_object('venture', venture)
WHERE custom_fields IS NULL OR custom_fields = '{}' OR custom_fields->>'venture' = 'skill_tank';

-- 3. Sync Tasks to match their parent Lead's venture
UPDATE tasks t
SET venture = l.venture
FROM leads l
WHERE t.lead_id = l.id AND t.venture = 'core';

-- 4. For any tasks without a lead, randomize them too
UPDATE tasks
SET venture = (ARRAY['saasum', 'maceco', 'skill_tank', 'promtal', 'tobofu', 'vriddhi'])[floor(random() * 6 + 1)]
WHERE venture = 'core';
