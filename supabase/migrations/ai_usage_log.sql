-- ── AI Usage Log Migration ──────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create ai_usage_log table
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name  TEXT NOT NULL,           -- 'suggest-workout' | 'generate-workout'
  triggered_by   UUID,                    -- user_id de quem disparou
  athlete_id     UUID,                    -- aluno alvo (suggest-workout)
  model          TEXT NOT NULL,
  input_tokens   INT NOT NULL DEFAULT 0,
  output_tokens  INT NOT NULL DEFAULT 0,
  cost_usd       NUMERIC(10, 8) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read
DROP POLICY IF EXISTS "admins_read_ai_usage" ON ai_usage_log;
CREATE POLICY "admins_read_ai_usage" ON ai_usage_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.roles @> ARRAY['admin']
    )
  );

-- Edge Functions use service_role which bypasses RLS — no INSERT policy needed

-- 2. RPC: admin_get_ai_usage_stats
CREATE OR REPLACE FUNCTION admin_get_ai_usage_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.roles @> ARRAY['admin']
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    -- All-time totals
    'total_calls',        COUNT(*),
    'total_cost_usd',     COALESCE(SUM(cost_usd), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens',COALESCE(SUM(output_tokens), 0),

    -- This month
    'month_calls',        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
    'month_cost_usd',     COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0),

    -- This week (Mon–Sun)
    'week_calls',         COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW())),
    'week_cost_usd',      COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0),

    -- Today
    'today_calls',        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())),
    'today_cost_usd',     COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0),

    -- By function
    'suggest_calls',      COUNT(*) FILTER (WHERE function_name = 'suggest-workout'),
    'suggest_cost_usd',   COALESCE(SUM(cost_usd) FILTER (WHERE function_name = 'suggest-workout'), 0),
    'generate_calls',     COUNT(*) FILTER (WHERE function_name = 'generate-workout'),
    'generate_cost_usd',  COALESCE(SUM(cost_usd) FILTER (WHERE function_name = 'generate-workout'), 0),

    -- Averages
    'avg_cost_usd',       COALESCE(AVG(cost_usd), 0),
    'avg_input_tokens',   COALESCE(AVG(input_tokens), 0),
    'avg_output_tokens',  COALESCE(AVG(output_tokens), 0)
  ) INTO result
  FROM ai_usage_log;

  RETURN result;
END;
$$;

-- 3. RPC: admin_get_ai_usage_recent (últimas 50 chamadas com nome do usuário)
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

-- 4. RPC: admin_get_ai_usage_by_user (top usuários por custo)
CREATE OR REPLACE FUNCTION admin_get_ai_usage_by_user()
RETURNS TABLE (
  user_id    UUID,
  user_name  TEXT,
  calls      BIGINT,
  cost_usd   NUMERIC
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
  SELECT
    l.triggered_by                                                        AS user_id,
    COALESCE(p.name, p.username, l.triggered_by::TEXT)::TEXT             AS user_name,
    COUNT(*)                                                              AS calls,
    SUM(l.cost_usd)                                                       AS cost_usd
  FROM ai_usage_log l
  LEFT JOIN profiles p ON p.user_id = l.triggered_by
  GROUP BY l.triggered_by, p.name, p.username
  ORDER BY cost_usd DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_ai_usage_stats    TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_ai_usage_recent   TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_ai_usage_by_user  TO authenticated;
