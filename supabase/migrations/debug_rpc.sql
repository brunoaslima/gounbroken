-- Testa a RPC de leaderboard diretamente com a comp de teste
SELECT
  team_name, box, total_points, overall_rank,
  jsonb_object_keys(per_wod) AS wod_keys
FROM get_competition_leaderboard(
  (SELECT id FROM competitions WHERE public_slug = 'go-unbroken-open-2025')
)
LIMIT 5;
