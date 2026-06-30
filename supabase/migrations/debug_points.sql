-- Verificar v_num_teams e pontos por WOD para Força Bruta
WITH comp AS (
  SELECT id FROM competitions WHERE public_slug = 'go-unbroken-open-2025'
),
num_teams AS (
  SELECT COUNT(*)::INT AS n
  FROM competition_teams ct, comp c
  WHERE ct.competition_id = c.id AND ct.status = 'approved'
),
published_wods AS (
  SELECT cw.id AS wod_id, cw.name AS wod_name, cw.score_order
  FROM competition_wods cw, comp c
  WHERE cw.competition_id = c.id AND cw.status = 'published'
),
wod_rankings AS (
  SELECT
    r.team_id,
    r.wod_id,
    r.score_numeric,
    pw.wod_name,
    pw.score_order,
    RANK() OVER (
      PARTITION BY r.wod_id
      ORDER BY
        CASE WHEN pw.score_order = 'asc'  THEN r.score_numeric END ASC  NULLS LAST,
        CASE WHEN pw.score_order = 'desc' THEN r.score_numeric END DESC NULLS LAST
    )::INT AS wod_rank
  FROM competition_results r
  JOIN published_wods pw ON pw.wod_id = r.wod_id
  WHERE r.status = 'published'
)
SELECT
  ct.name AS team_name,
  wr.wod_name,
  wr.wod_rank,
  nt.n AS num_teams,
  GREATEST(0, nt.n - wr.wod_rank + 1) AS points
FROM wod_rankings wr
JOIN competition_teams ct ON ct.id = wr.team_id
CROSS JOIN num_teams nt
WHERE ct.name = 'Força Bruta'
ORDER BY wr.wod_name;
