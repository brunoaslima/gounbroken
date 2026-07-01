CREATE OR REPLACE FUNCTION invite_judge_by_username(
  p_competition_id UUID,
  p_username       TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id    UUID;
  v_target_uid   UUID;
BEGIN
  IF NOT (is_competition_head_judge(p_competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Only the head judge or an admin can invite judges';
  END IF;

  SELECT user_id INTO v_target_uid
  FROM profiles
  WHERE lower(username) = lower(trim(p_username));

  IF EXISTS (
    SELECT 1 FROM competition_judge_invites
    WHERE competition_id = p_competition_id
      AND (
        (v_target_uid IS NOT NULL AND invited_user_id = v_target_uid)
        OR lower(invited_email) = lower(trim(p_username))
      )
      AND status IN ('pending','accepted')
  ) THEN
    RAISE EXCEPTION 'This user already has an active invite for this competition';
  END IF;

  INSERT INTO competition_judge_invites
    (competition_id, invited_user_id, invited_email, invited_by)
  VALUES
    (p_competition_id, v_target_uid, trim(p_username), auth.uid())
  RETURNING id INTO v_invite_id;

  INSERT INTO competition_audit_log (competition_id, changed_by, action, target_type, target_id)
  VALUES (p_competition_id, auth.uid(), 'judge_invited', 'judge_invite', v_invite_id);

  RETURN v_invite_id;
END;
$$;
