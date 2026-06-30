-- Testa get_wod_ranking para Grace (WOD 1 da comp de teste)
SELECT wod_position, v_team_name, v_box, v_raw_result
FROM get_wod_ranking(
  (SELECT id FROM competition_wods
   WHERE name = 'Grace'
     AND competition_id = (SELECT id FROM competitions WHERE public_slug = 'go-unbroken-open-2025')
  )
)
LIMIT 5;
