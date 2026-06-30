-- Returns the ranked results for a single published WOD.
-- SECURITY DEFINER bypasses competition_teams RLS so team names are always visible.
CREATE OR REPLACE FUNCTION get_wod_ranking(p_wod_id UUID)
RETURNS TABLE (
  wod_position    INT,
  v_team_name     TEXT,
  v_box           TEXT,
  v_raw_result    TEXT,
  v_score_numeric NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_order TEXT;
BEGIN
  SELECT score_order INTO v_score_order
  FROM competition_wods WHERE id = p_wod_id;

  RETURN QUERY
  SELECT
    RANK() OVER (
      ORDER BY
        CASE WHEN v_score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
        CASE WHEN v_score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
    )::INT,
    ct.name,
    ct.box,
    r.raw_result,
    r.score_numeric
  FROM competition_results r
  JOIN competition_teams ct ON ct.id = r.team_id
  WHERE r.wod_id = p_wod_id
    AND r.status = 'published'
  ORDER BY
    CASE WHEN v_score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
    CASE WHEN v_score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_wod_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wod_ranking(UUID) TO anon;
