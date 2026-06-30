-- ─────────────────────────────────────────────────────────────────────
-- Onboarding v2 — schema updates
-- 1. Allow gender = 'prefer_not_to_say'
-- 2. Add training_types[] for multi-select modalities
-- 3. Loosen main_goals constraint (now used as multi-select)
-- ─────────────────────────────────────────────────────────────────────

-- 1. Update gender constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check
  CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- 2. New column for training modalities (multi-select)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_types text[];

-- 3. main_goals is already text[] — no CHECK on array elements.
--    Accepted values going forward (validated client-side):
--    'strength', 'conditioning', 'crossfit_performance', 'fat_loss',
--    'muscle_gain', 'technique', 'return_to_routine', 'competition'
