-- RPC to fetch all competition results for a given competition.
-- SECURITY DEFINER bypasses RLS; caller must be a judge, head_judge, or global admin.
-- Mirrors the pattern used by get_competition_team_members.
CREATE OR REPLACE FUNCTION get_competition_results(p_competition_id UUID)
RETURNS SETOF competition_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM competition_roles
      WHERE competition_id = p_competition_id AND user_id = auth.uid()
    ) OR is_global_admin()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT * FROM competition_results
  WHERE competition_id = p_competition_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_competition_results(UUID) TO authenticated;
