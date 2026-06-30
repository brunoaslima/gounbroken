-- RPC: update_competition_status
-- Admin or head judge can move a competition through its lifecycle.

DROP FUNCTION IF EXISTS update_competition_status(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION update_competition_status(
  p_competition_id UUID,
  p_new_status     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current TEXT;
BEGIN
  IF NOT (is_competition_head_judge(p_competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT status INTO v_current FROM competitions WHERE id = p_competition_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'competition not found';
  END IF;

  IF p_new_status NOT IN ('draft','open','closed','in_progress','finished','cancelled') THEN
    RAISE EXCEPTION 'invalid status: %', p_new_status;
  END IF;

  UPDATE competitions
  SET status = p_new_status, updated_at = now()
  WHERE id = p_competition_id;

  -- No audit log entry — action type 'status_changed' not in the CHECK constraint.
  -- Status changes are visible via competitions.updated_at and competitions.status directly.
END;
$$;

GRANT EXECUTE ON FUNCTION update_competition_status(UUID, TEXT) TO authenticated;
