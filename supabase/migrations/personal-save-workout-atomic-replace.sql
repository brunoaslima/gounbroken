-- Une o fluxo de editar treino (apagar + recriar) em uma única RPC
-- transacional. Antes eram duas chamadas separadas do frontend
-- (admin_delete_workout + personal_save_workout): se o usuário clicasse
-- salvar de novo numa tela desatualizada (o workout antigo já tinha sido
-- apagado na tentativa anterior), a segunda tentativa falhava com
-- "Workout not found" e nada era salvo — parecendo que o botão não fazia
-- nada, mesmo a primeira tentativa tendo funcionado. Agora é uma
-- transação só: se o workout a substituir já não existe, segue e cria o
-- novo mesmo assim, em vez de falhar.
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
        section_id, movement_name, movement_id, sets, reps, duration_seconds,
        load_kg, load_pct_1rm, rpe, rest_seconds, notes, position
      ) VALUES (
        v_section_id, v_exercise->>'movement_name', v_exercise->>'movement_id',
        (v_exercise->>'sets')::int, (v_exercise->>'reps')::int,
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
