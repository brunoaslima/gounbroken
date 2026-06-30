-- Adiciona 'cancelled' ao CHECK constraint de competitions.status
ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_status_check,
  ADD CONSTRAINT competitions_status_check
    CHECK (status IN ('draft','open','closed','in_progress','finished','cancelled'));
