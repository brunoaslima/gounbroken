-- Add score_type to movements
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS score_type TEXT NOT NULL DEFAULT 'weight'
    CHECK (score_type IN ('weight', 'time', 'rounds'));

-- Seed existing Girls and Heroes movements as time-based
UPDATE movements SET score_type = 'time'
  WHERE name IN (
    'Fran','Grace','Annie','Cindy','Karen','Isabel','Helen','Eva','Kelly','Amanda',
    'Murph','DT','Michael','JT','Diane','Randy','Ryan','Josh','Nate'
  );

-- Make weight_kg nullable (RX time scores have no weight)
ALTER TABLE scores ALTER COLUMN weight_kg DROP NOT NULL;

-- Add time scoring columns
ALTER TABLE scores ADD COLUMN IF NOT EXISTS time_seconds INT;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS rx         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS adaptation TEXT
  CHECK (char_length(adaptation) <= 200);
