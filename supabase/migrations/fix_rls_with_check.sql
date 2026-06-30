-- 1. profiles: adiciona WITH CHECK no UPDATE para impedir mudança de user_id
DROP POLICY IF EXISTS "update_own" ON profiles;
CREATE POLICY "update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. weight_history: remove política duplicada sem WITH CHECK
DROP POLICY IF EXISTS "own weight_history" ON weight_history;

-- 3. prescribed_workouts: adiciona WITH CHECK para impedir trainer_id falso
DROP POLICY IF EXISTS "workouts_trainer" ON prescribed_workouts;
CREATE POLICY "workouts_trainer" ON prescribed_workouts
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
