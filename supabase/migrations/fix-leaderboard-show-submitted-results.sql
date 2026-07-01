-- During live competitions results should appear on the leaderboard as soon as
-- they are submitted, not only after the head judge publishes them.
-- Change: relax the results filter from status='published' to any entered status.
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
BEGIN
  RETURN QUERY
  WITH
  division_sizes AS (
    SELECT ct.division_id, COUNT(*)::INT AS n_teams
    FROM competition_teams ct
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
    GROUP BY ct.division_id
  ),
  published_wods AS (
    SELECT id AS wod_id, name AS wod_name, score_order
    FROM competition_wods
    WHERE competition_id = p_competition_id AND status = 'published'
  ),
  wod_rankings AS (
    SELECT
      r.team_id,
      r.wod_id,
      r.raw_result,
      r.score_numeric,
      pw.wod_name,
      ct.division_id,
      RANK() OVER (
        PARTITION BY r.wod_id, ct.division_id
        ORDER BY
          CASE WHEN pw.score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
          CASE WHEN pw.score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
      )::INT AS wod_rank,
      pw.score_order
    FROM competition_results r
    JOIN published_wods pw ON pw.wod_id = r.wod_id
    JOIN competition_teams ct ON ct.id = r.team_id
    -- include submitted and reviewed results so the live leaderboard updates in real time
    WHERE r.status IN ('submitted', 'reviewed', 'published')
  ),
  wod_points AS (
    SELECT
      wr.team_id,
      wr.wod_id,
      wr.wod_name,
      wr.raw_result,
      wr.wod_rank,
      wr.division_id,
      (ds.n_teams - wr.wod_rank + 1)::INT AS points
    FROM wod_rankings wr
    JOIN division_sizes ds ON ds.division_id = wr.division_id
  ),
  team_totals AS (
    SELECT
      ct.id          AS team_id,
      ct.name        AS team_name,
      ct.box,
      ct.division_id,
      COALESCE(SUM(wp.points), 0)::INT AS total_points,
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
    RANK() OVER (PARTITION BY tt.division_id ORDER BY tt.total_points DESC)::INT AS overall_rank,
    COALESCE(tt.per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.division_id, tt.total_points DESC;
END;
$$;
