-- ── Workout section notes ──────────────────────────────────────────────
-- Free-text note per section of the athlete's own workout (e.g. "felt heavy
-- today", "did 8 instead of 10 reps"), separate from the whole-workout
-- feedback in workout_feedback.
--
-- Keyed by (athlete_id, workout_date, section_position) instead of
-- workout_id/section_id: personal_save_workout deletes and recreates
-- prescribed_workouts + workout_sections on every edit (see
-- docs/BUG_PATTERNS.md #4), so those ids are NOT stable across edits.
-- personal_set_workout_student_note (workout_feedback.sql) already
-- establishes this same (athlete_id, workout_date) pattern for exactly
-- this reason.

CREATE TABLE IF NOT EXISTS workout_section_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id              UUID NOT NULL,
  workout_date            DATE NOT NULL,
  section_position        INT NOT NULL,
  section_label_snapshot  TEXT,
  note                    TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, workout_date, section_position)
);

ALTER TABLE workout_section_notes ENABLE ROW LEVEL SECURITY;

-- Athletes read and delete their own section notes (writes via save_section_note RPC)
DROP POLICY IF EXISTS "athletes_manage_own_section_notes" ON workout_section_notes;
CREATE POLICY "athletes_manage_own_section_notes" ON workout_section_notes
  FOR SELECT
  USING  (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "athletes_delete_own_section_notes" ON workout_section_notes;
CREATE POLICY "athletes_delete_own_section_notes" ON workout_section_notes
  FOR DELETE
  USING  (auth.uid() = athlete_id);

-- Coaches and admins can read their athletes' section notes (same read
-- policy shape as workout_feedback.trainers_read_athlete_feedback)
DROP POLICY IF EXISTS "trainers_read_athlete_section_notes" ON workout_section_notes;
CREATE POLICY "trainers_read_athlete_section_notes" ON workout_section_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athletes ta
      WHERE ta.athlete_id = workout_section_notes.athlete_id
        AND ta.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (p.roles @> ARRAY['admin'] OR p.roles @> ARRAY['personal'])
    )
  );

-- ── save_section_note: upsert, athlete only, section must exist ──────────
-- p_section_position must match a real section in the athlete's current
-- workout for that date — otherwise this would accept notes on positions
-- that don't correspond to anything, growing orphaned rows indefinitely.
CREATE OR REPLACE FUNCTION save_section_note(
  p_workout_date     DATE,
  p_section_position INT,
  p_section_label    TEXT,
  p_note             TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_safe_text(p_note) THEN
    RAISE EXCEPTION 'Invalid note content';
  END IF;
  IF length(p_note) > 300 THEN
    RAISE EXCEPTION 'Note too long (max 300 characters)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM workout_sections ws
    JOIN prescribed_workouts pw ON pw.id = ws.workout_id
    WHERE pw.athlete_id   = auth.uid()
      AND pw.workout_date = p_workout_date
      AND ws.position     = p_section_position
  ) THEN
    RAISE EXCEPTION 'Section not found for this workout';
  END IF;

  INSERT INTO workout_section_notes (
    athlete_id, workout_date, section_position, section_label_snapshot, note
  )
  VALUES (
    auth.uid(), p_workout_date, p_section_position, p_section_label, p_note
  )
  ON CONFLICT (athlete_id, workout_date, section_position) DO UPDATE SET
    section_label_snapshot = EXCLUDED.section_label_snapshot,
    note                   = EXCLUDED.note,
    updated_at             = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION save_section_note TO authenticated;
