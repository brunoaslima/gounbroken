-- Adiciona SET search_path = public em funções SECURITY DEFINER que estavam sem ele.
-- Sem search_path fixo, um schema malicioso pode injetar funções shadow e escalar privilégios.

ALTER FUNCTION public.admin_delete_workout(p_workout_id uuid)
  SET search_path = public;

ALTER FUNCTION public.admin_toggle_user_active(p_user_id uuid, p_is_active boolean)
  SET search_path = public;

ALTER FUNCTION public.admin_toggle_user_role(p_user_id uuid, p_role text)
  SET search_path = public;

ALTER FUNCTION public.admin_update_user_role(p_user_id uuid, p_role text)
  SET search_path = public;

ALTER FUNCTION public.ai_save_workout(p_workout_date date, p_focus text[], p_notes text, p_sections jsonb)
  SET search_path = public;

ALTER FUNCTION public.get_athlete_recent_feedback(p_athlete_id uuid, p_days integer)
  SET search_path = public;

ALTER FUNCTION public.get_email_by_username(p_username text)
  SET search_path = public;

ALTER FUNCTION public.get_my_prescribed_workouts()
  SET search_path = public;

ALTER FUNCTION public.get_my_prs()
  SET search_path = public;

ALTER FUNCTION public.save_workout_feedback(p_workout_id uuid, p_status text, p_enjoyment text, p_perceived_difficulty text, p_student_comment text)
  SET search_path = public;
