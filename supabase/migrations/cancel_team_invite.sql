-- Permite ao capitão cancelar um convite pendente (status='invited').
-- Marca o membro como 'removed' para manter histórico.
-- Aplique no Supabase Dashboard → SQL Editor.

CREATE OR REPLACE FUNCTION cancel_team_invite(p_member_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member competition_team_members%ROWTYPE;
  v_team   competition_teams%ROWTYPE;
BEGIN
  SELECT * INTO v_member FROM competition_team_members WHERE id = p_member_id;
  IF v_member.id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  SELECT * INTO v_team FROM competition_teams WHERE id = v_member.team_id;
  IF v_team.id IS NULL THEN RAISE EXCEPTION 'Team not found'; END IF;

  IF v_team.captain_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the captain can cancel invites';
  END IF;

  IF v_member.status <> 'invited' THEN
    RAISE EXCEPTION 'Can only cancel pending invites';
  END IF;

  UPDATE competition_team_members SET status = 'removed' WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_team_invite(UUID) TO authenticated;
