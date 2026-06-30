-- Replace CF Games fixed points with dynamic N-down-to-1 scoring.
-- 1st place = N pts (N = total approved teams), last = 1 pt.
-- Fix: qualify CTE columns to avoid ambiguity with RETURNS TABLE output vars.
CREATE OR REPLACE FUNCTION get_competition_leaderboard(
  p_competition_id UUID
)
RETURNS TABLE (
  team_id       UUID,
  team_name     TEXT,
  box           TEXT,
  total_points  INT,
  overall_rank  INT,
  per_wod       JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num_teams INT;
BEGIN
  SELECT COUNT(*) INTO v_num_teams
  FROM competition_teams
  WHERE competition_id = p_competition_id
    AND status = 'approved';

  RETURN QUERY
  WITH published_wods AS (
    SELECT id AS wod_id, name AS wod_name, score_order
    FROM competition_wods
    WHERE competition_id = p_competition_id
      AND status = 'published'
  ),
  wod_rankings AS (
    SELECT
      r.team_id   AS r_team_id,
      r.wod_id    AS r_wod_id,
      r.raw_result,
      r.score_numeric,
      pw.wod_name,
      RANK() OVER (
        PARTITION BY r.wod_id
        ORDER BY
          CASE WHEN pw.score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
          CASE WHEN pw.score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
      )::INT AS wod_rank,
      pw.score_order
    FROM competition_results r
    JOIN published_wods pw ON pw.wod_id = r.wod_id
    WHERE r.status = 'published'
  ),
  wod_points AS (
    SELECT
      wr.r_team_id,
      wr.r_wod_id,
      wr.wod_name,
      wr.raw_result,
      wr.wod_rank,
      GREATEST(0, v_num_teams - wr.wod_rank + 1) AS points
    FROM wod_rankings wr
  ),
  team_totals AS (
    SELECT
      ct.id                              AS tt_team_id,
      ct.name                            AS tt_team_name,
      ct.box                             AS tt_box,
      COALESCE(SUM(wp.points), 0)::INT   AS tt_total_points,
      jsonb_object_agg(
        wp.r_wod_id::TEXT,
        jsonb_build_object(
          'wod_name',   wp.wod_name,
          'position',   wp.wod_rank,
          'points',     wp.points,
          'raw_result', wp.raw_result
        )
      ) FILTER (WHERE wp.r_wod_id IS NOT NULL) AS tt_per_wod
    FROM competition_teams ct
    LEFT JOIN wod_points wp ON wp.r_team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
    GROUP BY ct.id, ct.name, ct.box
  )
  SELECT
    tt.tt_team_id,
    tt.tt_team_name,
    tt.tt_box,
    tt.tt_total_points,
    RANK() OVER (ORDER BY tt.tt_total_points DESC)::INT AS overall_rank,
    COALESCE(tt.tt_per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.tt_total_points DESC;
END;
$$;
