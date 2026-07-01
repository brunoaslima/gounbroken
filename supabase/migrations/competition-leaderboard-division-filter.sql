-- Extend get_competition_leaderboard with optional division filter.
-- When p_division_id is NULL, returns all approved teams (existing behavior).
-- When set, filters to teams in that division only; rank is relative to the division.

DROP FUNCTION IF EXISTS get_competition_leaderboard(UUID);
DROP FUNCTION IF EXISTS get_competition_leaderboard(UUID, UUID);

CREATE OR REPLACE FUNCTION get_competition_leaderboard(
  p_competition_id UUID,
  p_division_id    UUID DEFAULT NULL
)
RETURNS TABLE (
  team_id       UUID,
  team_name     TEXT,
  box           TEXT,
  division_id   UUID,
  total_points  INT,
  overall_rank  INT,
  per_wod       JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cf_points INT[] := ARRAY[
    100,95,92,89,86,83,80,78,76,74,72,70,68,66,64,62,60,58,56,54,
    52,50,48,46,44,42,40,38,36,34,32,30,28,26,24,22,20,18,16,14,
    12,10,8,6,4,2,1,0
  ];
BEGIN
  RETURN QUERY
  WITH published_wods AS (
    SELECT id AS wod_id, name AS wod_name, score_order
    FROM competition_wods
    WHERE competition_id = p_competition_id
      AND status = 'published'
  ),
  wod_rankings AS (
    SELECT
      r.team_id,
      r.wod_id,
      r.raw_result,
      r.score_numeric,
      pw.wod_name,
      RANK() OVER (
        PARTITION BY r.wod_id
        ORDER BY
          CASE WHEN pw.score_order = 'asc'  THEN  r.score_numeric END ASC  NULLS LAST,
          CASE WHEN pw.score_order = 'desc' THEN  r.score_numeric END DESC NULLS LAST
      )::INT AS wod_rank,
      pw.score_order
    FROM competition_results r
    JOIN published_wods pw ON pw.wod_id = r.wod_id
    WHERE r.status = 'published'
  ),
  wod_points AS (
    SELECT
      team_id,
      wod_id,
      wod_name,
      raw_result,
      wod_rank,
      COALESCE(v_cf_points[wod_rank], 0) AS points
    FROM wod_rankings
  ),
  team_totals AS (
    SELECT
      ct.id                              AS team_id,
      ct.name                            AS team_name,
      ct.box,
      ct.division_id,
      COALESCE(SUM(wp.points), 0)::INT   AS total_points,
      jsonb_object_agg(
        wp.wod_id::TEXT,
        jsonb_build_object(
          'wod_name',   wp.wod_name,
          'position',   wp.wod_rank,
          'points',     wp.points,
          'raw_result', wp.raw_result
        )
      ) FILTER (WHERE wp.wod_id IS NOT NULL) AS per_wod
    FROM competition_teams ct
    LEFT JOIN wod_points wp ON wp.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
      AND (p_division_id IS NULL OR ct.division_id = p_division_id)
    GROUP BY ct.id, ct.name, ct.box, ct.division_id
  )
  SELECT
    tt.team_id,
    tt.team_name,
    tt.box,
    tt.division_id,
    tt.total_points,
    RANK() OVER (ORDER BY tt.total_points DESC)::INT AS overall_rank,
    COALESCE(tt.per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.total_points DESC;
END;
$$;
