-- Resolve bug de RLS circular entre competition_teams e competition_team_members.
-- Como SECURITY DEFINER, bypassa RLS e faz a autorização no corpo da função.
-- Substitui a query direta em load() e silentReloadMembers() no frontend.

CREATE OR REPLACE FUNCTION get_team_members(p_team_id UUID)
RETURNS SETOF competition_team_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team competition_teams%ROWTYPE;
BEGIN
  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Só pode ler: capitão, membro da equipe, ou quem tem role na competição
  IF v_team.captain_user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM competition_team_members
      WHERE team_id = p_team_id AND user_id = auth.uid() AND status NOT IN ('removed','rejected')
    )
    AND NOT EXISTS (
      SELECT 1 FROM competition_roles cr
      JOIN competition_teams ct ON ct.competition_id = cr.competition_id
      WHERE ct.id = p_team_id AND cr.user_id = auth.uid()
    )
    AND NOT is_global_admin()
  THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT * FROM competition_team_members
  WHERE team_id = p_team_id
  ORDER BY created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_members(UUID) TO authenticated;
