-- ── Workout Feedback Migration ─────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add student_note to prescribed_workouts
ALTER TABLE prescribed_workouts
  ADD COLUMN IF NOT EXISTS student_note TEXT;

-- 2. Create workout_feedback table
CREATE TABLE IF NOT EXISTS workout_feedback (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id           UUID NOT NULL REFERENCES prescribed_workouts(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('completed', 'partially_completed', 'skipped')),
  enjoyment            TEXT CHECK (enjoyment IN ('liked', 'neutral', 'disliked')),
  perceived_difficulty TEXT CHECK (perceived_difficulty IN ('easy', 'appropriate', 'too_hard')),
  student_comment      TEXT,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workout_id, student_id)
);

ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;

-- Students can manage their own feedback
DROP POLICY IF EXISTS "students_manage_own_feedback" ON workout_feedback;
CREATE POLICY "students_manage_own_feedback" ON workout_feedback
  FOR ALL
  USING  (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Coaches and admins can read their athletes' feedback
DROP POLICY IF EXISTS "trainers_read_athlete_feedback" ON workout_feedback;
CREATE POLICY "trainers_read_athlete_feedback" ON workout_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_athletes ta
      WHERE ta.athlete_id = student_id
        AND ta.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (p.roles @> ARRAY['admin'] OR p.roles @> ARRAY['personal'])
    )
  );

-- 3. RPC: save_workout_feedback (upsert — student calls this)
CREATE OR REPLACE FUNCTION save_workout_feedback(
  p_workout_id           UUID,
  p_status               TEXT,
  p_enjoyment            TEXT DEFAULT NULL,
  p_perceived_difficulty TEXT DEFAULT NULL,
  p_student_comment      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO workout_feedback (
    workout_id, student_id, status, enjoyment,
    perceived_difficulty, student_comment, completed_at
  )
  VALUES (
    p_workout_id,
    auth.uid(),
    p_status,
    p_enjoyment,
    p_perceived_difficulty,
    p_student_comment,
    CASE WHEN p_status IN ('completed', 'partially_completed') THEN NOW() ELSE NULL END
  )
  ON CONFLICT (workout_id, student_id) DO UPDATE SET
    status               = EXCLUDED.status,
    enjoyment            = EXCLUDED.enjoyment,
    perceived_difficulty = EXCLUDED.perceived_difficulty,
    student_comment      = EXCLUDED.student_comment,
    completed_at         = CASE
                             WHEN EXCLUDED.status IN ('completed', 'partially_completed')
                             THEN COALESCE(workout_feedback.completed_at, NOW())
                             ELSE NULL
                           END,
    updated_at           = NOW();
END;
$$;

-- 4. RPC: get_athlete_recent_feedback (coach/edge function calls this)
CREATE OR REPLACE FUNCTION get_athlete_recent_feedback(
  p_athlete_id UUID,
  p_days       INT DEFAULT 14
)
RETURNS TABLE (
  workout_date         DATE,
  focus                TEXT[],
  status               TEXT,
  enjoyment            TEXT,
  perceived_difficulty TEXT,
  student_comment      TEXT,
  completed_at         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pw.workout_date::DATE,
    pw.focus,
    wf.status,
    wf.enjoyment,
    wf.perceived_difficulty,
    wf.student_comment,
    wf.completed_at
  FROM prescribed_workouts pw
  JOIN workout_feedback wf ON wf.workout_id = pw.id
  WHERE wf.student_id = p_athlete_id
    AND pw.workout_date >= CURRENT_DATE - p_days
  ORDER BY pw.workout_date DESC;
END;
$$;

-- 5. RPC: personal_set_workout_student_note (coach sets student_note by date)
CREATE OR REPLACE FUNCTION personal_set_workout_student_note(
  p_athlete_id   UUID,
  p_workout_date DATE,
  p_student_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE prescribed_workouts
  SET student_note = p_student_note
  WHERE athlete_id   = p_athlete_id
    AND workout_date = p_workout_date
    AND (
      trainer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles pr
        WHERE pr.user_id = auth.uid()
          AND (pr.roles @> ARRAY['admin'] OR pr.roles @> ARRAY['personal'])
      )
    );
END;
$$;

-- 6. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION save_workout_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_athlete_recent_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION personal_set_workout_student_note TO authenticated;
