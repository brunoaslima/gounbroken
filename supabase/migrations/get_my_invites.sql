-- Retorna todos os convites (judge + equipe) do usuário logado, ordenados por data.
-- SECURITY DEFINER para bypasassar RLS circular de competition_team_members/competition_teams.
CREATE OR REPLACE FUNCTION get_my_invites()
RETURNS TABLE (
  invite_type        TEXT,
  id                 UUID,
  competition_id     UUID,
  competition_name   TEXT,
  competition_date   DATE,
  invited_by_user_id UUID,
  status             TEXT,
  assigned_wod_ids   UUID[],
  team_id            UUID,
  team_name          TEXT,
  created_at         TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    'judge'::TEXT,
    cji.id,
    cji.competition_id,
    c.name,
    c.start_date,
    cji.invited_by::UUID,
    cji.status::TEXT,
    cr.assigned_wod_ids,
    NULL::UUID,
    NULL::TEXT,
    cji.created_at
  FROM competition_judge_invites cji
  JOIN competitions c ON c.id = cji.competition_id
  LEFT JOIN competition_roles cr ON cr.competition_id = cji.competition_id AND cr.user_id = auth.uid()
  WHERE cji.invited_user_id = auth.uid()

  UNION ALL

  SELECT
    'team'::TEXT,
    ctm.id,
    ct.competition_id,
    c.name,
    c.start_date,
    ctm.invited_by::UUID,
    ctm.status::TEXT,
    NULL::UUID[],
    ct.id,
    ct.name,
    ctm.created_at
  FROM competition_team_members ctm
  JOIN competition_teams ct ON ct.id = ctm.team_id
  JOIN competitions c ON c.id = ct.competition_id
  WHERE ctm.user_id = auth.uid()
    AND ctm.team_role = 'athlete'

  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_invites() TO authenticated;
