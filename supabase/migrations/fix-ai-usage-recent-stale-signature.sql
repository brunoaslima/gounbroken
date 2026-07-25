-- admin_get_ai_usage_recent was live with a stale 5-column signature
-- (id, function_name, triggered_by, tokens_used, created_at) referencing
-- `tokens_used`, a column that no longer exists on ai_usage_log (it was
-- split into input_tokens/output_tokens). The correct 11-column definition
-- has been committed in ai_usage_log.sql since that split, but was never
-- actually applied to the database — discovered because the Admin "Recent
-- calls" panel was silently empty (RPC returning HTTP 400).
-- Return type changes, so the stale function must be dropped first.
DROP FUNCTION IF EXISTS admin_get_ai_usage_recent(INT);

CREATE OR REPLACE FUNCTION admin_get_ai_usage_recent(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id             UUID,
  function_name  TEXT,
  triggered_by   UUID,
  triggered_name TEXT,
  athlete_id     UUID,
  athlete_name   TEXT,
  model          TEXT,
  input_tokens   INT,
  output_tokens  INT,
  cost_usd       NUMERIC,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.roles @> ARRAY['admin']
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  p_limit := LEAST(p_limit, 500);

  RETURN QUERY
  SELECT
    l.id,
    l.function_name,
    l.triggered_by,
    COALESCE(p1.name, p1.username, l.triggered_by::TEXT)::TEXT AS triggered_name,
    l.athlete_id,
    COALESCE(p2.name, p2.username, l.athlete_id::TEXT)::TEXT   AS athlete_name,
    l.model,
    l.input_tokens,
    l.output_tokens,
    l.cost_usd,
    l.created_at
  FROM ai_usage_log l
  LEFT JOIN profiles p1 ON p1.user_id = l.triggered_by
  LEFT JOIN profiles p2 ON p2.user_id = l.athlete_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_ai_usage_recent TO authenticated;
