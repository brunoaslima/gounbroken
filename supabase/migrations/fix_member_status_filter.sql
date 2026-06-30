-- Corrige get_team_members: exclui removed/rejected além de ghost members
CREATE OR REPLACE FUNCTION get_team_members(p_team_id UUID)
RETURNS SETOF competition_team_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team competition_teams%ROWTYPE;
BEGIN
  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;
  IF v_team.id IS NULL THEN RAISE EXCEPTION 'Team not found'; END IF;

  IF v_team.captain_user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM competition_team_members
      WHERE team_id = p_team_id AND user_id = auth.uid()
        AND status NOT IN ('removed','rejected')
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
    AND status NOT IN ('removed', 'rejected')
    AND NOT (user_id IS NULL AND (invited_email IS NULL OR trim(invited_email) = ''))
  ORDER BY created_at;
END;
$$;

-- Corrige get_competition_team_members: exclui removed/rejected também
CREATE OR REPLACE FUNCTION get_competition_team_members(p_competition_id UUID)
RETURNS SETOF competition_team_members LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ctm.*
  FROM competition_team_members ctm
  JOIN competition_teams ct ON ct.id = ctm.team_id
  WHERE ct.competition_id = p_competition_id
    AND ctm.status NOT IN ('removed', 'rejected')
    AND (ctm.user_id IS NOT NULL OR (ctm.invited_email IS NOT NULL AND ctm.invited_email <> ''));
$$;
