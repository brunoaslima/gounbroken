-- Extend create_competition_team to accept an optional division_id.
-- The division must belong to the same competition.

DROP FUNCTION IF EXISTS create_competition_team(UUID, TEXT, TEXT);

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
  v_team_id UUID;
  v_comp    competitions%ROWTYPE;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;

  IF v_comp.id IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF v_comp.status NOT IN ('open') THEN
    RAISE EXCEPTION 'Competition is not open for registration';
  END IF;

  IF now() > v_comp.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- One team per user per competition
  IF EXISTS (
    SELECT 1 FROM competition_teams ct
    JOIN competition_team_members ctm ON ctm.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ctm.user_id = auth.uid()
      AND ctm.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You already belong to a team in this competition';
  END IF;

  -- Validate division belongs to this competition
  IF p_division_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM competition_divisions
      WHERE id = p_division_id AND competition_id = p_competition_id
    ) THEN
      RAISE EXCEPTION 'Division not found in this competition';
    END IF;
  END IF;

  INSERT INTO competition_teams (competition_id, name, captain_user_id, box, division_id)
  VALUES (p_competition_id, p_name, auth.uid(), p_box, p_division_id)
  RETURNING id INTO v_team_id;

  INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_by)
  VALUES (v_team_id, auth.uid(), 'captain', 'accepted', auth.uid());

  -- Register caller as athlete role in competition
  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (p_competition_id, auth.uid(), 'athlete')
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN v_team_id;
END;
$$;
