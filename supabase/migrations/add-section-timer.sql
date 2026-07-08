-- Add per-section timer to workout_section_notes.
-- BUG_PATTERNS #9: DROP old signature before CREATE OR REPLACE to avoid overload ambiguity.

ALTER TABLE workout_section_notes
  ADD COLUMN IF NOT EXISTS duration_seconds INT;

DROP FUNCTION IF EXISTS save_section_note(DATE, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION save_section_note(
  p_workout_date      DATE,
  p_section_position  INT,
  p_section_label     TEXT,
  p_note              TEXT DEFAULT NULL,
  p_duration_seconds  INT  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_note IS NOT NULL THEN
    IF NOT is_safe_text(p_note) THEN
      RAISE EXCEPTION 'Invalid note content';
    END IF;
    IF length(p_note) > 300 THEN
      RAISE EXCEPTION 'Note too long (max 300 characters)';
    END IF;
  END IF;

  IF p_duration_seconds IS NOT NULL AND (p_duration_seconds < 0 OR p_duration_seconds > 86400) THEN
    RAISE EXCEPTION 'Invalid duration';
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
    athlete_id, workout_date, section_position, section_label_snapshot, note, duration_seconds
  )
  VALUES (
    auth.uid(), p_workout_date, p_section_position, p_section_label,
    COALESCE(p_note, ''), p_duration_seconds
  )
  ON CONFLICT (athlete_id, workout_date, section_position) DO UPDATE SET
    section_label_snapshot = EXCLUDED.section_label_snapshot,
    note                   = CASE WHEN p_note IS NOT NULL THEN EXCLUDED.note ELSE workout_section_notes.note END,
    duration_seconds       = CASE WHEN p_duration_seconds IS NOT NULL THEN EXCLUDED.duration_seconds ELSE workout_section_notes.duration_seconds END,
    updated_at             = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION save_section_note TO authenticated;
