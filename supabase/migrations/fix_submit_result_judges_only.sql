-- Remove captain permission from submit_competition_result — only judges and head_judges may submit
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
  v_result_id    UUID;
  v_competition  UUID;
BEGIN
  SELECT competition_id INTO v_competition FROM competition_wods WHERE id = p_wod_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'WOD not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM competition_roles
    WHERE competition_id = v_competition
      AND user_id = auth.uid()
      AND role IN ('judge', 'head_judge')
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be a judge or head_judge';
  END IF;

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
        status        = 'submitted',
        updated_at    = now();

  SELECT id INTO v_result_id FROM competition_results
  WHERE wod_id = p_wod_id AND team_id = p_team_id;

  RETURN v_result_id;
END;
$$;
