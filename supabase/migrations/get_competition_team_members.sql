-- Retorna todos os membros de todas as equipes de uma competição.
-- SECURITY DEFINER para o head judge conseguir ver sem ser membro das equipes.
CREATE OR REPLACE FUNCTION get_competition_team_members(p_competition_id UUID)
RETURNS SETOF competition_team_members LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ctm.*
  FROM competition_team_members ctm
  JOIN competition_teams ct ON ct.id = ctm.team_id
  WHERE ct.competition_id = p_competition_id
    AND (ctm.user_id IS NOT NULL OR (ctm.invited_email IS NOT NULL AND ctm.invited_email <> ''));
$$;

GRANT EXECUTE ON FUNCTION get_competition_team_members(UUID) TO authenticated;
