-- ── Security Hardening Migration ────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Fixes: C-3, A-1, A-2

-- ── C-3: Remove open INSERT policy on ai_usage_log ──────────────────────
-- Edge Functions use service_role which bypasses RLS entirely.
-- This policy was allowing any authenticated user to insert rows directly.
DROP POLICY IF EXISTS "service_insert_ai_usage" ON ai_usage_log;


-- ── A-1: Authorization guard for get_athlete_recent_feedback ────────────
-- Caller must be the athlete themselves, their assigned trainer,
-- or have admin/personal role.
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
SET search_path = public
AS $$
BEGIN
  -- Allow: the athlete themselves
  IF p_athlete_id = auth.uid() THEN
    NULL; -- permitted, fall through
  -- Allow: assigned trainer
  ELSIF EXISTS (
    SELECT 1 FROM trainer_athletes ta
    WHERE ta.athlete_id = p_athlete_id
      AND ta.trainer_id = auth.uid()
  ) THEN
    NULL; -- permitted, fall through
  -- Allow: admin or personal role
  ELSIF EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.user_id = auth.uid()
      AND (pr.roles @> ARRAY['admin'] OR pr.roles @> ARRAY['personal'])
  ) THEN
    NULL; -- permitted, fall through
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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


-- ── A-2: Ownership validation in save_workout_feedback ──────────────────
-- Verify the workout was actually prescribed to the calling user
-- before allowing feedback insertion, preventing IDOR.
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
SET search_path = public
AS $$
BEGIN
  -- Ensure the workout belongs to the caller
  IF NOT EXISTS (
    SELECT 1 FROM prescribed_workouts
    WHERE id = p_workout_id
      AND athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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
