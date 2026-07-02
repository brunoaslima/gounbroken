-- movement_id liga o exercício prescrito ao catálogo global de movimentos
-- (src/lib/exerciseCatalog.data.json). Nullable: exercícios custom e treinos
-- antigos ficam sem id e continuam funcionando por nome.
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS movement_id TEXT;

CREATE OR REPLACE FUNCTION personal_save_workout(
  p_athlete_id   UUID,
  p_workout_date DATE,
  p_focus        TEXT[],
  p_notes        TEXT,
  p_sections     JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout_id uuid; v_section_id uuid; v_section jsonb; v_exercise jsonb;
BEGIN
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
