-- Bug: admin_delete_workout exigia role global 'admin'. É usada no fluxo de
-- edição de treino (delete+recreate) por qualquer coach com role 'personal',
-- então editar um treino falhava silenciosamente (erro só ia pro console)
-- para qualquer trainer sem também ser admin. Passa a permitir o próprio
-- trainer dono do treino, além de admin.
CREATE OR REPLACE FUNCTION admin_delete_workout(p_workout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID;
BEGIN
  SELECT trainer_id INTO v_trainer_id FROM prescribed_workouts WHERE id = p_workout_id;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Workout not found';
  END IF;

  IF NOT (
    v_trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND 'admin' = ANY(roles))
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM workout_exercises
    WHERE section_id IN (SELECT id FROM workout_sections WHERE workout_id = p_workout_id);
  DELETE FROM workout_sections WHERE workout_id = p_workout_id;
  DELETE FROM prescribed_workouts WHERE id = p_workout_id;
END;
$$;
