-- Add division_id to competition_teams
ALTER TABLE competition_teams
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES competition_divisions(id) ON DELETE SET NULL;
