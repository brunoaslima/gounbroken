-- Change leaderboard scoring from fixed CF Games array to dynamic formula:
-- points = N − position + 1  (where N = teams with published results in that WOD)
-- Example: 15 teams → 1st=15pts, 2nd=14pts, ..., 15th=1pt.
-- Ties use RANK() gaps (standard CrossFit rule).
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
      team_id,
      wod_id,
      wod_name,
      raw_result,
      wod_rank,
      -- Dynamic: N teams in this WOD → 1st gets N pts, last gets 1 pt
      (COUNT(*) OVER (PARTITION BY wod_id) - wod_rank + 1)::INT AS points
    FROM wod_rankings
  ),
  team_totals AS (
    SELECT
      ct.id                              AS team_id,
      ct.name                            AS team_name,
      ct.box,
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
    GROUP BY ct.id, ct.name, ct.box
  )
  SELECT
    tt.team_id,
    tt.team_name,
    tt.box,
    tt.total_points,
    RANK() OVER (ORDER BY tt.total_points DESC)::INT AS overall_rank,
    COALESCE(tt.per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.total_points DESC;
END;
$$;
