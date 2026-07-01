-- ─────────────────────────────────────────────────────────────────────────────
-- Security: harden submit_competition_result
--
-- Fixes:
--  1. (CRITICAL) Judge cannot overwrite another judge's result
--  2. (CRITICAL) Judge cannot reset status back from 'reviewed'/'published'
--  3. (HIGH)     Validate score_numeric bounds per score_type server-side
--  4. (HIGH)     Audit every submit/update in competition_audit_log
--  5. Expand audit_log CHECK constraints to cover all actions in use
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Expand audit_log action + target_type constraints ────────────────────────
ALTER TABLE competition_audit_log
  DROP CONSTRAINT IF EXISTS competition_audit_log_action_check;
ALTER TABLE competition_audit_log
  ADD CONSTRAINT competition_audit_log_action_check
    CHECK (action IN (
      'result_submit', 'result_update', 'result_override', 'wod_published',
      'team_approved', 'team_rejected', 'team_payment_confirmed',
      'team_checked_in', 'team_cancelled', 'judge_invited'
    ));

ALTER TABLE competition_audit_log
  DROP CONSTRAINT IF EXISTS competition_audit_log_target_type_check;
ALTER TABLE competition_audit_log
  ADD CONSTRAINT competition_audit_log_target_type_check
    CHECK (target_type IN ('team', 'wod', 'result', 'judge_invite'));

-- ── Fixed RPC ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_competition_result(
  p_wod_id        UUID,
  p_team_id       UUID,
  p_raw_result    TEXT,
  p_score_type    TEXT,
  p_score_numeric NUMERIC,
  p_notes         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competition  UUID;
  v_existing     competition_results%ROWTYPE;
  v_result_id    UUID;
  v_is_first     BOOLEAN;
BEGIN
  -- ── Resolve competition ───────────────────────────────────────────────────
  SELECT competition_id INTO v_competition FROM competition_wods WHERE id = p_wod_id;
  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'WOD not found';
  END IF;

  -- ── Auth: judge or head_judge only (captain path removed) ────────────────
  IF NOT EXISTS (
    SELECT 1 FROM competition_roles
    WHERE competition_id = v_competition
      AND user_id = auth.uid()
      AND role IN ('judge', 'head_judge')
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be a judge or head_judge';
  END IF;

  -- ── Input validation ──────────────────────────────────────────────────────
  IF length(p_raw_result) > 50 THEN
    RAISE EXCEPTION 'raw_result too long (max 50 chars)';
  END IF;

  IF p_score_type = 'time' THEN
    -- seconds, 1 sec minimum, 3600 max (1 hour cap)
    IF p_score_numeric <= 0 OR p_score_numeric > 3600 THEN
      RAISE EXCEPTION 'Invalid time score: must be between 1 and 3600 seconds';
    END IF;
  ELSIF p_score_type = 'reps' THEN
    IF p_score_numeric <= 0 OR p_score_numeric > 99999 THEN
      RAISE EXCEPTION 'Invalid reps score';
    END IF;
  ELSIF p_score_type = 'weight' THEN
    IF p_score_numeric <= 0 OR p_score_numeric > 9999 THEN
      RAISE EXCEPTION 'Invalid weight score';
    END IF;
  ELSIF p_score_type = 'rounds_plus_reps' THEN
    -- encoding: rounds * 10000 + reps; reps part must be < 10000
    IF p_score_numeric <= 0
       OR p_score_numeric > 9999 * 10000 + 9999
       OR (p_score_numeric::BIGINT % 10000) >= 10000 THEN
      RAISE EXCEPTION 'Invalid rounds+reps score';
    END IF;
  END IF;

  -- ── Guard: check existing result ──────────────────────────────────────────
  SELECT * INTO v_existing
  FROM competition_results
  WHERE wod_id = p_wod_id AND team_id = p_team_id;

  IF v_existing.id IS NOT NULL THEN
    -- Block if already reviewed or published — only head_judge via override
    IF v_existing.status IN ('reviewed', 'published') THEN
      RAISE EXCEPTION 'Result already reviewed — use override to correct it';
    END IF;
    -- Block if submitted by a different judge
    IF v_existing.submitted_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Result submitted by another judge — contact the head judge to override';
    END IF;
  END IF;

  v_is_first := v_existing.id IS NULL;

  -- ── Upsert ────────────────────────────────────────────────────────────────
  INSERT INTO competition_results
    (competition_id, wod_id, team_id, submitted_by, raw_result, score_type, score_numeric, notes, status)
  VALUES
    (v_competition, p_wod_id, p_team_id, auth.uid(), p_raw_result, p_score_type, p_score_numeric, p_notes, 'submitted')
  ON CONFLICT (wod_id, team_id) DO UPDATE
    SET raw_result    = EXCLUDED.raw_result,
        score_type    = EXCLUDED.score_type,
        score_numeric = EXCLUDED.score_numeric,
        notes         = EXCLUDED.notes,
        submitted_by  = EXCLUDED.submitted_by,
        submitted_at  = now(),
        status        = 'submitted';

  SELECT id INTO v_result_id FROM competition_results
  WHERE wod_id = p_wod_id AND team_id = p_team_id;

  -- ── Audit log ─────────────────────────────────────────────────────────────
  INSERT INTO competition_audit_log
    (competition_id, changed_by, action, target_type, target_id, from_value, to_value)
  VALUES (
    v_competition,
    auth.uid(),
    CASE WHEN v_is_first THEN 'result_submit' ELSE 'result_update' END,
    'result',
    v_result_id,
    v_existing.raw_result,
    p_raw_result
  );

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_competition_result(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
