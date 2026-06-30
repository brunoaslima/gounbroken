-- Clamp unbounded parameters to prevent expensive full-table scans

DROP FUNCTION IF EXISTS get_athlete_recent_feedback(UUID, INT);
DROP FUNCTION IF EXISTS admin_get_ai_usage_recent(INT);

CREATE OR REPLACE FUNCTION get_athlete_recent_feedback(
  p_athlete_id UUID,
  p_days       INT DEFAULT 14
)
RETURNS TABLE (
  workout_date          DATE,
  focus                 TEXT[],
  status                TEXT,
  enjoyment             TEXT,
  perceived_difficulty  TEXT,
  student_comment       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  p_days := LEAST(p_days, 365);

  RETURN QUERY
  SELECT
    pw.workout_date,
    pw.focus,
    pw.status,
    wf.enjoyment,
    wf.perceived_difficulty,
    wf.student_comment
  FROM prescribed_workouts pw
  LEFT JOIN workout_feedback wf ON wf.prescribed_workout_id = pw.id
  WHERE pw.athlete_id = p_athlete_id
    AND pw.workout_date >= CURRENT_DATE - p_days
  ORDER BY pw.workout_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_ai_usage_recent(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id            UUID,
  function_name TEXT,
  triggered_by  UUID,
  tokens_used   INT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  p_limit := LEAST(p_limit, 500);

  RETURN QUERY
  SELECT
    al.id,
    al.function_name,
    al.triggered_by,
    al.tokens_used,
    al.created_at
  FROM ai_usage_log al
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;
