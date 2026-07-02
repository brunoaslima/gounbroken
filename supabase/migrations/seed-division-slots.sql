-- Seed: 1 competition covering all slot-badge states in CompetitionDetail
--   · team4 · mixed · RX          → max 8,  5 teams  →  3 left  (ÚLTIMAS 3 VAGAS, laranja)
--   · pair  · mixed · RX          → max 3,  2 teams  →  1 left  (ÚLTIMA VAGA, laranja)
--   · team4 · mixed · Scaled      → max 4,  4 teams  →  0 left  (ESGOTADO, vermelho)
--   · individual · male · RX      → max 20, 3 teams  → 17 left  (17 VAGAS, cinza)
--   · individual · female · RX    → sem limite,  2 teams        (sem badge)

DO $$
DECLARE
  v_organizer UUID;
  v_c   UUID;
  v_d   UUID;
BEGIN

  SELECT user_id INTO v_organizer FROM profiles ORDER BY created_at LIMIT 1;

  INSERT INTO competitions (name, description, venue, start_date, registration_deadline, created_by, status)
  VALUES (
    'Slot Badges Test Cup',
    'Competição de teste para os badges de vagas por divisão.',
    'CF Teste – Rua das Vagas, 100, São Paulo',
    now() + interval '40 days',
    now() + interval '25 days',
    v_organizer, 'open'
  ) RETURNING id INTO v_c;

  INSERT INTO competition_divisions (competition_id, format, composition, category, max_teams) VALUES
    (v_c, 'team4',      'mixed',  'RX',     8),
    (v_c, 'pair',       'mixed',  'RX',     3),
    (v_c, 'team4',      'mixed',  'Scaled', 4),
    (v_c, 'individual', 'male',   'RX',     20),
    (v_c, 'individual', 'female', 'RX',     NULL);

  -- team4 · mixed · RX (8 vagas, 5 ocupadas → últimas 3)
  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c AND format = 'team4' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c, 'Atlheta Prime',   'CrossFit Pinheiros', v_d),
    (v_c, 'Iron Wolves',     'Box Jardins',        v_d),
    (v_c, 'Thunder Squad',   'CF Perdizes',        v_d),
    (v_c, 'Dark Matter',     'CF Centro',          v_d),
    (v_c, 'Apex Crew',       'Box Moema',          v_d);

  -- pair · mixed · RX (3 vagas, 2 ocupadas → última vaga)
  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c AND format = 'pair' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c, 'Duo Impact',      'CF Pinheiros',       v_d),
    (v_c, 'Sync & Lift',     'Box Higienópolis',   v_d);

  -- team4 · mixed · Scaled (4 vagas, 4 ocupadas → esgotado)
  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c AND format = 'team4' AND composition = 'mixed' AND category = 'Scaled';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c, 'First Reps',      'Box Butantã',        v_d),
    (v_c, 'Just Warming Up', 'CF Lapa',            v_d),
    (v_c, 'Ground Zero',     'Box Santo André',    v_d),
    (v_c, 'Force Pair',      'CF Moema',           v_d);

  -- individual · male · RX (20 vagas, 3 ocupadas → 17 vagas)
  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c AND format = 'individual' AND composition = 'male' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c, 'Rafael Mendes',   'CF Pinheiros',       v_d),
    (v_c, 'Lucas Teixeira',  'Box Jardins',        v_d),
    (v_c, 'Bruno Carvalho',  'CF Perdizes',        v_d);

  -- individual · female · RX (sem limite → sem badge)
  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c AND format = 'individual' AND composition = 'female' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c, 'Camila Torres',      'CF Vila Madalena', v_d),
    (v_c, 'Ana Beatriz Silva',  'Box Brooklin',      v_d);

END $$;
