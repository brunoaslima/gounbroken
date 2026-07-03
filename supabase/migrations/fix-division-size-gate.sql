-- Bug crítico (revisado por arquiteto + security antes da implementação,
-- ambos aprovaram): o tamanho exigido de um time nunca considerava o
-- formato real da divisão (individual=1, pair=2, team3=3, team4=4) — usava
-- só competitions.team_min_size/team_max_size, campos genéricos e legados
-- (a própria private-competitions-and-division-slots.sql já rotula isso
-- como legado). Resultado observado: um time team4 com 2/4 aceitos já
-- avançava pra pending_approval, e manage_team('approve') não tinha
-- NENHUMA trava de tamanho — só checava convite pendente. Achado do
-- security: approve é a ÚNICA barreira real (leaderboard confia cegamente
-- em status='approved'), então a trava ali precisa ser bloqueante de
-- verdade, não best-effort.
--
-- Auditoria (SELECT, antes desta migration): times "aprovados incompletos"
-- hoje são quase todos dado de seed inserido direto via SQL nas migrations
-- de teste (bypassa create_competition_team, nunca ganharam linha de
-- membro) — não é fraude real, é artefato de demo. Não corrigido
-- retroativamente aqui. O único caso real (time "test", team4, 2/4) ainda
-- está em pending_approval, nunca foi aprovado — nada a reverter.
--
-- Bug irmão encontrado no mesmo escopo: invite_team_member também usava
-- team_max_size genérico para limitar convites, não o máximo real da
-- divisão — corrigido junto.

-- ── Helper reutilizável nas 3 RPCs ────────────────────────────────────────
CREATE OR REPLACE FUNCTION division_required_size(p_division_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE format
    WHEN 'individual' THEN 1
    WHEN 'pair'        THEN 2
    WHEN 'team3'       THEN 3
    WHEN 'team4'       THEN 4
  END
  FROM competition_divisions WHERE id = p_division_id;
$$;

-- ── invite_team_member: limite de convite usa o máximo real da divisão ───
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

  v_max_size := division_required_size(v_team.division_id);
  IF v_max_size IS NULL THEN
    SELECT team_max_size INTO v_max_size FROM competitions WHERE id = v_team.competition_id;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM competition_team_members
  WHERE team_id = p_team_id
    AND status NOT IN ('removed', 'rejected');

  IF v_member_count >= v_max_size THEN
    RAISE EXCEPTION 'Team is already at maximum size (% members)', v_max_size;
  END IF;

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

-- ── respond_team_invite: auto-advance usa tamanho real + lock contra race ─
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
  v_required       INT;
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

  -- FOR UPDATE serializa aceites concorrentes do mesmo time — sem isso,
  -- dois membros aceitando ao mesmo tempo podiam ambos ler a contagem
  -- abaixo do threshold e nenhum disparar o avanço (fail-closed, não
  -- fail-open — mas ainda um bug real de UX)
  SELECT * INTO v_team FROM competition_teams WHERE id = v_member.team_id FOR UPDATE;
  SELECT * INTO v_comp FROM competitions WHERE id = v_team.competition_id;

  SELECT COUNT(*) INTO v_accepted
  FROM competition_team_members
  WHERE team_id = v_member.team_id
    AND status = 'accepted';

  v_required := division_required_size(v_team.division_id);
  IF v_required IS NULL THEN
    v_required := v_comp.team_min_size;
  END IF;

  IF v_accepted >= v_required AND v_team.status = 'pending_members' THEN
    UPDATE competition_teams
    SET status = 'pending_approval',
        updated_at = now()
    WHERE id = v_member.team_id;
  END IF;
END;
$$;

-- ── manage_team: approve passa a bloquear time incompleto de verdade ─────
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
  v_comp          competitions%ROWTYPE;
  v_audit_action  TEXT;
  v_pending_count INT;
  v_max_teams     INT;
  v_taken         INT;
  v_accepted      INT;
  v_required      INT;
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

      -- Trava real de tamanho: aprovação bloqueada se o time não bate o
      -- tamanho exigido pelo formato da divisão. Esta é a única barreira
      -- de integridade (leaderboard confia em status='approved' sem
      -- revalidar tamanho), então precisa ser bloqueante.
      SELECT COUNT(*) INTO v_accepted
      FROM competition_team_members
      WHERE team_id = p_team_id AND status = 'accepted';

      v_required := division_required_size(v_team.division_id);
      IF v_required IS NULL THEN
        SELECT team_min_size INTO v_required FROM competitions WHERE id = v_team.competition_id;
      END IF;

      IF v_accepted < v_required THEN
        RAISE EXCEPTION 'Equipe tem apenas %/% atletas confirmados. Não é possível aprovar antes do time completo.', v_accepted, v_required;
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
