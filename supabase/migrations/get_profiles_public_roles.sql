-- Atualiza get_profiles_public para retornar também os roles globais do perfil
DROP FUNCTION IF EXISTS get_profiles_public(UUID[]) CASCADE;

CREATE OR REPLACE FUNCTION get_profiles_public(p_user_ids UUID[])
RETURNS TABLE (
  user_id   UUID,
  username  TEXT,
  full_name TEXT,
  roles     TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.name AS full_name, COALESCE(p.roles, '{}')
  FROM profiles p
  WHERE p.user_id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION get_profiles_public(UUID[]) TO authenticated;
