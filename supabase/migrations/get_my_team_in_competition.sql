-- Retorna o time do usuário logado nesta competição (status accepted).
-- SECURITY DEFINER bypassa RLS circular entre competition_teams e competition_team_members.
CREATE OR REPLACE FUNCTION get_my_team_in_competition(p_competition_id UUID)
RETURNS SETOF competition_teams LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ct.*
  FROM competition_teams ct
  JOIN competition_team_members ctm ON ctm.team_id = ct.id
  WHERE ctm.user_id = auth.uid()
    AND ctm.status = 'accepted'
    AND ct.competition_id = p_competition_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_team_in_competition(UUID) TO authenticated;
