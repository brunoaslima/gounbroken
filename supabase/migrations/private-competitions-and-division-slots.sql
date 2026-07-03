-- ═══════════════════════════════════════════════════════════════════════════
-- Competições privadas + vagas por divisão
--
-- Decisões de produto:
--   · Privada = invisível na listagem; acesso por link longo reutilizável
--     (invite_code, 32 hex chars) que não expira. Atleta logado que abre o
--     link "resgata" o vínculo (competition_roles) e passa a ver tudo.
--   · Leaderboard/detalhe de comp privada: apenas logados com vínculo.
--   · Divisão obrigatória na inscrição quando a competição tem divisões.
--   · max_teams por divisão (NULL = ilimitado); vaga = team não rejeitado
--     nem cancelado. Lock FOR UPDATE evita overbooking em corrida.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Schema ───────────────────────────────────────────────────────────────

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

ALTER TABLE competition_divisions
  ADD COLUMN IF NOT EXISTS max_teams INT
    CHECK (max_teams IS NULL OR max_teams > 0);

CREATE INDEX IF NOT EXISTS competition_teams_division_id_idx
  ON competition_teams (division_id);

-- ─── 2. Helper de visibilidade ───────────────────────────────────────────────
-- Pública: qualquer um vê. Privada: criador, quem tem role, ou admin global.

CREATE OR REPLACE FUNCTION can_view_competition(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.id = p_id
      AND (
        NOT c.is_private
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM competition_roles cr
          WHERE cr.competition_id = c.id AND cr.user_id = auth.uid()
        )
        OR is_global_admin()
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION can_view_competition(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_view_competition(UUID) TO anon, authenticated;

-- ─── 3. Policies: privacidade em todas as superfícies de leitura ─────────────

DROP POLICY IF EXISTS "comp: anon read public" ON competitions;
CREATE POLICY "comp: anon read public" ON competitions
  FOR SELECT TO anon
  USING (status IN ('open','in_progress','finished') AND NOT is_private);

DROP POLICY IF EXISTS "comp: auth read" ON competitions;
CREATE POLICY "comp: auth read" ON competitions
  FOR SELECT TO authenticated
  USING (
    (status IN ('open','in_progress','finished') AND NOT is_private)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      WHERE cr.competition_id = competitions.id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

DROP POLICY IF EXISTS "wods: anon read" ON competition_wods;
CREATE POLICY "wods: anon read" ON competition_wods
  FOR SELECT TO anon
  USING (can_view_competition(competition_id));

DROP POLICY IF EXISTS "wods: auth read" ON competition_wods;
CREATE POLICY "wods: auth read" ON competition_wods
  FOR SELECT TO authenticated
  USING (can_view_competition(competition_id));

DROP POLICY IF EXISTS "divisions public read" ON competition_divisions;
CREATE POLICY "divisions public read" ON competition_divisions
  FOR SELECT
  USING (can_view_competition(competition_id));

DROP POLICY IF EXISTS "results: anon read published" ON competition_results;
CREATE POLICY "results: anon read published" ON competition_results
  FOR SELECT TO anon
  USING (status = 'published' AND can_view_competition(competition_id));

-- ─── 4. Resgate do link privado ──────────────────────────────────────────────
-- Valida o código e vincula o caller como 'athlete' (dá visibilidade via RLS).

CREATE OR REPLACE FUNCTION redeem_competition_invite(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login required';
  END IF;

  IF p_code IS NULL OR char_length(p_code) <> 32 THEN
    RAISE EXCEPTION 'Convite inválido';
  END IF;

  SELECT id INTO v_comp_id
  FROM competitions
  WHERE invite_code = p_code AND is_private;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido';
  END IF;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_comp_id, auth.uid(), 'athlete')
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN v_comp_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION redeem_competition_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_competition_invite(TEXT) TO authenticated;

-- ─── 5. Vagas por divisão: leitura agregada (só números, zero PII) ───────────

CREATE OR REPLACE FUNCTION get_division_availability(p_competition_id UUID)
RETURNS TABLE (division_id UUID, max_teams INT, taken INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_view_competition(p_competition_id) THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  RETURN QUERY
  SELECT
    cd.id,
    cd.max_teams,
    COUNT(ct.id) FILTER (
      WHERE ct.status NOT IN ('rejected','cancelled')
    )::INT
  FROM competition_divisions cd
  LEFT JOIN competition_teams ct ON ct.division_id = cd.id
  WHERE cd.competition_id = p_competition_id
  GROUP BY cd.id, cd.max_teams;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_division_availability(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_division_availability(UUID) TO anon, authenticated;

-- ─── 6. create_competition com privacidade ───────────────────────────────────

DROP FUNCTION IF EXISTS create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT) CASCADE;

-- team_min/max viraram legado (divisões definem o formato) — defaults preservam
-- o frontend atual, que não envia esses parâmetros
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
    v_slug := substring(lower(encode(gen_random_bytes(4), 'hex')) FROM 1 FOR 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM competitions WHERE public_slug = v_slug);
  END LOOP;

  IF p_is_private THEN
    v_code := lower(encode(gen_random_bytes(16), 'hex'));
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

REVOKE EXECUTE ON FUNCTION create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT, BOOLEAN) TO authenticated;

-- ─── 7. Toggle de privacidade pós-criação ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_competition_privacy(
  p_competition_id UUID,
  p_is_private     BOOLEAN
)
RETURNS TEXT  -- retorna o invite_code atual (gera se necessário)
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
    v_comp.invite_code := lower(encode(gen_random_bytes(16), 'hex'));
  END IF;

  UPDATE competitions
  SET is_private = p_is_private,
      invite_code = v_comp.invite_code
  WHERE id = p_competition_id;

  RETURN v_comp.invite_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_competition_privacy(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_competition_privacy(UUID, BOOLEAN) TO authenticated;

-- ─── 8. Inscrição: privacidade + divisão obrigatória + vagas com lock ────────

DROP FUNCTION IF EXISTS create_competition_team(UUID, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_competition_team(
  p_competition_id  UUID,
  p_name            TEXT,
  p_box             TEXT DEFAULT NULL,
  p_division_id     UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id       UUID;
  v_comp          competitions%ROWTYPE;
  v_division_count INT;
  v_max_teams     INT;
  v_taken         INT;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;

  IF v_comp.id IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  -- privada sem vínculo = mesma resposta de inexistente (anti-enumeração)
  IF v_comp.is_private AND NOT can_view_competition(p_competition_id) THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF v_comp.status NOT IN ('open') THEN
    RAISE EXCEPTION 'Competition is not open for registration';
  END IF;

  IF now() > v_comp.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM competition_teams ct
    JOIN competition_team_members ctm ON ctm.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ctm.user_id = auth.uid()
      AND ctm.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You already belong to a team in this competition';
  END IF;

  -- divisão obrigatória quando a competição tem divisões
  SELECT COUNT(*) INTO v_division_count
  FROM competition_divisions WHERE competition_id = p_competition_id;

  IF v_division_count > 0 AND p_division_id IS NULL THEN
    RAISE EXCEPTION 'Division is required for this competition';
  END IF;

  IF p_division_id IS NOT NULL THEN
    -- FOR UPDATE serializa inscrições concorrentes na mesma divisão
    SELECT max_teams INTO v_max_teams
    FROM competition_divisions
    WHERE id = p_division_id AND competition_id = p_competition_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Division not found in this competition';
    END IF;

    IF v_max_teams IS NOT NULL THEN
      SELECT COUNT(*) INTO v_taken
      FROM competition_teams
      WHERE division_id = p_division_id
        AND status NOT IN ('rejected','cancelled');

      IF v_taken >= v_max_teams THEN
        RAISE EXCEPTION 'Division is full';
      END IF;
    END IF;
  END IF;

  INSERT INTO competition_teams (competition_id, name, captain_user_id, box, division_id)
  VALUES (p_competition_id, p_name, auth.uid(), p_box, p_division_id)
  RETURNING id INTO v_team_id;

  INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_by)
  VALUES (v_team_id, auth.uid(), 'captain', 'accepted', auth.uid());

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (p_competition_id, auth.uid(), 'athlete')
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN v_team_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_competition_team(UUID, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_competition_team(UUID, TEXT, TEXT, UUID) TO authenticated;

-- ─── 9. manage_team: re-check de vagas no approve (safety net) ───────────────

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

      -- vaga ainda existe? (equipe rejeitada não conta; aprovar não pode estourar o limite)
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

-- ─── 10. Gate de privacidade nas RPCs de leitura existentes ──────────────────

DROP FUNCTION IF EXISTS get_competition_leaderboard(UUID);
DROP FUNCTION IF EXISTS get_competition_leaderboard(UUID, UUID);

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

CREATE OR REPLACE FUNCTION get_wod_ranking(p_wod_id UUID)
RETURNS TABLE (
  wod_position    INT,
  v_team_name     TEXT,
  v_box           TEXT,
  v_raw_result    TEXT,
  v_score_numeric NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_order TEXT;
  v_comp_id     UUID;
BEGIN
  SELECT score_order, competition_id INTO v_score_order, v_comp_id
  FROM competition_wods WHERE id = p_wod_id;

  IF v_comp_id IS NOT NULL AND NOT can_view_competition(v_comp_id) THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  RETURN QUERY
  SELECT
    RANK() OVER (
      ORDER BY
        CASE WHEN v_score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
        CASE WHEN v_score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
    )::INT,
    ct.name,
    ct.box,
    r.raw_result,
    r.score_numeric
  FROM competition_results r
  JOIN competition_teams ct ON ct.id = r.team_id
  WHERE r.wod_id = p_wod_id
    AND r.status IN ('submitted', 'reviewed', 'published')
  ORDER BY
    CASE WHEN v_score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
    CASE WHEN v_score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_wod_ranking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_wod_ranking(UUID) TO anon, authenticated;
