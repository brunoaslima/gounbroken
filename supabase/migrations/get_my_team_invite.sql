-- Retorna o convite de equipe pendente do usuário logado nesta competição.
-- SECURITY DEFINER bypassa RLS de competition_teams e competition_team_members.
CREATE OR REPLACE FUNCTION get_my_team_invite(p_competition_id UUID)
RETURNS TABLE (id UUID, team_id UUID, team_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ctm.id,
    ctm.team_id,
    ct.name AS team_name
  FROM competition_team_members ctm
  JOIN competition_teams ct ON ct.id = ctm.team_id
  WHERE ctm.user_id = auth.uid()
    AND ctm.status = 'invited'
    AND ct.competition_id = p_competition_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_team_invite(UUID) TO authenticated;
