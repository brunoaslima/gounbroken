-- Root cause of "editing doesn't stick": the coach could always TYPE free
-- text (e.g. "60m", "60 cal") into Reps/Scheme, but on save, anything that
-- wasn't a pure integer was silently diverted into the notes field instead
-- of being kept as the exercise's main value — so it never showed as the
-- highlighted prefix, and re-editing didn't restore it into the Reps field
-- either (notes and reps are disconnected). That hack is removed.
--
-- reps_label: exact raw text the coach typed, always used for display.
-- reps (existing int column): best-effort leading integer, kept only for
-- WrappedReport's volume calc (sets × reps × load_kg) — null for schemes
-- like "21-15-9" or text with no leading digit, same as before.
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS reps_label TEXT;

-- Backfill: old rows already have a clean numeric reps, mirror it into the label.
UPDATE workout_exercises SET reps_label = reps::text WHERE reps_label IS NULL AND reps IS NOT NULL;

CREATE OR REPLACE FUNCTION parse_leading_reps(p_text TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_text IS NULL OR p_text = '' OR p_text LIKE '%-%' THEN NULL
    ELSE (regexp_match(p_text, '^\d+'))[1]::int
  END;
$$;

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
