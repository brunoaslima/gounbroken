-- ─── decline_judge_invite ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS decline_judge_invite(UUID) CASCADE;

CREATE OR REPLACE FUNCTION decline_judge_invite(p_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite competition_judge_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM competition_judge_invites WHERE id = p_invite_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite is no longer pending (status: %)', v_invite.status;
  END IF;

  UPDATE competition_judge_invites
  SET status = 'declined'
  WHERE id = p_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decline_judge_invite(UUID) TO authenticated;
