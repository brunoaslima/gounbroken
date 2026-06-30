CREATE OR REPLACE FUNCTION update_wod_status(p_wod_id UUID, p_status TEXT)
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

  IF p_status NOT IN ('draft', 'submitted', 'published') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE competition_wods SET status = p_status WHERE id = p_wod_id;

  INSERT INTO competition_audit_log (competition_id, changed_by, action, target_type, target_id)
  VALUES (v_comp, auth.uid(), 'wod_published', 'wod', p_wod_id);
END;
$$;

GRANT EXECUTE ON FUNCTION update_wod_status(UUID, TEXT) TO authenticated;
