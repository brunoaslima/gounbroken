-- Seed WODs for the 4 test competitions
DO $$
DECLARE
  c_pinheiros UUID;
  c_battle    UUID;
  c_summer    UUID;
  c_masters   UUID;
BEGIN
  SELECT id INTO c_pinheiros FROM competitions WHERE name = 'Open Box Pinheiros 2025';
  SELECT id INTO c_battle    FROM competitions WHERE name = 'Battle of the Boxes SP';
  SELECT id INTO c_summer    FROM competitions WHERE name = 'Functional Summer Cup';
  SELECT id INTO c_masters   FROM competitions WHERE name = 'Brazilian Masters Championship';

  -- ── Open Box Pinheiros 2025 (3 WODs) ─────────────────────────────────────
  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status) VALUES
  (c_pinheiros, 'WOD 1 — Ignition',
   '21-15-9' || chr(10) ||
   'Thrusters (42,5kg/30kg)' || chr(10) ||
   'Pull-ups',
   1, 'time', 'asc', '10:00', 'published'),

  (c_pinheiros, 'WOD 2 — Iron Mile',
   'AMRAP 12:' || chr(10) ||
   '10 Deadlifts (100kg/70kg)' || chr(10) ||
   '15 Box Jumps (60/50cm)' || chr(10) ||
   '20 Double Unders',
   2, 'reps', 'desc', NULL, 'published'),

  (c_pinheiros, 'WOD 3 — Final Storm',
   'For time — teams of 4:' || chr(10) ||
   '100 Wall Balls (9kg/6kg)' || chr(10) ||
   '80 Toes-to-Bar' || chr(10) ||
   '60 Power Cleans (60kg/42,5kg)' || chr(10) ||
   '40 Bar Muscle-Ups' || chr(10) ||
   '* Trabalho partilhado entre os 4 atletas',
   3, 'time', 'asc', '20:00', 'published');

  -- ── Battle of the Boxes SP (4 WODs) ──────────────────────────────────────
  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status) VALUES
  (c_battle, 'WOD 1 — Qualifier',
   '5 rounds for time:' || chr(10) ||
   '10 Hang Power Snatches (52,5kg/35kg)' || chr(10) ||
   '10 Bar-Facing Burpees',
   1, 'time', 'asc', '15:00', 'published'),

  (c_battle, 'WOD 2 — Chipper',
   'For time:' || chr(10) ||
   '50 Cal Assault Bike' || chr(10) ||
   '40 Kettlebell Swings (32kg/24kg)' || chr(10) ||
   '30 Overhead Squats (52,5kg/35kg)' || chr(10) ||
   '20 Chest-to-Bar Pull-ups' || chr(10) ||
   '10 Squat Cleans (80kg/55kg)',
   2, 'time', 'asc', '20:00', 'published'),

  (c_battle, 'WOD 3 — Max Effort',
   '1 rep max:' || chr(10) ||
   'Clean & Jerk' || chr(10) ||
   '* 4 tentativas, melhor resultado conta',
   3, 'weight', 'desc', NULL, 'published'),

  (c_battle, 'WOD 4 — Team Relay',
   'AMRAP 16 — por revezamento:' || chr(10) ||
   '5 Rope Climbs' || chr(10) ||
   '10 Hang Cleans (70kg/47,5kg)' || chr(10) ||
   '15 Box Jumps (60/50cm)' || chr(10) ||
   '* Atleta A completa 1 round, passa para atleta B, etc.',
   4, 'reps', 'desc', NULL, 'published');

  -- ── Functional Summer Cup (3 WODs) ───────────────────────────────────────
  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status) VALUES
  (c_summer, 'WOD 1 — Open Air',
   'For time:' || chr(10) ||
   '400m Run' || chr(10) ||
   '21 Kettlebell Swings (24kg/16kg)' || chr(10) ||
   '400m Run' || chr(10) ||
   '15 Kettlebell Swings' || chr(10) ||
   '400m Run' || chr(10) ||
   '9 Kettlebell Swings',
   1, 'time', 'asc', '18:00', 'published'),

  (c_summer, 'WOD 2 — Stamina',
   'AMRAP 10:' || chr(10) ||
   '10 Push Press (52,5kg/35kg)' || chr(10) ||
   '10 Pull-ups' || chr(10) ||
   '10 Air Squats',
   2, 'reps', 'desc', NULL, 'published'),

  (c_summer, 'WOD 3 — Scorcher',
   '3 rounds for time:' || chr(10) ||
   '800m Run' || chr(10) ||
   '15 Thrusters (42,5kg/30kg)' || chr(10) ||
   '10 Burpee Box Jumps (60/50cm)',
   3, 'time', 'asc', '25:00', 'published');

  -- ── Brazilian Masters Championship (3 WODs) ───────────────────────────────
  INSERT INTO competition_wods (competition_id, name, description, order_index, score_type, score_order, cap, status) VALUES
  (c_masters, 'WOD 1 — Masters Classic',
   '21-15-9:' || chr(10) ||
   'Power Cleans (70kg RX / 52,5kg Intermediate)' || chr(10) ||
   'Ring Dips (RX) / Push-ups (Intermediate)',
   1, 'time', 'asc', '12:00', 'published'),

  (c_masters, 'WOD 2 — Longevity',
   'AMRAP 15:' || chr(10) ||
   '5 Deadlifts (120kg RX / 90kg Intermediate)' || chr(10) ||
   '10 Hand Release Push-ups' || chr(10) ||
   '15 Box Step-Overs (60cm RX / 50cm Intermediate)' || chr(10) ||
   '200m Run',
   2, 'reps', 'desc', NULL, 'published'),

  (c_masters, 'WOD 3 — Veterans Final',
   'For time — 4 rounds:' || chr(10) ||
   '10 Front Squats (80kg RX / 60kg Intermediate)' || chr(10) ||
   '10 Chest-to-Bar (RX) / Pull-ups (Intermediate)' || chr(10) ||
   '10 Cal Row',
   3, 'time', 'asc', '20:00', 'published');

END $$;
