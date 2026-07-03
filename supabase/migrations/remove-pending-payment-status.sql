-- Remove 'pending_payment' de team_status. Pagamento vira responsabilidade
-- exclusiva de payment_status (coluna já independente). status volta a ser
-- só pending_members -> pending_approval -> approved (+ rejected/cancelled).
--
-- Motivação: status era um enum único tentando carregar duas dimensões
-- ortogonais (progresso de aprovação x progresso de pagamento) — um time
-- incompleto (2/4 atletas) que também tivesse pagamento pendente só
-- conseguia mostrar UM dos dois fatos por vez.
--
-- Revisado por arquiteto + security antes da implementação (ambos
-- aprovaram). Achado do security: manage_team('approve') nunca checou
-- payment_status — pending_payment nunca foi um gate técnico, só rótulo de
-- UI. Removê-lo não abre buraco novo.

-- ── 1. Migrar dados existentes (antes de trocar o CHECK) ─────────────────
-- Times em pending_payment já atingiram team_min_size (é o que os colocou
-- nesse estado); o próximo passo natural é pending_approval. payment_status
-- fica como está — já reflete o estado real de pagamento.
UPDATE competition_teams
SET status = 'pending_approval', updated_at = now()
WHERE status = 'pending_payment';

-- ── 2. Trocar o CHECK constraint ──────────────────────────────────────────
ALTER TABLE competition_teams DROP CONSTRAINT competition_teams_status_check;
ALTER TABLE competition_teams
  ADD CONSTRAINT competition_teams_status_check
  CHECK (status IN ('pending_members','pending_approval','approved','rejected','cancelled'));

-- ── 3. Audit action dedicada pra "pagamento solicitado" ───────────────────
-- Antes reusava 'team_approved' por comentário explícito no código; agora
-- que a action só mexe em payment_status, merece um valor próprio.
ALTER TABLE competition_audit_log DROP CONSTRAINT competition_audit_log_action_check;
ALTER TABLE competition_audit_log
  ADD CONSTRAINT competition_audit_log_action_check
  CHECK (action IN (
    'result_submit','result_update','result_override','wod_published',
    'team_approved','team_rejected','team_payment_confirmed','team_payment_requested',
    'team_checked_in','team_cancelled','judge_invited'
  ));

-- ── 4. respond_team_invite: auto-advance sempre pra pending_approval ──────
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
        SELECT gender INTO v_gender
        FROM profiles
        WHERE user_id = auth.uid();

        IF v_gender IS NULL OR v_gender NOT IN ('male', 'female') THEN
          RAISE EXCEPTION 'Invalid composition for this division';
        END IF;

        v_gender_cap := CASE v_div.format
          WHEN 'pair'  THEN 1
          WHEN 'team4' THEN 2
          ELSE NULL
        END;

        IF v_gender_cap IS NOT NULL THEN
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
    SET status = 'pending_approval',
        updated_at = now()
    WHERE id = v_member.team_id;
  END IF;
END;
$$;

-- ── 5. manage_team: request_payment só mexe em payment_status ────────────
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
  v_team          competition_teams%ROWTYPE;
  v_audit_action  TEXT;
  v_pending_count INT;
  v_max_teams     INT;
  v_taken         INT;
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

      IF v_team.division_id IS NOT NULL AND v_team.status IN ('rejected','cancelled') THEN
        SELECT max_teams INTO v_max_teams
        FROM competition_divisions
        WHERE id = v_team.division_id
        FOR UPDATE;

        IF v_max_teams IS NOT NULL THEN
          SELECT COUNT(*) INTO v_taken
          FROM competition_teams
          WHERE division_id = v_team.division_id
            AND status NOT IN ('rejected','cancelled');

          IF v_taken >= v_max_teams THEN
            RAISE EXCEPTION 'Division is full';
          END IF;
        END IF;
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
      -- Só sinaliza pagamento pendente; não mexe mais em status (aprovação
      -- e pagamento são eixos independentes agora)
      UPDATE competition_teams
      SET payment_status = 'pending',
          updated_at     = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_payment_requested';

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
