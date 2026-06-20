-- ======================================================
-- DROP OLD POLICIES FIRST (in case any were partially created)
-- ======================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','companies','contacts','pipeline_stages','referral_codes',
    'leads','stage_history','deals','activities','tasks','task_reminders',
    'invoices','invoice_items','referral_clicks','referral_conversions','payouts'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_authenticated_%s" ON %I;', tbl, tbl);
  END LOOP;
END $$;

-- ======================================================
-- CREATE CORRECT POLICIES (auth.uid() not auth.uid)
-- ======================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','companies','contacts','pipeline_stages','referral_codes',
    'leads','stage_history','deals','activities','tasks','task_reminders',
    'invoices','invoice_items','referral_clicks','referral_conversions','payouts'
  ] LOOP
    EXECUTE format('CREATE POLICY "allow_all_authenticated_%s"
                   ON %I
                   FOR ALL
                   USING (true)
                   WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
