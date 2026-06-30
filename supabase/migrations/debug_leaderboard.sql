SELECT team_name, box, total_points, overall_rank
FROM get_competition_leaderboard(
  (SELECT id FROM competitions WHERE public_slug = 'go-unbroken-open-2025')
)
ORDER BY overall_rank;
