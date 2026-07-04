-- Add category column to movements (backward-compat: default weightlifting)
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'weightlifting'
    CHECK (category IN ('weightlifting', 'gymnastics', 'monostructural', 'girls', 'heroes'));

-- Unbroken sets table
CREATE TABLE IF NOT EXISTS unbroken_sets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  movement_id  uuid        REFERENCES movements(id) ON DELETE CASCADE NOT NULL,
  reps         int         NOT NULL CHECK (reps BETWEEN 1 AND 1000),
  time_seconds int         NOT NULL CHECK (time_seconds BETWEEN 1 AND 7200),
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE unbroken_sets ENABLE ROW LEVEL SECURITY;

-- RLS: user owns the row AND the referenced movement belongs to the same user
CREATE POLICY "unbroken_sets: own data"
  ON unbroken_sets FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM movements m
      WHERE m.id = movement_id
        AND m.user_id = auth.uid()
    )
  );
