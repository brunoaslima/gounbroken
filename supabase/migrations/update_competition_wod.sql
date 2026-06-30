DROP FUNCTION IF EXISTS update_competition_wod(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION update_competition_wod(
  p_wod_id      UUID,
  p_name        TEXT,
  p_description TEXT,
  p_score_type  TEXT,
  p_score_order TEXT,
  p_cap         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp UUID;
BEGIN
  SELECT competition_id INTO v_comp FROM competition_wods WHERE id = p_wod_id;

  IF NOT (is_competition_head_judge(v_comp) OR is_global_admin()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_score_type NOT IN ('time', 'reps', 'weight', 'rounds_plus_reps') THEN
    RAISE EXCEPTION 'invalid score_type: %', p_score_type;
  END IF;

  IF p_score_order NOT IN ('asc', 'desc') THEN
    RAISE EXCEPTION 'invalid score_order: %', p_score_order;
  END IF;

  UPDATE competition_wods
  SET
    name        = trim(p_name),
    description = NULLIF(trim(p_description), ''),
    score_type  = p_score_type,
    score_order = p_score_order,
    cap         = NULLIF(trim(p_cap), '')
  WHERE id = p_wod_id;

  INSERT INTO competition_audit_log (competition_id, changed_by, action, target_type, target_id)
  VALUES (v_comp, auth.uid(), 'wod_published', 'wod', p_wod_id);
END;
$$;

GRANT EXECUTE ON FUNCTION update_competition_wod(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
