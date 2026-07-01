-- Create competition_divisions table
-- Each division is a unique combination of format × composition × category per competition.

CREATE TABLE IF NOT EXISTS competition_divisions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  format          TEXT        NOT NULL CHECK (format IN ('individual', 'pair', 'team3', 'team4')),
  composition     TEXT        NOT NULL CHECK (composition IN ('male', 'female', 'mixed')),
  category        TEXT        NOT NULL CHECK (char_length(category) <= 50),
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_individual_mixed CHECK (NOT (format = 'individual' AND composition = 'mixed')),
  CONSTRAINT no_team3_mixed      CHECK (NOT (format = 'team3'      AND composition = 'mixed')),
  UNIQUE (competition_id, format, composition, category)
);

ALTER TABLE competition_divisions ENABLE ROW LEVEL SECURITY;

-- Anyone can read divisions (for leaderboard, registration page, etc.)
CREATE POLICY "divisions public read" ON competition_divisions
  FOR SELECT USING (true);

-- Only the competition organizer can create, update, or delete divisions
CREATE POLICY "divisions organizer write" ON competition_divisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_id
        AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_id
        AND c.created_by = auth.uid()
    )
  );
