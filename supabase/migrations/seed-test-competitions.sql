-- Seed: 4 test competitions with divisions and teams
-- Uses the first user with admin or any role as organizer

DO $$
DECLARE
  v_organizer UUID;
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID;
  v_d UUID;
BEGIN

  SELECT user_id INTO v_organizer FROM profiles ORDER BY created_at LIMIT 1;

  -- ── Competition 1: Open Box Pinheiros 2025 ────────────────────────────────
  INSERT INTO competitions (name, description, venue, start_date, registration_deadline, created_by, status)
  VALUES (
    'Open Box Pinheiros 2025',
    'Maior competição de CrossFit do bairro. Três dias de WODs intensos.',
    'Box Pinheiros – R. dos Pinheiros, 144, São Paulo',
    now() + interval '45 days',
    now() + interval '30 days',
    v_organizer, 'open'
  ) RETURNING id INTO v_c1;

  INSERT INTO competition_divisions (competition_id, format, composition, category) VALUES
    (v_c1, 'team4', 'mixed',  'RX'),
    (v_c1, 'team4', 'female', 'RX'),
    (v_c1, 'team4', 'male',   'RX'),
    (v_c1, 'team4', 'mixed',  'Scaled');

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c1 AND format = 'team4' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c1, 'Atlheta Prime',    'CrossFit Pinheiros', v_d),
    (v_c1, 'Iron Wolves',      'Box Jardins',        v_d),
    (v_c1, 'Thunder Squad',    'CF Perdizes',        v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c1 AND format = 'team4' AND composition = 'female' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c1, 'Fierce & Free',    'Box Pinheiros',      v_d),
    (v_c1, 'She Lifts',        'CF Vila Madalena',   v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c1 AND format = 'team4' AND composition = 'mixed' AND category = 'Scaled';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c1, 'First Reps',       'Box Butantã',        v_d),
    (v_c1, 'Just Warming Up',  'CF Lapa',            v_d);

  -- ── Competition 2: Battle of the Boxes SP ────────────────────────────────
  INSERT INTO competitions (name, description, venue, start_date, registration_deadline, created_by, status)
  VALUES (
    'Battle of the Boxes SP',
    'Boxes de SP se enfrentam em WODs classificatórios e finais.',
    'Arena Uniasselvi – Av. Paulista, 900, São Paulo',
    now() + interval '60 days',
    now() + interval '45 days',
    v_organizer, 'open'
  ) RETURNING id INTO v_c2;

  INSERT INTO competition_divisions (competition_id, format, composition, category) VALUES
    (v_c2, 'team4', 'mixed',  'Elite'),
    (v_c2, 'team4', 'mixed',  'RX'),
    (v_c2, 'pair',  'mixed',  'RX');

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c2 AND format = 'team4' AND composition = 'mixed' AND category = 'Elite';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c2, 'Dark Matter',      'CF Centro',          v_d),
    (v_c2, 'Apex Crew',        'Box Moema',          v_d),
    (v_c2, 'The Untouchables', 'CF Brooklin',        v_d),
    (v_c2, 'Kinetic Force',    'Box Tatuapé',        v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c2 AND format = 'team4' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c2, 'Savage Load',      'CF Itaim',           v_d),
    (v_c2, 'Ground Zero',      'Box Santo André',    v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c2 AND format = 'pair' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c2, 'Duo Impact',       'CF Pinheiros',       v_d),
    (v_c2, 'Sync & Lift',      'Box Higienópolis',   v_d),
    (v_c2, 'Force Pair',       'CF Moema',           v_d);

  -- ── Competition 3: Functional Summer Cup ─────────────────────────────────
  INSERT INTO competitions (name, description, venue, start_date, registration_deadline, created_by, status)
  VALUES (
    'Functional Summer Cup',
    'Edição de verão com WODs ao ar livre. Atletas individuais e duplas.',
    'Parque Ibirapuera – Portão 3, São Paulo',
    now() + interval '90 days',
    now() + interval '70 days',
    v_organizer, 'open'
  ) RETURNING id INTO v_c3;

  INSERT INTO competition_divisions (competition_id, format, composition, category) VALUES
    (v_c3, 'individual', 'male',   'RX'),
    (v_c3, 'individual', 'female', 'RX'),
    (v_c3, 'individual', 'male',   'Scaled'),
    (v_c3, 'individual', 'female', 'Scaled'),
    (v_c3, 'pair',       'mixed',  'RX');

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c3 AND format = 'individual' AND composition = 'male' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c3, 'Rafael Mendes',    'CF Pinheiros',       v_d),
    (v_c3, 'Lucas Teixeira',   'Box Jardins',        v_d),
    (v_c3, 'Bruno Carvalho',   'CF Perdizes',        v_d),
    (v_c3, 'Matheus Lima',     'Box Moema',          v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c3 AND format = 'individual' AND composition = 'female' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c3, 'Camila Torres',    'CF Vila Madalena',   v_d),
    (v_c3, 'Ana Beatriz Silva','Box Brooklin',       v_d),
    (v_c3, 'Fernanda Costa',   'CF Itaim',           v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c3 AND format = 'pair' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c3, 'Duo Relentless',   'CF Jardins',         v_d),
    (v_c3, 'Power Couple',     'Box Moema',          v_d);

  -- ── Competition 4: Brazilian Masters Championship ─────────────────────────
  INSERT INTO competitions (name, description, venue, start_date, registration_deadline, created_by, status)
  VALUES (
    'Brazilian Masters Championship',
    'Competição masters 35+. Categorias RX e Intermediate por faixa etária.',
    'Ginásio do Ibirapuera, São Paulo',
    now() + interval '120 days',
    now() + interval '100 days',
    v_organizer, 'open'
  ) RETURNING id INTO v_c4;

  INSERT INTO competition_divisions (competition_id, format, composition, category) VALUES
    (v_c4, 'individual', 'male',   'RX'),
    (v_c4, 'individual', 'female', 'RX'),
    (v_c4, 'individual', 'male',   'Intermediate'),
    (v_c4, 'individual', 'female', 'Intermediate'),
    (v_c4, 'team4',      'mixed',  'RX');

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c4 AND format = 'individual' AND composition = 'male' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c4, 'Eduardo Fonseca',  'Masters SP',         v_d),
    (v_c4, 'Carlos Andrade',   'Box Veterans',       v_d),
    (v_c4, 'Roberto Dias',     'CF 35+',             v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c4 AND format = 'individual' AND composition = 'female' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c4, 'Patrícia Melo',    'Masters SP',         v_d),
    (v_c4, 'Juliana Ramos',    'Box Veterans',       v_d);

  SELECT id INTO v_d FROM competition_divisions WHERE competition_id = v_c4 AND format = 'team4' AND composition = 'mixed' AND category = 'RX';
  INSERT INTO competition_teams (competition_id, name, box, division_id) VALUES
    (v_c4, 'Golden Force',     'CF Masters',         v_d),
    (v_c4, 'Legacy Team',      'Box Veteranos',      v_d),
    (v_c4, 'Iron Generation',  'CF 35+',             v_d);

END $$;
