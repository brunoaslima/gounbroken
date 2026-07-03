-- Trigger de defesa em profundidade: hoje o limite de membros por time só é
-- checado dentro da RPC invite_team_member (SECURITY DEFINER). Qualquer
-- INSERT direto em competition_team_members que não passe por essa RPC
-- (bug futuro, service_role, seed de teste, migration nova) ignora
-- completamente o limite. Triggers rodam sempre, independente de role —
-- diferente de RLS, não são bypassados por service_role.

-- ── Fonte única do "tamanho máximo real" de um time ──────────────────────
-- Reusa division_required_size() (já existente) em vez de reimplementar o
-- CASE format; fallback pro campo legado competitions.team_max_size quando
-- o time não tem divisão. Extraído pra função própria porque esse mesmo
-- fallback já precisa ser chamado tanto por invite_team_member quanto pela
-- trigger nova — sem isso, os dois pontos podem divergir se um for editado
-- e o outro esquecido (ver docs/BUG_PATTERNS.md #1).
CREATE OR REPLACE FUNCTION team_required_max_size(p_team_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    division_required_size(t.division_id),
    (SELECT c.team_max_size FROM competitions c WHERE c.id = t.competition_id)
  )
  FROM competition_teams t
  WHERE t.id = p_team_id;
$$;

GRANT EXECUTE ON FUNCTION team_required_max_size(UUID) TO authenticated;

-- ── Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_exists  BOOLEAN;
  v_max_size     INT;
  v_member_count INT;
BEGIN
  -- FOR UPDATE serializa INSERTs concorrentes no mesmo time (mesmo padrão
  -- já usado em respond_team_invite) — sem isso, dois INSERTs simultâneos
  -- poderiam ambos contar abaixo do limite antes de qualquer commit e
  -- ambos passarem, estourando o limite.
  SELECT true INTO v_team_exists
  FROM competition_teams
  WHERE id = NEW.team_id
  FOR UPDATE;

  IF v_team_exists IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  v_max_size := team_required_max_size(NEW.team_id);

  SELECT COUNT(*) INTO v_member_count
  FROM competition_team_members
  WHERE team_id = NEW.team_id
    AND status NOT IN ('removed', 'rejected');

  IF v_max_size IS NOT NULL AND v_member_count >= v_max_size THEN
    RAISE EXCEPTION 'Team is already at maximum size (% members)', v_max_size;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_team_member_limit ON competition_team_members;
CREATE TRIGGER trg_check_team_member_limit
  BEFORE INSERT ON competition_team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_limit();
