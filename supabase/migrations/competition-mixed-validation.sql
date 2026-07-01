-- Add Mixed division gender validation to respond_team_invite.
-- When a member accepts a Mixed division invite, the RPC verifies:
--   1. The athlete's gender is 'male' or 'female' (required for Mixed)
--   2. The team hasn't already reached the per-gender cap for the division format
-- Error messages are always generic to prevent gender-inference attacks.

CREATE OR REPLACE FUNCTION respond_team_invite(
  p_member_id UUID,
  p_accept    BOOL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member         competition_team_members%ROWTYPE;
  v_team           competition_teams%ROWTYPE;
  v_comp           competitions%ROWTYPE;
  v_div            competition_divisions%ROWTYPE;
  v_accepted       INT;
  v_min_size       INT;
  v_caller_email   TEXT;
  v_gender         TEXT;
  v_gender_count   INT;
  v_gender_cap     INT;
BEGIN
  SELECT * INTO v_member FROM competition_team_members WHERE id = p_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

  IF v_member.user_id IS NOT NULL AND v_member.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_member.user_id IS NULL
     AND (v_member.invited_email IS NULL OR v_member.invited_email <> v_caller_email) THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_member.status <> 'invited' THEN
    RAISE EXCEPTION 'Invite is no longer pending';
  END IF;

  -- Mixed division validation (only when accepting)
  IF p_accept THEN
    SELECT * INTO v_team FROM competition_teams WHERE id = v_member.team_id;

    IF v_team.division_id IS NOT NULL THEN
      SELECT * INTO v_div FROM competition_divisions WHERE id = v_team.division_id;

      IF v_div.composition = 'mixed' THEN
        -- Fetch accepting member's gender
        SELECT gender INTO v_gender
        FROM profiles
        WHERE user_id = auth.uid();

        -- Only 'male' and 'female' are valid for Mixed
        IF v_gender IS NULL OR v_gender NOT IN ('male', 'female') THEN
          RAISE EXCEPTION 'Invalid composition for this division';
        END IF;

        -- Determine per-gender cap based on format
        v_gender_cap := CASE v_div.format
          WHEN 'pair'  THEN 1
          WHEN 'team4' THEN 2
          ELSE NULL
        END;

        IF v_gender_cap IS NOT NULL THEN
          -- Count already-accepted members with the same gender
          SELECT COUNT(*) INTO v_gender_count
          FROM competition_team_members ctm
          JOIN profiles p ON p.user_id = ctm.user_id
          WHERE ctm.team_id = v_member.team_id
            AND ctm.status = 'accepted'
            AND p.gender = v_gender;

          IF v_gender_count >= v_gender_cap THEN
            RAISE EXCEPTION 'Invalid composition for this division';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  UPDATE competition_team_members
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      user_id = COALESCE(v_member.user_id, auth.uid())
  WHERE id = p_member_id;

  IF NOT p_accept THEN
    RETURN;
  END IF;

  SELECT * INTO v_team FROM competition_teams WHERE id = v_member.team_id;
  SELECT * INTO v_comp FROM competitions WHERE id = v_team.competition_id;

  SELECT COUNT(*) INTO v_accepted
  FROM competition_team_members
  WHERE team_id = v_member.team_id
    AND status = 'accepted';

  IF v_accepted >= v_comp.team_min_size AND v_team.status = 'pending_members' THEN
    UPDATE competition_teams
    SET status = CASE WHEN v_comp.status IN ('open') THEN 'pending_payment' ELSE 'pending_approval' END,
        updated_at = now()
    WHERE id = v_member.team_id;
  END IF;
END;
$$;
