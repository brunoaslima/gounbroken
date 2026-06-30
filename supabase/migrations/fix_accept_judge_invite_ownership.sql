-- Fix: when invited_user_id is NULL (invite by username), verify the caller matches
-- the invited_email before allowing them to accept the invite
CREATE OR REPLACE FUNCTION accept_judge_invite(
  p_invite_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite       competition_judge_invites%ROWTYPE;
  v_caller_email TEXT;
BEGIN
  SELECT * INTO v_invite FROM competition_judge_invites WHERE id = p_invite_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite is no longer pending (status: %)', v_invite.status;
  END IF;

  IF now() > v_invite.expires_at THEN
    UPDATE competition_judge_invites SET status = 'expired' WHERE id = p_invite_id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- If invite was targeted at a specific user_id, enforce exact match
  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  -- If invite was by username/email (invited_user_id is NULL), verify caller matches
  IF v_invite.invited_user_id IS NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

    IF v_invite.invited_email LIKE '@%' THEN
      -- Invited by username: check caller's profile username
      IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND lower(username) = lower(ltrim(v_invite.invited_email, '@'))
      ) THEN
        RAISE EXCEPTION 'Not your invite';
      END IF;
    ELSE
      -- Invited by email: check caller's auth email
      IF lower(v_caller_email) <> lower(v_invite.invited_email) THEN
        RAISE EXCEPTION 'Not your invite';
      END IF;
    END IF;
  END IF;

  UPDATE competition_judge_invites
  SET status          = 'accepted',
      accepted_at     = now(),
      invited_user_id = COALESCE(v_invite.invited_user_id, auth.uid())
  WHERE id = p_invite_id;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_invite.competition_id, auth.uid(), 'judge')
  ON CONFLICT (competition_id, user_id) DO NOTHING;
END;
$$;
