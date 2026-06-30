-- 1. Remove membros fantasma criados por convites com user_id=NULL e sem email.
--    Esses ficaram presos no banco de convites quebrados anteriores e bloqueavam o limite.
DELETE FROM competition_team_members
WHERE user_id IS NULL
  AND (invited_email IS NULL OR trim(invited_email) = '')
  AND status = 'invited';

-- 2. Recria invite_team_member com validações corretas:
--    - Rejeita quando nem user_id nem email foram fornecidos
--    - Conta apenas membros não-removed/rejected para o limite
--    - Impede double-invite do mesmo usuário
CREATE OR REPLACE FUNCTION invite_team_member(
  p_team_id       UUID,
  p_user_id       UUID    DEFAULT NULL,
  p_invited_email TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id    UUID;
  v_team         competition_teams%ROWTYPE;
  v_member_count INT;
  v_max_size     INT;
BEGIN
  IF p_user_id IS NULL AND (p_invited_email IS NULL OR trim(p_invited_email) = '') THEN
    RAISE EXCEPTION 'Must provide either user_id or invited_email';
  END IF;

  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_team.captain_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the captain can invite members';
  END IF;

  SELECT team_max_size INTO v_max_size
  FROM competitions WHERE id = v_team.competition_id;

  -- Conta membros ativos (exclui rejected e removed)
  SELECT COUNT(*) INTO v_member_count
  FROM competition_team_members
  WHERE team_id = p_team_id
    AND status NOT IN ('removed', 'rejected');

  IF v_member_count >= v_max_size THEN
    RAISE EXCEPTION 'Team is already at maximum size (% members)', v_max_size;
  END IF;

  -- Impede double-invite do mesmo usuário
  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM competition_team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status NOT IN ('removed', 'rejected')
  ) THEN
    RAISE EXCEPTION 'This athlete is already in the team or has a pending invite';
  END IF;

  INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_email, invited_by)
  VALUES (p_team_id, p_user_id, 'athlete', 'invited', p_invited_email, auth.uid())
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION invite_team_member(UUID, UUID, TEXT) TO authenticated;
