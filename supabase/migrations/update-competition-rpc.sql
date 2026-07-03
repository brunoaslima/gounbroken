-- Head judge (ou admin) edita os detalhes gerais da competição e o max_teams
-- de cada divisão numa única transação. Substitui o update direto e imediato
-- em competition_divisions.max_teams que existia em CompetitionManage.tsx
-- (sem RPC, sem validação de negócio, gated só pela RLS de created_by).
CREATE OR REPLACE FUNCTION update_competition(
  p_competition_id        UUID,
  p_name                   TEXT,
  p_description            TEXT,
  p_venue                  TEXT,
  p_start_date             DATE,
  p_registration_deadline  TIMESTAMPTZ,
  p_divisions              JSONB DEFAULT '[]'::JSONB  -- [{ "id": uuid, "max_teams": int|null }, ...]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists  BOOLEAN;
  v_div     JSONB;
  v_div_id  UUID;
  v_max     INT;
  v_taken   INT;
BEGIN
  -- Permissão checada ANTES de existência, pra não vazar quais IDs existem.
  IF NOT (is_competition_head_judge(p_competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT EXISTS (SELECT 1 FROM competitions WHERE id = p_competition_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'competition not found';
  END IF;

  IF char_length(trim(coalesce(p_name, ''))) = 0 OR char_length(p_name) > 200 THEN
    RAISE EXCEPTION 'invalid name length';
  END IF;
  IF p_description IS NOT NULL AND char_length(p_description) > 5000 THEN
    RAISE EXCEPTION 'description too long';
  END IF;
  IF p_venue IS NOT NULL AND char_length(p_venue) > 300 THEN
    RAISE EXCEPTION 'invalid venue length';
  END IF;
  IF p_registration_deadline::date > p_start_date THEN
    RAISE EXCEPTION 'registration deadline must be before the event date';
  END IF;

  UPDATE competitions
  SET name                   = trim(p_name),
      description             = NULLIF(trim(p_description), ''),
      venue                   = NULLIF(trim(p_venue), ''),
      start_date              = p_start_date,
      registration_deadline   = p_registration_deadline,
      updated_at              = now()
  WHERE id = p_competition_id;

  FOR v_div IN SELECT * FROM jsonb_array_elements(p_divisions)
  LOOP
    v_div_id := (v_div->>'id')::UUID;
    v_max    := NULLIF(v_div->>'max_teams', '')::INT;

    IF v_max IS NOT NULL THEN
      SELECT COUNT(*) INTO v_taken
      FROM competition_teams
      WHERE division_id = v_div_id AND status = 'approved';

      IF v_max < v_taken THEN
        RAISE EXCEPTION 'max_teams (%) cannot be less than % teams already approved', v_max, v_taken;
      END IF;
    END IF;

    -- Single statement: WHERE inclui competition_id pra impedir um head judge
    -- de editar uma divisão de outra competição injetando o id no payload.
    UPDATE competition_divisions
    SET max_teams = v_max
    WHERE id = v_div_id AND competition_id = p_competition_id;
  END LOOP;

  -- Sem audit log — mesmo padrão de update_competition_status (action type não
  -- está na CHECK constraint de competition_audit_log; mudanças ficam visíveis
  -- via competitions.updated_at).
END;
$$;

GRANT EXECUTE ON FUNCTION update_competition(UUID, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, JSONB) TO authenticated;
