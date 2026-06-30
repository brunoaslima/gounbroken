-- Seed: GO UNBROKEN Open 2025
-- 15 approved teams · 5 published WODs · 75 published results
-- Safe to re-run: deletes by public_slug first.
DO $$
DECLARE
  v_admin_id  UUID;
  v_comp_id   UUID;
  v_wod1 UUID; v_wod2 UUID; v_wod3 UUID; v_wod4 UUID; v_wod5 UUID;
  v_team_ids  UUID[] := ARRAY[]::UUID[];
  v_tid       UUID;
  i           INT;

  v_names TEXT[] := ARRAY[
    'Team Alpha','Força Bruta','Iron Will','CrossFit Legends','Thunder Squad',
    'Phoenix Rising','The Grinders','Pain Cave','Steel Nerves','Dark Horse',
    'Underdogs','Elite Pack','Barbell Club','No Limits','Last Rep'
  ];
  v_boxes TEXT[] := ARRAY[
    'CF Pinheiros','CF Moema','CF Vila Madalena','CF Itaim','CF Brooklin',
    'CF Lapa','CF Perdizes','CF Vila Olímpia','CF Santo André','CF ABC',
    'CF Santos','CF Campinas','CF Ribeirão Preto','CF Sorocaba','CF Alphaville'
  ];

  -- perm[i] = which team index (1-based) gets rank i in this WOD
  v_p1 INT[] := ARRAY[1,2,3,5,4,7,6,8,9,11,10,13,12,14,15];
  v_p2 INT[] := ARRAY[4,2,1,3,6,5,8,7,9,10,12,11,14,13,15];
  v_p3 INT[] := ARRAY[3,1,2,5,4,6,7,9,8,11,10,12,13,15,14];
  v_p4 INT[] := ARRAY[2,3,1,4,5,7,6,8,10,9,11,12,14,13,15];
  v_p5 INT[] := ARRAY[1,4,3,2,6,5,7,9,8,10,11,13,12,14,15];

  -- WOD1: Grace (time, asc) — score_numeric = +seconds (lower = faster = rank 1)
  v_s1n NUMERIC[] := ARRAY[152,168,175,183,195,204,215,228,240,255,270,290,318,342,378];
  v_s1d TEXT[]    := ARRAY['2:32','2:48','2:55','3:03','3:15','3:24','3:35','3:48','4:00','4:15','4:30','4:50','5:18','5:42','6:18'];

  -- WOD2: AMRAP 12 (rounds_plus_reps, desc)
  v_s2n NUMERIC[] := ARRAY[8015,8010,7018,7012,7005,6020,6015,6008,6001,5019,5014,5007,5000,4015,4005];
  v_s2d TEXT[]    := ARRAY['8+15','8+10','7+18','7+12','7+05','6+20','6+15','6+08','6+01','5+19','5+14','5+07','5+00','4+15','4+05'];

  -- WOD3: Max Clean & Jerk (weight, desc)
  v_s3n NUMERIC[] := ARRAY[127.5,122.5,120,115,112.5,110,107.5,105,102.5,100,97.5,95,92.5,90,85];
  v_s3d TEXT[]    := ARRAY['127.5 kg','122.5 kg','120 kg','115 kg','112.5 kg','110 kg','107.5 kg','105 kg','102.5 kg','100 kg','97.5 kg','95 kg','92.5 kg','90 kg','85 kg'];

  -- WOD4: Max Pull-ups (reps, desc)
  v_s4n NUMERIC[] := ARRAY[45,42,39,37,35,33,31,29,27,25,23,21,20,18,16];
  v_s4d TEXT[]    := ARRAY['45 reps','42 reps','39 reps','37 reps','35 reps','33 reps','31 reps','29 reps','27 reps','25 reps','23 reps','21 reps','20 reps','18 reps','16 reps'];

  -- WOD5: The Chipper (time, asc) — score_numeric = +seconds (lower = faster = rank 1)
  v_s5n NUMERIC[] := ARRAY[612,645,678,702,738,774,810,852,888,930,978,1020,1074,1080,1122];
  v_s5d TEXT[]    := ARRAY['10:12','10:45','11:18','11:42','12:18','12:54','13:30','14:12','14:48','15:30','16:18','17:00','17:54','18:00','18:42'];
BEGIN
  SELECT user_id INTO v_admin_id
  FROM profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found in profiles';
  END IF;

  -- Remove previous seed if re-running
  DELETE FROM competitions WHERE public_slug = 'go-unbroken-open-2025';

  INSERT INTO competitions (
    name, description, venue, start_date, registration_deadline,
    team_min_size, team_max_size, status, created_by, public_slug
  ) VALUES (
    'GO UNBROKEN Open 2025',
    'Competição oficial da comunidade Go Unbroken. 15 equipes, 5 WODs, pontuação por ranking.',
    'CrossFit Pinheiros · São Paulo, SP',
    '2025-07-05',
    '2025-06-30 23:59:59+00',
    3, 4, 'in_progress', v_admin_id, 'go-unbroken-open-2025'
  ) RETURNING id INTO v_comp_id;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_comp_id, v_admin_id, 'head_judge');

  -- 5 WODs
  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status)
  VALUES (v_comp_id, 'Grace', 'For Time: 30 Clean & Jerks (60/42 kg)', 1, 'time', 'asc', '7 MIN', 'published')
  RETURNING id INTO v_wod1;

  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status)
  VALUES (v_comp_id, 'AMRAP 12', 'AMRAP 12 min: 5 Power Cleans (80/55 kg) + 10 Bar-Facing Burpees + 15 Wall Balls', 2, 'rounds_plus_reps', 'desc', '12 MIN', 'published')
  RETURNING id INTO v_wod2;

  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status)
  VALUES (v_comp_id, 'Max Clean & Jerk', '6 min para estabelecer 1RM Clean & Jerk. 4 tentativas com incrementos livres.', 3, 'weight', 'desc', '6 MIN', 'published')
  RETURNING id INTO v_wod3;

  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status)
  VALUES (v_comp_id, 'Max Pull-ups', '2 min: Max Unbroken Pull-ups (kipping permitido). Uma tentativa.', 4, 'reps', 'desc', '2 MIN', 'published')
  RETURNING id INTO v_wod4;

  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status)
  VALUES (v_comp_id, 'The Chipper', 'For Time: 50 Wall Balls + 40 Box Jumps + 30 T2B + 20 Squat Cleans (70/50 kg) + 10 Muscle-Ups', 5, 'time', 'asc', '20 MIN', 'published')
  RETURNING id INTO v_wod5;

  -- 15 teams
  FOR i IN 1..15 LOOP
    INSERT INTO competition_teams (
      competition_id, name, box, captain_user_id,
      status, payment_status, checked_in, approved_at
    ) VALUES (
      v_comp_id, v_names[i], v_boxes[i], v_admin_id,
      'approved', 'not_required', true,
      now() - interval '3 days'
    ) RETURNING id INTO v_tid;
    v_team_ids := array_append(v_team_ids, v_tid);

    INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_by)
    VALUES (v_tid, v_admin_id, 'captain', 'accepted', v_admin_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Results: WOD 1 (Grace, time asc)
  FOR i IN 1..15 LOOP
    INSERT INTO competition_results (
      competition_id, wod_id, team_id, submitted_by,
      raw_result, score_numeric, score_type, status, submitted_at, published_at
    ) VALUES (
      v_comp_id, v_wod1, v_team_ids[v_p1[i]], v_admin_id,
      v_s1d[i], v_s1n[i], 'time', 'published',
      now() - interval '4 hours', now() - interval '3 hours'
    );
  END LOOP;

  -- Results: WOD 2 (AMRAP 12, rounds_plus_reps desc)
  FOR i IN 1..15 LOOP
    INSERT INTO competition_results (
      competition_id, wod_id, team_id, submitted_by,
      raw_result, score_numeric, score_type, status, submitted_at, published_at
    ) VALUES (
      v_comp_id, v_wod2, v_team_ids[v_p2[i]], v_admin_id,
      v_s2d[i], v_s2n[i], 'rounds_plus_reps', 'published',
      now() - interval '3 hours', now() - interval '2 hours'
    );
  END LOOP;

  -- Results: WOD 3 (Max C&J, weight desc)
  FOR i IN 1..15 LOOP
    INSERT INTO competition_results (
      competition_id, wod_id, team_id, submitted_by,
      raw_result, score_numeric, score_type, status, submitted_at, published_at
    ) VALUES (
      v_comp_id, v_wod3, v_team_ids[v_p3[i]], v_admin_id,
      v_s3d[i], v_s3n[i], 'weight', 'published',
      now() - interval '2 hours', now() - interval '1 hour'
    );
  END LOOP;

  -- Results: WOD 4 (Max Pull-ups, reps desc)
  FOR i IN 1..15 LOOP
    INSERT INTO competition_results (
      competition_id, wod_id, team_id, submitted_by,
      raw_result, score_numeric, score_type, status, submitted_at, published_at
    ) VALUES (
      v_comp_id, v_wod4, v_team_ids[v_p4[i]], v_admin_id,
      v_s4d[i], v_s4n[i], 'reps', 'published',
      now() - interval '1 hour', now() - interval '30 minutes'
    );
  END LOOP;

  -- Results: WOD 5 (The Chipper, time asc)
  FOR i IN 1..15 LOOP
    INSERT INTO competition_results (
      competition_id, wod_id, team_id, submitted_by,
      raw_result, score_numeric, score_type, status, submitted_at, published_at
    ) VALUES (
      v_comp_id, v_wod5, v_team_ids[v_p5[i]], v_admin_id,
      v_s5d[i], v_s5n[i], 'time', 'published',
      now() - interval '30 minutes', now() - interval '10 minutes'
    );
  END LOOP;

  RAISE NOTICE 'Seed complete. Competition ID: % | Teams: 15 | WODs: 5 | Results: 75', v_comp_id;
END $$;
