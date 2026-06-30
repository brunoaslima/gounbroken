-- Diagnóstico: ver o que existe no DB para a comp de teste
SELECT
  c.id,
  c.name,
  c.status,
  (SELECT COUNT(*) FROM competition_teams ct WHERE ct.competition_id = c.id) AS teams_total,
  (SELECT COUNT(*) FROM competition_teams ct WHERE ct.competition_id = c.id AND ct.status = 'approved') AS teams_approved,
  (SELECT COUNT(*) FROM competition_wods cw WHERE cw.competition_id = c.id) AS wods_total,
  (SELECT COUNT(*) FROM competition_wods cw WHERE cw.competition_id = c.id AND cw.status = 'published') AS wods_published,
  (SELECT COUNT(*) FROM competition_results cr
     JOIN competition_wods cw ON cr.wod_id = cw.id
     WHERE cw.competition_id = c.id) AS results_total,
  (SELECT COUNT(*) FROM competition_results cr
     JOIN competition_wods cw ON cr.wod_id = cw.id
     WHERE cw.competition_id = c.id AND cr.status = 'published') AS results_published
FROM competitions c
WHERE c.public_slug = 'go-unbroken-open-2025';
