-- admin_get_ai_usage_by_user: add per-function breakdown (flat rows: one per user×function)
-- Return type changes, so the old function must be dropped before recreating.
DROP FUNCTION IF EXISTS admin_get_ai_usage_by_user();

CREATE OR REPLACE FUNCTION admin_get_ai_usage_by_user()
RETURNS TABLE (
  user_id       UUID,
  user_name     TEXT,
  function_name TEXT,
  calls         BIGINT,
  cost_usd      NUMERIC
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

  RETURN QUERY
  WITH agg AS (
    SELECT
      l.triggered_by                                            AS user_id,
      COALESCE(p.name, p.username, l.triggered_by::TEXT)::TEXT  AS user_name,
      l.function_name,
      COUNT(*)                                                   AS calls,
      SUM(l.cost_usd)                                            AS cost_usd
    FROM ai_usage_log l
    LEFT JOIN profiles p ON p.user_id = l.triggered_by
    GROUP BY l.triggered_by, p.name, p.username, l.function_name
  )
  SELECT agg.user_id, agg.user_name, agg.function_name, agg.calls, agg.cost_usd
  FROM agg
  ORDER BY SUM(agg.cost_usd) OVER (PARTITION BY agg.user_id) DESC, agg.cost_usd DESC
  LIMIT 40;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_ai_usage_by_user TO authenticated;
