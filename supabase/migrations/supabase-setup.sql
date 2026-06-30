-- CrossFit Score Tracker — Supabase Setup
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de movimentos
CREATE TABLE movements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Tabela de scores
CREATE TABLE scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movement_id uuid REFERENCES movements(id) ON DELETE CASCADE NOT NULL,
  reps        int NOT NULL CHECK (reps BETWEEN 1 AND 10),
  weight_kg   numeric(6,2) NOT NULL CHECK (weight_kg > 0),
  recorded_at date NOT NULL DEFAULT current_date,
  notes       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 3. Row Level Security — cada usuário vê apenas seus dados
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements: own data"
  ON movements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores: own data"
  ON scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Índices para queries frequentes
CREATE INDEX idx_movements_user ON movements(user_id);
CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_scores_movement ON scores(movement_id);
CREATE INDEX idx_scores_recorded_at ON scores(recorded_at DESC);
