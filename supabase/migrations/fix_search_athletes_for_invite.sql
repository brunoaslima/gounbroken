-- Fix: exclui o próprio caller + membros já na equipe dos resultados de busca.
-- Adiciona p_team_id opcional; só filtra membros se o caller for capitão da equipe.
-- Aplique no Supabase Dashboard → SQL Editor.

CREATE OR REPLACE FUNCTION search_athletes_for_invite(
  p_query   TEXT,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id   UUID,
  username  TEXT,
  full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.name AS full_name
  FROM profiles p
  WHERE length(trim(p_query)) >= 2
    -- nunca retorna o próprio caller
    AND p.user_id <> auth.uid()
    -- exclui membros existentes da equipe, mas só se o caller for capitão dela
    AND (
      p_team_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM competition_teams WHERE id = p_team_id AND captain_user_id = auth.uid())
      OR p.user_id NOT IN (
        SELECT ctm.user_id
        FROM competition_team_members ctm
        WHERE ctm.team_id = p_team_id
          AND ctm.status NOT IN ('rejected', 'removed')
          AND ctm.user_id IS NOT NULL
      )
    )
    AND (
      p.username ILIKE '%' || trim(p_query) || '%'
      OR p.name   ILIKE '%' || trim(p_query) || '%'
    )
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION search_athletes_for_invite(TEXT, UUID) TO authenticated;
