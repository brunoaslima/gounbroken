-- Adds server-side validation: registration_deadline must be before start_date.
-- Recreates the full function to keep it as the canonical version.

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
  v_id   UUID;
  v_slug TEXT;
  v_tries INT := 0;
BEGIN
  IF NOT is_global_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_team_min_size < 1 OR p_team_max_size < p_team_min_size THEN
    RAISE EXCEPTION 'invalid team size';
  END IF;

  IF p_registration_deadline >= p_start_date::TIMESTAMPTZ THEN
    RAISE EXCEPTION 'registration_deadline must be before start_date';
  END IF;

  -- Generate unique 6-char slug with up to 5 retries
  LOOP
    v_tries := v_tries + 1;
    IF v_tries > 5 THEN
      RAISE EXCEPTION 'could not generate unique slug after 5 attempts';
    END IF;
    v_slug := substring(lower(encode(gen_random_bytes(4), 'hex')) FROM 1 FOR 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM competitions WHERE public_slug = v_slug);
  END LOOP;

  INSERT INTO competitions
    (name, description, venue, start_date, registration_deadline, team_min_size, team_max_size, created_by, public_slug)
  VALUES
    (trim(p_name),
     NULLIF(trim(p_description), ''),
     NULLIF(trim(p_venue), ''),
     p_start_date,
     p_registration_deadline,
     p_team_min_size,
     p_team_max_size,
     auth.uid(),
     v_slug)
  RETURNING id INTO v_id;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_id, auth.uid(), 'head_judge')
  ON CONFLICT (competition_id, user_id) DO UPDATE SET role = 'head_judge';

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_competition(TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, INT, INT) TO authenticated;
