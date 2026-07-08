ALTER TABLE profiles ADD COLUMN IF NOT EXISTS competition_level TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_competition_level_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_competition_level_check
  CHECK (competition_level IS NULL OR competition_level IN ('never', 'occasionally', 'regularly', 'competitive'));
