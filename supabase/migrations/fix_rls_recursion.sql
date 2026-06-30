-- Fix: infinite recursion in competition_teams RLS policy
-- Root cause: competition_teams policy queries competition_team_members,
-- which queries competition_teams → infinite loop.
-- Solution: SECURITY DEFINER function bypasses RLS on competition_team_members.

-- Helper: check team membership without triggering RLS cycle
DROP FUNCTION IF EXISTS auth_user_is_team_member(UUID) CASCADE;

CREATE OR REPLACE FUNCTION auth_user_is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM competition_team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND status NOT IN ('rejected', 'removed')
  );
$$;

-- Rebuild competition_teams SELECT policy using the helper
DROP POLICY IF EXISTS "teams: auth read" ON competition_teams;
CREATE POLICY "teams: auth read" ON competition_teams
  FOR SELECT TO authenticated
  USING (
    captain_user_id = auth.uid()
    OR auth_user_is_team_member(competition_teams.id)
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      WHERE cr.competition_id = competition_teams.competition_id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

GRANT EXECUTE ON FUNCTION auth_user_is_team_member(UUID) TO authenticated;
