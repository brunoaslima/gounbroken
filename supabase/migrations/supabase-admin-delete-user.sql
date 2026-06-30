-- ─────────────────────────────────────────────────────────────────────
-- Admin delete user — SECURITY DEFINER function
-- Only callable by users with the 'admin' role.
-- Cannot be used to delete one's own account.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND 'admin' = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Prevent self-deletion via this function
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account via admin function';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_user(uuid) TO authenticated;
