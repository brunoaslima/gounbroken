CREATE OR REPLACE FUNCTION auto_transition_competition_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- open → closed quando o prazo de inscrições passou
  UPDATE competitions
  SET status = 'closed', updated_at = now()
  WHERE status = 'open'
    AND registration_deadline IS NOT NULL
    AND registration_deadline < now();

  -- closed → in_progress quando o dia do evento chegou
  UPDATE competitions
  SET status = 'in_progress', updated_at = now()
  WHERE status = 'closed'
    AND start_date IS NOT NULL
    AND start_date <= CURRENT_DATE;
END;
$$;

REVOKE EXECUTE ON FUNCTION auto_transition_competition_statuses() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION auto_transition_competition_statuses() FROM authenticated;
GRANT  EXECUTE ON FUNCTION auto_transition_competition_statuses() TO service_role;
