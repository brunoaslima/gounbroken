DROP FUNCTION IF EXISTS create_competition_wod(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION create_competition_wod(
  p_competition_id UUID,
  p_name           TEXT,
  p_description    TEXT,
  p_score_type     TEXT,
  p_score_order    TEXT,
  p_cap            TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_order INT;
BEGIN
  IF NOT (is_competition_head_judge(p_competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_order
  FROM competition_wods WHERE competition_id = p_competition_id;

  INSERT INTO competition_wods
    (competition_id, name, description, score_type, score_order, cap, order_index, status)
  VALUES
    (p_competition_id, trim(p_name), NULLIF(trim(p_description), ''),
     p_score_type, p_score_order, NULLIF(trim(p_cap), ''), v_order, 'draft')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_competition_wod(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
