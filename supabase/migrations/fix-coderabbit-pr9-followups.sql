-- Follow-ups do review do CodeRabbit no PR #9. Três achados reais em
-- private-competitions-and-division-slots.sql que ficaram desatualizados
-- porque outras migrations os corrigiram DEPOIS dele cronologicamente — o
-- banco já está certo, mas o arquivo fica inconsistente se replayed
-- isoladamente ou fora de ordem. Esta migration consolida a versão final.

-- ── 1. gen_random_bytes qualificado (extensions.*, não public) ───────────
CREATE OR REPLACE FUNCTION create_competition(
  p_name                  TEXT,
  p_description           TEXT,
  p_venue                 TEXT,
  p_start_date            DATE,
  p_registration_deadline TIMESTAMPTZ,
  p_team_min_size         INT DEFAULT 1,
  p_team_max_size         INT DEFAULT 4,
  p_is_private            BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_slug  TEXT;
  v_code  TEXT;
  v_tries INT := 0;
BEGIN
  IF NOT is_global_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_team_min_size < 1 OR p_team_max_size < p_team_min_size THEN
    RAISE EXCEPTION 'invalid team size';
  END IF;

  LOOP
    v_tries := v_tries + 1;
    IF v_tries > 5 THEN
      RAISE EXCEPTION 'could not generate unique slug after 5 attempts';
    END IF;
    v_slug := substring(lower(encode(extensions.gen_random_bytes(4), 'hex')) FROM 1 FOR 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM competitions WHERE public_slug = v_slug);
  END LOOP;

  IF p_is_private THEN
    v_code := lower(encode(extensions.gen_random_bytes(16), 'hex'));
  END IF;

  INSERT INTO competitions
    (name, description, venue, start_date, registration_deadline,
     team_min_size, team_max_size, created_by, public_slug, is_private, invite_code)
  VALUES
    (trim(p_name),
     NULLIF(trim(p_description), ''),
     NULLIF(trim(p_venue), ''),
     p_start_date,
     p_registration_deadline,
     p_team_min_size,
     p_team_max_size,
     auth.uid(),
     v_slug,
     COALESCE(p_is_private, false),
     v_code)
  RETURNING id INTO v_id;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_id, auth.uid(), 'head_judge')
  ON CONFLICT (competition_id, user_id) DO UPDATE SET role = 'head_judge';

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_competition_privacy(
  p_competition_id UUID,
  p_is_private     BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp competitions%ROWTYPE;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;

  IF v_comp.id IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF NOT (v_comp.created_by = auth.uid() OR is_global_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_is_private AND v_comp.invite_code IS NULL THEN
    v_comp.invite_code := lower(encode(extensions.gen_random_bytes(16), 'hex'));
  END IF;

  UPDATE competitions
  SET is_private = p_is_private,
      invite_code = v_comp.invite_code
  WHERE id = p_competition_id;

  RETURN v_comp.invite_code;
END;
$$;

-- ── 2. manage_team: reafirma o gate de tamanho por divisão ───────────────
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

-- ── 3. get_competition_leaderboard: wod_rankings passa a filtrar por time aprovado ─
-- Antes: um time não-aprovado com resultado submetido consumia uma posição
-- no RANK() OVER, empurrando os times aprovados pra baixo e distorcendo os
-- pontos (n_teams - rank + 1) de todo mundo na divisão.
CREATE OR REPLACE FUNCTION get_competition_leaderboard(
  p_competition_id UUID,
  p_division_id    UUID DEFAULT NULL
)
RETURNS TABLE (
  team_id       UUID,
  team_name     TEXT,
  box           TEXT,
  division_id   UUID,
  total_points  INT,
  overall_rank  INT,
  per_wod       JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_view_competition(p_competition_id) THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  RETURN QUERY
  WITH
  division_sizes AS (
    SELECT ct.division_id, COUNT(*)::INT AS n_teams
    FROM competition_teams ct
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
    GROUP BY ct.division_id
  ),
  published_wods AS (
    SELECT id AS wod_id, name AS wod_name, score_order
    FROM competition_wods
    WHERE competition_id = p_competition_id AND status = 'published'
  ),
  wod_rankings AS (
    SELECT
      r.team_id,
      r.wod_id,
      r.raw_result,
      r.score_numeric,
      pw.wod_name,
      ct.division_id,
      RANK() OVER (
        PARTITION BY r.wod_id, ct.division_id
        ORDER BY
          CASE WHEN pw.score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
          CASE WHEN pw.score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
      )::INT AS wod_rank,
      pw.score_order
    FROM competition_results r
    JOIN published_wods pw ON pw.wod_id = r.wod_id
    JOIN competition_teams ct ON ct.id = r.team_id
    WHERE r.status IN ('submitted', 'reviewed', 'published')
      AND ct.status = 'approved'
  ),
  wod_points AS (
    SELECT
      wr.team_id,
      wr.wod_id,
      wr.wod_name,
      wr.raw_result,
      wr.wod_rank,
      wr.division_id,
      (ds.n_teams - wr.wod_rank + 1)::INT AS points
    FROM wod_rankings wr
    JOIN division_sizes ds ON ds.division_id = wr.division_id
  ),
  team_totals AS (
    SELECT
      ct.id          AS team_id,
      ct.name        AS team_name,
      ct.box,
      ct.division_id,
      COALESCE(SUM(wp.points), 0)::INT AS total_points,
      jsonb_object_agg(
        wp.wod_id::TEXT,
        jsonb_build_object(
          'wod_name',   wp.wod_name,
          'position',   wp.wod_rank,
          'points',     wp.points,
          'raw_result', wp.raw_result
        )
      ) FILTER (WHERE wp.wod_id IS NOT NULL) AS per_wod
    FROM competition_teams ct
    LEFT JOIN wod_points wp ON wp.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
      AND (p_division_id IS NULL OR ct.division_id = p_division_id)
    GROUP BY ct.id, ct.name, ct.box, ct.division_id
  )
  SELECT
    tt.team_id,
    tt.team_name,
    tt.box,
    tt.division_id,
    tt.total_points,
    RANK() OVER (PARTITION BY tt.division_id ORDER BY tt.total_points DESC)::INT AS overall_rank,
    COALESCE(tt.per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.division_id, tt.total_points DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_competition_leaderboard(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_competition_leaderboard(UUID, UUID) TO anon, authenticated;
