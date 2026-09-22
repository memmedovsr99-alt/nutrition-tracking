-- ============================================================
-- Multi-profile setup: Samir + Mina
-- Run ONCE in Supabase → SQL Editor → New query → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Add `profile` to every table. Existing rows become 'samir'.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'nutrition_log','food_items','weight_log','targets',
    'inbody_scans','hydration_log','daily_checkin'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS profile text NOT NULL DEFAULT ''samir''', t
    );
  END LOOP;
END $$;

-- 2. Date-keyed tables: primary key becomes (date, profile)
--    so both people can have a row for the same day.
DO $$
DECLARE
  t text;
  pk text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'nutrition_log','weight_log','inbody_scans','hydration_log','daily_checkin'
  ] LOOP
    SELECT conname INTO pk
      FROM pg_constraint
     WHERE conrelid = t::regclass AND contype = 'p';

    IF pk IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, pk);
    END IF;

    EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (date, profile)', t);
  END LOOP;
END $$;

-- 3. targets: one row per profile (keeps id as PK, adds a unique key
--    on profile so upserts with on_conflict=profile work).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'targets'::regclass AND conname = 'targets_profile_key'
  ) THEN
    ALTER TABLE targets ADD CONSTRAINT targets_profile_key UNIQUE (profile);
  END IF;
END $$;

-- 4. Seed Mina's targets (edit the numbers any time from the app).
INSERT INTO targets (id, profile, calories, protein, carbs, fat)
SELECT COALESCE(MAX(id), 0) + 1, 'mina', 1600, 110, 150, 50 FROM targets
ON CONFLICT (profile) DO NOTHING;

-- 5. Indexes so per-profile queries stay fast.
CREATE INDEX IF NOT EXISTS food_items_profile_date_idx    ON food_items    (profile, date);
CREATE INDEX IF NOT EXISTS nutrition_log_profile_date_idx ON nutrition_log (profile, date);
CREATE INDEX IF NOT EXISTS weight_log_profile_date_idx    ON weight_log    (profile, date);

-- Done. Existing data is untouched and belongs to 'samir'.
