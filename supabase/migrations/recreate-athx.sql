DO $$
DECLARE
  admin_id   UUID := '314f291c-b246-4205-897e-1927f27fcaa7';
  comp_id    UUID;
  div_id     UUID;
  t          UUID;
BEGIN

  -- 1. Delete old competition (CASCADE removes divisions, wods, teams, results, roles)
  DELETE FROM competitions WHERE id = 'fbc35f99-4860-4a08-a07a-11c54574ae3e';

  -- 2. Recreate competition (status = 'open', same slug)
  INSERT INTO competitions (
    name, description, status, team_min_size, team_max_size,
    start_date, registration_deadline, venue, public_slug, created_by
  ) VALUES (
    'TREND ATHX SIMULATION 26.7',
    NULL,
    'open',
    1, 4,
    '2026-07-11',
    '2026-07-10 22:59:59+00',
    'TREND CT',
    'ce3466',
    admin_id
  ) RETURNING id INTO comp_id;

  -- 3. Division: PAIR · MIXED · ATHX
  INSERT INTO competition_divisions (competition_id, format, composition, category)
  VALUES (comp_id, 'pair', 'mixed', 'athx')
  RETURNING id INTO div_id;

  -- 4. WODs (STRENGTH with components from teste; ENDURANCE; METCON X — no teste)
  INSERT INTO competition_wods (competition_id, name, description, score_type, score_order, cap, order_index, status, components)
  VALUES
    (comp_id, 'STRENGTH',
     E'0’–6’\n1RM Strict Press\n\n6’–12’\n3RM Back Squat\n\n12’–20’\n5RM Deadlift',
     'weight', 'desc', NULL, 1, 'draft',
     ARRAY['Strict Press', 'Back Squat', 'Dead Lift']),

    (comp_id, 'ENDURANCE',
     E'22\' AMRAP\n\nAthlete A → 600m Run\nAthlete B → Maximum distance on the Rower\n\nSwitch every time one athlete completes the 600m run.\n\nScore: total combined distance covered by both athletes on the run and rower.',
     'reps', 'desc', '22', 2, 'draft', NULL),

    (comp_id, 'METCON X',
     E'60 Cal SkiErg\n60 DB Snatches @ 22.5/15kg\n60m Slam Ball Carry @ 40/30kg\n60 Box Jump Overs\n60m DB Walking Lunges @ 22.5/15kg\n60m Burpee Broad Jumps\n60 Cal SkiErg\n\nScore: total time.',
     'time', 'asc', '25', 3, 'draft', NULL);

  -- 5. Head judge role
  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (comp_id, admin_id, 'head_judge');

  -- 6. Teams (12 duplas, todas approved, same heats)
  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Sofia / André',     'Heat 1', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'David / Daniel',    'Heat 1', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Bruno / Vasco',     'Heat 2', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Mico / Fernando',   'Heat 2', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Guilherme / Marco', 'Heat 3', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Maísa / Rafa',      'Heat 3', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Vera / Maria João', 'Heat 4', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Cláudia / André',   'Heat 4', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Wanderick / Dani',  'Heat 5', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Mariana / França',  'Heat 5', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Patrícia / Leonor', 'Heat 6', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  INSERT INTO competition_teams (competition_id, name, box, captain_user_id, division_id, status, payment_status, approved_at)
  VALUES (comp_id, 'Alda / Inês',       'Heat 6', admin_id, div_id, 'approved', 'not_required', now()) RETURNING id INTO t;
  INSERT INTO competition_team_members (team_id, user_id, team_role, status) VALUES (t, admin_id, 'captain', 'accepted');

  RAISE NOTICE 'New competition id: %', comp_id;
END $$;

-- Verify
SELECT c.id, c.name, c.status, c.public_slug,
  (SELECT count(*) FROM competition_wods WHERE competition_id = c.id) AS wods,
  (SELECT count(*) FROM competition_teams WHERE competition_id = c.id) AS teams,
  (SELECT count(*) FROM competition_roles WHERE competition_id = c.id) AS roles
FROM competitions c WHERE c.name = 'TREND ATHX SIMULATION 26.7';
