ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experience_level text CHECK (experience_level IN ('beginner','intermediate','advanced','athlete')),
  ADD COLUMN IF NOT EXISTS training_frequency int CHECK (training_frequency BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS main_goal text CHECK (main_goal IN ('strength','hypertrophy','crossfit','fat_loss','health','performance')),
  ADD COLUMN IF NOT EXISTS body_fat_pct numeric(4,1) CHECK (body_fat_pct BETWEEN 3 AND 60);
