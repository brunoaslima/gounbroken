-- ─── create_competition ───────────────────────────────────────────────────────
-- Admin creates competition and is automatically assigned as head_judge.
DROP FUNCTION IF EXISTS create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION create_competition(
  p_name                  TEXT,
  p_description           TEXT,
  p_venue                 TEXT,
  p_start_date            DATE,
  p_registration_deadline TIMESTAMPTZ,
  p_team_min_size         INT,
  p_team_max_size         INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_global_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_team_min_size < 1 OR p_team_max_size < p_team_min_size THEN
    RAISE EXCEPTION 'invalid team size';
  END IF;

  INSERT INTO competitions
    (name, description, venue, start_date, registration_deadline, team_min_size, team_max_size, created_by)
  VALUES
    (trim(p_name),
     NULLIF(trim(p_description), ''),
     NULLIF(trim(p_venue), ''),
     p_start_date,
     p_registration_deadline,
     p_team_min_size,
     p_team_max_size,
     auth.uid())
  RETURNING id INTO v_id;

  -- Creator is automatically the head judge of the competition they created.
  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_id, auth.uid(), 'head_judge')
  ON CONFLICT (competition_id, user_id) DO UPDATE SET role = 'head_judge';

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT) TO authenticated;
