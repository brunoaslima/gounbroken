-- Bloqueia aprovação de equipe se algum membro ainda não aceitou o convite.
CREATE OR REPLACE FUNCTION manage_team(
  p_team_id UUID,
  p_action  TEXT,
  p_reason  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team       competition_teams%ROWTYPE;
  v_audit_action TEXT;
  v_pending_count INT;
BEGIN
  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF NOT (is_competition_head_judge(v_team.competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      SELECT COUNT(*) INTO v_pending_count
      FROM competition_team_members
      WHERE team_id = p_team_id AND status = 'invited';

      IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'Existem % membro(s) com convite pendente. Todos devem aceitar antes de aprovar a equipe.', v_pending_count;
      END IF;

      UPDATE competition_teams
      SET status      = 'approved',
          approved_at = now(),
          updated_at  = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_approved';

    WHEN 'reject' THEN
      UPDATE competition_teams
      SET status           = 'rejected',
          rejection_reason = p_reason,
          rejected_at      = now(),
          updated_at       = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_rejected';

    WHEN 'cancel' THEN
      UPDATE competition_teams
      SET status     = 'cancelled',
          updated_at = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_cancelled';

    WHEN 'request_payment' THEN
      UPDATE competition_teams
      SET status         = 'pending_payment',
          payment_status = 'pending',
          updated_at     = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_approved';

    WHEN 'confirm_payment' THEN
      UPDATE competition_teams
      SET payment_status = 'manually_confirmed',
          updated_at     = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_payment_confirmed';

    WHEN 'check_in' THEN
      UPDATE competition_teams
      SET checked_in = true,
          updated_at = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_checked_in';

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  INSERT INTO competition_audit_log
    (competition_id, changed_by, action, target_type, target_id, target_label, reason)
  VALUES
    (v_team.competition_id, auth.uid(), v_audit_action, 'team', p_team_id, v_team.name, p_reason);
END;
$$;
