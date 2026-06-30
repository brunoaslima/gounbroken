-- ─────────────────────────────────────────────────────────────────────
-- Delete own account — SECURITY DEFINER function
-- Runs as postgres superuser so it can remove the row from auth.users,
-- which cascades to profiles / scores / movements via ON DELETE CASCADE.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only the authenticated session owner can delete their account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only the authenticated user can call this function
REVOKE ALL ON FUNCTION delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
