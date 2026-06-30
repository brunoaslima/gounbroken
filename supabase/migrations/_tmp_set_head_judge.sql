-- Find competition and user, then upsert head_judge role
WITH comp AS (
  SELECT id FROM competitions WHERE name ILIKE '%GO UNBROKEN Open 2025%' LIMIT 1
),
usr AS (
  SELECT user_id FROM profiles WHERE username = 'brunoaslima' LIMIT 1
)
INSERT INTO competition_roles (competition_id, user_id, role)
SELECT comp.id, usr.user_id, 'head_judge'
FROM comp, usr
ON CONFLICT (competition_id, user_id) DO UPDATE
  SET role = 'head_judge';
