-- Feature: atleta pode editar/apagar um treino que ELE MESMO criou (auto-
-- registro sem personal trainer), mas não um treino prescrito por um
-- personal de verdade. admin_delete_workout já faz essa checagem certa
-- (trainer_id = auth.uid() OR admin) — não precisa mudar. O que faltava:
-- get_my_prescribed_workouts() não expunha nenhum jeito do frontend saber
-- "esse treino é meu (trainer_id = athlete_id) ou é do meu personal".

-- ── 1. get_my_prescribed_workouts: expõe is_own (booleano, não o UUID cru
--    de trainer_id — menor superfície de dados, mesmo padrão de is_* já
--    usado em is_competition_head_judge/is_global_admin). Muda o tipo de
--    retorno da função (RETURNS TABLE), então precisa DROP antes do
--    CREATE OR REPLACE (docs/BUG_PATTERNS.md #9 — isso vale pra mudança
--    de tipo de retorno, não só de parâmetros).
DROP FUNCTION IF EXISTS get_my_prescribed_workouts();

CREATE OR REPLACE FUNCTION get_my_prescribed_workouts()
RETURNS TABLE(
  id uuid, workout_date date, focus text[], notes text,
  trainer_name text, source text, created_at timestamptz,
  sections jsonb, is_own boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pw.id, pw.workout_date, pw.focus, pw.notes,
    CASE WHEN pw.trainer_id = pw.athlete_id THEN NULL
      WHEN COALESCE(pw.source,'personal') = 'personal'
        THEN (SELECT p.name FROM profiles p WHERE p.user_id = pw.trainer_id)
      ELSE NULL END AS trainer_name,
    COALESCE(pw.source,'personal') AS source,
    pw.created_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ws.id, 'section_type', ws.section_type, 'label', ws.label,
        'position', ws.position, 'notes', ws.notes,
        'format_type', ws.format_type, 'format_config', ws.format_config,
        'exercises', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', we.id, 'movement_name', we.movement_name,
            'sets', we.sets, 'reps', we.reps, 'reps_label', we.reps_label,
            'duration_seconds', we.duration_seconds,
            'load_kg', we.load_kg, 'load_pct_1rm', we.load_pct_1rm,
            'rpe', we.rpe, 'rest_seconds', we.rest_seconds,
            'notes', we.notes, 'position', we.position
          ) ORDER BY we.position)
          FROM workout_exercises we WHERE we.section_id = ws.id
        ), '[]'::jsonb)
      ) ORDER BY ws.position)
      FROM workout_sections ws WHERE ws.workout_id = pw.id
    ), '[]'::jsonb) AS sections,
    (pw.trainer_id = pw.athlete_id) AS is_own
  FROM prescribed_workouts pw
  WHERE pw.athlete_id = auth.uid()
  ORDER BY pw.workout_date DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_my_prescribed_workouts() TO authenticated;

-- ── 2. personal_save_workout: fecha o gap de Tampering encontrado no
--    security review. Sem essa checagem, qualquer usuário autenticado
--    podia chamar a RPC com p_athlete_id de OUTRA pessoa (trainer_id vira
--    o próprio atacante), plantando treino-lixo na conta da vítima — que,
--    com a feature de auto-edição/delete, a vítima NÃO conseguiria apagar
--    sozinha (pra ela, trainer_id != athlete_id, is_own = false).
--    Único vínculo legítimo pra prescrever a OUTRO atleta é a tabela
--    trainer_athletes (a mesma usada por personal_get_athletes_summary).
CREATE OR REPLACE FUNCTION personal_save_workout(
  p_athlete_id          UUID,
  p_workout_date        DATE,
  p_focus               TEXT[],
  p_notes               TEXT,
  p_sections            JSONB,
  p_replace_workout_id  UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout_id uuid; v_section_id uuid; v_section jsonb; v_exercise jsonb;
  v_old_trainer_id uuid;
BEGIN
  IF p_athlete_id != auth.uid()
     AND NOT EXISTS (SELECT 1 FROM trainer_athletes WHERE trainer_id = auth.uid() AND athlete_id = p_athlete_id)
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND 'admin' = ANY(roles))
  THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_replace_workout_id IS NOT NULL THEN
    SELECT trainer_id INTO v_old_trainer_id
    FROM prescribed_workouts WHERE id = p_replace_workout_id;

    IF v_old_trainer_id IS NOT NULL THEN
      IF NOT (
        v_old_trainer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND 'admin' = ANY(roles))
      ) THEN
        RAISE EXCEPTION 'Unauthorized';
      END IF;

      DELETE FROM workout_exercises
        WHERE section_id IN (SELECT id FROM workout_sections WHERE workout_id = p_replace_workout_id);
      DELETE FROM workout_sections WHERE workout_id = p_replace_workout_id;
      DELETE FROM prescribed_workouts WHERE id = p_replace_workout_id;
    END IF;
    -- v_old_trainer_id nulo = já foi apagado antes (double-submit); segue e cria o novo
  END IF;

  INSERT INTO prescribed_workouts (trainer_id, athlete_id, workout_date, focus, notes)
  VALUES (auth.uid(), p_athlete_id, p_workout_date, p_focus, p_notes)
  RETURNING id INTO v_workout_id;

  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections) LOOP
    INSERT INTO workout_sections (workout_id, section_type, label, position, notes, format_type, format_config)
    VALUES (
      v_workout_id, v_section->>'section_type', v_section->>'label',
      (v_section->>'position')::int, v_section->>'notes',
      NULLIF(v_section->>'format_type', ''),
      CASE WHEN v_section->'format_config' IS NOT NULL AND v_section->>'format_config' != 'null'
           THEN (v_section->'format_config')::jsonb ELSE NULL END
    ) RETURNING id INTO v_section_id;

    FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_section->'exercises') LOOP
      INSERT INTO workout_exercises (
        section_id, movement_name, movement_id, sets, reps, reps_label, duration_seconds,
        load_kg, load_pct_1rm, rpe, rest_seconds, notes, position
      ) VALUES (
        v_section_id, v_exercise->>'movement_name', v_exercise->>'movement_id',
        (v_exercise->>'sets')::int,
        parse_leading_reps(v_exercise->>'reps_label'),
        NULLIF(v_exercise->>'reps_label', ''),
        (v_exercise->>'duration_seconds')::int, (v_exercise->>'load_kg')::numeric,
        (v_exercise->>'load_pct_1rm')::int, (v_exercise->>'rpe')::int,
        (v_exercise->>'rest_seconds')::int, v_exercise->>'notes',
        (v_exercise->>'position')::int
      );
    END LOOP;
  END LOOP;
  RETURN v_workout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION personal_save_workout(UUID, DATE, TEXT[], TEXT, JSONB, UUID) TO authenticated;
